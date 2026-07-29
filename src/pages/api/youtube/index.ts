/*
 * /api/youtube
 *
 * Server-side proxy to the YouTube Data API v3 that returns the channel's
 * uploads (streams, videos, shorts) plus whatever is live or premiering
 * right now. The API key stays server-side; the browser only ever sees the
 * sanitized payload below.
 *
 * ---- Quota ----
 * The default Data API allowance is 10,000 units/day, and the /youtube page
 * polls once a minute (1,440 refreshes/day), so every unit counts. This route
 * deliberately avoids search.list (100 units a call -- it would blow the whole
 * quota in ~100 refreshes) and instead walks the channel's uploads playlist:
 *
 *   channels.list       1 unit   cached CHANNEL_TTL_MS (rarely changes)
 *   playlistItems.list  1 unit   per 50 videos
 *   videos.list         1 unit   per 50 videos
 *
 * At MAX_VIDEOS = 100 that is 4 units per refresh => ~5,760 units/day, which
 * leaves comfortable headroom for /api/youtube/comments. Raising MAX_VIDEOS by
 * 50 costs another ~2,880 units/day, so bump it with that budget in mind.
 *
 * MUST be on-demand (prerender = false) so the env read happens at request
 * time on Vercel rather than being baked in at build time.
 */
import type { APIRoute } from 'astro';
import {
  YOUTUBE_CHANNEL_ID,
  YOUTUBE_HANDLE,
  YOUTUBE_TYPE_OVERRIDES,
} from '../../../consts';
import {
  formatDuration,
  jsonResponse,
  parseIsoDuration,
  YouTubeError,
  youtubeApiKey,
  ytFetch,
  type LiveStatus,
  type VideoCategory,
  type YouTubeChannel,
  type YouTubeFeedData,
  type YouTubeVideo,
} from '../../../lib/youtube';

export const prerender = false;

/** Newest N uploads to expose. See the quota note above before raising this. */
const MAX_VIDEOS = 100;
const PAGE_SIZE = 50;

const LIST_TTL_MS = 60_000;
const CHANNEL_TTL_MS = 12 * 60 * 60_000;

/** YouTube caps Shorts at 3 minutes; probe anything at or under that. */
const SHORT_MAX_SECONDS = 185;
/** Fallback cutoff when the /shorts probe is unavailable. */
const SHORT_FALLBACK_SECONDS = 60;
/** Bound the added latency of probing uncached candidates on a cold start. */
const MAX_SHORT_PROBES_PER_REFRESH = 25;

/** Descriptions are capped at YouTube's own 5,000-character limit. */
const MAX_DESCRIPTION = 5000;

type CachedResponse = { body: string; expires: number };
let listCache: CachedResponse | null = null;

type ChannelInfo = { channel: YouTubeChannel; uploadsPlaylistId: string };
let channelCache: { info: ChannelInfo; expires: number } | null = null;

/**
 * Shorts vs. regular video: the Data API exposes no flag for it, so we ask
 * youtube.com directly -- /shorts/<id> answers 200 for a real Short and
 * 303s to /watch for anything else. Results never change for a given video,
 * so they are memoised for the life of the serverless instance.
 *
 * Two things this has to get right:
 *   - Consent regions (most of the EU) bounce every request to
 *     consent.youtube.com, which would look like "redirected, so not a
 *     Short" and quietly mislabel every Short. The consent cookies below
 *     opt out of that interstitial.
 *   - Anything we can't read confidently returns null rather than a guess,
 *     so categorise() falls back to the duration heuristic instead of
 *     trusting a redirect we didn't understand.
 */
const shortsCache = new Map<string, boolean>();

const PROBE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';
const PROBE_COOKIE = 'CONSENT=YES+1; SOCS=CAI';

async function probeShort(id: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': PROBE_UA,
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: PROBE_COOKIE,
      },
    });

    if (res.status === 200) return true;

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location') ?? '';
      // Only a bounce to the regular watch page proves it isn't a Short.
      // A consent (or any other) redirect tells us nothing.
      if (/^https?:\/\/(www\.)?youtube\.com\/watch/i.test(location)) return false;
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

