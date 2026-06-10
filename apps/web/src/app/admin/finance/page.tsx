'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
  piconeroToXMR,
  type MoneroBalance,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function StatusBadge({ connected, error }: { connected: boolean; error?: string }) {
  const { t } = useI18n();
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
      {connected ? t('outpost.rpcConnected') : t('outpost.rpcDisconnected')}
    </span>
  );
}

interface ActionCardProps {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

function ActionCard({ to, icon: Icon, title, description }: ActionCardProps) {
  return (
    <Link
      to={to}
      className="flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
    >
      <div className="rounded-lg bg-muted p-2 text-muted-foreground shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="mt-0.5 w-4 h-4 text-muted-foreground shrink-0" />
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

function NotOutpostPlaceholder() {
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

export default function AdminFinancePage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<PaymentRPCStatusEntry | null | undefined>(undefined);
  const [balance, setBalance] = useState<MoneroBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const showNodePoolUI = getBrandNetworkConfig().showNodePoolUI;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [statusResult, balanceResult] = await Promise.allSettled([
      getPaymentRPCStatus(),
      getXMRBalance(),
    ]);

    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value.xmr || null);
    } else {
      setStatus(null);
    }

    if (balanceResult.status === 'fulfilled') {
      setBalance(balanceResult.value);
    } else {
      setBalance(null);
      setError(
        balanceResult.reason instanceof Error
          ? balanceResult.reason.message
          : t('admin.finance.fetchError')
      );
    }

    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (!__OUTPOST__) return;
    refresh();
  }, [refresh]);

  if (!__OUTPOST__) {
    return <NotOutpostPlaceholder />;
  }

  const isConnected = Boolean(status?.connected);
  const availableNow = balance ? piconeroToXMR(balance.unlockedBalance) : null;
  const totalBalance = balance ? piconeroToXMR(balance.balance) : null;
  const pendingAmount =
    balance && balance.balance !== balance.unlockedBalance
      ? piconeroToXMR((BigInt(balance.balance) - BigInt(balance.unlockedBalance)).toString())
      : null;

  return (
    <div className="space-y-6" data-testid="admin-funds">
      {/* Page header */}
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

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* L1: Balance overview — hero area */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Monero (XMR)
            </CardTitle>
            {status !== undefined && <StatusBadge connected={isConnected} error={status?.error} />}
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
                    {t('outpost.xmrWithdraw.blocksToUnlock', { n: balance.blocksToUnlock })}
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
            <p className="text-sm text-muted-foreground">{t('admin.finance.balanceUnavailable')}</p>
          )}
        </CardContent>
      </Card>

      {/* L2: Quick actions */}
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
          />
          <ActionCard
            to={getAdminXmrTransfersPath()}
            icon={History}
            title={t('admin.finance.transactionsTitle')}
            description={t('admin.finance.transactionsDesc')}
          />
        </div>
      </section>

      {/* L3: Wallet management (collapsible) */}
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

      {/* L4: Advanced config (collapsed by default) */}
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
                  {status.endpoint || t('outpost.rpcDisconnected')}
                </p>
              </div>
            </div>
            {status.error && <p className="text-xs text-destructive">{status.error}</p>}
            <p className="text-xs text-muted-foreground">{t('admin.finance.rpcConfigHint')}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin.finance.rpcNotAvailable')}</p>
        )}
      </CollapsibleSection>
    </div>
  );
}
