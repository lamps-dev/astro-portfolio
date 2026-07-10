/**
 * Gallery configuration.
 *
 * Images live in `src/assets/gallery`. Reference each one here by its
 * filename (with extension) and give it a title + description. Images are
 * organised into groups — add a new object to `galleryGroups` to create a
 * new section on the page.
 */
export interface GalleryImage {
  /** Filename (with extension) of the image under src/assets/gallery. */
  file: string;
  title: string;
  description: string;
}

export interface GalleryGroup {
  /** Heading shown above this group. */
  title: string;
  /** Optional short blurb under the heading. */
  blurb?: string;
  images: GalleryImage[];
}

export const galleryGroups: GalleryGroup[] = [
  {
    title: 'Cat(s)',
    blurb: 'My cat! :3',
    images: [
      {
        file: 'aurora.jpg',
        title: 'Aurora',
        description: 'Old Salma pic but still showing it here :3',
      },
      {
        file: 'city-lights.jpg',
        title: 'City Lights',
        description: 'Downtown after dark, all neon and rain-slick streets.',
      },
    ],
  },
];
