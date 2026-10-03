// Translation backends, tried in order: DeepL, then Google Cloud Translation,
// then Google's keyless web endpoint. Shared by the /api/translate route and
// scripts/translate.mjs so both pick providers the same way.
//
// Keys come from the environment (never shipped to the browser):
//   DEEPL_API_KEY             DeepL API (Free keys end in ":fx")
//   GOOGLE_TRANSLATE_API_KEY  Google Cloud Translation v2, optional
// A provider without a key is skipped. The keyless endpoint needs nothing,
// but it is undocumented and can be rate-limited, so it only runs last.

/** @typedef {'text' | 'html'} Format */
/** @typedef {{ DEEPL_API_KEY?: string, GOOGLE_TRANSLATE_API_KEY?: string }} Env */

const TIMEOUT_MS = 60_000;
// DeepL accepts at most 50 texts per request.
const DEEPL_MAX_TEXTS = 50;

async function postJson(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = json?.message ?? json?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(reason);
  }
  return json;
}

/** @param {string[]} texts @param {string} target @param {Format} format @param {string} key */
async function deepl(texts, target, format, key) {
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  const out = [];
  for (let i = 0; i < texts.length; i += DEEPL_MAX_TEXTS) {
    const json = await postJson(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `DeepL-Auth-Key ${key}` },
      body: JSON.stringify({
        text: texts.slice(i, i + DEEPL_MAX_TEXTS),
        source_lang: 'EN',
        target_lang: target.toUpperCase(),
        ...(format === 'html' ? { tag_handling: 'html' } : {}),
      }),
    });
    out.push(...(json?.translations ?? []).map((t) => t.text));
  }
  return out;
}

/** @param {string[]} texts @param {string} target @param {Format} format @param {string} key */
async function googleCloud(texts, target, format, key) {
  const json = await postJson(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source: 'en', target, format }),
    },
  );
  return (json?.data?.translations ?? []).map((t) => t.translatedText);
}

const tagCount = (s) => (s.match(/<[^>]+>/g) ?? []).length;

/** @param {string[]} texts @param {string} target @param {Format} format */
async function googleWeb(texts, target, format) {
  return Promise.all(
    texts.map(async (text) => {
      const url =
        'https://translate.googleapis.com/translate_a/single?client=gtx&dt=t' +
        `&sl=en&tl=${encodeURIComponent(target)}&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const translated = (json?.[0] ?? []).map((part) => part?.[0] ?? '').join('');
      // This endpoint has no HTML mode; refuse output that lost markup.
      if (format === 'html' && tagCount(translated) !== tagCount(text)) {
        throw new Error('markup was not preserved');
      }
      return translated;
    }),
  );
}

/**
 * Translate English `texts` into `target`, falling through the providers.
 * @param {string[]} texts
 * @param {{ target: string, format: Format, env: Env }} opts
 * @returns {Promise<{ translations: string[], provider: string }>}
 */
export async function translateBatch(texts, { target, format, env }) {
  /** @type {[string, () => Promise<string[]>][]} */
  const chain = [];
  if (env.DEEPL_API_KEY) chain.push(['deepl', () => deepl(texts, target, format, env.DEEPL_API_KEY)]);
  if (env.GOOGLE_TRANSLATE_API_KEY) {
    chain.push(['google-cloud', () => googleCloud(texts, target, format, env.GOOGLE_TRANSLATE_API_KEY)]);
  }
  chain.push(['google-web', () => googleWeb(texts, target, format)]);

  const errors = [];
  for (const [provider, run] of chain) {
    try {
      const translations = await run();
      if (translations.length !== texts.length || translations.some((t) => typeof t !== 'string')) {
        throw new Error('unexpected response length');
      }
      return { translations, provider };
    } catch (err) {
      errors.push(`${provider}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  throw new Error(`every translation provider failed (${errors.join('; ')})`);
}
