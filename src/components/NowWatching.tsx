/*
 * NowWatching
 *
 * Reads from /api/yt-now, which is fed by the yt-scrobbler browser
 * extension. Polls every 3s for state changes; a separate 1s tick
 * advances the time bar via client-side interpolation between server
 * updates so the bar moves smoothly without thrashing the API.
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
      currentTime: number | null;
      duration: number | null;
      capturedAt: number | null;
    }
  | { ok: false };

const POLL_INTERVAL_MS = 3_000;
const TICK_INTERVAL_MS = 1_000;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? m.toString().padStart(2, '0') : m.toString();
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function NowWatching() {
  const [data, setData] = useState<YtNowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/yt-now', { cache: 'no-store' });
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

  useEffect(() => {
    const id = window.setInterval(() => tick((n) => n + 1), TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const playing = !loading && data?.ok && data.state === 'playing';
  const paused = !loading && data?.ok && data.state === 'paused';
  const sourceLabel = data?.ok && data.source === 'music' ? 'youtube music' : 'youtube';

  let liveTime: number | null = null;
  let duration: number | null = null;
  let pct = 0;
  if (data?.ok && (playing || paused) && data.currentTime != null) {
    duration = data.duration;
    if (playing && data.capturedAt) {
      const elapsed = Math.max(0, (Date.now() - data.capturedAt) / 1000);
      liveTime = data.currentTime + elapsed;
    } else {
      liveTime = data.currentTime;
    }
    if (duration && duration > 0) {
      liveTime = Math.min(liveTime, duration);
      pct = Math.max(0, Math.min(100, (liveTime / duration) * 100));
    }
  }

  return (
    <div className="now-watching" role="status" aria-live="polite">
      <div className="head">
        <span className="who">watching</span>
        {playing && <span className="live" />}
        {paused && (
          <span className="pause" aria-label="paused" title="paused">
            <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
              <rect x="2" y="2" width="3" height="8" rx="0.6" />
              <rect x="7" y="2" width="3" height="8" rx="0.6" />
            </svg>
          </span>
        )}
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

          {liveTime != null && (
            <div className={`progress ${paused ? 'is-paused' : ''}`}>
              <div className="bar" aria-hidden="true">
                <div className="fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="times">
                <span>{formatTime(liveTime)}</span>
                <span>{duration && duration > 0 ? formatTime(duration) : '--:--'}</span>
              </div>
            </div>
          )}
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
        .pause {
          display: inline-flex;
          align-items: center;
          color: var(--color-muted);
          fill: currentColor;
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
        .progress {
          margin-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .bar {
          position: relative;
          width: 100%;
          height: 4px;
          border-radius: 999px;
          background: color-mix(in oklab, var(--color-border) 70%, transparent);
          overflow: hidden;
        }
        .fill {
          height: 100%;
          background: var(--color-accent);
          border-radius: 999px;
          transition: width 1s linear;
        }
        .progress.is-paused .fill {
          background: var(--color-muted);
          transition: none;
        }
        .times {
          display: flex;
          justify-content: space-between;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}
