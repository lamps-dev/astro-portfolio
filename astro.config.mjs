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
  // Astro 5 replaced 'hybrid' with 'static' + per-route prerender opt-out.
  // Pages stay prerendered by default; API routes that need SSR set
  // `export const prerender = false` (see src/pages/api/wakatime.ts).
  output: 'static',
  adapter: vercel(),
  integrations: [mdx(), sitemap(), react(), icon()],

  vite: {
    plugins: [tailwindcss()],
  },
});
