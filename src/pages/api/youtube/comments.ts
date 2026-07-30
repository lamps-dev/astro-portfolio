/*
 * /api/youtube/comments?id=<videoId>
 *
 * Top-level comments for one video, fetched on demand when the lightbox on
 * /youtube opens. Kept out of /api/youtube so the once-a-minute feed poll
 * never pays for comments nobody looked at.
 *
 * commentThreads.list costs 1 quota unit per call and results are cached per
 * video for COMMENTS_TTL_MS, so browsing the grid stays cheap.
 */
import type { APIRoute } from 'astro';
import {
  describeYouTubeError,
  jsonResponse,
  YouTubeError,
  youtubeApiKey,
  ytFetch,
  type YouTubeComment,
  type YouTubeCommentsData,
} from '../../../lib/youtube';

export const prerender = false;

const MAX_COMMENTS = 20;
const COMMENTS_TTL_MS = 5 * 60_000;
/** Bound in-memory growth; oldest entry is evicted past this. */
const MAX_CACHE_ENTRIES = 60;
const MAX_COMMENT_LENGTH = 2000;

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const cache = new Map<string, { body: string; expires: number }>();

function readCache(id: string): string | null {
  const hit = cache.get(id);
  if (!hit) return null;
  if (hit.expires <= Date.now()) {
    cache.delete(id);
    return null;
  }
  return hit.body;
}

function writeCache(id: string, body: string): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(id, { body, expires: Date.now() + COMMENTS_TTL_MS });
}

/**
 * The API only returns `textOriginal` to the comment's own author, so with a
 * plain API key we get `textDisplay`, which is HTML. Flatten it to text here
 * rather than shipping markup the client would have to dangerously render.
 */
function htmlToText(html: unknown): string {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_COMMENT_LENGTH);
}

function sanitize(raw: any): YouTubeComment[] {
  const comments: YouTubeComment[] = [];
  for (const thread of raw?.items ?? []) {
    const top = thread?.snippet?.topLevelComment;
    const s = top?.snippet;
    if (!top?.id || !s) continue;

    const text = htmlToText(s.textDisplay);
    if (!text) continue;

    comments.push({
      id: top.id,
      author: typeof s.authorDisplayName === 'string' ? s.authorDisplayName : 'unknown',
      authorUrl: typeof s.authorChannelUrl === 'string' ? s.authorChannelUrl : null,
      avatar: typeof s.authorProfileImageUrl === 'string' ? s.authorProfileImageUrl : null,
      text,
      likes: Number.isFinite(s.likeCount) ? s.likeCount : 0,
      replyCount: Number.isFinite(thread.snippet?.totalReplyCount)
        ? thread.snippet.totalReplyCount
        : 0,
      publishedAt: typeof s.publishedAt === 'string' ? s.publishedAt : '',
    });
  }
  return comments;
}

export const GET: APIRoute = async ({ url }) => {
  const id = url.searchParams.get('id') ?? '';
  if (!VIDEO_ID_RE.test(id)) {
    return jsonResponse({ ok: false, error: 'bad video id' } satisfies YouTubeCommentsData, 400);
  }

  const cached = readCache(id);
  if (cached) {
    return new Response(cached, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const key = youtubeApiKey();
  if (!key) {
    return jsonResponse({
      ok: false,
      error: 'missing YOUTUBE_API_KEY',
    } satisfies YouTubeCommentsData);
  }

  try {
    const json = await ytFetch<any>(
      'commentThreads',
      {
        part: 'snippet',
        videoId: id,
        maxResults: String(MAX_COMMENTS),
        order: 'relevance',
        textFormat: 'html',
      },
      key,
    );

    const body = JSON.stringify({
      ok: true,
      disabled: false,
      comments: sanitize(json),
    } satisfies YouTubeCommentsData);
    writeCache(id, body);
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    // Comments turned off is a normal state, not an error -- cache it so we
    // stop asking, and let the UI say so plainly.
    if (err instanceof YouTubeError && err.reason === 'commentsDisabled') {
      const body = JSON.stringify({
        ok: true,
        disabled: true,
        comments: [],
      } satisfies YouTubeCommentsData);
      writeCache(id, body);
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    return jsonResponse({
      ok: false,
      error: describeYouTubeError(err),
    } satisfies YouTubeCommentsData);
  }
};
