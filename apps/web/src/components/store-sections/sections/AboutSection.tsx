/**
 * AboutSection — PG-201 (Server Component)
 *
 * Text + image two-column layout. Image position toggles left/right.
 */

import type { AboutSectionProps } from '@mobazha/core';
import { getImageUrl } from '@mobazha/core';

export function AboutSection({
  title,
  text,
  image,
  imagePosition,
  showContactInfo,
}: AboutSectionProps) {
  const imgSrc = image ? getImageUrl(image) : null;
  const isLeft = imagePosition === 'left';

  return (
    <div className="py-4">
      <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--store-font, inherit)' }}>
        {title}
      </h2>
      <div className={`flex flex-col gap-8 ${imgSrc ? 'md:flex-row md:items-start' : ''}`}>
        {imgSrc && isLeft && (
          <div className="md:w-2/5 shrink-0">
            <img
              src={imgSrc}
              alt={title}
              className="w-full object-cover"
              style={{ borderRadius: 'var(--store-radius, 8px)' }}
            />
          </div>
        )}
        <div className="flex-1">
          <p
            className="text-base leading-relaxed text-muted-foreground whitespace-pre-line"
            style={{ fontFamily: 'var(--store-font, inherit)' }}
          >
            {text}
          </p>
          {showContactInfo && (
            <p className="mt-4 text-sm text-muted-foreground italic">
              Contact us for more information.
            </p>
          )}
        </div>
        {imgSrc && !isLeft && (
          <div className="md:w-2/5 shrink-0">
            <img
              src={imgSrc}
              alt={title}
              className="w-full object-cover"
              style={{ borderRadius: 'var(--store-radius, 8px)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
