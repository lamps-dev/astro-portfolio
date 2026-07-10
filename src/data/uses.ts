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
      { name: 'Main PC', detail: 'Desktop PC, Nvidia RTX 5050 GPU, AMD Ryzen 5 8400F CPU, MSI PRO A620M-E Motherboard, Kingston NV3 1 To Internal SSD (500GB for Windows), DDR5 Kingston Fury Beast 16 GB Ram (Planning to buy 16GB more soon)' },
      { name: 'Raspberry Pi', detail: 'For self-hosted stuff' },
      { name: 'Keyboard', detail: 'G-Lab Keyz Rubidium (Planning to buy a new keyboard)' },
      { name: 'Mouse', detail: 'Glorious Gaming Model O Wired (Planning to buy a new mouse)' },
    ],
  },
  {
    id: 'software',
    title: 'Software',
    items: [
      { name: 'Editor', detail: 'VSCode' },
      { name: 'Terminal', detail: 'Windows: Windows Terminal. Linux (EndeavourOS): Konsole.' },
      { name: 'Browser', detail: 'Waterfox (often), Librewolf (rarely)' },
      { name: 'OS', detail: 'Windows: Mostly daily use. Linux dual-booted (EndeavourOS): Somewhat daily sometimes.' },
    ],
  },
  {
    id: 'dev',
    title: 'Dev',
    items: [
      { name: 'Languages', detail: 'Python (often), C#, JS, NodeJS, TS, Lua, Basic Web Stack, Java (rarely)' },
      { name: 'Frameworks', detail: 'Astro, React, Pycord (Python Discord Bots), ForgeScript (NodeJS Discord Bots, aoi.js alternative), Discord.JS (NodeJS Discord Bots), .Net (Windows GUI apps, uses rarely)' },
      { name: 'Shell', detail: 'Powershell. Zsh and Bash (rarely) if on Linux.' },
    ],
  },
  {
    id: 'online',
    title: 'Online',
    items: [
      { name: 'lamps-dev.dev', detail: 'This portfolio', link: 'https://lamps-dev.dev' },
      { name: 'onlycats.info', detail: 'The vibecoded joke project', link: 'https://onlycats.info' },
      { name: 'sillycat.cloud', detail: 'In-progress/WIP Cat cloud hosting', link: 'https://sillycat.cloud' },
      { name: 'uniqueweb.site', detail: 'Self-hosting domain', link: 'https://uniqueweb.site'},
    ],
  },
];
