'use client';

/**
 * CollectionsSection — PG-201
 *
 * Renders published collections in grid or carousel layout.
 * Uses the existing collections API.
 */

import { useState, useEffect } from 'react';
import type { CollectionsSectionProps } from '@mobazha/core';
import type { Collection } from '@mobazha/core';
import { collectionsApi, getImageUrl, useI18n, useStorefrontMode } from '@mobazha/core';
import Link from 'next/link';

const COLS_CLASS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

export function CollectionsSection({
  title,
  mode,
  collectionIDs,
  layout,
  columns = 3,
  peerId,
}: CollectionsSectionProps & { peerId: string }) {
  const { t } = useI18n();
  const standalone = useStorefrontMode();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await collectionsApi.listPublishedCollections(peerId, 1, 20);
        if (cancelled) return;
        let items = resp ?? [];
        if (mode === 'manual' && collectionIDs?.length) {
          const idSet = new Set(collectionIDs);
          items = items.filter(c => idSet.has(c.id));
        }
        setCollections(items);
      } catch {
        // silently fail — section shows empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, collectionIDs, peerId]);

  if (loading) {
    return (
      <div className="py-4">
        <h2
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--store-font, inherit)' }}
        >
          {title}
        </h2>
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  if (!collections.length) return null;

  const isCarousel = layout === 'carousel';

  return (
    <div className="py-4">
      <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--store-font, inherit)' }}>
        {title}
      </h2>
      {isCarousel ? (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4">
          {collections.map(col => (
            <CollectionCard
              key={col.id}
              collection={col}
              peerId={peerId}
              standalone={standalone}
              className="snap-start shrink-0 w-64"
            />
          ))}
        </div>
      ) : (
        <div className={`grid gap-4 ${COLS_CLASS[columns] ?? COLS_CLASS[3]}`}>
          {collections.map(col => (
            <CollectionCard key={col.id} collection={col} peerId={peerId} standalone={standalone} />
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  peerId,
  standalone,
  className = '',
}: {
  collection: Collection;
  peerId: string;
  standalone: boolean;
  className?: string;
}) {
  const imgSrc = collection.image ? getImageUrl(collection.image, peerId) : null;
  const href = standalone
    ? `/collections/${collection.id}`
    : `/store/${peerId}/collection/${collection.id}`;
  return (
    <Link
      href={href}
      className={`block border border-border overflow-hidden hover:shadow-md transition-shadow ${className}`}
      style={{ borderRadius: 'var(--store-radius, 8px)' }}
    >
      {imgSrc && (
        <div className="aspect-[16/9] overflow-hidden">
          <img
            src={imgSrc}
            alt={collection.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-medium text-sm" style={{ fontFamily: 'var(--store-font, inherit)' }}>
          {collection.title}
        </h3>
        {collection.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {collection.description}
          </p>
        )}
      </div>
    </Link>
  );
}
