/*
 * /api/wakatime
 *
 * Server-side proxy to Wakatime so the API key never reaches the
 * browser. Caches the response in-memory for 60s, which is enough to
 * keep us well under Wakatime's free-tier rate limits even with a few
 * concurrent visitors. CodingActivity polls this every 60s as well.
 *
 * The route MUST be on-demand (prerender = false) so the env read is
 * evaluated at request time (Vercel injects dashboard env vars into
 * process.env for serverless functions), not baked in at build time.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const STATUS_BAR_URL = 'https://wakatime.com/api/v1/users/current/status_bar/today';
const CACHE_TTL_MS = 60_000;
// "active" means: last_heartbeat_at is within this many ms of now.
const ACTIVE_WINDOW_MS = 5 * 60_000;

type CachedResponse = { body: string; expires: number };
let cache: CachedResponse | null = null;

type Sanitized =
  | {
      ok: true;
      active: boolean;
      language: string | null;
      project: string | null;
      todayText: string | null;
      topLanguage: string | null;
      topProject: string | null;
    }
  | { ok: false; error: string };

function sanitize(raw: any): Sanitized {
  const data = raw?.data;
  if (!data) return { ok: false, error: 'no data' };

  const last = data.last_heartbeat_at ? Date.parse(data.last_heartbeat_at) : null;
  const active = !!last && Date.now() - last < ACTIVE_WINDOW_MS;

  const todayText = typeof data.grand_total?.text === 'string' ? data.grand_total.text : null;
  const topLanguage = data.languages?.[0]?.name ?? null;
  const topProject = data.projects?.[0]?.name ?? null;

  return {
    ok: true,
    active,
    language: active ? topLanguage : null,
    project: active ? topProject : null,
    todayText,
    topLanguage,
    topProject,
  };
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cache && cache.expires > now) {
    return new Response(cache.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  // process.env is the source of truth for Vercel runtime env vars
  // (set via the Vercel dashboard / `vercel env`). Falls back to
  // import.meta.env for local `astro dev`, which loads .env into Vite.
  const apiKey = process.env.WAKATIME_API_KEY ?? import.meta.env.WAKATIME_API_KEY;
  if (!apiKey) {
    const body = JSON.stringify({ ok: false, error: 'missing WAKATIME_API_KEY' });
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Wakatime accepts the API key as either a basic auth user or as
  // ?api_key=. Basic auth keeps it out of any access logs we don't
  // control on Wakatime's side.
  const auth = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');

  try {
    const res = await fetch(STATUS_BAR_URL, {
      headers: { Authorization: auth, Accept: 'application/json' },
    });
    if (!res.ok) {
      const body = JSON.stringify({ ok: false, error: `wakatime ${res.status}` });
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const json = await res.json();
    const sanitized = sanitize(json);
    const body = JSON.stringify(sanitized);
    cache = { body, expires: now + CACHE_TTL_MS };
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err) {
    const body = JSON.stringify({ ok: false, error: 'fetch failed' });
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
