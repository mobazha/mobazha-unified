// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React from 'react';
import { useI18n, useSellerAffiliateProgram } from '@mobazha/core';
import { SellerAffiliateStatementsPanel } from '@/components/SellerAffiliate/SellerAffiliateStatementsPanel';
import { SellerAffiliateProgramPanel } from '@/components/SellerAffiliate/SellerAffiliateProgramPanel';

function AffiliateHomeContent() {
  const { t } = useI18n();
  // Owned here so the statements panel below stays hidden until a program
  // exists, and appears the moment the panel's save creates one.
  const programState = useSellerAffiliateProgram();
  return (
    <div className="space-y-6" data-testid="admin-affiliate-page">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t('sellerAffiliate.adminTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('sellerAffiliate.adminSubtitle')}</p>
      </div>
      <SellerAffiliateProgramPanel programState={programState} />
      {programState.program ? (
        <SellerAffiliateStatementsPanel audience="seller" />
      ) : !programState.loading ? (
        <p className="text-sm text-muted-foreground" data-testid="affiliate-statements-locked-hint">
          {t('sellerAffiliate.statementsLockedHint')}
        </p>
      ) : null}
    </div>
  );
}

export default function AdminAffiliatePage() {
  return <AffiliateHomeContent />;
}
