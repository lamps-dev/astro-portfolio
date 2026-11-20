import type { APIRoute } from 'astro';

/**
 * Allow crawling and point crawlers at the generated sitemap index.
 * The sitemap filename matches what @astrojs/sitemap emits (`sitemap-index.xml`).
 */
export const GET: APIRoute = ({ site }) => {
  if (!site) {
    return new Response('User-agent: *\nAllow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const sitemap = new URL('sitemap-index.xml', site);
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
