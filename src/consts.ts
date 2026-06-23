export const AGE = 13;
export const SITE_TITLE = 'Lamp';
export const SITE_DESCRIPTION = `Lamp's Portfolio. I'm ${AGE}, and I code things.`;
export const SITE_URL = 'https://lamps-dev.dev';

/** GitHub handle used for the live changelog feed (/api/commits). */
export const GITHUB_USERNAME = 'lamps-dev';

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
  { href: '/about', label: 'about' },
  { href: '/uses', label: 'uses' },
  { href: '/now', label: 'now' },
  { href: '/blog', label: 'blog' },
  { href: '/changelog', label: 'changelog' },
  { href: '/privacy', label: 'privacy policy' },
  { href: '/tos', label: 'tos' },
] as const;
