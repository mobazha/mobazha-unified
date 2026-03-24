'use client';

import React from 'react';
import { Container } from '@/components/layouts';
import { useI18n, getSupportedChains } from '@mobazha/core';

interface PlatformStatsSectionProps {
  storeCount: number;
  listingCount: number;
  isLoading: boolean;
}

const CHAINS_SUPPORTED = getSupportedChains().length;

export const PlatformStatsSection: React.FC<PlatformStatsSectionProps> = React.memo(
  ({ storeCount, listingCount, isLoading }) => {
    const { t } = useI18n();

    const stats = [
      { value: storeCount, label: t('saasHome.stats.activeStores') },
      { value: listingCount, label: t('saasHome.stats.productsListed') },
      { value: CHAINS_SUPPORTED, label: t('saasHome.stats.chainsSupported') },
    ];

    return (
      <section className="py-10 sm:py-14 lg:py-20 bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)]/50 to-[var(--hero-gradient-to)]">
        <Container size="xl">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            {stats.map(stat => (
              <div key={stat.label}>
                {isLoading ? (
                  <div className="h-8 sm:h-10 bg-white/10 rounded-lg w-16 sm:w-24 mx-auto mb-1 animate-pulse" />
                ) : (
                  <div className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white">
                    {stat.value.toLocaleString()}
                  </div>
                )}
                <div className="text-xs sm:text-sm text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    );
  }
);

PlatformStatsSection.displayName = 'PlatformStatsSection';
