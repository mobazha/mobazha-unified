// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { setLoginRedirectPath, useI18n, useUserStore } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { ProvisionalCommissionStatementsPanel } from '@/components/DealCommission/ProvisionalCommissionStatementsPanel';

export default function PromoteCommissionsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);

  const handleRequireAuth = useCallback(() => {
    const returnPath = '/promote/commissions';
    setLoginRedirectPath(returnPath);
    router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div
        className="mx-auto max-w-2xl space-y-4 px-4 py-8"
        data-testid="promote-commissions-auth-required"
      >
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dealCommissionStatements.promoterPageTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('promote.commissionsAuthRequired')}</p>
        <Button type="button" className="min-h-11" onClick={handleRequireAuth}>
          {t('promote.signInCta')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" data-testid="promote-commissions-page">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dealCommissionStatements.promoterPageTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('dealCommissionStatements.promoterPageSubtitle')}
        </p>
      </div>

      <ProvisionalCommissionStatementsPanel audience="promoter" />
    </div>
  );
}
