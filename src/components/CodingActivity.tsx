/*
 * CodingActivity
 *
 * Reads from /api/wakatime (which proxies Wakatime server-side so the
 * API key never reaches the browser). Polls every 60 seconds.
 */
import { useEffect, useState } from 'react';

type WakatimeData = {
  ok: true;
  active: boolean;
  language: string | null;
  project: string | null;
  todayText: string | null;
  topLanguage: string | null;
  topProject: string | null;
} | { ok: false; error: string };

const POLL_INTERVAL_MS = 60_000;

export default function CodingActivity() {
  const [data, setData] = useState<WakatimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/wakatime');
        if (!res.ok) throw new Error(String(res.status));
        const json: WakatimeData = await res.json();
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
    };
    load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="coding-activity" role="status" aria-live="polite">
      <div className="head">
        <span className="who">coding</span>
        {!loading && data?.ok && <span className="live" />}
      </div>

      {loading && <p className="muted">checking wakatime...</p>}

      {!loading && data && data.ok === false && (
        <p className="muted">wakatime not configured</p>
      )}

      {!loading && data && data.ok && !data.active && (
        <p className="muted">not coding right now</p>
      )}

      {!loading && data && data.ok && data.active && (
        <div className="line">
          <span className="title">
            {data.language ?? 'something'}
            {data.project && (
              <span className="muted-inline"> - {data.project}</span>
            )}
          </span>
        </div>
      )}

      {!loading && data && data.ok && (
        <ul className="stats">
          {data.todayText && (
            <li>
              <span className="k">today</span>
              <span className="v">{data.todayText}</span>
            </li>
          )}
          {data.topLanguage && (
            <li>
              <span className="k">top lang</span>
              <span className="v">{data.topLanguage}</span>
            </li>
          )}
          {data.topProject && (
            <li>
              <span className="k">top project</span>
              <span className="v">{data.topProject}</span>
            </li>
          )}
        </ul>
      )}

      <style>{`
        .coding-activity {
          padding: 0.75rem 0.9rem;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: color-mix(in oklab, var(--color-bg) 85%, var(--color-border));
        }
        .head {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.4rem;
        }
        .who {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-muted);
        }
        .live {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--color-accent);
          animation: pulse 1.6s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        .line {
          margin-bottom: 0.4rem;
        }
        .title {
          font-size: 0.92rem;
          color: var(--color-text);
        }
        .muted, .muted-inline {
          color: var(--color-muted);
          font-size: 0.85rem;
        }
        .muted { margin: 0; }
        .stats {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.4rem 1rem;
        }
        .stats li {
          display: flex;
          flex-direction: column;
        }
        .k {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-muted);
        }
        .v {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
}
