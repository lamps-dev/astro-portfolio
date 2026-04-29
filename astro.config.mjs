// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://lamps-dev.dev',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  integrations: [mdx(), sitemap(), react(), icon()],

  vite: {
    plugins: [tailwindcss()],
  },
});
