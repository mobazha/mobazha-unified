'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useI18n,
  getAdminXmrWalletPath,
  getAdminXmrWithdrawPath,
  getAdminXmrSecretsPath,
  getAdminXmrTransfersPath,
} from '@mobazha/core';
import { getBrandNetworkConfig } from '@mobazha/core/config/env';
import { getPaymentRPCStatus, type PaymentRPCStatusEntry } from '@mobazha/core/services/api/system';
import {
  getXMRBalance,
  getXMRWalletSetupStatus,
  isWalletOperational,
  piconeroToXMR,
  type MoneroBalance,
  type MoneroWalletSetupStatus,
} from '@mobazha/core/services/api/monero';
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  History,
  KeyRound,
  RefreshCw,
  Server,
  Terminal,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XmrWalletSetupEmptyState } from '@/components/admin/finance';
import {
  isWalletNotProvisionedMessage,
  sanitizeUserFacingError,
} from '@/lib/sanitizeUserFacingError';

function WalletStatusBadge({
  walletSetup,
  connected,
  error,
}: {
  walletSetup: MoneroWalletSetupStatus;
  connected: boolean;
  error?: string;
}) {
  const { t } = useI18n();

  if (!walletSetup.exists) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
        <WifiOff className="w-3 h-3" />
        {t('admin.finance.walletNotSetUpBadge', { defaultValue: 'Wallet not set up' })}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
        connected
          ? 'bg-green-500/10 text-green-600 dark:text-green-400'
          : 'bg-red-500/10 text-red-600 dark:text-red-400'
      }`}
      title={error}
    >
      {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {connected
        ? t('sovereign.rpcConnected', { defaultValue: 'Connected' })
        : t('admin.finance.walletDisconnected', { defaultValue: 'Not connected' })}
    </span>
  );
}

interface ActionCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  disabled?: boolean;
  disabledHint?: string;
}

function ActionCard({
  to,
  icon: Icon,
  title,
  description,
  disabled = false,
  disabledHint,
}: ActionCardProps) {
  const className =
    'flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors';

  const inner = (
    <>
      <div
        className={`rounded-lg p-2 shrink-0 ${
          disabled ? 'bg-muted/50 text-muted-foreground/50' : 'bg-muted text-muted-foreground'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium ${
            disabled ? 'text-muted-foreground' : 'text-foreground'
          }`}
        >
          {title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {disabled && disabledHint ? disabledHint : description}
        </p>
      </div>
      {!disabled && <ChevronRight className="mt-0.5 w-4 h-4 text-muted-foreground shrink-0" />}
    </>
  );

  if (disabled) {
    return (
      <div className={`${className} opacity-70 cursor-not-allowed`} aria-disabled="true">
        {inner}
      </div>
    );
  }

  return (
    <Link to={to} className={`${className} hover:bg-muted/30`}>
      {inner}
    </Link>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function NotSovereignPlaceholder() {
  const { t } = useI18n();
  return (
    <div className="space-y-4" data-testid="admin-funds-placeholder">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.finance.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('admin.finance.notApplicable')}</p>
      </div>
    </div>
  );
}

function needsWalletSetup(
  walletSetup: MoneroWalletSetupStatus | null,
  status: PaymentRPCStatusEntry | null | undefined
): boolean {
  if (!walletSetup || !walletSetup.exists) {
    return true;
  }
  return isWalletNotProvisionedMessage(status?.error);
}

type SetupFetchState = 'pending' | 'ok' | 'failed';

export default function AdminFinancePage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<PaymentRPCStatusEntry | null | undefined>(undefined);
  const [walletSetup, setWalletSetup] = useState<MoneroWalletSetupStatus | null>(null);
  const [setupFetchState, setSetupFetchState] = useState<SetupFetchState>('pending');
  const [balance, setBalance] = useState<MoneroBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showNodePoolUI = getBrandNetworkConfig().showNodePoolUI;

  const sanitizeOptions = useMemo(
    () => ({
      walletNotProvisioned: t('admin.finance.walletNotProvisioned', {
        defaultValue:
          'Monero wallet is not set up yet. Create or restore a wallet to accept XMR payments.',
      }),
      walletNotOpen: t('admin.finance.walletNotOpen', {
        defaultValue: 'Monero wallet is not open. Restart the store or complete wallet setup.',
      }),
      generic: t('admin.finance.fetchError'),
    }),
    [t]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [statusResult, balanceResult, setupResult] = await Promise.allSettled([
      getPaymentRPCStatus(),
      getXMRBalance(),
      getXMRWalletSetupStatus(),
    ]);

    let nextStatus: PaymentRPCStatusEntry | null = null;
    if (statusResult.status === 'fulfilled') {
      nextStatus = statusResult.value.xmr || null;
      setStatus(nextStatus);
    } else {
      setStatus(null);
    }

    let nextSetup: MoneroWalletSetupStatus | null = null;
    if (setupResult.status === 'fulfilled') {
      nextSetup = setupResult.value;
      setWalletSetup(nextSetup);
      setSetupFetchState('ok');
    } else {
      setSetupFetchState('failed');
    }

    const walletMissing =
      (setupResult.status === 'fulfilled' && needsWalletSetup(nextSetup, nextStatus)) ||
      (setupResult.status === 'rejected' && isWalletNotProvisionedMessage(nextStatus?.error));

    const nextBalance = balanceResult.status === 'fulfilled' ? balanceResult.value : null;
    const walletOperational = isWalletOperational(nextStatus, nextSetup);

    if (balanceResult.status === 'fulfilled') {
      setBalance(nextBalance);
    } else {
      setBalance(null);
      if (!walletMissing && !walletOperational) {
        const raw =
          balanceResult.reason instanceof Error
            ? balanceResult.reason.message
            : t('admin.finance.fetchError');
        setError(sanitizeUserFacingError(raw, sanitizeOptions));
      }
    }

    if (walletMissing) {
      setError(null);
    } else if (nextStatus?.error && !nextBalance && !walletOperational) {
      setError(sanitizeUserFacingError(nextStatus.error, sanitizeOptions));
    }

    setLoading(false);
  }, [sanitizeOptions, t]);

  useEffect(() => {
    if (!__SOVEREIGN__) return;
    refresh();
  }, [refresh]);

  if (!__SOVEREIGN__) {
    return <NotSovereignPlaceholder />;
  }

  const walletStatusPending = setupFetchState === 'pending' && loading;
  const walletMissing =
    setupFetchState === 'ok'
      ? needsWalletSetup(walletSetup, status)
      : isWalletNotProvisionedMessage(status?.error);
  const walletStatusUnknown = setupFetchState === 'failed' && !walletMissing;
  const isConnected = Boolean(status?.connected);
  const availableNow = balance ? piconeroToXMR(balance.unlockedBalance) : null;
  const pendingAmount =
    balance && balance.balance !== balance.unlockedBalance
      ? piconeroToXMR((BigInt(balance.balance) - BigInt(balance.unlockedBalance)).toString())
      : null;

  const disabledActionHint = t('admin.finance.actionRequiresWallet', {
    defaultValue: 'Set up your Monero wallet first.',
  });

  return (
    <div className="space-y-6" data-testid="admin-funds">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.finance.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('admin.finance.subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={loading}
          className="min-h-[44px] self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {walletStatusPending && loading ? (
        <Card>
          <CardContent className="py-10">
            <div className="h-32 rounded-lg bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ) : walletMissing ? (
        <XmrWalletSetupEmptyState />
      ) : walletStatusUnknown ? (
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('admin.finance.walletStatusUnknown')}
            </p>
            <Button type="button" variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Monero (XMR)
                </CardTitle>
                {status !== undefined && walletSetup && (
                  <WalletStatusBadge
                    walletSetup={walletSetup}
                    connected={isConnected}
                    error={status?.error}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading && !balance ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-24 rounded-lg bg-muted animate-pulse" />
                  <div className="h-24 rounded-lg bg-muted animate-pulse" />
                </div>
              ) : balance ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('admin.finance.availableBalance')}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                      {availableNow}{' '}
                      <span className="text-base font-normal text-muted-foreground">XMR</span>
                    </p>
                    {balance.blocksToUnlock != null && balance.blocksToUnlock > 0 && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                        {t('sovereign.xmrWithdraw.blocksToUnlock', { n: balance.blocksToUnlock })}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {t('admin.finance.pendingConfirmation')}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                      {pendingAmount ?? '0'}{' '}
                      <span className="text-base font-normal text-muted-foreground">XMR</span>
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {t('admin.finance.pendingHint')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('admin.finance.balanceUnavailable')}
                </p>
              )}
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('admin.finance.quickActionsTitle')}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionCard
                to={getAdminXmrWithdrawPath()}
                icon={ArrowUpRight}
                title={t('admin.finance.withdrawTitle')}
                description={t('admin.finance.withdrawDesc')}
                disabled={walletMissing}
                disabledHint={disabledActionHint}
              />
              <ActionCard
                to={getAdminXmrTransfersPath()}
                icon={History}
                title={t('admin.finance.transactionsTitle')}
                description={t('admin.finance.transactionsDesc')}
                disabled={walletMissing}
                disabledHint={disabledActionHint}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('admin.finance.walletManagementTitle')}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <ActionCard
                to={getAdminXmrWalletPath()}
                icon={Wallet}
                title={t('admin.finance.setupWalletTitle')}
                description={t('admin.finance.setupWalletDesc')}
              />
              <ActionCard
                to={getAdminXmrSecretsPath()}
                icon={KeyRound}
                title={t('admin.finance.exportSecretsTitle')}
                description={t('admin.finance.exportSecretsDesc')}
                disabled={walletMissing}
                disabledHint={disabledActionHint}
              />
              {showNodePoolUI && (
                <ActionCard
                  to="/admin/settings/monero-nodes"
                  icon={Server}
                  title={t('admin.finance.manageNodesTitle')}
                  description={t('admin.finance.manageNodesDesc')}
                />
              )}
            </div>
          </section>

          {showNodePoolUI && (
            <CollapsibleSection title={t('admin.finance.advancedTitle')}>
              {status !== undefined && status ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Terminal className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {t('admin.finance.rpcEndpointLabel')}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono truncate">
                        {status.endpoint || t('sovereign.rpcDisconnected')}
                      </p>
                    </div>
                  </div>
                  {status.error && (
                    <p className="text-xs text-destructive">
                      {sanitizeUserFacingError(status.error, sanitizeOptions)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('admin.finance.rpcConfigHint')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('admin.finance.rpcNotAvailable')}
                </p>
              )}
            </CollapsibleSection>
          )}
        </>
      )}
    </div>
  );
}
