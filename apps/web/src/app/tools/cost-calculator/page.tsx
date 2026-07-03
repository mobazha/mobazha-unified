'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container } from '@/components/layouts';
import { DigitalCostCalculator } from '@/components/Pricing/DigitalCostCalculator';

export default function CostCalculatorPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background" data-testid="cost-calculator-page">
      <Header />
      <MobilePageHeader title={t('costCalc.pageTitle')} />
      <main className="py-6 sm:py-10 pb-24 sm:pb-12">
        <Container size="lg">
          <header className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-3xl font-bold text-foreground">
              {t('costCalc.pageTitle')}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl">
              {t('costCalc.pageSubtitle')}
            </p>
          </header>

          <DigitalCostCalculator />
        </Container>
      </main>
      <Footer />
    </div>
  );
}
