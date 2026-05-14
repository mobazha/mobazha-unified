'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { getBrandNetworkConfig } from '@mobazha/core/config/env';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  XCircle,
} from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  addMoneroNode,
  getMoneroNodes,
  removeMoneroNode,
  switchMoneroNode,
  type MoneroNodeInfo,
  type MoneroNodePoolSnapshot,
} from '@mobazha/core/services/api/monero';

/**
 * Monero NodePool admin page (Outpost only)
 *
 * Exposes the four NodePool admin endpoints:
 *   list / add / remove / switch
 *
 * Three operational states distinguished:
 *   1) Non-outpost build       → page renders a friendly "not available"
 *   2) Outpost + NodePool off  → snapshot.available === false (legacy single-daemon)
 *   3) Outpost + NodePool on   → normal list + add/remove/switch
 */

function StatusPill({
  ok,
  label,
  warnLabel,
  emptyLabel,
  state,
}: {
  ok: boolean;
  label: string;
  warnLabel?: string;
  emptyLabel?: string;
  state: 'ok' | 'warn' | 'empty';
}) {
  const styles =
    state === 'ok'
      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : state === 'warn'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'bg-muted text-muted-foreground';
  const Icon = state === 'ok' ? CheckCircle2 : state === 'warn' ? AlertCircle : Circle;
  const text = state === 'ok' ? label : state === 'warn' ? warnLabel || label : emptyLabel || label;
  // ok unused at runtime but kept for prop symmetry; eslint will not flag this.
  void ok;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${styles}`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const palette: Record<string, string> = {
    'seed-embedded': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    discovered: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    'user-added': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  };
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded ${palette[source] || 'bg-muted text-muted-foreground'}`}
    >
      {source}
    </span>
  );
}

function HealthCell({ node }: { node: MoneroNodeInfo }) {
  const { t } = useI18n();
  if (node.suspicious) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <XCircle className="w-3.5 h-3.5" />
        {t('outpost.nodes.suspicious', { defaultValue: 'Suspicious' })}
      </span>
    );
  }
  if (node.failStreak > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
        <AlertCircle className="w-3.5 h-3.5" />
        {t('outpost.nodes.failStreak', {
          defaultValue: 'Fail streak: {{n}}',
          n: node.failStreak,
        })}
      </span>
    );
  }
  if (node.successStreak > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('outpost.nodes.successStreak', {
          defaultValue: 'Healthy ({{n}})',
          n: node.successStreak,
        })}
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      {t('outpost.nodes.notProbed', { defaultValue: 'Not yet probed' })}
    </span>
  );
}

function formatLastChecked(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const ageMs = Date.now() - date.getTime();
  if (ageMs < 60_000) return `${Math.max(1, Math.floor(ageMs / 1000))}s ago`;
  if (ageMs < 3_600_000) return `${Math.floor(ageMs / 60_000)}m ago`;
  if (ageMs < 86_400_000) return `${Math.floor(ageMs / 3_600_000)}h ago`;
  return date.toLocaleDateString();
}

