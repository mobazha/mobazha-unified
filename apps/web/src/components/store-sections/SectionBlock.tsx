/**
 * SectionBlock — PG-201
 *
 * Wrapper that applies SectionLayout (padding, background, full-width)
 * to each rendered section. Server Component compatible.
 */

import type { ReactNode } from 'react';
import type { SectionLayout } from '@mobazha/core';
import { SPACING_MAP } from '@mobazha/core';

interface SectionBlockProps {
  layout?: SectionLayout;
  children: ReactNode;
}

/** Fluid spacing: ~50% on 320px, full at ~800px+ */
function responsiveSpacing(value: string): string {
  const num = parseFloat(value);
  if (num === 0) return '0';
  const mobileMin = Math.max(num * 0.5, 0.25);
  return `clamp(${mobileMin}rem, ${num * 2.5}vw, ${num}rem)`;
}

export function SectionBlock({ layout, children }: SectionBlockProps) {
  const pt = layout?.paddingTop ? SPACING_MAP[layout.paddingTop] : SPACING_MAP['md'];
  const pb = layout?.paddingBottom ? SPACING_MAP[layout.paddingBottom] : SPACING_MAP['md'];
  const bg = layout?.backgroundColor;
  const fullWidth = layout?.fullWidth ?? false;

  return (
    <section
      style={{
        paddingTop: responsiveSpacing(pt),
        paddingBottom: responsiveSpacing(pb),
        backgroundColor: bg || undefined,
      }}
    >
      <div className={fullWidth ? '' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'}>{children}</div>
    </section>
  );
}
