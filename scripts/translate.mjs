#!/usr/bin/env node
/*
 * Pre-translates the site so visitors don't wait on the (slow) translate API.
 *
 *   pnpm translate              build, then translate whatever is new
 *   pnpm translate --skip-build reuse the existing dist/ output
 *
 * It collects every translatable string the browser would look up:
 *   - data-i18n elements and data-i18n-attr attributes in the built HTML
 *   - t('...') strings in the React islands (plus a few built at runtime)
 * then translates only the ones missing from src/i18n/translations/<lang>.json
 * and drops entries that are no longer used. Commit the JSON afterwards.
 * Progress is saved after every batch, so an interrupted run loses nothing.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, serialize } from 'parse5';
import { cacheKey, sourceHtml, toTemplate } from '../src/i18n/shared.mjs';
import { translateBatch } from '../src/i18n/providers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist', 'client');
const OUT_DIR = path.join(ROOT, 'src', 'i18n', 'translations');
const SOURCE_LANG = 'en';
const CHUNK_SIZE = 25;
const MAX_PARALLEL = 3;

// Strings the islands assemble at runtime, so a source scan can't see them.
const EXTRA_TEXT = [
  ...['minute', 'hour', 'day', 'week'].flatMap((u) => [`{n} ${u} ago`, `{n} ${u}s ago`]),
  ...['view', 'like'].flatMap((w) => [`{n} ${w}`, `{n} ${w}s`]),
  // YouTube filters and category chips
  'all', 'streams', 'videos', 'shorts', 'stream', 'video', 'short',
  // Discord statuses
  'online', 'idle', 'dnd', 'offline',
];

/* ---- Languages (read from src/i18n/index.ts so there is one list) ---- */

function targetLangs() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'i18n', 'index.ts'), 'utf8');
  const block = src.match(/export const LANGUAGES = \{([\s\S]*?)\} as const;/);
  if (!block) throw new Error('could not find LANGUAGES in src/i18n/index.ts');
  return [...block[1].matchAll(/^\s*(\w+):/gm)].map((m) => m[1]).filter((l) => l !== SOURCE_LANG);
}

/* ---- Collect strings ---- */

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;

function collectFromHtml(file, out) {
  const walk = (node, insideUnit) => {
    let inside = insideUnit;
    if (node.tagName) {
      if (attr(node, 'data-i18n') !== undefined && !insideUnit) {
        // serialize(node) gives the children, i.e. the same as el.innerHTML.
        const source = sourceHtml(serialize(node.tagName === 'template' ? node.content : node));
        if (source) out.add(cacheKey('html', source));
        inside = true;
      }
      const attrs = attr(node, 'data-i18n-attr');
      if (attrs) {
        for (const name of attrs.split(',').map((s) => s.trim())) {
          const value = attr(node, name);
          if (value?.trim()) out.add(cacheKey('text', value));
        }
      }
    }
    for (const child of node.childNodes ?? []) walk(child, inside);
    if (node.content) walk(node.content, inside);
  };
  walk(parse(fs.readFileSync(file, 'utf8')), false);
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(tsx|jsx)$/.test(e.name) ? [p] : [];
  });
}

/** Every plain string literal inside each t(...) call, ternaries included. */
function collectFromSource(file, out) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\bt\(/g)) {
    let depth = 1;
    let i = m.index + 2;
    const literals = [];
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === "'" || ch === '"') {
        let j = i + 1;
        let value = '';
        while (j < src.length && src[j] !== ch) {
          if (src[j] === '\\') {
            value += src[j + 1];
            j += 2;
          } else value += src[j++];
        }
        literals.push(value);
        i = j + 1;
        continue;
      }
      if (ch === '`') {
        // Template literals are runtime-built; see EXTRA_TEXT.
        i = src.indexOf('`', i + 1) + 1;
        continue;
      }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      i++;
    }
    for (const text of literals) {
      if (text.trim()) out.add(cacheKey('text', toTemplate(text).template));
    }
  }
}

/* ---- Translate ---- */

// API keys (DEEPL_API_KEY, GOOGLE_TRANSLATE_API_KEY) are read from .env.
try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  // No .env: only the keyless fallback will be available.
}

async function translateChunk(lang, format, texts) {
  const { translations } = await translateBatch(texts, { target: lang, format, env: process.env });
  return translations;
}

function save(file, dict, used) {
  const sorted = Object.fromEntries(
    Object.keys(dict)
      .filter((k) => used.has(k))
      .sort()
      .map((k) => [k, dict[k]]),
  );
  fs.writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
}

async function run() {
  if (!process.argv.includes('--skip-build')) {
    console.log('Building the site...');
    const build = spawnSync('pnpm', ['astro', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }
  if (!fs.existsSync(DIST)) throw new Error(`no build output at ${DIST}; run without --skip-build`);

  const used = new Set();
  for (const file of htmlFiles(DIST)) collectFromHtml(file, used);
  for (const file of sourceFiles(path.join(ROOT, 'src'))) collectFromSource(file, used);
  for (const text of EXTRA_TEXT) used.add(cacheKey('text', toTemplate(text).template));
  console.log(`Found ${used.size} translatable strings.`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = false;

  for (const lang of targetLangs()) {
    const file = path.join(OUT_DIR, `${lang}.json`);
    const dict = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
    const missing = [...used].filter((k) => !(k in dict));
    console.log(`\n[${lang}] ${missing.length} new, ${used.size - missing.length} already translated.`);

    const chunks = [];
    for (const format of ['html', 'text']) {
      const keys = missing.filter((k) => k.startsWith(`${format}:`));
      for (let i = 0; i < keys.length; i += CHUNK_SIZE) chunks.push({ format, keys: keys.slice(i, i + CHUNK_SIZE) });
    }

    let done = 0;
    const started = Date.now();
    const worker = async () => {
      while (chunks.length > 0 && !failed) {
        const { format, keys } = chunks.shift();
        const texts = keys.map((k) => k.slice(format.length + 1));
        try {
          const out = await translateChunk(lang, format, texts);
          keys.forEach((k, i) => (dict[k] = out[i]));
          save(file, dict, used);
          done += keys.length;
          const secs = Math.round((Date.now() - started) / 1000);
          console.log(`[${lang}] ${done}/${missing.length} (${secs}s)`);
        } catch (err) {
          failed = true;
          console.error(`[${lang}] API error: ${err.message}. Progress so far is saved; run again to resume.`);
        }
      }
    };
    await Promise.all(Array.from({ length: MAX_PARALLEL }, worker));
    save(file, dict, used);
    if (failed) process.exit(1);
    console.log(`[${lang}] wrote ${path.relative(ROOT, file)}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
