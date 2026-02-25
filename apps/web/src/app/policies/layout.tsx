'use client';

import React from 'react';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('policies.backToStore')} />
      <main className="py-6 sm:py-12 pb-24 sm:pb-12">
        <Container size="md">
          <article className="prose prose-sm dark:prose-invert max-w-none">{children}</article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
