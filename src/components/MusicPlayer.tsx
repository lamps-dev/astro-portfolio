import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';

type Playlist = { songs: string[] };

const PLAYLIST_URL = '/files/assets/songs/playlist.json';
const SONG_BASE = '/files/assets/songs/';
const DEFAULT_VOLUME = 0.1;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function pickRandom(list: string[], avoid?: string) {
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  let pick = list[Math.floor(Math.random() * list.length)];
  // Avoid replaying the exact same track twice in a row when possible.
  let safety = 0;
  while (pick === avoid && safety++ < 5) {
    pick = list[Math.floor(Math.random() * list.length)];
  }
  return pick;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const [songs, setSongs] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [showVolume, setShowVolume] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Cover art for the current track (served by /api/cover). Hidden when the
  // mp3 has no embedded artwork (the endpoint 404s and the <img> errors).
  const [coverOk, setCoverOk] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Muting is purely a function of the slider being at 0 — dragging down to
  // 0% mutes, raising it again unmutes.
  const muted = volume === 0;

  useEffect(() => {
    let cancelled = false;
    fetch(PLAYLIST_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Playlist) => {
        if (cancelled) return;
        const list = Array.isArray(data?.songs) ? data.songs : [];
        setSongs(list);
        const first = pickRandom(list);
        if (first) setCurrent(first);
      })
      .catch(() => {
        // Playlist missing or malformed: silently disable. The widget
        // simply won't appear since current stays null.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the audio element's volume in sync with the slider. `current` is a
  // dependency so the volume is (re)applied when the <audio> element first
  // mounts — otherwise it would play at the browser default of 100%.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume, current]);

  // Reset cover state whenever the track changes so the new track's art is
  // attempted afresh (and any open fullscreen view is closed).
  useEffect(() => {
    setCoverOk(false);
    setZoomed(false);
  }, [current]);

  // Close the fullscreen cover on Escape.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoomed]);

  // Try autoplay when a track is loaded. Browsers will block this if
  // there's been no user interaction yet, so we surface a "click to play"
  // affordance when that happens.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    setCurrentTime(0);
    setDuration(0);
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.then(() => setBlocked(false)).catch(() => setBlocked(true));
    }
  }, [current]);

  // Dismiss the volume popup when clicking anywhere outside of it.
  useEffect(() => {
    if (!showVolume) return;
    const onDocClick = (e: MouseEvent) => {
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolume(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showVolume]);

  const next = () => {
    setCurrent((prev) => pickRandom(songs, prev ?? undefined));
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = value;
    setCurrentTime(value);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    } else {
      audio.pause();
    }
  };

  if (!current) return null;

  const pct = Math.round(volume * 100);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = muted ? VolumeX : volume <= 0.5 ? Volume1 : Volume2;
  const coverUrl = `/api/cover/${encodeURIComponent(current)}`;
  const trackName = current.replace(/\.[^.]+$/, '');

  return (
    <div className={`music-player ${blocked ? 'blocked' : ''}`}>
      {/* Cover art lives outside the flow when hidden (no embedded art) so the
          pill keeps its shape. The <img> is always rendered so onLoad/onError
          can decide visibility; the wrapper is collapsed until it loads. */}
      <button
        type="button"
        className={`mp-cover ${coverOk ? 'is-visible' : ''}`}
        onClick={() => coverOk && setZoomed(true)}
        aria-label="view cover art"
        tabIndex={coverOk ? 0 : -1}
      >
        <img
          src={coverUrl}
          alt={coverOk ? `${trackName} cover art` : ''}
          onLoad={() => setCoverOk(true)}
          onError={() => setCoverOk(false)}
          draggable={false}
        />
      </button>
      <audio
        ref={audioRef}
        src={`${SONG_BASE}${current}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={next}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        preload="auto"
      />
      <button
        className="mp-btn"
        type="button"
        onClick={toggle}
        aria-label={playing ? 'pause music' : 'play music'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <button className="mp-btn" type="button" onClick={next} aria-label="skip song">
        <SkipForward size={14} />
      </button>
      <div className="mp-volume" ref={volumeRef}>
        <button
          className="mp-btn"
          type="button"
          onClick={() => setShowVolume((v) => !v)}
          aria-label="volume"
          aria-expanded={showVolume}
        >
          <VolumeIcon size={14} />
        </button>
        {showVolume && (
          <div className="mp-volume-popup" role="group" aria-label="volume control">
            <input
              className="mp-range"
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="volume"
              style={{
                background: `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-border) ${pct}%)`,
              }}
            />
            <span className="mp-vol-label">{pct}%</span>
          </div>
        )}
      </div>
      <div className="mp-meta">
        <span className="mp-track" title={current}>
          {current.replace(/\.[^.]+$/, '')}
        </span>
        <div className="mp-progress">
          <input
            className="mp-seek"
            type="range"
            min={0}
            max={duration || 0}
            step="any"
            value={Math.min(currentTime, duration || 0)}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="seek"
            style={{
              background: `linear-gradient(to right, var(--color-accent) ${progressPct}%, var(--color-border) ${progressPct}%)`,
            }}
          />
          <span className="mp-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
      {/* Rendered to <body> via a portal: the player pill uses backdrop-filter,
          which makes it a containing block for position:fixed children, so an
          in-place overlay would be trapped inside the pill instead of covering
          the viewport. */}
      {zoomed && coverOk && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="mp-cover-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`${trackName} cover art`}
            onClick={() => setZoomed(false)}
          >
            <figure className="mp-cover-figure" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="mp-cover-close"
                onClick={() => setZoomed(false)}
                aria-label="close"
              >
                &times;
              </button>
              <img src={coverUrl} alt={`${trackName} cover art`} draggable={false} />
              <figcaption>{trackName}</figcaption>
            </figure>
          </div>,
          document.body,
        )}
      <style>{`
        .music-player {
          position: fixed;
          right: calc(1rem + env(safe-area-inset-right, 0px));
          bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.6rem;
          background: color-mix(in oklab, var(--color-bg) 85%, transparent);
          border: 1px solid var(--color-border);
          border-radius: 999px;
          backdrop-filter: blur(10px);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-muted);
          max-width: 280px;
        }
        .music-player.blocked::after {
          content: 'click play';
          color: var(--color-accent);
          margin-left: 0.25rem;
        }
        /* Cover art box: collapsed to zero width until the image loads so the
           pill stays compact for tracks without embedded artwork. */
        .mp-cover {
          flex: 0 0 auto;
          width: 0;
          height: 30px;
          padding: 0;
          border: none;
          border-radius: 8px;
          overflow: hidden;
          background: none;
          cursor: pointer;
          opacity: 0;
          transition: width 0.2s ease, opacity 0.2s ease, transform 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .mp-cover.is-visible {
          width: 30px;
          opacity: 1;
        }
        .mp-cover.is-visible:hover {
          transform: scale(1.05);
        }
        .mp-cover img {
          width: 30px;
          height: 30px;
          object-fit: cover;
          display: block;
          border-radius: 8px;
          border: 1px solid var(--color-border);
        }
        .mp-cover-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 1.5rem;
          background: color-mix(in oklab, #000 78%, transparent);
          backdrop-filter: blur(4px);
          cursor: zoom-out;
          animation: mp-fade 0.18s ease-out;
        }
        @keyframes mp-fade { from { opacity: 0; } to { opacity: 1; } }
        .mp-cover-figure {
          position: relative;
          margin: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: auto;
        }
        .mp-cover-figure img {
          max-width: min(90vw, 560px);
          max-height: 80vh;
          width: auto;
          height: auto;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .mp-cover-figure figcaption {
          color: #fff;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          text-align: center;
          max-width: 80vw;
        }
        .mp-cover-close {
          position: absolute;
          top: -0.75rem;
          right: -0.75rem;
          width: 2.1rem;
          height: 2.1rem;
          display: grid;
          place-items: center;
          border: 1px solid var(--color-border);
          border-radius: 999px;
          background: var(--color-bg);
          color: var(--color-text);
          font-size: 1.3rem;
          line-height: 1;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .mp-cover-close:hover {
          border-color: var(--color-accent);
          transform: scale(1.05);
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-cover, .mp-cover-overlay, .mp-cover-close { transition: none; animation: none; }
        }
        .mp-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--color-text);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          transition: background-color 0.15s;
        }
        .mp-btn:hover {
          background: var(--color-border);
        }
        .mp-volume {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .mp-volume-popup {
          position: absolute;
          bottom: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 0.6rem;
          background: color-mix(in oklab, var(--color-bg) 92%, transparent);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          backdrop-filter: blur(10px);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
        }
        .mp-range {
          -webkit-appearance: none;
          appearance: none;
          width: 90px;
          height: 4px;
          border-radius: 999px;
          background: var(--color-border);
          cursor: pointer;
          outline: none;
        }
        .mp-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-accent);
          border: none;
          cursor: pointer;
        }
        .mp-range::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--color-accent);
          border: none;
          cursor: pointer;
        }
        .mp-vol-label {
          font-size: 0.65rem;
          color: var(--color-muted);
          min-width: 3ch;
          text-align: right;
        }
        .mp-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
        }
        .mp-track {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-muted);
        }
        .mp-progress {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .mp-seek {
          -webkit-appearance: none;
          appearance: none;
          width: 140px;
          height: 3px;
          border-radius: 999px;
          background: var(--color-border);
          cursor: pointer;
          outline: none;
        }
        .mp-seek::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-accent);
          border: none;
          cursor: pointer;
        }
        .mp-seek::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--color-accent);
          border: none;
          cursor: pointer;
        }
        .mp-time {
          font-size: 0.6rem;
          color: var(--color-muted);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
        }
        /* Mobile: hug the right edge and stay clear of the bottom-left
           cookie-settings button. Pinning max-width to the viewport keeps the
           player's left edge at a fixed ~80px, so the two never collide, and
           the inner track/seek flex down to fit the narrower box. */
        @media (max-width: 600px) {
          .music-player {
            max-width: calc(100vw - 96px);
            gap: 0.25rem;
            padding: 0.35rem 0.5rem;
          }
          .mp-meta {
            flex: 1 1 auto;
          }
          .mp-track {
            max-width: none;
          }
          .mp-seek {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
