'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Key,
  Upload,
  AlertCircle,
  Loader2,
  ShieldOff,
  CheckCircle2,
  Clock,
  Ban,
  RefreshCw,
} from 'lucide-react';
import { useI18n, digitalAssetsApi } from '@mobazha/core';
import type { LicenseKeyPoolStats, MaskedLicenseKey } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export interface LicenseKeyPoolPanelProps {
  listingSlug: string;
  variantSku?: string;
  readOnly?: boolean;
  className?: string;
}

const STATUS_META: Record<
  MaskedLicenseKey['status'],
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    labelKey: string;
    defaultLabel: string;
  }
> = {
  available: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/15',
    labelKey: 'listing.digital.keyStatus.available',
    defaultLabel: 'Available',
  },
  dispensed: {
    icon: Key,
    color: 'text-info',
    bgColor: 'bg-info/15',
    labelKey: 'listing.digital.keyStatus.dispensed',
    defaultLabel: 'Dispensed',
  },
  revoked: {
    icon: ShieldOff,
    color: 'text-destructive',
    bgColor: 'bg-destructive/15',
    labelKey: 'listing.digital.keyStatus.revoked',
    defaultLabel: 'Revoked',
  },
  expired: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    labelKey: 'listing.digital.keyStatus.expired',
    defaultLabel: 'Expired',
  },
};

