'use client';

/**
 * AboutSection — PG-201
 *
 * Text + image two-column layout. Image position toggles left/right.
 */

import type { AboutSectionProps } from '@mobazha/core';
import { getImageUrl, useI18n } from '@mobazha/core';

export function AboutSection({
  title,
  text,
  image,
  imagePosition,
  showContactInfo,
}: AboutSectionProps) {
  const { t } = useI18n();
  const imgSrc = image ? getImageUrl(image) : null;
  const isLeft = imagePosition === 'left';

  return (
    <div className="py-4">
      <h2
        className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6"
        style={{ fontFamily: 'var(--store-font, inherit)' }}
      >
        {title}
      </h2>
      <div className={`flex flex-col gap-6 sm:gap-8 ${imgSrc ? 'md:flex-row md:items-start' : ''}`}>
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
              {t('admin.storeBranding.contactUsInfo')}
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
