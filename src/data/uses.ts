export type UsesItem = {
  name: string;
  detail?: string;
  link?: string;
};

export type UsesSection = {
  id: string;
  title: string;
  items: UsesItem[];
};

export const uses: UsesSection[] = [
  {
    id: 'hardware',
    title: 'Hardware',
    items: [
      { name: 'Main PC', detail: 'Desktop, specs tbd (To be announced)' },
      { name: 'Raspberry Pi', detail: 'For self-hosted stuff' },
      { name: 'Keyboard', detail: 'G-Lab Keyz Rubidium' },
      { name: 'Mouse', detail: 'Glorious Gaming Model O Wired' },
    ],
  },
  {
    id: 'software',
    title: 'Software',
    items: [
      { name: 'Editor', detail: 'VSCode' },
      { name: 'Terminal', detail: 'Windows: Windows Terminal. Linux (EndeavourOS): Konsole.' },
      { name: 'Browser', detail: 'Waterfox' },
      { name: 'OS', detail: 'Windows: mostly daily use. Linux dual-booted (EndeavourOS): Somewhat daily sometimes.' },
    ],
  },
  {
    id: 'dev',
    title: 'Dev',
    items: [
      { name: 'Languages', detail: 'Python, C#, JS, TS, Lua, HTML, CSS, React, Bash' },
      { name: 'Frameworks', detail: 'Astro, React, Pycord (Discord Bots), .Net (Windows GUI apps, uses rarely nowadays)' },
      { name: 'Shell', detail: 'Powershell. Bash if on Linux.' },
    ],
  },
  {
    id: 'online',
    title: 'Online',
    items: [
      { name: 'lamps-dev.dev', detail: 'This portfolio', link: 'https://lamps-dev.dev' },
      { name: 'onlycats.info', detail: 'The vibecoded joke project', link: 'https://onlycats.info' },
      { name: 'sillycat.cloud', detail: 'In-progress/WIP', link: 'https://sillycat.cloud' },
      // { name: 'uniqueweb.site', detail: 'Parked' }, - Useless to put there now lol
    ],
  },
];
