export const SITE_TITLE = 'lamp';
export const SITE_DESCRIPTION = "lamp's site. 13, montpellier, codes things.";
export const SITE_URL = 'https://lamps-dev.dev';

export const SOCIAL_LINKS = {
  github: 'https://github.com/lamps-dev',
  youtube: 'https://youtube.com/@ilovelampadaire',
  mastodon: 'https://mastodon.social/@lampyt',
  discord: 'https://discord.gg/sZxmbu4ZrG',
  bluesky: 'https://bsky.app/profile/lamps-dev.bsky.social',
} as const;

export const NAV_LINKS = [
  { href: '/', label: 'home' },
  { href: '/projects', label: 'projects' },
  { href: '/about', label: 'about' },
  { href: '/uses', label: 'uses' },
  { href: '/now', label: 'now' },
  { href: '/blog', label: 'blog' },
] as const;
