'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Container, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n } from '@mobazha/core';

export const Hero: React.FC = () => {
  const { t } = useI18n();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)] py-10 sm:py-16 lg:py-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Floating Shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[var(--hero-glow)]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--hero-accent-secondary)]/20 rounded-full blur-3xl" />

      <Container size="xl" className="relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[var(--hero-accent)] text-xs sm:text-sm mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[var(--hero-accent)] animate-pulse" />
            {t('hero.badge')}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
            {t('hero.titleLine1')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--hero-accent)] to-[var(--hero-accent-secondary)]">
              {t('hero.titleLine2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg lg:text-xl text-white/80 mb-6 sm:mb-10 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>

          {/* CTA Buttons */}
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-8 sm:mt-16 pt-6 sm:pt-8 border-t border-white/10">
            <div>
              <div className="text-xl sm:text-3xl font-bold text-white">10K+</div>
              <div className="text-xs sm:text-sm text-white/60">{t('hero.activeStores')}</div>
            </div>
            <div>
              <div className="text-xl sm:text-3xl font-bold text-white">50K+</div>
              <div className="text-xs sm:text-sm text-white/60">{t('hero.productsListed')}</div>
            </div>
            <div>
              <div className="flex justify-center">
                <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--hero-accent)]" />
              </div>
              <div className="text-xs sm:text-sm text-white/60">{t('hero.privacyFirst')}</div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};
