/*
 * /api/commits
 *
 * Server-side proxy to GitHub that returns the most recent public
 * commits pushed by the configured user, flattened across repos. The
 * Changelog page reads from here so we can:
 *   - keep an optional GITHUB_TOKEN server-side (higher rate limit,
 *     never shipped to the browser), and
 *   - cache the upstream response in-memory so we stay well under
 *     GitHub's unauthenticated 60 req/hour-per-IP limit even with a
 *     few concurrent visitors.
 *
 * The route MUST be on-demand (prerender = false) so the env read is
 * evaluated at request time on Vercel, not baked in at build time.
 */
import type { APIRoute } from 'astro';
import { GITHUB_USERNAME } from '../../consts';

export const prerender = false;

// GitHub's public events feed surfaces PushEvents (recent commits)
// across all of a user's public repos in one call -- exactly the
// "recent activity" view we want, without enumerating every repo.
const EVENTS_URL = `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=100`;
const CACHE_TTL_MS = 5 * 60_000;
const MAX_COMMITS = 40;

type Commit = {
  sha: string;
  repo: string;
  /** First line of the commit message. */
  title: string;
  /** Everything after the first line, trimmed. May be empty. */
  description: string;
  url: string;
  date: string;
  author: string | null;
};

type Sanitized =
  | { ok: true; commits: Commit[] }
  | { ok: false; error: string };

type CachedResponse = { body: string; expires: number };
let cache: CachedResponse | null = null;

function sanitize(events: any): Sanitized {
  if (!Array.isArray(events)) return { ok: false, error: 'unexpected response' };

  const commits: Commit[] = [];
  for (const event of events) {
    if (event?.type !== 'PushEvent') continue;
    const repo: string | undefined = event.repo?.name;
    const date: string = event.created_at ?? '';
    // PushEvent payloads list commits oldest-first; reverse so the most
    // recent commit of each push shows up first.
    const pushed = Array.isArray(event.payload?.commits)
      ? [...event.payload.commits].reverse()
      : [];
    for (const c of pushed) {
      if (!c?.sha || !repo) continue;
      const message: string = typeof c.message === 'string' ? c.message : '';
      const newline = message.indexOf('\n');
      const title = newline === -1 ? message : message.slice(0, newline);
      const description = newline === -1 ? '' : message.slice(newline + 1).trim();
      commits.push({
        sha: c.sha,
        repo,
        title: title.trim() || '(no message)',
        description,
        url: `https://github.com/${repo}/commit/${c.sha}`,
        date,
        author: c.author?.name ?? null,
      });
      if (commits.length >= MAX_COMMITS) break;
    }
    if (commits.length >= MAX_COMMITS) break;
  }

  return { ok: true, commits };
}

export const GET: APIRoute = async () => {
  const now = Date.now();
  if (cache && cache.expires > now) {
    return new Response(cache.body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  // process.env is the source of truth for Vercel runtime env vars;
  // import.meta.env covers local `astro dev`. The token is optional --
  // unauthenticated requests work, just with a tighter rate limit.
  const token = process.env.GITHUB_TOKEN ?? import.meta.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': GITHUB_USERNAME,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(EVENTS_URL, { headers });
    if (!res.ok) {
      const body = JSON.stringify({ ok: false, error: `github ${res.status}` });
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const json = await res.json();
    const sanitized = sanitize(json);
    const body = JSON.stringify(sanitized);
    if (sanitized.ok) cache = { body, expires: now + CACHE_TTL_MS };
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    const body = JSON.stringify({ ok: false, error: 'fetch failed' });
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
