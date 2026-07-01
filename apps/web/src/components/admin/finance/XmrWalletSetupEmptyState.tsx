'use client';

import { Link } from 'react-router-dom';
import { ShieldAlert, Clock } from 'lucide-react';
import { useI18n, getAdminXmrWalletPath } from '@mobazha/core';
import { Button } from '@/components/ui/button';

/**
 * Primary empty state when an Sovereign has no Monero wallet yet.
 * Used on /admin/finance and surfaced from onboarding step 3.
 */
export function XmrWalletSetupEmptyState() {
  const { t } = useI18n();

  return (
    <div
      className="rounded-xl border border-border bg-card p-6 sm:p-8 text-center"
      data-testid="xmr-wallet-setup-empty"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="h-7 w-7 text-destructive" />
      </div>

      <h2 className="text-lg font-semibold text-foreground">
        {t('admin.finance.walletNotSetUpTitle', {
          defaultValue: 'Monero wallet not set up',
        })}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        {t('admin.finance.walletNotSetUpDesc', {
          defaultValue:
            'Buyers cannot pay with XMR until you create or restore a wallet. The setup takes about a minute.',
        })}
      </p>

      <div className="mt-6 flex flex-col items-center gap-3">
        <Button asChild size="lg" className="min-h-[44px] px-8">
          <Link to={getAdminXmrWalletPath()}>
            {t('admin.finance.walletNotSetUpCta', {
              defaultValue: 'Set up Monero wallet',
            })}
          </Link>
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {t('admin.finance.walletNotSetUpHint', {
            defaultValue: 'After setup, balance, withdrawals, and history appear here.',
          })}
        </p>
      </div>
    </div>
  );
}
