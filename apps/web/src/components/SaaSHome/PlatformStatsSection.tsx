'use client';

import React from 'react';
import { Container } from '@/components/layouts';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import {
  useI18n,
  getEditionAdvertisedPaymentTokens,
  getEditionSupportedChainCount,
} from '@mobazha/core';

interface PlatformStatsSectionProps {
  storeCount: number;
  listingCount: number;
  isLoading: boolean;
}

const CHAINS_SUPPORTED = getEditionSupportedChainCount();

const CHAIN_ECOSYSTEM = getEditionAdvertisedPaymentTokens();

export const PlatformStatsSection: React.FC<PlatformStatsSectionProps> = React.memo(
  ({ storeCount, listingCount, isLoading }) => {
    const { t } = useI18n();
    const hasRealData = storeCount > 0 || listingCount > 0;

    if (isLoading) {
      return (
        <section className="py-6 sm:py-14 lg:py-20 bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)]/50 to-[var(--hero-gradient-to)]">
          <Container size="xl">
            <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
              {[0, 1, 2].map(i => (
                <div key={i}>
                  <div className="h-8 sm:h-10 bg-white/10 rounded-lg w-16 sm:w-24 mx-auto mb-1 animate-pulse" />
                  <div className="h-3 bg-white/5 rounded w-20 mx-auto mt-2 animate-pulse" />
                </div>
              ))}
            </div>
          </Container>
        </section>
      );
    }

    const stats = [
      { value: storeCount, label: t('saasHome.stats.activeStores') },
      { value: listingCount, label: t('saasHome.stats.productsListed') },
      { value: CHAINS_SUPPORTED, label: t('saasHome.stats.chainsSupported') },
    ];

    return (
      <section className="py-6 sm:py-14 lg:py-20 bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)]/50 to-[var(--hero-gradient-to)]">
        <Container size="xl">
          {/* Desktop: always show numbers (original design) */}
          <div className="hidden md:grid grid-cols-3 gap-8 text-center">
            {stats.map(stat => (
              <div key={stat.label}>
                <div className="text-4xl lg:text-5xl font-bold text-white">
                  {stat.value.toLocaleString()}
                </div>
                <div className="text-sm text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Mobile: always show chain ecosystem; add numbers when has data */}
          <div className="md:hidden text-center">
            {hasRealData && (
              <div className="grid grid-cols-3 gap-4 text-center mb-5">
                {stats.map(stat => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-white">
                      {stat.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/60 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">
              {t('saasHome.stats.poweredBy')}
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              {CHAIN_ECOSYSTEM.map(chain => (
                <span key={chain.id} title={chain.name}>
                  <TokenIcon token={chain.id} size={20} />
                </span>
              ))}
            </div>

            <p className="text-white/20 text-[10px] mt-3">
              {t('saasHome.stats.utxoPayments', { count: CHAINS_SUPPORTED })}
            </p>
          </div>
        </Container>
      </section>
    );
  }
);

PlatformStatsSection.displayName = 'PlatformStatsSection';
