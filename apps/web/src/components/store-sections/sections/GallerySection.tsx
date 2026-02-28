'use client';

/**
 * GallerySection — PG-201
 *
 * Image grid with configurable columns, aspect ratio, and optional lightbox.
 */

import { useState } from 'react';
import type { GallerySectionProps } from '@mobazha/core';
import { getImageUrl } from '@mobazha/core';
import { X } from 'lucide-react';

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
}: GallerySectionProps) {
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
          const src = getImageUrl(img.src);
          const aspectClass = ASPECT_CLASS[aspectRatio] ?? '';
          const inner = (
            <div
              className={`overflow-hidden ${aspectClass}`}
              style={{ borderRadius: 'var(--store-radius, 8px)' }}
            >
              <img
                src={src}
                alt={img.alt || `Gallery image ${i + 1}`}
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

      {lightboxIndex != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={getImageUrl(images[lightboxIndex].src)}
            alt={images[lightboxIndex].alt || ''}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          {images.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-white/80 hover:text-white bg-white/10 rounded-md"
                onClick={e => {
                  e.stopPropagation();
                  setLightboxIndex(Math.max(0, lightboxIndex - 1));
                }}
                disabled={lightboxIndex === 0}
              >
                ‹ Prev
              </button>
              <span className="text-sm text-white/60 flex items-center">
                {lightboxIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-white/80 hover:text-white bg-white/10 rounded-md"
                onClick={e => {
                  e.stopPropagation();
                  setLightboxIndex(Math.min(images.length - 1, lightboxIndex + 1));
                }}
                disabled={lightboxIndex === images.length - 1}
              >
                Next ›
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
