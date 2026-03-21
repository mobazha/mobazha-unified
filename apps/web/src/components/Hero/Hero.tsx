'use client';

import React from 'react';
import Link from 'next/link';
import { Container, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n, useUserStore, isStandalone } from '@mobazha/core';

export const Hero: React.FC = () => {
  const { t } = useI18n();
  const { isAuthenticated, profile } = useUserStore();
  const standalone = isStandalone();

  const isAnonymous = !isAuthenticated;
  const isSeller = isAuthenticated && (profile?.stats?.listingCount ?? 0) > 0;
  const storeName = profile?.name || '';

  if (standalone) {
    return <StandaloneHero />;
  }

  if (isSeller) {
    return <SellerHero storeName={storeName} peerID={profile?.peerID} />;
  }

  return <AnonymousHero isAnonymous={isAnonymous} />;
};

function AnonymousHero({ isAnonymous }: { isAnonymous: boolean }) {
  const { t } = useI18n();

  const ctaHref = isAnonymous ? '/login?redirect=%2Fadmin' : '/admin';

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)] py-10 sm:py-16 lg:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--hero-glow)]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--hero-accent-secondary)]/20 rounded-full blur-3xl" />

      <Container size="xl" className="relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[var(--hero-accent)] text-xs sm:text-sm mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--hero-accent)] animate-pulse" />
            {t('hero.badge')}
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            {t('hero.titleLine1')}
            <br className="hidden sm:block" />{' '}
            <span
              className="text-[var(--hero-accent)] bg-gradient-to-r from-[var(--hero-accent)] to-[var(--hero-accent-secondary)]"
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('hero.titleLine2')}
            </span>
          </h1>

          <p className="text-sm sm:text-lg lg:text-xl text-white/80 mb-6 sm:mb-10 max-w-2xl mx-auto">
            {t('saasHome.hero.subtitle')}
          </p>

          <HStack gap="md" justify="center" wrap>
            <Link href={ctaHref}>
              <Button size="lg" className="shadow-lg shadow-[var(--hero-glow)]/25">
                {isAnonymous ? t('saasHome.hero.ctaCreate') : t('saasHome.hero.ctaStartSelling')}
              </Button>
            </Link>
            <a
              href="#featured-stores"
              className="inline-flex items-center px-4 py-2 text-sm sm:text-base text-white/80 hover:text-white transition-colors font-medium"
            >
              {isAnonymous ? t('saasHome.hero.ctaExplore') : t('saasHome.hero.ctaBrowse')}
              <span className="ml-1">↓</span>
            </a>
          </HStack>
        </div>
      </Container>
    </section>
  );
}

function SellerHero({ storeName, peerID }: { storeName: string; peerID?: string }) {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)] py-8 sm:py-12 lg:py-16">
      <div className="absolute top-10 left-10 w-48 h-48 bg-[var(--hero-glow)]/15 rounded-full blur-3xl" />

      <Container size="xl" className="relative z-10">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
            {t('saasHome.hero.welcomeBack', { storeName: storeName || 'Seller' })}
          </h1>

          <HStack gap="md" justify="center" wrap>
            <Link href="/admin">
              <Button size="lg" className="shadow-lg shadow-[var(--hero-glow)]/25">
                {t('saasHome.hero.ctaDashboard')}
              </Button>
            </Link>
            {peerID && (
              <Link href={`/store/${peerID}`}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  {t('saasHome.hero.ctaViewStore')}
                </Button>
              </Link>
            )}
          </HStack>
        </div>
      </Container>
    </section>
  );
}

function StandaloneHero() {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)] py-10 sm:py-16 lg:py-32">
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
      <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--hero-glow)]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--hero-accent-secondary)]/20 rounded-full blur-3xl" />

      <Container size="xl" className="relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[var(--hero-accent)] text-xs sm:text-sm mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--hero-accent)] animate-pulse" />
            {t('hero.badge')}
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            {t('hero.titleLine1')}
            <br />
            <span
              className="text-[var(--hero-accent)] bg-gradient-to-r from-[var(--hero-accent)] to-[var(--hero-accent-secondary)]"
              style={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {t('hero.titleLine2')}
            </span>
          </h1>

          <p className="text-sm sm:text-lg lg:text-xl text-white/80 mb-6 sm:mb-10 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>

          <HStack gap="md" justify="center" wrap>
            <Link href="/marketplace">
              <Button size="lg" className="shadow-lg shadow-[var(--hero-glow)]/25">
                {t('hero.exploreMarket')}
              </Button>
            </Link>
            <Link href="/listing/new">
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                {t('hero.startSelling')}
              </Button>
            </Link>
          </HStack>
        </div>
      </Container>
    </section>
  );
}
