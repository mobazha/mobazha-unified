'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n, isNewOnNetworkStore } from '@mobazha/core';
import type { SearchedUser } from '@mobazha/core/services/api/products';
import { StoreCard } from './StoreCard';

interface FeaturedStoresSectionProps {
  stores: SearchedUser[];
  isLoading: boolean;
}

function StoreSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="h-24 sm:h-28 bg-muted" />
      <div className="pt-8 px-4 pb-4">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-full mt-2" />
        <div className="h-3 bg-muted rounded w-4/5 mt-1" />
        <div className="h-3 bg-muted rounded w-1/3 mt-3" />
      </div>
    </div>
  );
}

export const FeaturedStoresSection: React.FC<FeaturedStoresSectionProps> = React.memo(
  ({ stores, isLoading }) => {
    const { t } = useI18n();

    if (!isLoading && stores.length === 0) {
      return (
        <section id="featured-stores" className="py-8 sm:py-12 lg:py-16">
          <Container size="xl">
            <div className="text-center py-12">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
                {t('saasHome.featuredStores.emptyTitle')}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t('saasHome.featuredStores.emptySubtitle')}
              </p>
              <Link href="/login?redirect=%2Fadmin">
                <Button size="lg">{t('saasHome.hero.ctaCreate')}</Button>
              </Link>
            </div>
          </Container>
        </section>
      );
    }

    const showGrowingCta = !isLoading && stores.length > 0 && stores.length <= 2;

    return (
      <section id="featured-stores" className="py-8 sm:py-12 lg:py-16">
        <Container size="xl">
          {/* Section header */}
          <div className="flex items-end justify-between mb-6 sm:mb-8">
            <div>
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground">
                {t('saasHome.featuredStores.title')}
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                {t('saasHome.featuredStores.subtitle')}
              </p>
            </div>
            {!isLoading && stores.length >= 6 && (
              <Link
                href="/marketplace?tab=stores"
                className="hidden sm:inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {t('saasHome.featuredStores.viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <StoreSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Stores grid */}
          {!isLoading && stores.length > 0 && (
            <>
              {stores.length <= 2 ? (
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {stores.map(store => (
                    <div key={store.peerID} className="sm:w-1/2 lg:w-1/3">
                      <StoreCard store={store} isNewOnNetwork={isNewOnNetworkStore(store)} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {stores.slice(0, 6).map(store => (
                    <StoreCard
                      key={store.peerID}
                      store={store}
                      isNewOnNetwork={isNewOnNetworkStore(store)}
                    />
                  ))}
                </div>
              )}

              {showGrowingCta && (
                <p className="text-center text-muted-foreground text-sm mt-6">
                  {t('saasHome.featuredStores.growingCta')}
                </p>
              )}
            </>
          )}
        </Container>
      </section>
    );
  }
);

FeaturedStoresSection.displayName = 'FeaturedStoresSection';
