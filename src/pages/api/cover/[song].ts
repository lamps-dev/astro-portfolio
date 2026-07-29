/*
 * /api/cover/[song]
 *
 * Extracts the embedded cover art (ID3v2 APIC frame) from an mp3 in
 * /public/files/assets/songs and serves it as an image. The music player
 * reads from here to show the current track's artwork.
 *
 * Why fetch-then-parse instead of reading from disk: on Vercel the mp3s are
 * static CDN assets and are NOT bundled into this function's filesystem, so
 * process.cwd() reads would 404 in production. Instead we fetch the song from
 * its own public URL and stream-parse only enough bytes to reach the tag
 * (skipPostHeaders + duration:false keep it from downloading the whole file).
 *
 * Must be on-demand so it runs at request time on Vercel.
 */
import type { APIRoute } from 'astro';
import { parseWebStream } from 'music-metadata';

export const prerender = false;

const SONG_BASE = '/files/assets/songs/';

// Cache extracted covers per song for the life of the (warm) function so
// repeated requests don't re-fetch and re-parse the mp3. `null` records
// "parsed, but this track has no cover" so we don't retry those either.
type Cover = { data: Uint8Array; type: string } | null;
const cache = new Map<string, Cover>();

export const GET: APIRoute = async ({ params, request }) => {
  const song = params.song ?? '';

  // Only plain "<name>.mp3" filenames — no path separators / traversal.
  if (!/^[^/\\]+\.mp3$/i.test(song)) {
    return new Response('bad request', { status: 400 });
  }

  if (cache.has(song)) {
    const hit = cache.get(song)!;
    return hit ? imageResponse(hit) : new Response('no cover', { status: 404 });
  }

  const fileUrl = new URL(SONG_BASE + encodeURIComponent(song), request.url);

  let body: ReadableStream<Uint8Array> | null = null;
  try {
    const res = await fetch(fileUrl);
    if (!res.ok || !res.body) return new Response('not found', { status: 404 });
    body = res.body;

    const size = Number(res.headers.get('content-length')) || undefined;
    const metadata = await parseWebStream(
      res.body,
      { mimeType: 'audio/mpeg', size },
      { duration: false, skipPostHeaders: true },
    );

    const pic = metadata.common.picture?.[0];
    if (!pic) {
      cache.set(song, null);
      return new Response('no cover', { status: 404 });
    }

    const cover: Cover = {
      data: pic.data instanceof Uint8Array ? pic.data : new Uint8Array(pic.data),
      type: pic.format || 'image/jpeg',
    };
    cache.set(song, cover);
    return imageResponse(cover);
  } catch {
    return new Response('error reading cover', { status: 500 });
  } finally {
    // Stop downloading the rest of the mp3 once we have the tag.
    try { await body?.cancel(); } catch {}
  }
};

function imageResponse(cover: NonNullable<Cover>): Response {
  return new Response(cover.data, {
    headers: {
      'Content-Type': cover.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
