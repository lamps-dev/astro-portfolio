/*
 * Shared helpers for the YouTube Data API v3 routes under /api/youtube.
 *
 * The API key is server-side only (never prefixed with PUBLIC_) and is read
 * at request time so Vercel dashboard changes take effect without a rebuild.
 */

const API_BASE = 'https://www.googleapis.com/youtube/v3';

/** Reads the key from process.env (Vercel) or import.meta.env (astro dev). */
export function youtubeApiKey(): string | null {
  const key = process.env.YOUTUBE_API_KEY ?? import.meta.env.YOUTUBE_API_KEY;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/** Carries Google's machine-readable `reason` so callers can branch on it. */
export class YouTubeError extends Error {
  reason: string | null;
  status: number;

  constructor(message: string, status: number, reason: string | null) {
    super(message);
    this.name = 'YouTubeError';
    this.status = status;
    this.reason = reason;
  }
}

export async function ytFetch<T>(
  endpoint: string,
  params: Record<string, string>,
  key: string,
): Promise<T> {
  const url = new URL(`${API_BASE}/${endpoint}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('key', key);

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const json: any = await res.json().catch(() => null);

  if (!res.ok) {
    const reason: string | null = json?.error?.errors?.[0]?.reason ?? null;
    throw new YouTubeError(
      `youtube ${res.status}${reason ? ` (${reason})` : ''}`,
      res.status,
      reason,
    );
  }
  return json as T;
}

/**
 * ISO 8601 duration -> seconds. YouTube reports "P0D" for a broadcast that is
 * still in progress, which parses to 0 -- that zero is load-bearing, see the
 * live/premiere split in /api/youtube.
 */
export function parseIsoDuration(iso: string | null | undefined): number {
  if (typeof iso !== 'string') return 0;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(min ?? 0) * 60 +
    Math.round(Number(s ?? 0))
  );
}

/** 3725 -> "1:02:05", 95 -> "1:35". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/* ---- Shapes shared by the API routes and the YouTubeFeed component ---- */

export type VideoCategory = 'streams' | 'videos' | 'shorts';
export type LiveStatus = 'live' | 'premiere' | 'upcoming-stream' | 'upcoming-premiere';

export type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  url: string;
  /** Grid-sized thumbnail. */
  thumbnail: string;
  /** Largest thumbnail available, used by the lightbox. */
  thumbnailFull: string;
  /** Seconds. 0 while a broadcast is still in progress. */
  duration: number;
  durationText: string;
  views: number | null;
  likes: number | null;
  category: VideoCategory;
  /** Null for anything that is not live, premiering, or scheduled. */
  liveStatus: LiveStatus | null;
  scheduledStartTime: string | null;
  actualStartTime: string | null;
  concurrentViewers: number | null;
};

export type YouTubeChannel = {
  title: string;
  handle: string;
  url: string;
  avatar: string | null;
};

export type YouTubeFeedData =
  | {
      ok: true;
      channel: YouTubeChannel;
      videos: YouTubeVideo[];
      /** Currently broadcasting -- drives the banner on /youtube. */
      live: YouTubeVideo[];
      /** Scheduled but not started yet. */
      upcoming: YouTubeVideo[];
      fetchedAt: number;
    }
  | { ok: false; error: string };

export type YouTubeComment = {
  id: string;
  author: string;
  authorUrl: string | null;
  avatar: string | null;
  text: string;
  likes: number;
  replyCount: number;
  publishedAt: string;
};

export type YouTubeCommentsData =
  | { ok: true; disabled: false; comments: YouTubeComment[] }
  | { ok: true; disabled: true; comments: [] }
  | { ok: false; error: string };

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