async function resolveChannel(key: string): Promise<ChannelInfo> {
  const now = Date.now();
  if (channelCache && channelCache.expires > now) return channelCache.info;

  const params: Record<string, string> = { part: 'snippet,contentDetails' };
  if (YOUTUBE_CHANNEL_ID) params.id = YOUTUBE_CHANNEL_ID;
  else params.forHandle = `@${YOUTUBE_HANDLE}`;

  const json = await ytFetch<any>('channels', params, key);
  const item = json?.items?.[0];
  if (!item) throw new YouTubeError('channel not found', 404, 'channelNotFound');

  const uploadsPlaylistId: string | undefined = item.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new YouTubeError('no uploads playlist', 404, 'noUploads');

  const info: ChannelInfo = {
    channel: {
      title: item.snippet?.title ?? YOUTUBE_HANDLE,
      handle: `@${YOUTUBE_HANDLE}`,
      url: `https://www.youtube.com/@${YOUTUBE_HANDLE}`,
      avatar:
        item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
    },
    uploadsPlaylistId,
  };

  channelCache = { info, expires: now + CHANNEL_TTL_MS };
  return info;
}

async function fetchUploadIds(playlistId: string, key: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  while (ids.length < MAX_VIDEOS) {
    const params: Record<string, string> = {
      part: 'contentDetails',
      playlistId,
      maxResults: String(Math.min(PAGE_SIZE, MAX_VIDEOS - ids.length)),
    };
    if (pageToken) params.pageToken = pageToken;

    const json = await ytFetch<any>('playlistItems', params, key);
    for (const item of json?.items ?? []) {
      const id = item?.contentDetails?.videoId;
      if (typeof id === 'string' && id.length > 0) ids.push(id);
    }

    pageToken = json?.nextPageToken;
    if (!pageToken) break;
  }

  return ids;
}

async function fetchVideoDetails(ids: string[], key: string): Promise<any[]> {
  const items: any[] = [];
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const chunk = ids.slice(i, i + PAGE_SIZE);
    const json = await ytFetch<any>(
      'videos',
      {
        part: 'snippet,contentDetails,statistics,liveStreamingDetails',
        id: chunk.join(','),
        maxResults: String(PAGE_SIZE),
      },
      key,
    );
    items.push(...(json?.items ?? []));
  }
  return items;
}

