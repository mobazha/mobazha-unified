'use client';

/**
 * GallerySection — PG-201
 *
 * Image grid with configurable columns, aspect ratio, and optional lightbox.
 */

import { useState } from 'react';
import type { GallerySectionProps } from '@mobazha/core';
import { getImageUrl, useI18n } from '@mobazha/core';
import { ImageLightbox } from '@/components/ui/image-lightbox';

const COLS_CLASS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;
const ASPECT_CLASS = {
  square: 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  auto: '',
} as const;

export function GallerySection({
  title,
  images,
  columns,
  aspectRatio,
  enableLightbox,
  storeHint,
}: GallerySectionProps & { storeHint?: string }) {
  const { t } = useI18n();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images.length) return null;

  const openLightbox = (i: number) => {
    if (enableLightbox) setLightboxIndex(i);
  };

  return (
    <div className="py-4">
      {title && (
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--store-font, inherit)' }}
        >
          {title}
        </h2>
      )}
      <div className={`grid gap-3 ${COLS_CLASS[columns] ?? COLS_CLASS[3]}`}>
        {images.map((img, i) => {
          const src = getImageUrl(img.src, storeHint);
          const aspectClass = ASPECT_CLASS[aspectRatio] ?? '';
          const inner = (
            <div
              className={`overflow-hidden ${aspectClass}`}
              style={{ borderRadius: 'var(--store-radius, 8px)' }}
            >
              <img
                src={src}
                alt={img.alt || t('admin.storeBranding.galleryImage', { index: i + 1 })}
                className={`w-full h-full object-cover ${enableLightbox ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                onClick={() => openLightbox(i)}
              />
            </div>
          );

          return (
            <div key={i}>
              {img.link ? (
                <a href={img.link} target="_blank" rel="noopener noreferrer">
                  {inner}
                </a>
              ) : (
                inner
              )}
              {img.caption && (
                <p className="text-xs text-muted-foreground mt-1.5 text-center">{img.caption}</p>
              )}
            </div>
          );
        })}
      </div>

      <ImageLightbox
        imageUrls={images.map(image => getImageUrl(image.src, storeHint) || '').filter(Boolean)}
        open={lightboxIndex != null}
        selectedIndex={lightboxIndex ?? 0}
        onSelectIndex={setLightboxIndex}
        onOpenChange={open => {
          if (!open) setLightboxIndex(null);
        }}
        altPrefix={title || t('admin.storeBranding.galleryImage')}
        ariaLabel="Gallery image preview"
        loopNavigation={false}
        testIdPrefix="gallery-lightbox"
        className="z-[110]"
      />
    </div>
  );
}