export function LicenseKeyPoolPanel({
  listingSlug,
  variantSku,
  readOnly = false,
  className,
}: LicenseKeyPoolPanelProps) {
  const { t } = useI18n();
  const { toast } = useToast();

  const [stats, setStats] = useState<LicenseKeyPoolStats | null>(null);
  const [keys, setKeys] = useState<MaskedLicenseKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Refetch when refreshKey changes — show loading=true immediately so a
    // stale empty state doesn't flash. Async fetch dwarfs any cascading-render
    // cost the rule warns about.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    Promise.all([
      digitalAssetsApi.getLicenseKeyPoolStats(listingSlug, variantSku),
      digitalAssetsApi.listLicenseKeys(listingSlug, variantSku, 100, 0),
    ])
      .then(([s, k]) => {
        if (cancelled) return;
        setStats(s);
        setKeys(Array.isArray(k) ? k : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : t('common.unknownError', { defaultValue: 'Unknown error' })
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingSlug, variantSku, refreshKey, t]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const handleRevoke = useCallback(async () => {
    if (!pendingRevokeId) return;
    const id = pendingRevokeId;
    setPendingRevokeId(null);
    try {
      await digitalAssetsApi.revokeLicenseKey(id);
      toast({
        title: t('listing.digital.keyRevoked', { defaultValue: 'License key revoked' }),
      });
      refresh();
    } catch (err) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description:
          err instanceof Error
            ? err.message
            : t('listing.digital.revokeFailed', {
                defaultValue: 'Failed to revoke license key',
              }),
        variant: 'destructive',
      });
    }
  }, [pendingRevokeId, refresh, t, toast]);

  const lowInventoryWarning = stats != null && stats.available < 5 && stats.available > 0;
  const outOfStock = stats != null && stats.available === 0 && stats.total > 0;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h3 className="text-base font-semibold">
            {t('listing.digital.licenseKeyPoolHeader', { defaultValue: 'License key pool' })}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
            aria-label={t('common.refresh', { defaultValue: 'Refresh' })}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
          {!readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              {t('listing.digital.importKeys', { defaultValue: 'Import keys' })}
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <PoolStatCell
            label={t('listing.digital.poolStats.available', { defaultValue: 'Available' })}
            value={stats.available}
            tone="success"
          />
          <PoolStatCell
            label={t('listing.digital.poolStats.dispensed', { defaultValue: 'Dispensed' })}
            value={stats.dispensed}
            tone="info"
          />
          <PoolStatCell
            label={t('listing.digital.poolStats.revoked', { defaultValue: 'Revoked' })}
            value={stats.revoked}
            tone="destructive"
          />
          <PoolStatCell
            label={t('listing.digital.poolStats.total', { defaultValue: 'Total' })}
            value={stats.total}
            tone="default"
          />
        </div>
      )}

      {outOfStock && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t('listing.digital.outOfStockWarning', {
              defaultValue:
                'No license keys available. New buyers will not receive a key until you import more.',
            })}
          </span>
        </div>
      )}
      {!outOfStock && lowInventoryWarning && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-warning/15 text-warning text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            {t('listing.digital.lowInventoryWarning', {
              defaultValue: 'Only {{n}} license keys left. Consider importing more.',
              n: stats?.available ?? 0,
            })}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button type="button" variant="ghost" size="sm" onClick={refresh}>
            {t('common.retry', { defaultValue: 'Retry' })}
          </Button>
        </div>
      )}

      {keys.length === 0 && !loading && !error && (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {t('listing.digital.emptyKeyPool', {
            defaultValue: 'No license keys yet. Import a CSV or paste keys to seed the pool.',
          })}
        </div>
      )}

      {keys.length > 0 && (
        <div className="rounded-md border border-border divide-y">
          {keys.map(k => {
            const meta = STATUS_META[k.status] ?? STATUS_META.available;
            const StatusIcon = meta.icon;
            return (
              <div
                key={k.id}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/30"
              >
                <code className="font-mono text-xs flex-1 break-all">{k.maskedKey}</code>
                <Badge variant="outline" className="text-xs uppercase">
                  {k.licenseType || 'standard'}
                </Badge>
                <div
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                    meta.bgColor,
                    meta.color
                  )}
                >
                  <StatusIcon className="w-3 h-3" />
                  {t(meta.labelKey, { defaultValue: meta.defaultLabel })}
                </div>
                {!readOnly && k.status === 'available' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingRevokeId(k.id)}
                    aria-label={t('listing.digital.revokeKey', { defaultValue: 'Revoke key' })}
                  >
                    <Ban className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showImport && (
        <ImportKeysDialog
          listingSlug={listingSlug}
          variantSku={variantSku}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            refresh();
          }}
        />
      )}

      {pendingRevokeId && (
        <Dialog open onOpenChange={open => !open && setPendingRevokeId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t('listing.digital.confirmRevokeTitle', { defaultValue: 'Revoke license key?' })}
              </DialogTitle>
              <DialogDescription>
                {t('listing.digital.confirmRevokeDesc', {
                  defaultValue:
                    'Buyers who have already received this key may lose access on next activation check. This cannot be undone.',
                })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPendingRevokeId(null)}>
                {t('common.cancel', { defaultValue: 'Cancel' })}
              </Button>
              <Button variant="destructive" onClick={handleRevoke}>
                {t('listing.digital.revokeKey', { defaultValue: 'Revoke key' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface PoolStatCellProps {
  label: string;
  value: number;
  tone: 'success' | 'info' | 'destructive' | 'default';
}

function PoolStatCell({ label, value, tone }: PoolStatCellProps) {
  const toneColor =
    tone === 'success'
      ? 'text-success'
      : tone === 'info'
        ? 'text-info'
        : tone === 'destructive'
          ? 'text-destructive'
          : 'text-foreground';
  return (
    <div className="rounded-md border border-border px-3 py-2 bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-semibold tabular-nums', toneColor)}>{value}</p>
    </div>
  );
}

// =====================================================================
// Import keys dialog
// =====================================================================

interface ImportKeysDialogProps {
  listingSlug: string;
  variantSku?: string;
  onClose: () => void;
  onImported: (count: number) => void;
}

function ImportKeysDialog({ listingSlug, variantSku, onClose, onImported }: ImportKeysDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [keysText, setKeysText] = useState('');
  const [licenseType, setLicenseType] = useState('standard');
  const [maxActivations, setMaxActivations] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const parsedKeys = useMemo(
    () =>
      keysText
        .split(/[\r\n,]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0),
    [keysText]
  );

  const handleImport = async () => {
    if (parsedKeys.length === 0) return;
    setSubmitting(true);
    try {
      let expiresAtRFC: string | undefined;
      if (expiresAt) {
        const d = new Date(expiresAt);
        if (!isNaN(d.getTime())) {
          expiresAtRFC = d.toISOString();
        }
      }
      const result = await digitalAssetsApi.importLicenseKeys({
        listingSlug,
        variantSku,
        keys: parsedKeys,
        licenseType: licenseType.trim() || undefined,
        maxActivations: maxActivations > 0 ? maxActivations : undefined,
        expiresAt: expiresAtRFC,
      });
      toast({
        title: t('listing.digital.keysImported', {
          defaultValue: '{{n}} keys imported',
          n: result.imported,
        }),
      });
      onImported(result.imported);
    } catch (err) {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description:
          err instanceof Error
            ? err.message
            : t('listing.digital.importFailed', { defaultValue: 'Failed to import keys' }),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={open => !open && !submitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('listing.digital.importKeysTitle', { defaultValue: 'Import license keys' })}
          </DialogTitle>
          <DialogDescription>
            {t('listing.digital.importKeysDesc', {
              defaultValue:
                'Paste keys one per line or comma-separated. Keys are hashed at rest — only masked previews are shown afterward.',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="keys-text">
              {t('listing.digital.keysLabel', { defaultValue: 'License keys' })}{' '}
              <span className="text-xs text-muted-foreground">({parsedKeys.length})</span>
            </Label>
            <Textarea
              id="keys-text"
              value={keysText}
              onChange={e => setKeysText(e.target.value)}
              placeholder={'XXXX-XXXX-XXXX-XXXX\nYYYY-YYYY-YYYY-YYYY\n...'}
              rows={8}
              disabled={submitting}
              className="mt-1 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="license-type">
                {t('listing.digital.licenseTypeLabel', {
                  defaultValue: 'License type',
                })}
              </Label>
              <Input
                id="license-type"
                value={licenseType}
                onChange={e => setLicenseType(e.target.value)}
                disabled={submitting}
                placeholder="standard"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="max-activations">
                {t('listing.digital.maxActivationsLabel', {
                  defaultValue: 'Max activations',
                })}
              </Label>
              <Input
                id="max-activations"
                type="number"
                min={0}
                value={maxActivations}
                onChange={e => setMaxActivations(Number(e.target.value) || 0)}
                disabled={submitting}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expires-at">
              {t('listing.digital.expiresAtLabel', {
                defaultValue: 'Expires at (optional)',
              })}
            </Label>
            <Input
              id="expires-at"
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              disabled={submitting}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleImport} disabled={parsedKeys.length === 0 || submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {t('listing.digital.importing', { defaultValue: 'Importing…' })}
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {t('listing.digital.importNKeys', {
                  defaultValue: 'Import {{n}} keys',
                  n: parsedKeys.length,
                })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LicenseKeyPoolPanel;
