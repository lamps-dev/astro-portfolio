export type NowData = {
  lastUpdated: string;
  building: string[];
  learning: string[];
  consuming: string[];
};

export const now: NowData = {
  lastUpdated: 'april 2026',
  building: [
    'this portfolio',
    'sillycat.cloud',
    'lmp bot improvements',
  ],
  learning: [
    'getting better at typescript',
    'astro internals',
  ],
  consuming: [
    'random youtube rabbit holes',
    'whatever salma the cat is doing',
  ],
};
