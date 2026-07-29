/*
 * YouTubeFeed
 *
 * The whole /youtube page: a filterable grid of uploads (all / streams /
 * videos / shorts), a banner for anything live or premiering right now, and
 * a fullscreen lightbox for each thumbnail.
 *
 * Data comes from /api/youtube, which proxies the YouTube Data API v3 and
 * caches for 60s. We poll on the same 60s cadence so a stream going live
 * shows up within a minute. Comments are fetched lazily from
 * /api/youtube/comments only when the lightbox opens -- and never for
 * streams, which show description only.
 *
 * The lightbox follows the gallery's pattern (backdrop click, Escape, body
 * scroll lock) with a side panel added for the title, description and
 * comments.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  VideoCategory,
  YouTubeComment,
  YouTubeCommentsData,
  YouTubeFeedData,
  YouTubeVideo,
} from '../lib/youtube';

const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 12;

type Filter = 'all' | VideoCategory;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'all' },
  { key: 'streams', label: 'streams' },
  { key: 'videos', label: 'videos' },
  { key: 'shorts', label: 'shorts' },
];

type CommentState =
  | { status: 'loading' }
  | { status: 'disabled' }
  | { status: 'error'; error: string }
  | { status: 'ready'; comments: YouTubeComment[] };

function formatCount(n: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return `${(v < 10 ? v.toFixed(1) : Math.round(v).toString()).replace(/\.0$/, '')}K`;
  }
  const v = n / 1_000_000;
  return `${(v < 10 ? v.toFixed(1) : Math.round(v).toString()).replace(/\.0$/, '')}M`;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Relative for the first month, then a plain date -- "2 days ago" beats "Jan 3" when fresh. */
function timeAgo(iso: string): string {
  if (!iso) return '';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 60) return 'just now';
  const units: [number, string][] = [
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [604800, 'week'],
  ];
  for (let i = units.length - 1; i >= 0; i--) {
    const [size, name] = units[i];
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      if (name === 'week' && n > 4) break;
      return `${n} ${name}${n === 1 ? '' : 's'} ago`;
    }
  }
  return formatDate(iso);
}

