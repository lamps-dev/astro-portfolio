/*
 * NowWatching
 *
 * Reads from /api/yt-now, which is fed by the yt-scrobbler browser
 * extension. Polls every 20 seconds — the extension heartbeats every
 * 30s while a video is playing, and the API treats data older than 60s
 * as stale.
 */
import { useEffect, useState } from 'react';

type YtNowData =
  | {
      ok: true;
      active: boolean;
      state: 'playing' | 'paused' | 'stopped';
      source: 'youtube' | 'music' | null;
      title: string | null;
      channel: string | null;
      url: string | null;
      videoId: string | null;
    }
  | { ok: false };

const POLL_INTERVAL_MS = 20_000;

export default function NowWatching() {
  const [data, setData] = useState<YtNowData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/yt-now');
        if (!res.ok) throw new Error(String(res.status));
        const json: YtNowData = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setData({ ok: false });
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

  const playing = !loading && data?.ok && data.state === 'playing';
  const paused = !loading && data?.ok && data.state === 'paused';
  const sourceLabel = data?.ok && data.source === 'music' ? 'youtube music' : 'youtube';

  return (
    <div className="now-watching" role="status" aria-live="polite">
      <div className="head">
        <span className="who">watching</span>
        {playing && <span className="live" />}
      </div>

      {loading && <p className="muted">checking...</p>}

      {!loading && data && data.ok === false && (
        <p className="muted">scrobbler offline</p>
      )}

      {!loading && data?.ok && data.state === 'stopped' && (
        <p className="muted">not watching anything right now</p>
      )}

      {!loading && data?.ok && (playing || paused) && (
        <div className="line">
          <span className="label">
            {paused ? 'paused on' : 'on'} {sourceLabel}
          </span>
          {data.url ? (
            <a className="title" href={data.url} target="_blank" rel="noopener noreferrer">
              {data.title ?? 'unknown'}
            </a>
          ) : (
            <span className="title">{data.title ?? 'unknown'}</span>
          )}
          {data.channel && <span className="sub">{data.channel}</span>}
        </div>
      )}

      <style>{`
        .now-watching {
          padding: 0.75rem 0.9rem;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: color-mix(in oklab, var(--color-bg) 85%, var(--color-border));
          min-width: 0;
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
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .label {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-muted);
          text-transform: lowercase;
        }
        .title {
          font-size: 0.92rem;
          font-weight: 500;
          color: var(--color-text);
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        a.title:hover {
          color: var(--color-accent);
        }
        .sub {
          font-size: 0.8rem;
          color: var(--color-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .muted {
          color: var(--color-muted);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
