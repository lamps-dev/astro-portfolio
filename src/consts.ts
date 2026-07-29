export const AGE = 13;
export const SITE_TITLE = 'Lamp';
export const SITE_DESCRIPTION = `Lamp's Portfolio. I'm ${AGE}, and I code things.`;
export const SITE_URL = 'https://lamps-dev.dev';

/** GitHub handle used for the live changelog feed (/api/commits). */
export const GITHUB_USERNAME = 'lamps-dev';

/** "owner/repo" the changelog pulls its commits from. */
export const GITHUB_REPO = 'lamps-dev/astro-portfolio';
export const GALLERY_GITHUB_REPO = 'lamps-dev/portfolio-gallery';

/** YouTube handle (no leading @) the /youtube page pulls uploads from. */
export const YOUTUBE_HANDLE = 'ilovelampadaire';

/**
 * Optional channel ID (UC...). Set it to skip the handle lookup in
 * /api/youtube; leave empty to resolve YOUTUBE_HANDLE at runtime.
 */
export const YOUTUBE_CHANNEL_ID = '';

/**
 * Manual category overrides for /youtube, keyed by video ID.
 *
 * Everything is categorised automatically, but once a broadcast ends YouTube
 * gives archived streams and finished premieres identical metadata, so
 * archives fall back to "stream". Pin the odd one out here, e.g.
 *   'dQw4w9WgXcQ': 'video',
 */
export const YOUTUBE_TYPE_OVERRIDES: Record<string, 'stream' | 'video' | 'short'> = {};

export const SOCIAL_LINKS = {
  github: 'https://github.com/lamps-dev',
  youtube: 'https://youtube.com/@ilovelampadaire',
  mastodon: 'https://mastodon.social/@lampyt',
  discord: 'https://discord.gg/sZxmbu4ZrG',
  bluesky: 'https://bsky.app/profile/lamps-dev.bsky.social',
  email: 'mailto:rimit58872@pm.me'
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'home' },
  { href: '/projects', label: 'projects' },
  { href: '/gallery', label: 'gallery' },
  { href: '/youtube', label: 'youtube' },
  { href: '/about', label: 'about' },
  { href: '/uses', label: 'uses' },
  { href: '/now', label: 'now' },
  { href: '/blog', label: 'blog' },
  { href: '/changelog', label: 'changelog' },
  { href: '/privacy', label: 'privacy policy' },
  { href: '/tos', label: 'tos' },
] as const;
