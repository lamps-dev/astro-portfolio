/*
 * Client-side i18n. Live translations go through /api/translate, which tries
 * DeepL, then Google Cloud Translation, then Google's keyless endpoint (see
 * src/i18n/providers.mjs).
 *
 * English stays in the markup. When another language is picked, marked text is
 * looked up in src/i18n/translations/<lang>.json first. That file is generated
 * ahead of time by `pnpm translate` (the API is far too slow to make visitors
 * wait on it), and is loaded on demand so English visitors never download it.
 * Anything not in there (text added since the last run) is sent to the API,
 * swapped in as results come back, and cached in localStorage. If the API
 * errors, the site falls back to English and an `i18n-error` event is fired
 * (LanguagePicker shows a popup for it).
 *
 * Markup hooks:
 *   data-i18n                         translate the element's innerHTML
 *   data-i18n-attr="title,aria-label" translate those attributes
 *   data-i18n-date                    re-format a <time datetime> locally
 *
 * React islands use the useT() hook from ./react instead, so hydration is
 * never fought over.
 */

import { cacheKey, sourceHtml } from './shared.mjs';

export const TRANSLATE_API = '/api/translate';

export const LANGUAGES = {
  en: { label: 'English', short: 'EN' },
  fr: { label: 'Français', short: 'FR' },
} as const;

export type Lang = keyof typeof LANGUAGES;
export const DEFAULT_LANG: Lang = 'en';

/** Fired on window when the language changes (detail: Lang). */
export const LANG_EVENT = 'lang-change';
/** Fired on window whenever new translations land in the cache. */
export const UPDATE_EVENT = 'i18n-update';
/** Fired on window when requests start/stop (detail: boolean). */
export const BUSY_EVENT = 'i18n-busy';
/** Fired on window when the API fails (detail: error message). */
export const ERROR_EVENT = 'i18n-error';

export const CACHE_PREFIX = 'i18n-cache:';
/** Strings per request. The server translates them one by one, so keep it small. */
const CHUNK_SIZE = 8;
const MAX_PARALLEL = 3;
const REQUEST_TIMEOUT_MS = 90_000;

type Format = 'text' | 'html';

declare global {
  interface Window {
    __lang?: Lang;
    __functionalConsent?: () => boolean;
  }
}

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && value in LANGUAGES;
}

export function getLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  return isLang(window.__lang) ? window.__lang : DEFAULT_LANG;
}

function canStore() {
  return typeof window.__functionalConsent === 'function' ? window.__functionalConsent() : true;
}

/* ---- Cache ---- */

// Pre-translated dictionaries, each its own lazily loaded chunk.
const prebuiltLoaders = import.meta.glob<Record<string, string>>('./translations/*.json', {
  import: 'default',
});

/** Everything known for a language: pre-translated plus API results. */
const caches: Partial<Record<Lang, Map<string, string>>> = {};
/** Only the API results; this is what gets persisted to localStorage. */
const fetched: Partial<Record<Lang, Map<string, string>>> = {};
const prebuilt: Partial<Record<Lang, Promise<void>>> = {};
const prebuiltDone = new Set<Lang>();
const saveTimers: Partial<Record<Lang, number>> = {};

function fetchedFor(lang: Lang) {
  let map = fetched[lang];
  if (!map) {
    map = new Map();
    try {
      const raw = canStore() ? localStorage.getItem(CACHE_PREFIX + lang) : null;
      if (raw) for (const [k, v] of Object.entries(JSON.parse(raw))) map.set(k, String(v));
    } catch {}
    fetched[lang] = map;
  }
  return map;
}

function cacheFor(lang: Lang) {
  let cache = caches[lang];
  if (!cache) {
    cache = new Map(fetchedFor(lang));
    caches[lang] = cache;
  }
  return cache;
}

/**
 * Load the pre-translated dictionary for `lang` (once). Resolves even if it is
 * missing or fails to load; the API then covers everything.
 */
export function whenReady(lang: Lang = getLang()): Promise<void> {
  if (lang === DEFAULT_LANG) return Promise.resolve();
  prebuilt[lang] ??= (async () => {
    try {
      const load = prebuiltLoaders[`./translations/${lang}.json`];
      const dict = load ? await load() : {};
      const cache = cacheFor(lang);
      for (const [k, v] of Object.entries(dict)) cache.set(k, v);
    } catch {}
    prebuiltDone.add(lang);
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: lang }));
  })();
  return prebuilt[lang]!;
}

function store(lang: Lang, key: string, value: string) {
  cacheFor(lang).set(key, value);
  fetchedFor(lang).set(key, value);
  window.clearTimeout(saveTimers[lang]);
  saveTimers[lang] = window.setTimeout(() => {
    try {
      if (canStore()) {
        localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(Object.fromEntries(fetchedFor(lang))));
      }
    } catch {}
  }, 500);
}

/* ---- API queue ---- */

type Job = { lang: Lang; format: Format; text: string };

/** Bumped on every language switch so late responses for an old one are dropped. */
let generation = 0;
const queued = new Map<string, Job>();
const inFlight = new Set<string>();
const controllers = new Set<AbortController>();
const waiting: (() => Promise<void>)[] = [];
let flushScheduled = false;
let active = 0;

const jobId = (job: Job) => `${job.lang}|${cacheKey(job.format, job.text)}`;

function emitBusy() {
  window.dispatchEvent(new CustomEvent(BUSY_EVENT, { detail: active > 0 || waiting.length > 0 }));
}

function enqueue(job: Job) {
  const id = jobId(job);
  if (queued.has(id) || inFlight.has(id)) return;
  queued.set(id, job);
  if (!flushScheduled) {
    flushScheduled = true;
    // Collect everything one render pass asks for, then send it in batches.
    window.setTimeout(flush, 0);
  }
}

