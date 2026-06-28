'use client';

import React from 'react';
import { Container } from '@/components/layouts';
import { TokenIcon } from '@/components/Payment/TokenIcon';
import {
  useI18n,
  useRuntimeConfig,
  useFiatPaymentVisible,
  getVisibleSupportedChainCount,
} from '@mobazha/core';

interface PlatformStatsSectionProps {
  storeCount: number;
  listingCount: number;
  isLoading: boolean;
}

interface ChainEcosystemEntry {
  id: string;
  name: string;
}

const LEGACY_CHAIN_ECOSYSTEM: ChainEcosystemEntry[] = [
  { id: 'BTC', name: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum' },
  { id: 'BNB', name: 'BNB Chain' },
  { id: 'SOL', name: 'Solana' },
  { id: 'BASE', name: 'Base' },
  { id: 'LTC', name: 'Litecoin' },
];

const CHAIN_ECOSYSTEM_BY_CAPABILITY: Record<string, ChainEcosystemEntry> = {
  BTC: { id: 'BTC', name: 'Bitcoin' },
  BCH: { id: 'BCH', name: 'Bitcoin Cash' },
  LTC: { id: 'LTC', name: 'Litecoin' },
  ZEC: { id: 'ZEC', name: 'Zcash' },
  ETH: { id: 'ETH', name: 'Ethereum' },
  BSC: { id: 'BNB', name: 'BNB Chain' },
  MATIC: { id: 'MATIC', name: 'Polygon' },
  BASE: { id: 'BASE', name: 'Base' },
  CFX: { id: 'CFX', name: 'Conflux' },
  ARB: { id: 'ARB', name: 'Arbitrum' },
  OP: { id: 'OP', name: 'Optimism' },
  AVAX: { id: 'AVAX', name: 'Avalanche' },
  XDAI: { id: 'XDAI', name: 'Gnosis' },
  CELO: { id: 'CELO', name: 'Celo' },
  MNT: { id: 'MNT', name: 'Mantle' },
  ZKSYNC: { id: 'ZKSYNC', name: 'zkSync Era' },
  SCRL: { id: 'SCRL', name: 'Scroll' },
  LINEA: { id: 'LINEA', name: 'Linea' },
  SOL: { id: 'SOL', name: 'Solana' },
  TRX: { id: 'TRX', name: 'TRON' },
  XMR: { id: 'XMR', name: 'Monero' },
};

const FIAT_METHODS: { id: string; name: string; icon: React.ReactNode }[] = [
  {
    id: 'visa',
    name: 'Visa',
    icon: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
      </svg>
    ),
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    icon: (
      <svg className="h-6 w-auto" viewBox="0 0 24 16" fill="none" aria-hidden="true">
        <circle cx="8.5" cy="8" r="7" fill="#EB001B" opacity="0.9" />
        <circle cx="15.5" cy="8" r="7" fill="#F79E1B" opacity="0.9" />
        <path
          d="M12 2.8a6.97 6.97 0 012.5 5.2A6.97 6.97 0 0112 13.2a6.97 6.97 0 01-2.5-5.2A6.97 6.97 0 0112 2.8z"
          fill="#FF5F00"
          opacity="0.9"
        />
      </svg>
    ),
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: (
      <svg className="h-5 w-auto" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 012.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z" />
      </svg>
    ),
  },
];

export const PlatformStatsSection: React.FC<PlatformStatsSectionProps> = React.memo(
  ({ storeCount, listingCount, isLoading }) => {
    const { t } = useI18n();
    const runtimeConfig = useRuntimeConfig();
    const fiatVisible = useFiatPaymentVisible();
    const hasRealData = storeCount > 0 || listingCount > 0;
    const chainsSupported = getVisibleSupportedChainCount();
    const chainEcosystem =
      runtimeConfig.schemaVersion >= 2
        ? runtimeConfig.capabilities.payments.methods
            .filter(method => method.kind === 'crypto')
            .map(method => CHAIN_ECOSYSTEM_BY_CAPABILITY[method.id.toUpperCase()])
            .filter((chain): chain is ChainEcosystemEntry => Boolean(chain))
        : LEGACY_CHAIN_ECOSYSTEM;

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
      { value: chainsSupported, label: t('saasHome.stats.chainsSupported') },
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
              {chainEcosystem.map(chain => (
                <span key={chain.id} title={chain.name}>
                  <TokenIcon token={chain.id} size={20} />
                </span>
              ))}
              {fiatVisible && (
                <>
                  <span className="w-px h-4 bg-white/15 mx-0.5" aria-hidden="true" />
                  {FIAT_METHODS.map(method => (
                    <span
                      key={method.id}
                      title={method.name}
                      className="flex items-center opacity-70"
                    >
                      {method.icon}
                    </span>
                  ))}
                </>
              )}
            </div>

            <p className="text-white/20 text-[10px] mt-3">
              {t('saasHome.stats.andMore', { count: chainsSupported })}
            </p>
          </div>
        </Container>
      </section>
    );
  }
);

PlatformStatsSection.displayName = 'PlatformStatsSection';
