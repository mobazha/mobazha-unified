'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { DealLinksTabs } from '@/components/admin/deal-links/DealLinksTabs';
import { DealLinksSummaryBar } from '@/components/admin/deal-links/DealLinksSummaryBar';
import { DealLinksOnboarding } from '@/components/admin/deal-links/DealLinksOnboarding';
import { DealLinksEconomicsDisclosure } from '@/components/admin/deal-links/DealLinksEconomicsDisclosure';
import { ProtectedLinksTab } from '@/components/admin/deal-links/ProtectedLinksTab';
import { PromotionProgramsTab } from '@/components/admin/deal-links/PromotionProgramsTab';
import { PartnerAttributionTab } from '@/components/admin/deal-links/PartnerAttributionTab';
import { resolveDealLinksTab } from '@/components/admin/deal-links/dealLinksTypes';

function DealLinksHomeContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveDealLinksTab(searchParams.get('tab'));

  useEffect(() => {
    const dealProduct = searchParams.get('dealProduct');
    if (!dealProduct) return;
    router.replace(`/admin/deal-links/new?dealProduct=${encodeURIComponent(dealProduct)}`);
  }, [router, searchParams]);

  return (
    <div className="space-y-6" data-testid="admin-deal-links-page">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t('admin.dealLinks.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('admin.dealLinks.subtitle')}</p>
      </div>

      <DealLinksSummaryBar />
      <DealLinksOnboarding />
      <DealLinksEconomicsDisclosure />
      <DealLinksTabs />

      {activeTab === 'links' ? <ProtectedLinksTab /> : null}
      {activeTab === 'programs' ? <PromotionProgramsTab /> : null}
      {activeTab === 'attribution' ? <PartnerAttributionTab /> : null}
    </div>
  );
}

export default function AdminDealLinksPage() {
  return <DealLinksHomeContent />;
}