/** "starts in 2h 15m" for a scheduled broadcast, or the date if it is further out. */
function startsIn(iso: string | null): string {
  if (!iso) return '';
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '';
  const diff = at - Date.now();
  if (diff <= 0) return 'starting now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `starts in ${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `starts in ${hours}h ${minutes % 60}m`;
  return `starts ${new Date(at).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function liveLabel(video: YouTubeVideo): string | null {
  switch (video.liveStatus) {
    case 'live':
      return 'live';
    case 'premiere':
      return 'premiere';
    case 'upcoming-stream':
      return 'scheduled';
    case 'upcoming-premiere':
      return 'premiere soon';
    default:
      return null;
  }
}

export default function YouTubeFeed() {
  const [data, setData] = useState<YouTubeFeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, CommentState>>({});
  const closeRef = useRef<HTMLButtonElement | null>(null);

  /* ---- Feed polling ---- */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/youtube', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const json: YouTubeFeedData = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          // Keep whatever we already rendered; a dropped poll shouldn't
          // blank the page out.
          setData((prev) => prev ?? { ok: false, error: 'unreachable' });
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

  const videos = data?.ok ? data.videos : [];
  const live = data?.ok ? data.live : [];
  const upcoming = data?.ok ? data.upcoming : [];

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: videos.length, streams: 0, videos: 0, shorts: 0 };
    for (const v of videos) c[v.category]++;
    return c;
  }, [videos]);

  const filtered = useMemo(
    () => (filter === 'all' ? videos : videos.filter((v) => v.category === filter)),
    [videos, filter],
  );

  const openVideo = openId ? (videos.find((v) => v.id === openId) ?? null) : null;
  const isOpen = openVideo !== null;
  const openKey = openVideo?.id ?? null;
  // "no comments if its a stream" -- archived and live broadcasts show
  // description only.
  const wantsComments = openVideo !== null && openVideo.category !== 'streams';

  /* ---- Lightbox: scroll lock, Escape, initial focus ---- */
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  /* ---- Comments, fetched only when a non-stream lightbox opens ---- */
  useEffect(() => {
    if (!openKey || !wantsComments) return;
    let cancelled = false;
    let stale = false;
    setComments((prev) => {
      if (prev[openKey]) {
        stale = true;
        return prev;
      }
      return { ...prev, [openKey]: { status: 'loading' } };
    });
    if (stale) return;

    (async () => {
      try {
        const res = await fetch(`/api/youtube/comments?id=${encodeURIComponent(openKey)}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(String(res.status));
        const json: YouTubeCommentsData = await res.json();
        if (cancelled) return;
        setComments((prev) => ({
          ...prev,
          [openKey]: json.ok
            ? json.disabled
              ? { status: 'disabled' }
              : { status: 'ready', comments: json.comments }
            : { status: 'error', error: json.error },
        }));
      } catch {
        if (!cancelled) {
          setComments((prev) => ({ ...prev, [openKey]: { status: 'error', error: 'unreachable' } }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openKey, wantsComments]);

  const selectFilter = useCallback((next: Filter) => {
    setFilter(next);
    setVisible(PAGE_SIZE);
  }, []);

  const shown = filtered.slice(0, visible);
  const commentState = openKey ? comments[openKey] : undefined;

  return (
    <div className="yt">
      {/* ---- Live / premiere banner ---- */}
      {live.map((v) => (
        <button
          key={`live-${v.id}`}
          type="button"
          className="banner"
          onClick={() => setOpenId(v.id)}
        >
          <img className="banner-thumb" src={v.thumbnail} alt="" loading="lazy" />
          <span className="banner-body">
            <span className="banner-tag">
              <span className="dot" aria-hidden="true" />
              {v.liveStatus === 'premiere' ? 'premiering now' : 'live now'}
            </span>
            <span className="banner-title">{v.title}</span>
            <span className="banner-meta">
              {v.concurrentViewers != null
                ? `${formatCount(v.concurrentViewers)} watching`
                : 'broadcasting'}
              {v.actualStartTime ? ` · started ${timeAgo(v.actualStartTime)}` : ''}
            </span>
          </span>
        </button>
      ))}

      {upcoming.length > 0 && (
        <p className="upcoming">
          {upcoming.map((v, i) => (
            <span key={v.id}>
              {i > 0 && <span className="sep"> · </span>}
              <span className="upcoming-tag">
                {v.liveStatus === 'upcoming-premiere' ? 'premiere' : 'stream'}
              </span>{' '}
              <button type="button" className="linkish" onClick={() => setOpenId(v.id)}>
                {v.title}
              </button>{' '}
              <span className="muted">{startsIn(v.scheduledStartTime)}</span>
            </span>
          ))}
        </p>
      )}

      {/* ---- Filters ---- */}
      <div className="filters" role="tablist" aria-label="Filter uploads">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={filter === key}
            className={`filter${filter === key ? ' active' : ''}`}
            onClick={() => selectFilter(key)}
          >
            {label}
            <span className="filter-count">{counts[key]}</span>
          </button>
        ))}
      </div>

      {/* ---- States ---- */}
      {loading && <p className="muted">loading uploads...</p>}

      {!loading && data && data.ok === false && (
        <p className="muted">couldn't load youtube right now ({data.error}).</p>
      )}

      {!loading && data?.ok && videos.length === 0 && (
        <p className="muted">no uploads to show yet.</p>
      )}

      {!loading && data?.ok && videos.length > 0 && filtered.length === 0 && (
        <p className="muted">nothing in this category yet.</p>
      )}

      {/* ---- Grid ---- */}
      {shown.length > 0 && (
        <ul className="grid" role="list">
          {shown.map((v) => {
            const badge = liveLabel(v);
            return (
              <li key={v.id} className="card">
                <button
                  type="button"
                  className="thumb-btn"
                  onClick={() => setOpenId(v.id)}
                  aria-label={`View ${v.title} full-size`}
                >
                  <img className="thumb" src={v.thumbnail} alt={v.title} loading="lazy" />
                  {badge && (
                    <span
                      className={`badge badge--${v.liveStatus === 'live' || v.liveStatus === 'premiere' ? 'live' : 'soon'}`}
                    >
                      {(v.liveStatus === 'live' || v.liveStatus === 'premiere') && (
                        <span className="dot" aria-hidden="true" />
                      )}
                      {badge}
                    </span>
                  )}
                  {!badge && v.durationText && (
                    <span className="duration">{v.durationText}</span>
                  )}
                </button>

                <div className="card-body">
                  <h3 className="card-title">{v.title}</h3>
                  <p className="card-meta">
                    <span className="chip">{v.category.replace(/s$/, '')}</span>
                    {v.views != null && <span>{formatCount(v.views)} views</span>}
                    {v.publishedAt && <span>{timeAgo(v.publishedAt)}</span>}
                  </p>
                  {v.description && <p className="card-desc">{v.description}</p>}
                  <div className="card-actions">
                    <button type="button" className="read-more" onClick={() => setOpenId(v.id)}>
                      read more
                    </button>
                    <a
                      className="watch"
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      watch on youtube &#8599;
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {filtered.length > visible && (
        <button type="button" className="more" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
          load more ({filtered.length - visible} left)
        </button>
      )}

      {/* ---- Lightbox ---- */}
      {openVideo && (
        <div
          className="lb"
          role="dialog"
          aria-modal="true"
          aria-label={openVideo.title}
        >
          <div className="lb-backdrop" onClick={() => setOpenId(null)} />
          <div className="lb-panel">
            <button
              ref={closeRef}
              type="button"
              className="lb-close"
              onClick={() => setOpenId(null)}
              aria-label="Close"
            >
              &times;
            </button>

            <div className="lb-media">
              <img className="lb-img" src={openVideo.thumbnailFull} alt={openVideo.title} />
              <a
                className="lb-watch"
                href={openVideo.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                watch on youtube &#8599;
              </a>
            </div>

            <aside className="lb-side">
              <h2 className="lb-title">{openVideo.title}</h2>
              <p className="lb-meta">
                <span className="chip">{openVideo.category.replace(/s$/, '')}</span>
                {liveLabel(openVideo) && (
                  <span className="chip chip--live">{liveLabel(openVideo)}</span>
                )}
                {openVideo.views != null && <span>{formatCount(openVideo.views)} views</span>}
                {openVideo.likes != null && <span>{formatCount(openVideo.likes)} likes</span>}
                {openVideo.durationText && <span>{openVideo.durationText}</span>}
                {openVideo.publishedAt && <span>{formatDate(openVideo.publishedAt)}</span>}
              </p>

              <div className="lb-section">
                <h3 className="lb-h3">description</h3>
                {openVideo.description ? (
                  <p className="lb-desc">{openVideo.description}</p>
                ) : (
                  <p className="muted">no description.</p>
                )}
              </div>

              {wantsComments && (
                <div className="lb-section">
                  <h3 className="lb-h3">comments</h3>
                  {(!commentState || commentState.status === 'loading') && (
                    <p className="muted">loading comments...</p>
                  )}
                  {commentState?.status === 'disabled' && (
                    <p className="muted">comments are turned off for this video.</p>
                  )}
                  {commentState?.status === 'error' && (
                    <p className="muted">couldn't load comments ({commentState.error}).</p>
                  )}
                  {commentState?.status === 'ready' && commentState.comments.length === 0 && (
                    <p className="muted">no comments yet.</p>
                  )}
                  {commentState?.status === 'ready' && commentState.comments.length > 0 && (
                    <ul className="comments" role="list">
                      {commentState.comments.map((c) => (
                        <li key={c.id} className="comment">
                          {c.avatar ? (
                            <img className="avatar" src={c.avatar} alt="" loading="lazy" />
                          ) : (
                            <span className="avatar avatar--blank" aria-hidden="true">
                              {c.author.replace(/^@/, '').charAt(0)}
                            </span>
                          )}
                          <div className="comment-body">
                            <p className="comment-head">
                              {c.authorUrl ? (
                                <a href={c.authorUrl} target="_blank" rel="noopener noreferrer">
                                  {c.author}
                                </a>
                              ) : (
                                <span>{c.author}</span>
                              )}
                              <span className="muted">{timeAgo(c.publishedAt)}</span>
                            </p>
                            <p className="comment-text">{c.text}</p>
                            <p className="comment-foot">
                              {c.likes > 0 && <span>{formatCount(c.likes)} likes</span>}
                              {c.replyCount > 0 && (
                                <span>
                                  {c.replyCount} {c.replyCount === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      )}

      <style>{`
        .yt { min-width: 0; }
        .muted {
          color: var(--color-muted);
          font-family: var(--font-mono);
          font-size: 0.85rem;
          margin: 0.5rem 0;
        }

        /* ---- Live banner ---- */
        .banner {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          width: 100%;
          margin-bottom: 1rem;
          padding: 0.7rem 0.9rem 0.7rem 0.7rem;
          text-align: left;
          font: inherit;
          color: inherit;
          cursor: pointer;
          border: 1px solid color-mix(in oklab, var(--color-accent) 55%, var(--color-border));
          border-radius: 12px;
          background: color-mix(in oklab, var(--color-accent) 10%, transparent);
          transition: border-color 0.2s, transform 0.2s;
        }
        .banner:hover,
        .banner:focus-visible {
          border-color: var(--color-accent);
          transform: translateY(-2px);
          outline: none;
        }
        .banner-thumb {
          width: 132px;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          border-radius: 8px;
          flex: none;
        }
        .banner-body { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .banner-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--color-accent);
        }
        .banner-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--color-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .banner-meta {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-muted);
        }
        .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: currentColor;
          animation: yt-pulse 1.6s ease-in-out infinite;
          flex: none;
        }
        @keyframes yt-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.7); }
        }

        .upcoming {
          margin: 0 0 1rem;
          font-size: 0.85rem;
          color: var(--color-muted);
        }
        .upcoming-tag {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .linkish {
          border: 0;
          background: none;
          padding: 0;
          font: inherit;
          color: var(--color-accent);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* ---- Filters ---- */
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin: 0 0 1.5rem;
        }
        .filter {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.8rem;
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: transparent;
          color: var(--color-muted);
          font-family: var(--font-mono);
          font-size: 0.82rem;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background-color 0.2s;
        }
        .filter:hover { color: var(--color-text); border-color: var(--color-accent); }
        .filter.active {
          color: var(--color-text);
          border-color: var(--color-accent);
          background: color-mix(in oklab, var(--color-accent) 15%, transparent);
        }
        .filter-count {
          font-size: 0.72rem;
          color: var(--color-muted);
          padding: 0.05rem 0.35rem;
          border-radius: 999px;
          background: color-mix(in oklab, var(--color-border) 70%, transparent);
        }

        /* ---- Grid ---- */
        .grid {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 1.25rem;
        }
        .card {
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
        }
        .thumb-btn {
          position: relative;
          display: block;
          width: 100%;
          padding: 0;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          overflow: hidden;
          background: color-mix(in oklab, var(--color-bg) 85%, var(--color-border));
          cursor: zoom-in;
          transition: border-color 0.2s, transform 0.2s;
        }
        .thumb-btn:hover,
        .thumb-btn:focus-visible {
          border-color: var(--color-accent);
          transform: translateY(-2px);
          outline: none;
        }
        .thumb {
          display: block;
          width: 100%;
          aspect-ratio: 16 / 9;
          object-fit: cover;
          background: var(--color-border);
        }
        .badge, .duration {
          position: absolute;
          right: 0.5rem;
          bottom: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          line-height: 1.5;
          color: #fff;
          background: color-mix(in oklab, #000 72%, transparent);
        }
        .badge--live { background: #d33; }
        .badge--soon { background: color-mix(in oklab, #000 72%, transparent); }

        .card-body { display: flex; flex-direction: column; gap: 0.35rem; min-width: 0; }
        .card-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          line-height: 1.35;
          color: var(--color-text);
        }
        .card-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--color-muted);
        }
        .chip {
          padding: 0.05rem 0.4rem;
          border: 1px solid var(--color-border);
          border-radius: 999px;
        }
        .chip--live {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        .card-desc {
          margin: 0.15rem 0 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--color-muted);
          white-space: pre-wrap;
          /* Clamp to a teaser; "read more" opens the full text. */
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.25rem;
        }
        .read-more {
          border: 0;
          background: none;
          padding: 0;
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--color-accent);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .watch {
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--color-muted);
          text-decoration: none;
        }
        .watch:hover { color: var(--color-accent); }

        .more {
          display: block;
          margin: 1.75rem auto 0;
          padding: 0.5rem 1.1rem;
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: transparent;
          color: var(--color-muted);
          font-family: var(--font-mono);
          font-size: 0.82rem;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .more:hover { border-color: var(--color-accent); color: var(--color-text); }

        /* ---- Lightbox ---- */
        .lb {
          position: fixed;
          inset: 0;
          /* Above the floating music player (z-index 1000). */
          z-index: 1100;
          display: grid;
          place-items: center;
          padding: 1.5rem;
        }
        .lb-backdrop {
          position: absolute;
          inset: 0;
          background: color-mix(in oklab, #000 78%, transparent);
          backdrop-filter: blur(4px);
          cursor: zoom-out;
        }
        .lb-panel {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.85fr);
          /* minmax(0, 1fr) + min-height:0 on the children: without both, the
             row is sized by the sidebar's full content, outgrows max-height
             and gets clipped -- so long comment threads become unscrollable. */
          grid-template-rows: minmax(0, 1fr);
          width: min(1180px, 100%);
          max-height: min(86vh, 100%);
          border: 1px solid var(--color-border);
          border-radius: 14px;
          overflow: hidden;
          background: var(--color-bg);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: yt-lb-in 0.18s ease-out;
        }
        @keyframes yt-lb-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .lb-close {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          z-index: 2;
          width: 2.1rem;
          height: 2.1rem;
          display: grid;
          place-items: center;
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: var(--color-bg);
          color: var(--color-text);
          font-size: 1.35rem;
          line-height: 1;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .lb-close:hover { border-color: var(--color-accent); transform: scale(1.05); }

        .lb-media {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          background: color-mix(in oklab, #000 88%, var(--color-bg));
        }
        .lb-img {
          display: block;
          max-width: 100%;
          max-height: 68vh;
          width: auto;
          height: auto;
          border-radius: 8px;
        }
        .lb-watch {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: #fff;
          text-decoration: none;
          padding: 0.35rem 0.8rem;
          border: 1px solid color-mix(in oklab, #fff 35%, transparent);
          border-radius: 999px;
        }
        .lb-watch:hover { border-color: #fff; }

        .lb-side {
          min-width: 0;
          min-height: 0;
          overflow-y: auto;
          padding: 1.25rem 1.25rem 1.5rem;
          border-left: 1px solid var(--color-border);
        }
        .lb-title {
          margin: 0 2rem 0.5rem 0;
          font-size: 1.15rem;
          font-weight: 600;
          line-height: 1.35;
          color: var(--color-text);
        }
        .lb-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.45rem;
          margin: 0 0 1rem;
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--color-muted);
        }
        .lb-section { margin-top: 1.25rem; }
        .lb-section:first-of-type { margin-top: 0; }
        .lb-h3 {
          margin: 0 0 0.5rem;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-muted);
        }
        .lb-desc {
          margin: 0;
          font-size: 0.88rem;
          line-height: 1.6;
          color: var(--color-text);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .comments { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; }
        /* Flex, not grid: the avatar is optional, and with implicit grid
           placement a missing one drops the body into the 28px column. */
        .comment { display: flex; gap: 0.6rem; }
        .avatar {
          flex: none;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          background: color-mix(in oklab, var(--color-border) 80%, transparent);
        }
        .avatar--blank {
          display: grid;
          place-items: center;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-muted);
          text-transform: uppercase;
        }
        .comment-body { flex: 1; min-width: 0; }
        .comment-head {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin: 0 0 0.2rem;
          font-size: 0.78rem;
          font-weight: 500;
        }
        .comment-head a { color: var(--color-text); text-decoration: none; }
        .comment-head a:hover { color: var(--color-accent); }
        .comment-head .muted { margin: 0; font-size: 0.72rem; font-weight: 400; }
        .comment-text {
          margin: 0;
          font-size: 0.85rem;
          line-height: 1.5;
          color: var(--color-text);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .comment-foot {
          display: flex;
          gap: 0.75rem;
          margin: 0.25rem 0 0;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-muted);
        }

        @media (max-width: 820px) {
          .card { grid-template-columns: 1fr; }
          .thumb-btn { max-width: 420px; }
          .lb { padding: 0.75rem; }
          /* Stacked: the panel itself scrolls, so the columns go back to
             natural height instead of each managing its own overflow. */
          .lb-panel {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto;
            max-height: 92vh;
            overflow-y: auto;
          }
          .lb-media { min-height: auto; }
          .lb-img { max-height: 42vh; }
          .lb-side {
            min-height: auto;
            overflow: visible;
            border-left: 0;
            border-top: 1px solid var(--color-border);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .banner, .thumb-btn, .lb-panel, .lb-close, .more, .filter, .dot {
            transition: none;
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