function flush() {
  flushScheduled = false;
  const groups = new Map<string, Job[]>();
  for (const [id, job] of queued) {
    inFlight.add(id);
    const group = `${job.lang}|${job.format}`;
    groups.set(group, [...(groups.get(group) ?? []), job]);
  }
  queued.clear();
  for (const jobs of groups.values()) {
    for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
      const chunk = jobs.slice(i, i + CHUNK_SIZE);
      waiting.push(() => request(chunk));
    }
  }
  pump();
}

function pump() {
  while (active < MAX_PARALLEL && waiting.length > 0) {
    const run = waiting.shift()!;
    active++;
    run().finally(() => {
      active--;
      pump();
    });
  }
  emitBusy();
}

async function request(jobs: Job[]) {
  const { lang, format } = jobs[0];
  const gen = generation;
  const controller = new AbortController();
  controllers.add(controller);
  const timer = window.setTimeout(
    () => controller.abort(new Error('the request timed out')),
    REQUEST_TIMEOUT_MS,
  );
  try {
    const res = await fetch(TRANSLATE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: jobs.map((j) => j.text), source: DEFAULT_LANG, target: lang, format }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.error) {
      throw new Error(json?.error ?? `the server answered with HTTP ${res.status}`);
    }
    const out: unknown = json.translatedText;
    const list = Array.isArray(out) ? out : [out];
    if (list.length !== jobs.length || list.some((t) => typeof t !== 'string')) {
      throw new Error('the server sent back an unexpected response');
    }
    if (gen !== generation) return;
    jobs.forEach((job, i) => store(lang, cacheKey(format, job.text), list[i] as string));
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: lang }));
  } catch (err) {
    if (gen !== generation) return; // superseded by a language switch
    fail(err);
  } finally {
    window.clearTimeout(timer);
    controllers.delete(controller);
    if (gen === generation) for (const job of jobs) inFlight.delete(jobId(job));
  }
}

function cancelAll() {
  generation++;
  queued.clear();
  waiting.length = 0;
  inFlight.clear();
  for (const c of controllers) c.abort();
  controllers.clear();
  emitBusy();
}

function fail(err: unknown) {
  const reason = err instanceof Error ? err.message : String(err);
  setLang(DEFAULT_LANG);
  window.dispatchEvent(new CustomEvent(ERROR_EVENT, { detail: reason || 'unknown error' }));
}

/**
 * Translated `text` for `lang` if it is known. Otherwise it is queued for the
 * API and the English text is returned for now; an UPDATE_EVENT follows once
 * the translation arrives.
 */
export function translateText(lang: Lang, text: string, format: Format = 'text'): string {
  if (lang === DEFAULT_LANG || !text.trim() || typeof window === 'undefined') return text;
  const hit = cacheFor(lang).get(cacheKey(format, text));
  if (hit !== undefined) return hit;
  // Check the pre-translated file before bothering the API. Its UPDATE_EVENT
  // re-runs this lookup once it has loaded.
  if (!prebuiltDone.has(lang)) void whenReady(lang);
  else enqueue({ lang, format, text });
  return text;
}

/* ---- DOM application (Astro markup) ---- */

type Original = { html?: string; source?: string; attrs: Record<string, string | null> };
const originals = new WeakMap<Element, Original>();

function remember(el: Element) {
  let o = originals.get(el);
  if (!o) {
    o = { attrs: {} };
    originals.set(el, o);
  }
  return o;
}

/** Astro scopes styles with data-astro-cid-* attributes; put them back on swapped-in children. */
function copyScope(el: Element) {
  const scoped = [...el.attributes].filter((a) => a.name.startsWith('data-astro-cid-'));
  if (scoped.length === 0) return;
  el.querySelectorAll('*').forEach((child) => {
    for (const a of scoped) child.setAttribute(a.name, a.value);
  });
}

function setHtml(el: Element, html: string) {
  if (el.innerHTML === html) return;
  el.innerHTML = html;
  copyScope(el);
}

/** Apply whatever is cached to `root` and queue the rest. Safe to call repeatedly. */
export function applyTranslations(lang: Lang = getLang(), root: ParentNode = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    if (el.parentElement?.closest('[data-i18n]')) return; // the outer element covers it
    const o = remember(el);
    o.html ??= el.innerHTML;
    if (lang === DEFAULT_LANG) return setHtml(el, o.html);
    o.source ??= sourceHtml(o.html);
    const out = translateText(lang, o.source, 'html');
    setHtml(el, out === o.source ? o.html : out);
  });

  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const o = remember(el);
    for (const attr of el.getAttribute('data-i18n-attr')!.split(',').map((s) => s.trim())) {
      if (!attr) continue;
      if (!(attr in o.attrs)) o.attrs[attr] = el.getAttribute(attr);
      const original = o.attrs[attr];
      if (original != null) el.setAttribute(attr, translateText(lang, original));
    }
  });

  root.querySelectorAll('time[data-i18n-date]').forEach((el) => {
    const iso = el.getAttribute('datetime');
    if (!iso) return;
    const o = remember(el);
    o.html ??= el.innerHTML;
    if (lang === DEFAULT_LANG) return setHtml(el, o.html);
    el.textContent = new Date(iso).toLocaleDateString(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  });
}

/* ---- Switching ---- */

export function setLang(lang: Lang) {
  cancelAll();
  window.__lang = lang;
  document.documentElement.lang = lang;
  try {
    if (canStore() && lang !== DEFAULT_LANG) localStorage.setItem('lang', lang);
    else localStorage.removeItem('lang');
  } catch {}
  applyTranslations(lang);
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
}
