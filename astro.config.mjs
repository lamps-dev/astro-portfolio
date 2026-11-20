// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

import remarkSubtext from './src/lib/remark-subtext.mjs';
import remarkVideo from './src/lib/remark-video.mjs';

// https://astro.build/config
export default defineConfig({
  // Production is served on www. The apex 307-redirects to this host, so
  // canonical, Open Graph, RSS, and sitemap URLs must use www.
  site: 'https://www.lamps-dev.dev',
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  // Relative Markdown/MDX images and <Image> without an explicit layout get a
  // responsive WebP srcset. Gallery images pass layout="none" so their crop
  // styling stays as it was.
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  // Applies to both .md and .mdx (the MDX integration extends this config).
  markdown: {
    remarkPlugins: [remarkSubtext, remarkVideo],
  },
  integrations: [mdx(), sitemap(), react(), icon()],

  vite: {
    plugins: [tailwindcss()],
  },
});
