export type ProjectStatus = 'active' | 'random and silly' | 'old and abandonned, rip' | 'no longer active' | 'semi-active' | 'wip';

export type Project = {
  name: string;
  tagline: string;
  description: string;
  status: ProjectStatus;
  tech: string[];
  github?: string;
  demo?: string;
  image?: string;
  date: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    name: 'Cubic',
    tagline: 'Python + C# toolset',
    description:
      "Said i'd add 100 tools, currently has 2. TextTool's CDN has expired.",
    status: 'no longer active',
    tech: ['Python', 'C#'],
    github: 'https://github.com/lamps-dev/cubic',
    date: '2025',
  },
  {
    name: 'Lmp Bot',
    tagline: 'discord bot, my newest project.',
    description:
      'Pycord-based discord bot (used to be in Forgescript). Has a honeypot spam channel setup that auto-bans anyone who posts in it. surprisingly effective.',
    status: 'active',
    tech: ['Python', 'Pycord'],
    date: '2026',
    featured: true,
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
    status: 'random and silly',
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
];
