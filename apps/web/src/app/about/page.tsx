'use client';

import React from 'react';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { useI18n } from '@mobazha/core';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8 md:py-12 pb-24 md:pb-12">
        <Container size="md">
          <article className="prose prose-sm dark:prose-invert max-w-none text-base">
            <div className="flex items-center gap-3 mb-6">
              <MobazhaLogo size={48} className="text-primary" />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground m-0">
                {t('footer.about')}
              </h1>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {t('footer.tagline')}
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {t('about.intro')}
            </p>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
