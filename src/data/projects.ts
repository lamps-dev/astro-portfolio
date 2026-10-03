export type ProjectStatus = 'active' | 'random and silly' | 'old and abandonned, rip' | 'no longer active' | 'semi-active' | 'wip' | 'discontinued';

/**
 * Screenshots and clips shown on a project's card. Drop the files in
 * public/files/assets/projects/ and reference them as
 * '/files/assets/projects/<file>'. The first item is the card's cover;
 * clicking it opens all of them in a viewer.
 */
export type ProjectMedia =
  | { type: 'image'; src: string; alt?: string }
  | { type: 'video'; src: string; poster?: string; alt?: string };

/** Extra links beyond code/live, like a bot invite. `icon` is any iconify name. */
export type ProjectLink = { label: string; href: string; icon?: string };

export type Project = {
  name: string;
  tagline: string;
  description: string;
  status: ProjectStatus;
  tech: string[];
  github?: string;
  demo?: string;
  links?: ProjectLink[];
  media?: ProjectMedia[];
  date: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    name: 'Lmp Bot',
    tagline: 'discord bot, my newest project.',
    description:
      'Discord.js-based discord bot (used to be in Pycord, and Forgescript before that). Has a honeypot spam channel setup that auto-bans anyone who posts in it. surprisingly effective.',
    status: 'active',
    tech: ['Discord.js', 'NodeJS'],
    media: [{ type: 'image', src: '/files/assets/projects/zz-test.jpg', alt: 'test shot' }, { type: 'video', src: '/files/assets/videos/randomemesdiscordpart11.mp4' }],
    links: [{ label: 'invite', href: 'https://lmpbot-invite.vercel.app/', icon: 'lucide:bot' }],
    date: '2026',
    featured: true,
  },
  {
    name: 'Terry',
    tagline: 'Discord bot.',
    description:
      'A discord bot based on Forgescript. Partially alive again now that the hosting provider is back online, but most of my time still goes into LmpBot.',
    status: 'semi-active',
    tech: ['Forgescript', 'Javascript'],
    date: '2026',
  },
  {
    name: 'sillycat.cloud',
    tagline: 'silly cat themed cloud project',
    description:
      'In-progress and in WIP. Self-hosted silly hosting services, wired with pipes ig. Exactly as serious as the name suggests.',
    status: 'wip',
    tech: ['website: cloud', 'services: will be self-hosted'],
    demo: 'https://sillycat.cloud',
    date: '2026',
    featured: true,
  },
  {
    name: 'files.sillycat.cloud',
    tagline: 'CDN self-hosted for myself',
    description:
      'Made a CDN, self-hosted for myself, might use it for the file hosting of Sillycat Cloud too, one day.',
    status: 'active',
    tech: ['Nginxy', 'Caddy'],
    demo: 'https://files.sillycat.cloud',
    date: '2026',
  },
  {
    name: 'onlycats.info',
    tagline: 'joke website, vibecoded',
    description:
      'Vibecoded in an afternoon. Exactly what the domain says (its just a cat-posting platform). No further questions.',
    status: 'discontinued',
    tech: ['React', 'Typescript', 'Vite', 'Cloudflare Storage', 'Tailwind', 'Supabase'],
    demo: 'https://onlycats.info',
    date: '2026',
  },
  {
    name: 'SysInfo',
    tagline: 'Early python project',
    description:
      "One of the first things I ever wrote and vibecoded. Kept it for the museum.",
    status: 'old and abandonned, rip',
    tech: ['python'],
    date: '2023 / 2024',
  },
  {
    name: 'PyChatroom',
    tagline: 'Dead and broken',
    description:
      'Tried to do a chatroom in Python. It sort of worked once. It does not work now.',
    status: 'old and abandonned, rip',
    tech: ['Python'],
    date: '2023 / 2024',
  },
  {
    name: 'old.lamps-dev.dev',
    tagline: 'The 2 year old portfolio I had.',
    description:
      'This has been replaced with the new one on the main domain, but the old one still exists at https://old.lamps-dev.dev.',
    status: 'old and abandonned, rip',
    tech: ['HTML', 'CSS', 'JS'],
    date: '2024',
  },
  {
    name: 'Cubic',
    tagline: 'Python + C# toolset',
    description:
      "Said i'd add 100 tools, ended up with 2. TextTool's CDN has expired. Discontinued, use LampTools instead.",
    status: 'old and abandonned, rip',
    tech: ['Python', 'C#'],
    github: 'https://github.com/lamps-dev/cubic',
    date: '2025',
  },
  {
    name: 'lamps-dev.dev',
    tagline: 'This portfolio (the new one)',
    description:
      "This is the portfolio where you are at right now.",
    status: 'active',
    tech: ['Astro', 'React Components', 'TailwindCSS', 'Typescript'],
    github: 'https://github.com/lamps-dev/astro-portfolio',
    date: '2026',
  },
  {
    name: 'LampTools',
    tagline: 'A Cubic replacement',
    description: 'Fewer tools but a better gui and will be somewhat actively maintained.',
    status: 'wip',
    tech: ['Python', 'PySide6'],
    github: 'https://github.com/lamp-studios/lamptools',
    date: '2026',
  }
];
