/*
 * DiscordPresence
 *
 * Pulls live Discord presence from Lanyard's websocket
 * (wss://api.lanyard.rest/socket). Lanyard is a free public service
 * with no auth, but the user (Discord ID below) MUST be a member of
 * the Lanyard Discord server (discord.gg/lanyard) for any data to
 * come through. If Lanyard is unreachable or the user isn't a member,
 * the component falls back to a quiet "offline" pill.
 */
import { useEffect, useRef, useState } from 'react';

const DISCORD_USER_ID = '1056952213056004118';
const LANYARD_WS = 'wss://api.lanyard.rest/socket';

type DiscordStatus = 'online' | 'idle' | 'dnd' | 'offline';

type Activity = {
  id?: string;
  name: string;
  type: number; // 0 game, 1 streaming, 2 listening, 3 watching, 4 custom, 5 competing
  state?: string;
  details?: string;
  application_id?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  timestamps?: { start?: number; end?: number };
  sync_id?: string;
};

type LanyardPayload = {
  discord_status: DiscordStatus;
  activities: Activity[];
  listening_to_spotify?: boolean;
  spotify?: {
    track_id: string;
    song: string;
    artist: string;
    album: string;
    album_art_url: string;
    timestamps: { start: number; end: number };
  } | null;
};

type WsMessage =
  | { op: 1; d: { heartbeat_interval: number } }
  | { op: 0; t: string; d: LanyardPayload };

function statusColor(status: DiscordStatus): string {
  switch (status) {
    case 'online':
      return '#3ba55d';
    case 'idle':
      return '#faa81a';
    case 'dnd':
      return '#ed4245';
    default:
      return '#747f8d';
  }
}

function discordCdn(applicationId: string | undefined, asset: string | undefined) {
  if (!asset) return null;
  if (asset.startsWith('mp:external/')) {
    // External proxied asset (e.g. Spotify album art via Discord).
    return `https://media.discordapp.net/${asset.replace('mp:', '')}`;
  }
  if (!applicationId) return null;
  return `https://cdn.discordapp.com/app-assets/${applicationId}/${asset}.png`;
}

function elapsed(startMs: number) {
  const total = Math.max(0, Date.now() - startMs);
  const s = Math.floor(total / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function DiscordPresence() {
  const [data, setData] = useState<LanyardPayload | null>(null);
  const [connected, setConnected] = useState(false);
  const [, forceTick] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<number | null>(null);

  // Re-render once a second so elapsed timers stay live.
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let closed = false;
    let retryTimer: number | null = null;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(LANYARD_WS);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);
          if (msg.op === 1) {
            // Initial hello: subscribe + start heartbeat.
            ws.send(
              JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_USER_ID } }),
            );
            const interval = msg.d.heartbeat_interval;
            heartbeatRef.current = window.setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ op: 3 }));
              }
            }, interval);
          } else if (msg.op === 0) {
            setData(msg.d);
            setConnected(true);
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
        if (!closed) {
          retryTimer = window.setTimeout(connect, 5000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      wsRef.current?.close();
    };
  }, []);

  const status: DiscordStatus = data?.discord_status ?? 'offline';
  const activities = data?.activities ?? [];
  const custom = activities.find((a) => a.type === 4);
  const game = activities.find((a) => a.type === 0);
  const listening = activities.find((a) => a.type === 2);
  const spotify = data?.spotify;

  let content: React.ReactNode = <span className="muted">offline</span>;
  let albumArt: string | null = null;

  if (status !== 'offline') {
    if (spotify) {
      albumArt = spotify.album_art_url;
      content = (
        <div className="line">
          <span className="label">listening</span>
          <span className="title">{spotify.song}</span>
          <span className="sub">by {spotify.artist}</span>
        </div>
      );
    } else if (game) {
      const start = game.timestamps?.start;
      const art = discordCdn(game.application_id, game.assets?.large_image);
      if (art) albumArt = art;
      content = (
        <div className="line">
          <span className="label">{game.type === 0 ? 'playing' : 'doing'}</span>
          <span className="title">{game.name}</span>
          {(game.details || game.state) && (
            <span className="sub">
              {[game.details, game.state].filter(Boolean).join(' - ')}
            </span>
          )}
          {start && <span className="time">{elapsed(start)} elapsed</span>}
        </div>
      );
    } else if (listening) {
      content = (
        <div className="line">
          <span className="label">listening</span>
          <span className="title">{listening.name}</span>
        </div>
      );
    } else if (custom) {
      content = (
        <div className="line">
          <span className="label">status</span>
          <span className="title">{custom.state || custom.name}</span>
        </div>
      );
    } else {
      content = <span className="muted">{status}</span>;
    }
  }

  return (
    <div className="discord-presence" role="status" aria-live="polite">
      <div className="avatar-slot" style={{ background: albumArt ? 'transparent' : 'var(--color-border)' }}>
        {albumArt && <img src={albumArt} alt="" />}
        <span className="dot" style={{ background: statusColor(status) }} />
      </div>
      <div className="meta">
        <div className="head">
          <span className="who">discord</span>
          {connected && <span className="live" aria-label="connected" />}
        </div>
        {content}
      </div>
      <style>{`
        .discord-presence {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          padding: 0.75rem 0.9rem;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          background: color-mix(in oklab, var(--color-bg) 85%, var(--color-border));
        }
        .avatar-slot {
          position: relative;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          overflow: visible;
          flex-shrink: 0;
        }
        .avatar-slot img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          display: block;
        }
        .dot {
          position: absolute;
          right: -3px;
          bottom: -3px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--color-bg);
        }
        .meta {
          flex: 1;
          min-width: 0;
        }
        .head {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 0.2rem;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sub {
          font-size: 0.8rem;
          color: var(--color-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .time {
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-muted);
          margin-top: 0.15rem;
        }
        .muted {
          color: var(--color-muted);
          font-family: var(--font-mono);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
