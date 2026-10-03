/*
 * /api/translate
 *
 * Live translation for strings missing from the pre-translated JSON (see
 * src/i18n/index.ts). Same request/response shape the old LibreTranslate
 * endpoint used, so the client only changed its URL:
 *   POST { q: string[], source: 'en', target: 'fr', format: 'text' | 'html' }
 *   200  { translatedText: string[], provider: string }
 *
 * Providers and keys live in src/i18n/providers.mjs. The keys stay here on
 * the server. Requests are capped in size and limited to the site's own
 * languages so the endpoint can't be used to drain the DeepL quota.
 *
 * The route MUST be on-demand (prerender = false) so the env read happens at
 * request time on Vercel, not at build time.
 */
import type { APIRoute } from 'astro';
import { DEFAULT_LANG, LANGUAGES } from '../../i18n';
import { translateBatch } from '../../i18n/providers.mjs';
import { jsonResponse } from '../../lib/youtube';

export const prerender = false;

const MAX_TEXTS = 50;
const MAX_CHARS = 8_000;

const env = (name: 'DEEPL_API_KEY' | 'GOOGLE_TRANSLATE_API_KEY') =>
  process.env[name] ?? import.meta.env[name];

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const q: unknown = body?.q;
  const texts = Array.isArray(q) ? q : [q];
  const target = body?.target;
  const format = body?.format === 'html' ? 'html' : 'text';

  if (texts.length === 0 || texts.some((t) => typeof t !== 'string')) {
    return jsonResponse({ error: 'q must be a string or a list of strings' }, 400);
  }
  if (typeof target !== 'string' || target === DEFAULT_LANG || !(target in LANGUAGES)) {
    return jsonResponse({ error: 'unsupported target language' }, 400);
  }
  const chars = (texts as string[]).reduce((n, t) => n + t.length, 0);
  if (texts.length > MAX_TEXTS || chars > MAX_CHARS) {
    return jsonResponse({ error: 'request too large' }, 413);
  }

  try {
    const { translations, provider } = await translateBatch(texts as string[], {
      target,
      format,
      env: { DEEPL_API_KEY: env('DEEPL_API_KEY'), GOOGLE_TRANSLATE_API_KEY: env('GOOGLE_TRANSLATE_API_KEY') },
    });
    return jsonResponse({ translatedText: translations, provider });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
};
