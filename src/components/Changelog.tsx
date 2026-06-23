/*
 * Changelog
 *
 * Renders recent public GitHub commits from /api/commits (which proxies
 * GitHub server-side). Each entry is a clickable row; expanding it shows
 * the full commit description and a link to the commit on GitHub.
 */
import { useEffect, useState } from 'react';

type Commit = {
  sha: string;
  repo: string;
  title: string;
  description: string;
  url: string;
  date: string;
  author: string | null;
};

type CommitsData =
  | { ok: true; commits: Commit[] }
  | { ok: false; error: string };

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Changelog() {
  const [data, setData] = useState<CommitsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/commits', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json: CommitsData = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setData({ ok: false, error: 'unreachable' });
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="changelog">
      {loading && <p className="muted">loading recent commits...</p>}

      {!loading && data && data.ok === false && (
        <p className="muted">couldn't load commits right now.</p>
      )}

      {!loading && data && data.ok && data.commits.length === 0 && (
        <p className="muted">no recent commits to show.</p>
      )}

      {!loading && data && data.ok && data.commits.length > 0 && (
        <ul className="list">
          {data.commits.map((c) => {
            const id = `${c.repo}@${c.sha}`;
            const isOpen = open === id;
            return (
              <li key={id} className={`item${isOpen ? ' open' : ''}`}>
                <button
                  type="button"
                  className="row"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : id)}
                >
                  <span className="caret" aria-hidden="true">
                    {isOpen ? '−' : '+'}
                  </span>
                  <span className="main">
                    <span className="title">{c.title}</span>
                    <span className="meta">
                      <span className="sha">{c.sha.slice(0, 7)}</span>
                      {c.date && (
                        <>
                          <span className="sep">·</span>
                          <span className="date">{formatDate(c.date)}</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="detail">
                    {c.description ? (
                      <pre className="description">{c.description}</pre>
                    ) : (
                      <p className="no-desc">No additional description.</p>
                    )}
                    <a
                      className="commit-link"
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View commit on GitHub ↗
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <style>{`
        .changelog {
          margin-top: 0.5rem;
        }
        .muted {
          color: var(--color-muted);
          font-size: 0.9rem;
        }
        .list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .item {
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: color-mix(in oklab, var(--color-bg) 92%, var(--color-border));
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .item:hover {
          border-color: color-mix(in oklab, var(--color-accent) 45%, var(--color-border));
        }
        .item.open {
          border-color: color-mix(in oklab, var(--color-accent) 55%, var(--color-border));
        }
        .row {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.75rem 0.9rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          color: var(--color-text);
          font: inherit;
        }
        .caret {
          font-family: var(--font-mono);
          font-size: 1rem;
          line-height: 1.4;
          color: var(--color-accent);
          width: 1ch;
          flex-shrink: 0;
        }
        .main {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }
        .title {
          font-size: 0.95rem;
          color: var(--color-text);
          word-break: break-word;
        }
        .meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.4rem;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--color-muted);
        }
        .sha {
          color: var(--color-accent);
        }
        .sep {
          opacity: 0.5;
        }
        .detail {
          padding: 0 0.9rem 0.85rem 2.1rem;
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }
        .description {
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--color-text);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .no-desc {
          margin: 0;
          font-size: 0.85rem;
          font-style: italic;
          color: var(--color-muted);
        }
        .commit-link {
          align-self: flex-start;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--color-accent);
          text-decoration: none;
          padding: 0.35rem 0.6rem;
          border: 1px solid color-mix(in oklab, var(--color-accent) 40%, var(--color-border));
          border-radius: 8px;
          transition: background-color 0.15s, border-color 0.15s;
          word-break: break-all;
        }
        .commit-link:hover {
          background: color-mix(in oklab, var(--color-accent) 12%, transparent);
          border-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}
