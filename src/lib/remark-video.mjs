/**
 * remark-video
 *
 * Lets a video file be dropped into a post with the same syntax as an image:
 *
 *   ![A clip of the thing](/files/videos/clip.mp4)
 *
 * Markdown has no video syntax, so `![...](...)` on a video file would
 * otherwise render a broken <img>. This spots image nodes whose URL points at
 * a video and swaps the rendered element for a <video> instead.
 *
 * Works in both .md and .mdx: rather than injecting raw HTML (which the MDX
 * pipeline handles differently), it sets the mdast->hast hints that both
 * pipelines read.
 *
 * The alt text becomes the accessible name. For a *visible* caption, a poster,
 * a looping gif-style clip, or multiple encodings, use <Video> instead
 * (src/components/Video.astro).
 */

const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov)$/i;

const MIME = {
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mov: 'video/quicktime',
};

/** Extension of a URL, ignoring any ?query or #hash. */
function extensionOf(url) {
  const clean = String(url).split('?')[0].split('#')[0];
  const match = VIDEO_EXT.exec(clean);
  return match ? match[1].toLowerCase() : null;
}

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (const child of children) walk(child, visit);
}

export default function remarkVideo() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'image' || !node.url) return;
      const ext = extensionOf(node.url);
      if (!ext) return;

      const alt = typeof node.alt === 'string' && node.alt.length > 0 ? node.alt : null;
      const type = MIME[ext];

      node.data = {
        ...(node.data || {}),
        hName: 'video',
        hProperties: {
          className: ['post-video'],
          controls: true,
          preload: 'metadata',
          playsInline: true,
          'aria-label': alt ?? undefined,
          // `image` normally renders <img src alt>; clear both so they don't
          // survive the merge onto <video>, which takes neither.
          src: undefined,
          alt: undefined,
          title: node.title ?? undefined,
        },
        // A <source> child rather than src= so the browser can skip formats it
        // cannot play, and so adding encodings later is a one-line change.
        hChildren: [
          {
            type: 'element',
            tagName: 'source',
            properties: { src: node.url, type },
            children: [],
          },
          {
            type: 'element',
            tagName: 'a',
            properties: { href: node.url, download: true },
            children: [{ type: 'text', value: 'Download the video' }],
          },
        ],
      };
    });
  };
}
