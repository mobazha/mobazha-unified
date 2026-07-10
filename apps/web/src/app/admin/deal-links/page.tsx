'use client';

import React from 'react';
import { SellerAffiliateStatementsPanel } from '@/components/SellerAffiliate/SellerAffiliateStatementsPanel';
import { SellerAffiliateProgramPanel } from '@/components/SellerAffiliate/SellerAffiliateProgramPanel';

function DealLinksHomeContent() {
  return (
    <div className="space-y-6" data-testid="admin-deal-links-page">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Seller affiliate</h1>
        <p className="text-sm text-muted-foreground">
          Configure one automatic storefront-wide referral program and review its order-backed
          statement.
        </p>
      </div>
      <SellerAffiliateProgramPanel />
      <SellerAffiliateStatementsPanel audience="seller" />
    </div>
  );
}

export default function AdminDealLinksPage() {
  return <DealLinksHomeContent />;
}
