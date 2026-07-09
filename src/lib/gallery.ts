import { getImage } from 'astro:assets';
import { galleryGroups, type GalleryGroup } from '../data/gallery';

// All images in src/assets/gallery, keyed by filename so the config can
// reference them by name.
const files = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/gallery/*.{jpg,jpeg,png,webp,avif,gif}',
  { eager: true },
);
const byName = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(files)) {
  byName.set(path.split('/').pop()!, mod.default);
}

/** URL-safe slug for a group, used for its /gallery/<slug> page. */
export function groupSlug(group: GalleryGroup): string {
  return group.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolve the configured groups into renderable data: every image entry is
 * paired with its imported asset and a larger render for the lightbox.
 */
export async function resolveGroups() {
  return Promise.all(
    galleryGroups.map(async (group) => ({
      ...group,
      slug: groupSlug(group),
      items: await Promise.all(
        group.images.map(async (item) => {
          const image = byName.get(item.file);
          if (!image) {
            throw new Error(
              `Gallery: "${item.file}" not found in src/assets/gallery. ` +
                `Available: ${[...byName.keys()].join(', ') || '(none)'}`,
            );
          }
          return {
            ...item,
            image,
            full: await getImage({ src: image, width: 1600 }),
          };
        }),
      ),
    })),
  );
}

export type ResolvedGroup = Awaited<ReturnType<typeof resolveGroups>>[number];

/**
 * A smooth full-page transform used when navigating between the gallery
 * index and a group page. Keyframes (`gallery-in` / `gallery-out`) are
 * defined in each page's global styles so they exist on the destination.
 */
export const pageTransform = {
  forwards: {
    old: { name: 'gallery-out', duration: '0.26s', easing: 'ease-in', fillMode: 'forwards' },
    new: { name: 'gallery-in', duration: '0.4s', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fillMode: 'backwards' },
  },
  backwards: {
    old: { name: 'gallery-out', duration: '0.26s', easing: 'ease-in', fillMode: 'forwards' },
    new: { name: 'gallery-in', duration: '0.4s', easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fillMode: 'backwards' },
  },
};
