'use client';

import React from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import type { SearchedUser } from '@mobazha/core/services/api/products';

interface StoreCardProps {
  store: SearchedUser;
}

export const StoreCard: React.FC<StoreCardProps> = React.memo(({ store }) => {
  const { t } = useI18n();
  const storeUrl = `/store/${store.peerID}`;

  return (
    <Link
      href={storeUrl}
      className="group block rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
    >
      {/* Header area — store banner or gradient fallback */}
      <div className="h-24 sm:h-28 relative overflow-hidden">
        {store.headerImage ? (
          <img
            src={store.headerImage}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-primary/5" />
        )}
        {store.avatar ? (
          <div className="absolute -bottom-6 left-4">
            <img
              src={store.avatar}
              alt={store.name}
              className="w-12 h-12 rounded-full border-2 border-card object-cover bg-muted"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="absolute -bottom-6 left-4">
            <div className="w-12 h-12 rounded-full border-2 border-card bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {store.name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-8 px-4 pb-4">
        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate group-hover:text-primary transition-colors">
          {store.name}
        </h3>
        {store.shortDescription && (
          <p className="text-muted-foreground text-xs sm:text-sm mt-1 line-clamp-2 min-h-[2.5em]">
            {store.shortDescription}
          </p>
        )}
        {!store.shortDescription && <div className="min-h-[2.5em]" />}

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          {store.rating > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span className="font-medium text-foreground">{store.rating.toFixed(1)}</span>
              {store.reviewCount > 0 && <span>({store.reviewCount})</span>}
            </span>
          )}
          {store.listingCount > 0 && (
            <span>{t('saasHome.featuredStores.products', { count: store.listingCount })}</span>
          )}
        </div>
      </div>
    </Link>
  );
});

StoreCard.displayName = 'StoreCard';
