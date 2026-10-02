import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_LANG, LANG_EVENT, UPDATE_EVENT, getLang, translateText, type Lang } from './index';

// Bumped whenever translations land, so islands re-render with them.
let version = 0;

function subscribe(onChange: () => void) {
  const bump = () => {
    version++;
    onChange();
  };
  window.addEventListener(LANG_EVENT, bump);
  window.addEventListener(UPDATE_EVENT, bump);
  return () => {
    window.removeEventListener(LANG_EVENT, bump);
    window.removeEventListener(UPDATE_EVENT, bump);
  };
}

const snapshot = () => `${getLang()}:${version}`;
const serverSnapshot = () => `${DEFAULT_LANG}:0`;

export type Vars = Record<string, string | number>;
export type Translate = (english: string, vars?: Vars) => string;

/**
 * Translate a template, not the filled-in string, so "{time} elapsed" is one
 * API call rather than one per second. Named placeholders become {0}, {1}...
 * because the API translates words like {time} but leaves numbers alone.
 */
function translateTemplate(lang: Lang, english: string, vars?: Vars): string {
  const names: string[] = [];
  const template = english.replace(/\{(\w+)\}/g, (m, k: string) => {
    if (!vars || !(k in vars)) return m;
    if (!names.includes(k)) names.push(k);
    return `{${names.indexOf(k)}}`;
  });
  const fill = (str: string) => str.replace(/\{(\d+)\}/g, (m, i) => (i < names.length ? String(vars![names[i]]) : m));
  const out = translateText(lang, template);
  // If the translation lost a placeholder, the English is better than a gap.
  const intact = names.every((_, i) => out.includes(`{${i}}`));
  return fill(intact ? out : template);
}

/**
 * `t(english, vars?)` for React islands. Returns the cached translation, or the
 * English text while the API works on it (the island re-renders when it lands).
 * The server snapshot is always English, so hydration matches the SSR markup.
 */
export function useT() {
  const snap = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const lang = snap.split(':')[0] as Lang;
  const t: Translate = useCallback(
    (english: string, vars?: Vars) => translateTemplate(lang, english, vars),
    // `snap` changes when new translations arrive, which must refresh `t`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap],
  );
  return { t, lang };
}
