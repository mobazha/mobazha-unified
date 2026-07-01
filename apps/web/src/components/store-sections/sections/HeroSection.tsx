/**
 * HeroSection — PG-201 (Server Component)
 *
 * Full-width banner with title, subtitle, CTA, and optional background image.
 */

import type { HeroSectionProps } from '@mobazha/core';
import type { UserProfile } from '@mobazha/core';

interface Props extends HeroSectionProps {
  profile?: UserProfile;
}

const HEIGHT_MAP = {
  sm: 'min-h-[300px]',
  md: 'min-h-[450px]',
  lg: 'min-h-[600px]',
  full: 'min-h-screen',
} as const;

const ALIGN_MAP = {
  left: 'text-left items-start',
  center: 'text-center items-center',
  right: 'text-right items-end',
} as const;

export function HeroSection({
  title,
  subtitle,
  ctaText,
  ctaLink,
  backgroundImage,
  overlayOpacity = 0.4,
  height,
  textAlign,
  profile,
}: Props) {
  const displayTitle = title || profile?.name || 'Welcome';
  const bgUrl = backgroundImage || profile?.headerHashes?.large;
  const heightClass = HEIGHT_MAP[height] || HEIGHT_MAP.md;
  const alignClass = ALIGN_MAP[textAlign] || ALIGN_MAP.center;

  return (
    <div
      className={`relative flex flex-col justify-center ${heightClass} ${alignClass} overflow-hidden`}
      style={{
        backgroundColor: 'var(--store-primary)',
        color: 'var(--store-on-primary)',
        fontFamily: 'var(--store-font)',
        borderRadius: 'var(--store-radius)',
      }}
    >
      {bgUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
          <div
            className="absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
          />
        </>
      )}
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl font-bold sm:text-4xl lg:text-5xl">{displayTitle}</h1>
        {subtitle && <p className="mt-3 sm:mt-4 text-base sm:text-xl opacity-90">{subtitle}</p>}
        {ctaText && (
          <a
            href={ctaLink || '#'}
            className="mt-5 sm:mt-6 inline-flex items-center justify-center w-full sm:w-auto min-h-[44px] px-6 py-3 text-center font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'var(--store-accent)',
              color: 'var(--store-on-accent)',
              borderRadius: 'var(--store-radius)',
            }}
          >
            {ctaText}
          </a>
        )}
      </div>
    </div>
  );
}
