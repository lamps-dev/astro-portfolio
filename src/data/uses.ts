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
    title: 'hardware',
    items: [
      { name: 'main pc', detail: 'desktop, specs tbd' },
      { name: 'raspberry pi', detail: 'for self-hosted stuff' },
      { name: 'keyboard', detail: 'placeholder' },
      { name: 'mouse', detail: 'placeholder' },
    ],
  },
  {
    id: 'software',
    title: 'software',
    items: [
      { name: 'editor', detail: 'vs code' },
      { name: 'terminal', detail: 'placeholder' },
      { name: 'browser', detail: 'placeholder' },
      { name: 'os', detail: 'placeholder' },
    ],
  },
  {
    id: 'dev',
    title: 'dev',
    items: [
      { name: 'languages', detail: 'python, c#, js, ts, lua' },
      { name: 'frameworks', detail: 'astro, pycord, .net' },
      { name: 'shell', detail: 'powershell, batch when forced' },
    ],
  },
  {
    id: 'online',
    title: 'online',
    items: [
      { name: 'lamps-dev.dev', detail: 'this site', link: 'https://lamps-dev.dev' },
      { name: 'onlycats.info', detail: 'joke project', link: 'https://onlycats.info' },
      { name: 'sillycat.cloud', detail: 'in-progress', link: 'https://sillycat.cloud' },
      { name: 'uniqueweb.site', detail: 'parked' },
    ],
  },
];
