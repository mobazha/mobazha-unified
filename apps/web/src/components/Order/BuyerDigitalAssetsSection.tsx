'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Download,
  ExternalLink,
  Key,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  ShieldOff,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useI18n, digitalAssetsApi } from '@mobazha/core';
import type { BuyerAssetEntry, BuyerAssetStatus, BuyerLicenseEntry } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export interface BuyerDigitalAssetsSectionProps {
  orderId: string;
  className?: string;
}

const STATUS_META: Record<
  BuyerAssetStatus,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    labelKey: string;
    defaultLabel: string;
  }
> = {
  active: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/15',
    labelKey: 'order.digital.status.active',
    defaultLabel: 'Available',
  },
  protected: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/15',
    labelKey: 'order.digital.status.protected',
    defaultLabel: 'Available (protected)',
  },
  frozen: {
    icon: Lock,
    color: 'text-warning',
    bgColor: 'bg-warning/15',
    labelKey: 'order.digital.status.frozen',
    defaultLabel: 'Temporarily paused',
  },
  revoked: {
    icon: ShieldOff,
    color: 'text-destructive',
    bgColor: 'bg-destructive/15',
    labelKey: 'order.digital.status.revoked',
    defaultLabel: 'Access revoked',
  },
  expired: {
    icon: Clock,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    labelKey: 'order.digital.status.expired',
    defaultLabel: 'Expired',
  },
};

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[Math.min(i, units.length - 1)]}`;
}

/**
 * Returns true for HTTP responses that effectively mean "this order has no
 * digital entitlements on this node" — render an empty state instead of an
 * error banner.
 *
 * - 401/403: buyer auth not in scope for this order (e.g. cross-tenant or
 *   anon buyer hitting a SaaS node) → safe to hide the section
 * - 404/410: order known but no entitlements / revoked
 * - 501:    digital assets subsystem disabled on this node (Outpost build,
 *           feature flag off)
 *
 * 5xx other than 501 still surfaces because it indicates a real failure.
 */
function isMissingEntitlementsError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 401 || status === 403 || status === 404 || status === 410 || status === 501) {
    return true;
  }
  // Some helpers attach the code on `err.code` instead of HTTP status; treat
  // backend `NOT_IMPLEMENTED` envelope errors the same way.
  const code = (err as { code?: string })?.code;
  if (code === 'NOT_IMPLEMENTED' || code === 'FEATURE_DISABLED') {
    return true;
  }
  return false;
}

export function BuyerDigitalAssetsSection({ orderId, className }: BuyerDigitalAssetsSectionProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [assets, setAssets] = useState<BuyerAssetEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Reset on dependency change (orderId / refreshKey). React-hooks/set-state-in-effect
    // flags this as a cascading-render risk, but here it's the entry point for an async
    // fetch — we want loading=true visible immediately so a stale "no entitlements"
    // empty state doesn't flash before the new request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    digitalAssetsApi
      .getBuyerDigitalAssets(orderId)
      .then(data => {
        if (cancelled) return;
        setAssets(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Silent-empty-state degradation: errors that mean "this order
        // simply has no digital deliveries on this node" should render
        // nothing rather than shouting "load failed" on a normal physical
        // order page (TD-111B). The fallthrough surfaces only true errors
        // (network failures, 5xx other than 501, unexpected payloads).
        if (isMissingEntitlementsError(err)) {
          setAssets([]);
          return;
        }
        const message =
          err instanceof Error
            ? err.message
            : t('common.unknownError', { defaultValue: 'Unknown error' });
        setError(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, refreshKey, t]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleCopy = useCallback(
    async (text: string, labelDefault: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast({
          title: t('common.copied', { defaultValue: 'Copied' }),
          description: t('order.digital.copiedToClipboard', {
            defaultValue: `${labelDefault} copied to clipboard`,
          }),
        });
      } catch {
        toast({
          title: t('common.error', { defaultValue: 'Error' }),
          description: t('order.digital.copyFailed', {
            defaultValue: 'Failed to copy to clipboard',
          }),
          variant: 'destructive',
        });
      }
    },
    [t, toast]
  );

  const hasAssets = useMemo(() => Array.isArray(assets) && assets.length > 0, [assets]);

  // Render nothing if there are no entitlements (avoids empty card noise on physical-only orders)
  if (!loading && !error && !hasAssets) {
    return null;
  }

  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">
            {t('order.digital.title', { defaultValue: 'Digital downloads' })}
          </h2>
        </div>
        {hasAssets && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            aria-label={t('common.refresh', { defaultValue: 'Refresh' })}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>
        )}
      </div>

      {loading && !assets && (
        <div className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">
            {t('order.digital.loading', { defaultValue: 'Loading your downloads…' })}
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">
              {t('order.digital.loadError', { defaultValue: 'Could not load digital deliveries' })}
            </p>
            <p className="text-xs opacity-80 mt-0.5">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={handleRefresh}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        </div>
      )}

      {assets && assets.length > 0 && (
        <div className="space-y-3">
          {assets.map(asset => (
            <DigitalAssetCard key={asset.assetId} asset={asset} onCopy={handleCopy} />
          ))}
        </div>
      )}
    </Card>
  );
}

interface DigitalAssetCardProps {
  asset: BuyerAssetEntry;
  onCopy: (text: string, labelDefault: string) => void;
}

function DigitalAssetCard({ asset, onCopy }: DigitalAssetCardProps) {
  const { t } = useI18n();
  const meta = STATUS_META[asset.status] ?? STATUS_META.frozen;
  const StatusIcon = meta.icon;
  const accessible = asset.status === 'active' || asset.status === 'protected';

  const typeLabel = useMemo(() => {
    switch (asset.assetType) {
      case 'file':
        return t('digital.assetType.file', { defaultValue: 'File download' });
      case 'link':
        return t('digital.assetType.link', { defaultValue: 'Access link' });
      case 'license_key':
        return t('digital.assetType.license_key', { defaultValue: 'License key' });
      default:
        return asset.assetType;
    }
  }, [asset.assetType, t]);

  const TypeIcon =
    asset.assetType === 'file' ? FileText : asset.assetType === 'link' ? ExternalLink : Key;

  return (
    <div className="rounded-lg border border-border p-4 bg-card">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
          <TypeIcon className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {asset.fileName ||
                (asset.assetType === 'link'
                  ? t('digital.assetType.link', { defaultValue: 'Access link' })
                  : asset.assetType === 'license_key'
                    ? t('digital.assetType.license_key', { defaultValue: 'License key' })
                    : t('digital.assetType.file', { defaultValue: 'File download' }))}
            </span>
            <Badge variant="outline" className="text-xs">
              {typeLabel}
            </Badge>
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
                meta.bgColor,
                meta.color
              )}
            >
              <StatusIcon className="w-3 h-3" />
              <span>{t(meta.labelKey, { defaultValue: meta.defaultLabel })}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {asset.fileSize ? <span>{formatBytes(asset.fileSize)}</span> : null}
            {asset.maxDownloads > 0 && asset.assetType === 'file' && (
              <span>
                {t('order.digital.downloadsUsed', {
                  current: asset.downloadCount,
                  max: asset.maxDownloads,
                  defaultValue: `${asset.downloadCount} / ${asset.maxDownloads} downloads used`,
                })}
              </span>
            )}
            {asset.expiresAt && (
              <span>
                {t('order.digital.expiresAt', {
                  defaultValue: 'Access expires {{date}}',
                  date: new Date(asset.expiresAt).toLocaleString(),
                })}
              </span>
            )}
          </div>

          {!accessible && asset.restrictedReason && (
            <p className="text-xs text-muted-foreground italic">{asset.restrictedReason}</p>
          )}

          {accessible && asset.assetType === 'file' && asset.downloadURL && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => {
                window.open(asset.downloadURL, '_blank', 'noopener,noreferrer');
              }}
            >
              <Download className="w-4 h-4 mr-1" />
              {t('order.digital.download', { defaultValue: 'Download' })}
            </Button>
          )}

          {accessible && asset.assetType === 'link' && asset.deliveryURL && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  window.open(asset.deliveryURL, '_blank', 'noopener,noreferrer');
                }}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                {t('order.digital.openLink', { defaultValue: 'Open link' })}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onCopy(
                    asset.deliveryURL as string,
                    t('digital.assetType.link', { defaultValue: 'Link' })
                  )
                }
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                {t('common.copy', { defaultValue: 'Copy' })}
              </Button>
            </div>
          )}

          {accessible &&
            asset.assetType === 'license_key' &&
            Array.isArray(asset.licenseKeys) &&
            asset.licenseKeys.length > 0 && (
              <div className="space-y-2 mt-1">
                {asset.licenseKeys.map((lic, idx) => (
                  <LicenseKeyRow key={`${asset.assetId}-${idx}`} entry={lic} onCopy={onCopy} />
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

interface LicenseKeyRowProps {
  entry: BuyerLicenseEntry;
  onCopy: (text: string, labelDefault: string) => void;
}

function LicenseKeyRow({ entry, onCopy }: LicenseKeyRowProps) {
  const { t } = useI18n();
  const showActivations = typeof entry.maxActivations === 'number' && entry.maxActivations > 0;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
      <code className="text-sm font-mono flex-1 break-all">{entry.licenseKey}</code>
      <div className="flex flex-col items-end shrink-0 text-xs text-muted-foreground">
        {entry.licenseType && <span className="uppercase">{entry.licenseType}</span>}
        {showActivations && entry.maxActivations !== undefined && (
          <span>
            {t('order.digital.activationsUsed', {
              current: entry.activations,
              max: entry.maxActivations,
              defaultValue: `${entry.activations} / ${entry.maxActivations} seats`,
            })}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          onCopy(
            entry.licenseKey,
            t('digital.assetType.license_key', { defaultValue: 'License key' })
          )
        }
        aria-label={t('common.copy', { defaultValue: 'Copy' })}
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );
}

export default BuyerDigitalAssetsSection;