function pickThumbnails(thumbs: any): { thumbnail: string; thumbnailFull: string } {
  const grid = thumbs?.medium?.url ?? thumbs?.high?.url ?? thumbs?.default?.url ?? '';
  const full =
    thumbs?.maxres?.url ?? thumbs?.standard?.url ?? thumbs?.high?.url ?? grid;
  return { thumbnail: grid, thumbnailFull: full };
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Live vs. premiere, resolved from the pair of fields YouTube actually keeps
 * consistent while a broadcast runs: `liveBroadcastContent` says whether it is
 * on air, and `duration` is "P0D" (0s) for a real stream but the finished
 * runtime for a premiere -- because a premiere is a pre-recorded upload.
 */
function liveStatusOf(broadcast: string, duration: number): LiveStatus | null {
  if (broadcast === 'live') return duration > 0 ? 'premiere' : 'live';
  if (broadcast === 'upcoming') return duration > 0 ? 'upcoming-premiere' : 'upcoming-stream';
  return null;
}

/**
 * Once a broadcast ends, YouTube keeps liveStreamingDetails on both archived
 * streams and finished premieres with no field that separates them, so
 * archives default to "streams". Use YOUTUBE_TYPE_OVERRIDES in consts.ts to
 * move a specific video (e.g. an old premiere) into the right bucket.
 */
function categorise(
  id: string,
  duration: number,
  hasBroadcastDetails: boolean,
  liveStatus: LiveStatus | null,
  short: boolean | null,
): VideoCategory {
  const override = YOUTUBE_TYPE_OVERRIDES[id];
  if (override === 'stream') return 'streams';
  if (override === 'video') return 'videos';
  if (override === 'short') return 'shorts';

  const isShort =
    short === null ? duration > 0 && duration <= SHORT_FALLBACK_SECONDS : short;
  if (isShort) return 'shorts';

  if (liveStatus === 'live' || liveStatus === 'upcoming-stream') return 'streams';
  if (liveStatus === 'premiere' || liveStatus === 'upcoming-premiere') return 'videos';
  return hasBroadcastDetails ? 'streams' : 'videos';
}

async function buildVideos(items: any[]): Promise<YouTubeVideo[]> {
  // Probe Shorts candidates first so categorise() can run synchronously.
  let budget = MAX_SHORT_PROBES_PER_REFRESH;
  const probes = new Map<string, Promise<boolean | null>>();
  for (const item of items) {
    const id: string = item?.id ?? '';
    const duration = parseIsoDuration(item?.contentDetails?.duration);
    if (!id || duration <= 0 || duration > SHORT_MAX_SECONDS) continue;
    if (shortsCache.has(id) || probes.has(id)) continue;
    if (budget-- <= 0) break;
    probes.set(
      id,
      probeShort(id).then((result) => {
        if (result !== null) shortsCache.set(id, result);
        return result;
      }),
    );
  }
  await Promise.all(probes.values());

  const videos: YouTubeVideo[] = [];
  for (const item of items) {
    const id: string = item?.id ?? '';
    if (!id) continue;

    const snippet = item.snippet ?? {};
    const live = item.liveStreamingDetails ?? null;
    const duration = parseIsoDuration(item?.contentDetails?.duration);
    const broadcast: string =
      typeof snippet.liveBroadcastContent === 'string' ? snippet.liveBroadcastContent : 'none';
    const liveStatus = liveStatusOf(broadcast, duration);
    const { thumbnail, thumbnailFull } = pickThumbnails(snippet.thumbnails);

    const category = categorise(
      id,
      duration,
      Boolean(live?.actualStartTime),
      liveStatus,
      shortsCache.get(id) ?? null,
    );

    videos.push({
      id,
      title: typeof snippet.title === 'string' ? snippet.title : 'untitled',
      description:
        typeof snippet.description === 'string'
          ? snippet.description.slice(0, MAX_DESCRIPTION)
          : '',
      publishedAt: snippet.publishedAt ?? '',
      url:
        category === 'shorts'
          ? `https://www.youtube.com/shorts/${id}`
          : `https://www.youtube.com/watch?v=${id}`,
      thumbnail,
      thumbnailFull,
      duration,
      durationText: formatDuration(duration),
      views: toNumber(item.statistics?.viewCount),
      likes: toNumber(item.statistics?.likeCount),
      category,
      liveStatus,
      scheduledStartTime: live?.scheduledStartTime ?? null,
      actualStartTime: live?.actualStartTime ?? null,
      concurrentViewers: toNumber(live?.concurrentViewers),
    });
  }

  // playlistItems is already newest-first, but videos.list does not promise an
  // order, so sort explicitly.
  videos.sort((a, b) => Date.parse(b.publishedAt || '0') - Date.parse(a.publishedAt || '0'));
  return videos;
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (listCache && listCache.expires > now) return new Response(listCache.body, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

  const key = youtubeApiKey();
  if (!key) {
    return jsonResponse({ ok: false, error: 'missing YOUTUBE_API_KEY' } satisfies YouTubeFeedData);
  }

  try {
    const { channel, uploadsPlaylistId } = await resolveChannel(key);
    const ids = await fetchUploadIds(uploadsPlaylistId, key);
    const items = ids.length > 0 ? await fetchVideoDetails(ids, key) : [];
    const videos = await buildVideos(items);

    const payload: YouTubeFeedData = {
      ok: true,
      channel,
      videos,
      live: videos.filter((v) => v.liveStatus === 'live' || v.liveStatus === 'premiere'),
      upcoming: videos.filter(
        (v) => v.liveStatus === 'upcoming-stream' || v.liveStatus === 'upcoming-premiere',
      ),
      fetchedAt: now,
    };

    const body = JSON.stringify(payload);
    listCache = { body, expires: now + LIST_TTL_MS };
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const error =
      err instanceof YouTubeError
        ? err.reason === 'quotaExceeded'
          ? 'daily youtube quota exceeded'
          : err.message
        : 'fetch failed';
    // Serve the last good payload rather than an empty page when a refresh
    // fails (quota blips, transient 5xx). Keep it briefly so we retry soon.
    if (listCache) {
      listCache = { body: listCache.body, expires: now + 15_000 };
      return new Response(listCache.body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
    return jsonResponse({ ok: false, error } satisfies YouTubeFeedData);
  }
};
