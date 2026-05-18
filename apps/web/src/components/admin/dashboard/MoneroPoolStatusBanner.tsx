'use client';

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ServerOff, ChevronRight } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { getBrandNetworkConfig } from '@mobazha/core/config/env';
import { getMoneroNodes, type MoneroNodePoolSnapshot } from '@mobazha/core/services/api/monero';

/**
 * MoneroPoolStatusBanner — outpost-only dashboard indicator.
 *
 * Visibility rules (designed to keep the dashboard quiet when everything
 * is fine, and loud when intervention is needed):
 *
 *   - Non-outpost build:        renders nothing
 *   - NodePool not configured:  renders nothing (legacy single-daemon, no
 *                               actionable state — Monero status on
 *                               /admin/finance covers it)
 *   - NodePool + healthy:       compact green chip with active daemon
 *   - NodePool + unhealthy:     full warning banner with CTA
 *   - Fetch failed:             swallow silently (do not stress the
 *                               dashboard for a degraded admin endpoint)
 *
 * The component intentionally does NOT poll — it fetches once on mount.
 * The Monero NodePool admin page is one click away (CTA) for users who
 * want the live, refreshable view.
 */
export function MoneroPoolStatusBanner() {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<MoneroNodePoolSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  // White-label brands may hide the NodePool surface entirely. When that
  // flag is off, the banner is meaningless (it links to a hidden page),
  // so we suppress it before issuing the round-trip too.
  const showNodePoolUI = getBrandNetworkConfig().showNodePoolUI;

  useEffect(() => {
    if (!__OUTPOST__ || !showNodePoolUI) return;
    let cancelled = false;
    getMoneroNodes()
      .then(snap => {
        if (!cancelled) setSnapshot(snap);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [showNodePoolUI]);

  if (!__OUTPOST__ || !showNodePoolUI) return null;
  if (failed) return null;
  if (!snapshot) return null;
  if (!snapshot.available) return null;

  const candidateCount = snapshot.candidates.length;

  if (snapshot.healthy && snapshot.active) {
    return (
      <Link
        to="/admin/settings/monero-nodes"
        className="flex items-center justify-between gap-3 px-3 py-2 mb-4 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          <span className="text-xs text-green-700 dark:text-green-300 truncate">
            {t('admin.dashboard.moneroPoolHealthy', {
              defaultValue: 'Monero pool · {{count}} node(s) · {{active}}',
              count: candidateCount,
              active: snapshot.active.address,
            })}
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
      </Link>
    );
  }

  // Unhealthy or no active node — actionable banner
  const Icon = snapshot.active ? AlertTriangle : ServerOff;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
    >
      <Icon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {snapshot.active
            ? t('admin.dashboard.moneroPoolUnhealthy', {
                defaultValue: 'Monero pool is unhealthy',
              })
            : t('admin.dashboard.moneroPoolNoActive', {
                defaultValue: 'Monero pool has no active daemon',
              })}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {snapshot.active
            ? t('admin.dashboard.moneroPoolUnhealthyDesc', {
                defaultValue:
                  'Wallet-rpc may fall back to its static daemon. Review NodePool health.',
              })
            : t('admin.dashboard.moneroPoolNoActiveDesc', {
                defaultValue: 'XMR payments and withdrawals will fail until a daemon is bound.',
              })}
        </p>
        <Link
          to="/admin/settings/monero-nodes"
          className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline"
        >
          {t('admin.dashboard.moneroPoolManage', { defaultValue: 'Manage Monero nodes' })} →
        </Link>
      </div>
    </div>
  );
}
