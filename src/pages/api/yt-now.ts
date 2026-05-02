/*
 * /api/yt-now
 *
 * Receives YouTube watch state from the yt-scrobbler browser extension
 * and returns the latest payload to the /now widget.
 *
 * State lives in module-level memory: serverless instances are short-lived
 * and the data is heartbeat-driven (every 30s while playing), so a cold
 * start just shows "nothing playing" until the next POST. Persistence
 * across instances would need KV/Redis; not worth it for a personal site.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

const ACTIVE_WINDOW_MS = 60_000;

type Payload = {
  source: 'youtube' | 'music';
  state: 'playing' | 'paused' | 'stopped';
  videoId: string | null;
  url: string | null;
  title: string | null;
  channel: string | null;
  currentTime: number | null;
  duration: number | null;
  ts: number;
};

let latest: Payload | null = null;

function clean(s: unknown, max: number): string | null {
  return typeof s === 'string' && s.length > 0 ? s.slice(0, max) : null;
}

function num(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
}

export const POST: APIRoute = async ({ request }) => {
  const expected = process.env.YT_NOW_SECRET ?? import.meta.env.YT_NOW_SECRET;
  if (expected) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${expected}`) {
      return new Response('unauthorized', { status: 401 });
    }
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return new Response('bad payload', { status: 400 });
  }

  const state = ['playing', 'paused', 'stopped'].includes(body.state) ? body.state : 'stopped';
  const source = body.source === 'music' ? 'music' : 'youtube';

  latest = {
    source,
    state,
    videoId: clean(body.videoId, 32),
    url: clean(body.url, 256),
    title: clean(body.title, 300),
    channel: clean(body.channel, 200),
    currentTime: num(body.currentTime),
    duration: num(body.duration),
    ts: typeof body.ts === 'number' ? body.ts : Date.now(),
  };

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const GET: APIRoute = async () => {
  if (!latest) {
    return new Response(
      JSON.stringify({ ok: true, active: false, state: 'stopped' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      },
    );
  }

  const fresh = Date.now() - latest.ts < ACTIVE_WINDOW_MS;
  const active = fresh && latest.state === 'playing';
  const visible = fresh && latest.state !== 'stopped';

  return new Response(
    JSON.stringify({
      ok: true,
      active,
      state: visible ? latest.state : 'stopped',
      source: visible ? latest.source : null,
      title: visible ? latest.title : null,
      channel: visible ? latest.channel : null,
      url: visible ? latest.url : null,
      videoId: visible ? latest.videoId : null,
      currentTime: visible ? latest.currentTime : null,
      duration: visible ? latest.duration : null,
      // capturedAt: when the extension recorded this position. Lets the
      // client interpolate elapsed playback locally between polls so
      // the time bar advances smoothly without spamming the API.
      capturedAt: visible ? latest.ts : null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    },
  );
};
