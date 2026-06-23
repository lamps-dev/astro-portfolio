/*
 * /api/commits
 *
 * Server-side proxy to GitHub that returns the most recent commits for
 * the configured repository. The Changelog page reads from here so we
 * can:
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
import { GITHUB_REPO, GITHUB_USERNAME } from '../../consts';

export const prerender = false;

const MAX_COMMITS = 40;
const COMMITS_URL = `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=${MAX_COMMITS}`;
const CACHE_TTL_MS = 5 * 60_000;

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

function sanitize(raw: any): Sanitized {
  if (!Array.isArray(raw)) return { ok: false, error: 'unexpected response' };

  const commits: Commit[] = [];
  for (const c of raw) {
    if (!c?.sha) continue;
    const message: string = typeof c.commit?.message === 'string' ? c.commit.message : '';
    const newline = message.indexOf('\n');
    const title = newline === -1 ? message : message.slice(0, newline);
    const description = newline === -1 ? '' : message.slice(newline + 1).trim();
    commits.push({
      sha: c.sha,
      repo: GITHUB_REPO,
      title: title.trim() || '(no message)',
      description,
      url: c.html_url ?? `https://github.com/${GITHUB_REPO}/commit/${c.sha}`,
      date: c.commit?.author?.date ?? c.commit?.committer?.date ?? '',
      author: c.commit?.author?.name ?? c.author?.login ?? null,
    });
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
    const res = await fetch(COMMITS_URL, { headers });
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
