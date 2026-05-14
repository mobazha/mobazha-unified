'use client';

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@mobazha/core';
import { getPaymentRPCStatus, type PaymentRPCStatusEntry } from '@mobazha/core/services/api/system';
import {
  Wifi,
  WifiOff,
  Server,
  Terminal,
  Settings,
  ChevronRight,
  Wallet,
  ArrowUpRight,
  KeyRound,
  History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
      {connected
        ? t('outpost.rpcConnected', { defaultValue: 'Connected' })
        : t('outpost.rpcDisconnected', { defaultValue: 'Not configured' })}
    </span>
  );
}

function XmrSection() {
  const { t } = useI18n();
  const [status, setStatus] = useState<PaymentRPCStatusEntry | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getPaymentRPCStatus()
      .then(status => {
        if (cancelled) return;
        setStatus(status.xmr || null);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Monero (XMR)
            </CardTitle>
            <CardDescription className="mt-1">
              {t('outpost.xmrDesc', {
                defaultValue:
                  'Subaddress generation via monero-wallet-rpc. No sweep needed — funds are directly in your wallet.',
              })}
            </CardDescription>
          </div>
          {status !== undefined && (
            <StatusBadge connected={Boolean(status?.connected)} error={status?.error} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === undefined ? (
          <div className="h-16 bg-muted animate-pulse rounded" />
        ) : status ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <Terminal className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium">
                  {t('outpost.walletRpcUrl', { defaultValue: 'monero-wallet-rpc URL' })}
                </p>
                <p className="text-sm text-muted-foreground font-mono truncate">
                  {status.endpoint || 'Not configured'}
                </p>
              </div>
            </div>
            {status.error && <p className="text-xs text-destructive">{status.error}</p>}
            <p className="text-xs text-muted-foreground">
              {t('outpost.configViaStartup', {
                defaultValue:
                  'XMR payment is configured via startup parameters (--xmrwalletrpc). To change, restart the node with updated flags.',
              })}
            </p>
            <Link
              to="/admin/settings/payments/xmr-wallet"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                {t('outpost.manageWallet', {
                  defaultValue: 'Set up or manage Monero wallet',
                })}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/settings/payments/xmr-withdraw"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                {t('outpost.withdrawWallet', {
                  defaultValue: 'Withdraw Monero',
                })}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/settings/payments/xmr-secrets"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <KeyRound className="w-4 h-4 text-muted-foreground" />
                {t('outpost.exportSecrets', {
                  defaultValue: 'Export seed or view-only keys',
                })}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/settings/payments/xmr-transfers"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <History className="w-4 h-4 text-muted-foreground" />
                {t('outpost.viewTransactions', {
                  defaultValue: 'View transaction history',
                })}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link
              to="/admin/settings/monero-nodes"
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-muted-foreground" />
                {t('outpost.manageNodes', { defaultValue: 'Manage Monero nodes (NodePool)' })}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('outpost.xmrNotConfigured', {
                defaultValue:
                  'XMR wallet-rpc is not configured. Start the node with --xmrwalletrpc to enable Monero payments.',
              })}
            </p>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground">
                mobazha start --xmrwalletrpc=http://127.0.0.1:18082/json_rpc --xmraccount=0
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OutpostPaymentSettings() {
  return (
    <div className="space-y-6">
      <XmrSection />
    </div>
  );
}
