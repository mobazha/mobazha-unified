'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SellerAffiliateStatementsPanel } from '@/components/SellerAffiliate/SellerAffiliateStatementsPanel';
import { SellerAffiliateProgramPanel } from '@/components/SellerAffiliate/SellerAffiliateProgramPanel';

function DealLinksHomeContent() {
  const { t } = useI18n();
  return (
    <div className="space-y-6" data-testid="admin-deal-links-page">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t('sellerAffiliate.adminTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('sellerAffiliate.adminSubtitle')}</p>
      </div>
      <SellerAffiliateProgramPanel />
      <SellerAffiliateStatementsPanel audience="seller" />
    </div>
  );
}

export default function AdminDealLinksPage() {
  return <DealLinksHomeContent />;
}
