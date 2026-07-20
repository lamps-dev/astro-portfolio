// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

import remarkSubtext from './src/lib/remark-subtext.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://lamps-dev.dev',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  // Applies to both .md and .mdx (the MDX integration extends this config).
  markdown: {
    remarkPlugins: [remarkSubtext],
  },
  integrations: [mdx(), sitemap(), react(), icon()],

  vite: {
    plugins: [tailwindcss()],
  },
});