export default function MoneroNodesPage() {
  const { t } = useI18n();
  // White-label gating: a partner brand may hide the NodePool surface
  // entirely (Asgardium baseline) or expose it read-only without the
  // custom-node form (The Market Place pattern). Diagnostics columns are
  // gated separately so partners can show the active node + pool size
  // without leaking latency/fail-streak data that suggests "go fix it".
  // See docs/privacy/OUTPOST_MONEROD_NETWORK_DESIGN.md § OP-MP-4.
  const networkBrand = getBrandNetworkConfig();
  const showNodePoolUI = networkBrand.showNodePoolUI;
  const allowUserCustomNode = networkBrand.allowUserCustomNode;
  const showAdvancedDiagnostics = networkBrand.showAdvancedDiagnostics;

  const [snapshot, setSnapshot] = useState<MoneroNodePoolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // address being mutated (or "add")

  // Add-node form state
  const [newAddress, setNewAddress] = useState('');
  const [newOperator, setNewOperator] = useState('');

  const refresh = useCallback(
    async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const snap = await getMoneroNodes();
        setSnapshot(snap);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('outpost.nodes.loadError', { defaultValue: 'Failed to load Monero nodes' })
        );
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    // Skip the network round-trip when the brand has hidden the surface
    // — even if the user navigates here directly we shouldn't probe
    // /v1/system/monero/nodes when the partner has chosen to keep the
    // pool out of the UI.
    if (!__OUTPOST__ || !showNodePoolUI) {
      setLoading(false);
      return;
    }
    refresh(true);
  }, [refresh, showNodePoolUI]);

  const showToast = useCallback((msg: string) => {
    setSuccess(msg);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newAddress.trim();
      if (!trimmed) return;
      setBusy('add');
      setError(null);
      try {
        await addMoneroNode({ address: trimmed, operator: newOperator.trim() || undefined });
        setNewAddress('');
        setNewOperator('');
        await refresh();
        showToast(t('outpost.nodes.addSuccess', { defaultValue: 'Node added' }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('outpost.nodes.addError', { defaultValue: 'Failed to add node' })
        );
      } finally {
        setBusy(null);
      }
    },
    [newAddress, newOperator, refresh, showToast, t]
  );

  const handleSwitch = useCallback(
    async (address: string) => {
      setBusy(address);
      setError(null);
      try {
        const updated = await switchMoneroNode(address);
        setSnapshot(updated);
        showToast(t('outpost.nodes.switchSuccess', { defaultValue: 'Wallet-rpc rebound' }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('outpost.nodes.switchError', { defaultValue: 'Failed to switch node' })
        );
      } finally {
        setBusy(null);
      }
    },
    [showToast, t]
  );

  const handleRemove = useCallback(
    async (address: string) => {
      // Confirm by leveraging the platform-default confirm UX. We deliberately
      // do not block on a modal — this is a low-risk operation (user-added
      // nodes only) and an extra confirm step adds friction.
      if (
        !window.confirm(
          t('outpost.nodes.removeConfirm', {
            defaultValue: 'Remove this node from the pool? You can re-add it later.',
          })
        )
      ) {
        return;
      }
      setBusy(address);
      setError(null);
      try {
        await removeMoneroNode(address);
        await refresh();
        showToast(t('outpost.nodes.removeSuccess', { defaultValue: 'Node removed' }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : t('outpost.nodes.removeError', { defaultValue: 'Failed to remove node' })
        );
      } finally {
        setBusy(null);
      }
    },
    [refresh, showToast, t]
  );

  const candidates = useMemo(() => snapshot?.candidates ?? [], [snapshot]);
  const activeAddress = snapshot?.active?.address;

  // Non-outpost build OR brand has hidden the NodePool surface: render an
  // explanatory placeholder. We don't 404 because the page may still be
  // linked from elsewhere (older docs, bookmarks) and the message is
  // more useful than a blank screen.
  if (!__OUTPOST__ || !showNodePoolUI) {
    return (
      <div>
        <SettingsPageHeader
          title={t('outpost.nodes.title', { defaultValue: 'Monero Nodes' })}
          description={t('outpost.nodes.description', {
            defaultValue: 'Manage the Monero daemon NodePool that backs your wallet.',
          })}
          backHref="/admin/settings/payments"
        />
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {!__OUTPOST__
              ? t('outpost.nodes.notApplicable', {
                  defaultValue: 'This page is only available on Outpost builds.',
                })
              : t('outpost.nodes.brandHidden', {
                  defaultValue:
                    'Node pool management is not exposed in this build. Your administrator manages Monero daemons silently.',
                })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="admin-monero-nodes">
      <SettingsPageHeader
        title={t('outpost.nodes.title', { defaultValue: 'Monero Nodes' })}
        description={t('outpost.nodes.description', {
          defaultValue: 'Manage the Monero daemon NodePool that backs your wallet.',
        })}
        backHref="/admin/settings/payments"
      />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-500/50 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        {/* Status banner */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                {t('outpost.nodes.statusTitle', { defaultValue: 'Pool status' })}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refresh(true)}
                disabled={loading}
                aria-label={t('outpost.nodes.refresh', { defaultValue: 'Refresh' })}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !snapshot ? (
              <div className="h-16 bg-muted animate-pulse rounded" />
            ) : !snapshot?.available ? (
              <div className="text-sm text-muted-foreground">
                {t('outpost.nodes.unavailable', {
                  defaultValue:
                    'NodePool is not configured. Wallet-rpc is bound to its static --daemon-address (legacy single-node mode).',
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    ok={snapshot.available}
                    label={t('outpost.nodes.statusAvailable', { defaultValue: 'NodePool on' })}
                    state={snapshot.available ? 'ok' : 'empty'}
                  />
                  <StatusPill
                    ok={snapshot.healthy}
                    label={t('outpost.nodes.statusHealthy', { defaultValue: 'Healthy' })}
                    warnLabel={t('outpost.nodes.statusUnhealthy', { defaultValue: 'Unhealthy' })}
                    state={snapshot.healthy ? 'ok' : 'warn'}
                  />
                  <StatusPill
                    ok={snapshot.monitorOn}
                    label={t('outpost.nodes.statusMonitorOn', { defaultValue: 'Monitor running' })}
                    warnLabel={t('outpost.nodes.statusMonitorOff', {
                      defaultValue: 'Monitor stopped',
                    })}
                    state={snapshot.monitorOn ? 'ok' : 'warn'}
                  />
                </div>
                {snapshot.active ? (
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {t('outpost.nodes.activeNode', { defaultValue: 'Active daemon' })}
                    </p>
                    <p className="text-sm font-mono break-all">{snapshot.active.address}</p>
                    {snapshot.active.operator && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {snapshot.active.operator}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    {t('outpost.nodes.noActive', {
                      defaultValue: 'No daemon is currently bound. Pick one below.',
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Candidates table */}
        {snapshot?.available && (
          <Card>
            <CardHeader>
              <CardTitle>
                {t('outpost.nodes.candidatesTitle', { defaultValue: 'Pool candidates' })}{' '}
                <span className="text-muted-foreground text-sm font-normal">
                  ({candidates.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 px-4">
                  {t('outpost.nodes.empty', {
                    defaultValue: 'No nodes in the pool. Add one below.',
                  })}
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">
                        {t('outpost.nodes.colAddress', { defaultValue: 'Address' })}
                      </th>
                      {showAdvancedDiagnostics && (
                        <>
                          <th className="text-left px-4 py-2 font-medium">
                            {t('outpost.nodes.colSource', { defaultValue: 'Source' })}
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            {t('outpost.nodes.colHealth', { defaultValue: 'Health' })}
                          </th>
                          <th className="text-left px-4 py-2 font-medium">
                            {t('outpost.nodes.colLastChecked', { defaultValue: 'Last checked' })}
                          </th>
                        </>
                      )}
                      <th className="text-right px-4 py-2 font-medium">
                        {t('outpost.nodes.colActions', { defaultValue: 'Actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map(node => {
                      const isActive = node.address === activeAddress;
                      const isUserAdded = node.source === 'user-added';
                      const rowBusy = busy === node.address;
                      return (
                        <tr
                          key={node.address}
                          className={`border-t border-border ${isActive ? 'bg-primary/5' : ''}`}
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-center gap-2">
                              {isActive && (
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                              )}
                              <span className="font-mono text-xs break-all">{node.address}</span>
                            </div>
                            {node.operator && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {node.operator}
                              </p>
                            )}
                          </td>
                          {showAdvancedDiagnostics && (
                            <>
                              <td className="px-4 py-3 align-top">
                                <SourceBadge source={node.source} />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <HealthCell node={node} />
                              </td>
                              <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                                {formatLastChecked(node.lastChecked)}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-3 align-top text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isActive || rowBusy}
                                onClick={() => handleSwitch(node.address)}
                                title={
                                  isActive
                                    ? t('outpost.nodes.alreadyActive', {
                                        defaultValue: 'Already active',
                                      })
                                    : t('outpost.nodes.switchTo', {
                                        defaultValue: 'Bind wallet-rpc to this node',
                                      })
                                }
                              >
                                {rowBusy ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  t('outpost.nodes.switch', { defaultValue: 'Switch' })
                                )}
                              </Button>
                              {isUserAdded && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isActive || rowBusy}
                                  onClick={() => handleRemove(node.address)}
                                  title={
                                    isActive
                                      ? t('outpost.nodes.cannotRemoveActive', {
                                          defaultValue:
                                            'Cannot remove the active node — switch first',
                                        })
                                      : t('outpost.nodes.remove', { defaultValue: 'Remove' })
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add-node form (only when NodePool is configured AND the brand
            allows custom node entry — Asgardium baseline keeps this off
            because pasting an arbitrary monerod RPC URL is a known
            phishing vector). */}
        {snapshot?.available && allowUserCustomNode && (
          <Card>
            <CardHeader>
              <CardTitle>{t('outpost.nodes.addTitle', { defaultValue: 'Add a node' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="monero-node-address" className="text-sm font-medium">
                    {t('outpost.nodes.fieldAddress', { defaultValue: 'Address' })}
                  </label>
                  <input
                    id="monero-node-address"
                    type="text"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    placeholder="node.example.b32.i2p:18089"
                    required
                    disabled={busy !== null}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('outpost.nodes.fieldAddressHint', {
                      defaultValue:
                        'I2P / Tor / clearnet host:port of a monerod RPC endpoint (port 18081 or 18089).',
                    })}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="monero-node-operator" className="text-sm font-medium">
                    {t('outpost.nodes.fieldOperator', { defaultValue: 'Operator (optional)' })}
                  </label>
                  <input
                    id="monero-node-operator"
                    type="text"
                    value={newOperator}
                    onChange={e => setNewOperator(e.target.value)}
                    placeholder="MoneroWorld"
                    disabled={busy !== null}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <Button type="submit" disabled={busy !== null || !newAddress.trim()}>
                  {busy === 'add' ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  {t('outpost.nodes.addButton', { defaultValue: 'Add node' })}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
