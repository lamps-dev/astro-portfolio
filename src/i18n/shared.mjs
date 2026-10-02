// Shared between the browser runtime (src/i18n/index.ts) and the
// pre-translation script (scripts/translate.mjs). Both must build the exact
// same cache keys, or pre-translated strings would never be found.

/** @typedef {'text' | 'html'} Format */

/**
 * @param {Format} format
 * @param {string} text
 */
export const cacheKey = (format, text) => `${format}:${text}`;

/**
 * What gets sent to the API for a data-i18n element: whitespace collapsed,
 * Astro's scope (and dev-only source) attributes dropped so the key is the
 * same in dev and prod.
 * @param {string} html
 */
export function sourceHtml(html) {
  return html
    .replace(/\s+data-astro-(cid|source)-[\w-]+(="[^"]*")?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Turn "{time} elapsed" into "{0} elapsed". The API translates placeholder
 * names like {time} but leaves numbers alone, so templates are sent numbered.
 * Only names in `vars` are converted (all of them when `vars` is omitted).
 * @param {string} english
 * @param {Record<string, unknown>} [vars]
 * @returns {{ template: string, names: string[] }}
 */
export function toTemplate(english, vars) {
  /** @type {string[]} */
  const names = [];
  const template = english.replace(/\{(\w+)\}/g, (m, k) => {
    if (vars && !(k in vars)) return m;
    if (!names.includes(k)) names.push(k);
    return `{${names.indexOf(k)}}`;
  });
  return { template, names };
}
