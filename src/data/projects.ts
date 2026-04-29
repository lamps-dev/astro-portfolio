export type ProjectStatus = 'active' | 'stupid' | 'rip';

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
    tagline: 'python + c# toolset',
    description:
      "swore i'd add 100 tools, currently has 2. small grab-bag of utilities i actually use.",
    status: 'active',
    tech: ['python', 'c#'],
    github: 'https://github.com/lamps-dev/cubic',
    date: '2025',
    featured: true,
  },
  {
    name: 'lmp bot',
    tagline: 'discord bot, with feelings',
    description:
      'pycord-based discord bot. has a honeypot spam channel that auto-bans anyone who posts in it. surprisingly effective.',
    status: 'active',
    tech: ['python', 'pycord'],
    date: '2025',
    featured: true,
  },
  {
    name: 'sillycat.cloud',
    tagline: 'silly cat themed cloud project',
    description:
      'in-progress. self-hosted services with a cat skin on top. exactly as serious as the name suggests.',
    status: 'active',
    tech: ['self-hosted', 'docker'],
    demo: 'https://sillycat.cloud',
    date: '2025',
    featured: true,
  },
  {
    name: 'onlycats.info',
    tagline: 'joke website, vibecoded',
    description:
      'vibecoded in an afternoon. exactly what the domain says. no further questions.',
    status: 'stupid',
    tech: ['html', 'css', 'js'],
    demo: 'https://onlycats.info',
    date: '2025',
  },
  {
    name: 'SysInfo',
    tagline: 'early python project',
    description:
      "copied blindly i admit. one of the first things i ever wrote. kept it for the museum.",
    status: 'rip',
    tech: ['python'],
    date: '2023',
  },
  {
    name: 'PyChatroom',
    tagline: 'dead and broken',
    description:
      'tried to do a chatroom in python. it sort of worked once. it does not work now.',
    status: 'rip',
    tech: ['python'],
    date: '2023',
  },
];
