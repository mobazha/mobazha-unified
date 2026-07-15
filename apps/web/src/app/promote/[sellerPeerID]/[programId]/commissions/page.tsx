// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { setLoginRedirectPath, useI18n, useUserStore } from '@mobazha/core';
import { Header } from '@/components';
import { Button } from '@/components/ui/button';
import { SellerAffiliateStatementsPanel } from '@/components/SellerAffiliate/SellerAffiliateStatementsPanel';

export default function PromoteCommissionsPage() {
  const params = useParams<{ sellerPeerID: string; programId: string }>();
  const sellerPeerID = typeof params?.sellerPeerID === 'string' ? params.sellerPeerID : undefined;
  const programID = typeof params?.programId === 'string' ? params.programId : undefined;
  const router = useRouter();
  const { t } = useI18n();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);

  const handleRequireAuth = useCallback(() => {
    if (!sellerPeerID || !programID) return;
    const returnPath = `/promote/${encodeURIComponent(sellerPeerID)}/${encodeURIComponent(programID)}/commissions`;
    setLoginRedirectPath(returnPath);
    router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [programID, router, sellerPeerID]);

  if (!sellerPeerID || !programID) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-sm text-destructive">{t('promote.invalidProgram')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <div
          className="mx-auto max-w-2xl space-y-4 px-4 py-8"
          data-testid="promote-commissions-auth-required"
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('sellerAffiliate.promoterStatementTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('promote.commissionsAuthRequired')}</p>
          <Button type="button" className="min-h-11" onClick={handleRequireAuth}>
            {t('promote.signInCta')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" data-testid="promote-commissions-page">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('sellerAffiliate.promoterStatementTitle')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('sellerAffiliate.statementDescription')}
          </p>
        </div>

        <SellerAffiliateStatementsPanel
          audience="promoter"
          promoterTarget={{ sellerPeerID, programID }}
        />
      </div>
    </div>
  );
}
