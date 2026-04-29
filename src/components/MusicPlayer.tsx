import { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';

type Playlist = { songs: string[] };

const PLAYLIST_URL = '/files/assets/songs/playlist.json';
const SONG_BASE = '/files/assets/songs/';
const DEFAULT_VOLUME = 0.1;

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
  const [songs, setSongs] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);

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

  // Try autoplay when a track is loaded. Browsers will block this if
  // there's been no user interaction yet, so we surface a "click to play"
  // affordance when that happens.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.volume = DEFAULT_VOLUME;
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.then(() => setBlocked(false)).catch(() => setBlocked(true));
    }
  }, [current]);

  const next = () => {
    setCurrent((prev) => pickRandom(songs, prev ?? undefined));
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

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  if (!current) return null;

  return (
    <div className={`music-player ${blocked ? 'blocked' : ''}`}>
      <audio
        ref={audioRef}
        src={`${SONG_BASE}${current}`}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={next}
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
      <button
        className="mp-btn"
        type="button"
        onClick={toggleMute}
        aria-label={muted ? 'unmute' : 'mute'}
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
      <span className="mp-track" title={current}>
        {current.replace(/\.[^.]+$/, '')}
      </span>
      <style>{`
        .music-player {
          position: fixed;
          right: 1rem;
          bottom: 1rem;
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
        .mp-track {
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}
