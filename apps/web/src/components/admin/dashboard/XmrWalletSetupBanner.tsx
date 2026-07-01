'use client';

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, ShieldAlert } from 'lucide-react';
import { useI18n, getAdminXmrWalletPath } from '@mobazha/core';
import {
  getXMRWalletSetupStatus,
  type MoneroWalletSetupStatus,
} from '@mobazha/core/services/api/monero';

/**
 * XmrWalletSetupBanner — sovereign-only dashboard prompt.
 *
 * Visibility:
 *   - Non-sovereign build:          renders nothing
 *   - Fetch failed:               swallow silently (don't pollute dashboard
 *                                 just because the setup endpoint is
 *                                 momentarily unhappy — the payment status
 *                                 panel will surface wallet-rpc outages)
 *   - exists=false:               loud red banner — prompt operator to run
 *                                 the setup wizard before payments work
 *   - exists=true, backup not
 *     confirmed:                  amber reminder — payments still work but
 *                                 the seed isn't proven backed up
 *   - exists=true, walletOpen
 *     =false:                     amber warning — wallet metadata exists
 *                                 but wallet-rpc isn't serving it (auto-open
 *                                 failed at boot, e.g. password mismatch)
 *   - exists=true, walletOpen
 *     =true, backupConfirmed:     renders nothing (all good)
 *
 * One fetch on mount, no polling — the wizard page itself refreshes when
 * the operator returns.
 */
export function XmrWalletSetupBanner() {
  const { t } = useI18n();
  const [status, setStatus] = useState<MoneroWalletSetupStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!__SOVEREIGN__) return;
    let cancelled = false;
    getXMRWalletSetupStatus()
      .then(s => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!__SOVEREIGN__) return null;
  if (failed) return null;
  if (!status) return null;

  // All-good state: render nothing.
  if (status.exists && status.walletOpen && status.backupConfirmed) {
    return null;
  }

  if (!status.exists) {
    // First-run state: highest urgency.
    return (
      <div
        role="alert"
        className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-destructive/10 border border-destructive/30"
      >
        <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t('admin.dashboard.xmrWalletMissingTitle', {
              defaultValue: 'Monero wallet not set up',
            })}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('admin.dashboard.xmrWalletMissingDesc', {
              defaultValue:
                'XMR payments will fail until you create or restore a wallet. The setup takes about a minute.',
            })}
          </p>
          <Link
            to={getAdminXmrWalletPath()}
            className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-destructive hover:underline"
          >
            {t('admin.dashboard.xmrWalletSetupCta', { defaultValue: 'Set up wallet' })} →
          </Link>
        </div>
      </div>
    );
  }

  // Provisioned but in a degraded state (no walletOpen or backup not confirmed).
  const showBackupReminder = !status.backupConfirmed;
  const showReopenWarning = !status.walletOpen;

  return (
    <Link
      to={getAdminXmrWalletPath()}
      className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
    >
      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {showReopenWarning
            ? t('admin.dashboard.xmrWalletNotOpenTitle', {
                defaultValue: 'Monero wallet not open',
              })
            : t('admin.dashboard.xmrWalletBackupTitle', {
                defaultValue: 'Verify your Monero wallet backup',
              })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {showReopenWarning
            ? t('admin.dashboard.xmrWalletNotOpenDesc', {
                defaultValue:
                  'Wallet metadata exists but wallet-rpc is not serving it. Restart the node to retry auto-open.',
              })
            : showBackupReminder
              ? t('admin.dashboard.xmrWalletBackupDesc', {
                  defaultValue:
                    "Confirm you've recorded the 25-word seed safely. Without it, you cannot recover funds.",
                })
              : ''}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
    </Link>
  );
}
