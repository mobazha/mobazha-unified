/**
 * TestimonialsSection — PG-201 (Server Component)
 *
 * Customer testimonials in a card grid.
 * mode=manual renders provided items; mode=latest is a placeholder
 * for future integration with the ratings API.
 */

import type { TestimonialsProps } from '@mobazha/core';
import { getImageUrl } from '@mobazha/core';

export function TestimonialsSection({ title, mode, items, count }: TestimonialsProps) {
  const displayItems = mode === 'manual' ? (items ?? []) : [];
  const displayCount = count ?? 3;

  if (mode === 'latest' && displayItems.length === 0) {
    return (
      <div className="py-4">
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--store-font, inherit)' }}
        >
          {title}
        </h2>
        <p className="text-sm text-muted-foreground text-center py-8">
          Customer reviews will appear here automatically.
        </p>
      </div>
    );
  }

  if (!displayItems.length) return null;

  return (
    <div className="py-4">
      <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--store-font, inherit)' }}>
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayItems.slice(0, displayCount).map((item, i) => (
          <div
            key={i}
            className="p-5 border border-border bg-card"
            style={{ borderRadius: 'var(--store-radius, 8px)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              {item.avatar ? (
                <img
                  src={getImageUrl(item.avatar)}
                  alt={item.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--store-primary)',
                    color: 'var(--store-on-primary)',
                  }}
                >
                  {item.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div
                  className="text-sm font-medium"
                  style={{ fontFamily: 'var(--store-font, inherit)' }}
                >
                  {item.name}
                </div>
                {item.rating != null &&
                  (() => {
                    const stars = Math.min(5, Math.max(0, Math.round(item.rating)));
                    return (
                      <div className="text-xs text-amber-500">
                        {'★'.repeat(stars)}
                        {'☆'.repeat(5 - stars)}
                      </div>
                    );
                  })()}
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              &ldquo;{item.text}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
