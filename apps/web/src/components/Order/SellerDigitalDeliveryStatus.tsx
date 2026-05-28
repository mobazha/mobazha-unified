'use client';

import React, { memo, useCallback, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Key,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useI18n, digitalAssetsApi } from '@mobazha/core';
import type { DigitalAssetInfo, MaskedLicenseKey } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export interface SellerDigitalDeliveryStatusProps {
  isDigitalOrder: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  assetCount: number;
  hasPreconfiguredAssets: boolean;
  status:
    | 'not_digital'
    | 'ready'
    | 'delivered'
    | 'manual_required'
    | 'pending'
    | 'restricted'
    | null;
  error: string | null;
  canSyncDelivery?: boolean;
  canRetryDelivery?: boolean;
  onSyncDelivery: () => Promise<boolean>;
  onRetryDelivery?: () => Promise<boolean>;
  listingSlug?: string;
  onManageListing?: (slug: string) => void;
  refreshStatus?: () => void;
  orderId?: string;
  listingSlugs?: string[];
  className?: string;
  /** stacked: primary actions below copy (guest order drawer); inline: actions beside title */
  actionLayout?: 'inline' | 'stacked';
}

export const SellerDigitalDeliveryStatus = memo(function SellerDigitalDeliveryStatus({
  isDigitalOrder,
  isLoading,
  isSyncing,
  assetCount,
  hasPreconfiguredAssets,
  status,
  error,
  canSyncDelivery = true,
  canRetryDelivery = false,
  onSyncDelivery,
  onRetryDelivery,
  listingSlug,
  onManageListing,
  refreshStatus,
  orderId,
  listingSlugs,
  className,
  actionLayout = 'inline',
}: SellerDigitalDeliveryStatusProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [assets, setAssets] = useState<DigitalAssetInfo[] | null>(null);
  const [licenseKeys, setLicenseKeys] = useState<MaskedLicenseKey[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isDelivered = status === 'delivered';
  const detailListingSlugs = React.useMemo(
    () => Array.from(new Set([...(listingSlugs ?? []), listingSlug].filter(Boolean) as string[])),
    [listingSlug, listingSlugs]
  );

  const handleToggleExpand = useCallback(() => {
    setExpanded(prev => {
      const next = !prev;
      if (next && assets === null && orderId && isDelivered) {
        setDetailLoading(true);
        Promise.all(detailListingSlugs.map(slug => digitalAssetsApi.listAssets(slug)))
          .then(async results => {
            const mergedAssets = results
              .flat()
              .filter((asset, index, arr) => arr.findIndex(item => item.id === asset.id) === index);
            setAssets(mergedAssets);

            const licenseAssetSlugs = Array.from(
              new Set(
                mergedAssets
                  .filter(asset => asset.assetType === 'license_key')
                  .map(asset => asset.listingSlug)
                  .filter(Boolean)
              )
            );
            if (!licenseAssetSlugs.length || !orderId) {
              setLicenseKeys([]);
              return;
            }
            const licenseResults = await Promise.all(
              licenseAssetSlugs.map(slug => digitalAssetsApi.listLicenseKeys(slug))
            );
            const matching = licenseResults
              .flat()
              .filter(key => key.orderId === orderId)
              .filter((key, index, arr) => arr.findIndex(item => item.id === key.id) === index);
            setLicenseKeys(matching);
          })
          .catch(() => {
            setAssets([]);
            setLicenseKeys([]);
          })
          .finally(() => setDetailLoading(false));
      }
      return next;
    });
  }, [assets, detailListingSlugs, isDelivered, orderId]);

  const handleCopy = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text).then(() => {
        toast({
          title: t('common.copied', { defaultValue: 'Copied' }),
        });
      });
    },
    [t, toast]
  );

  if (!isDigitalOrder) {
    return null;
  }

  const isReady = status === 'ready';
  const isManualRequired = status === 'manual_required';
  // Title/description use hasPreconfiguredAssets; keep the manage CTA on the same predicate
  // so guest orders that infer digital locally but return not_digital/pending still get the button.
  const needsAssetConfiguration = !hasPreconfiguredAssets && !isDelivered && !isReady && !isLoading;
  const isAttention =
    Boolean(error) || isManualRequired || needsAssetConfiguration || status === 'restricted';
  const Icon = isLoading ? Loader2 : isAttention ? AlertCircle : CheckCircle2;
  const showSyncAction = isDelivered && canSyncDelivery;
  const showRetryAction = isReady && canRetryDelivery && onRetryDelivery;
  const manageListingSlug = listingSlug && onManageListing ? listingSlug : null;
  const showManageAction =
    Boolean(manageListingSlug) && (isManualRequired || needsAssetConfiguration);
  const title = isDelivered
    ? t('order.digitalDelivery.deliveredTitle')
    : hasPreconfiguredAssets
      ? isReady
        ? t('order.digitalDelivery.readyTitle')
        : t('order.digitalDelivery.pendingTitle')
      : t('order.digitalDelivery.manualTitle');
  const description = isLoading
    ? t('order.digitalDelivery.checking')
    : isDelivered
      ? t('order.digitalDelivery.deliveredDesc', { count: assetCount })
      : hasPreconfiguredAssets
        ? isReady
          ? canRetryDelivery
            ? t('order.digitalDelivery.readyDesc', { count: assetCount })
            : t('order.digitalDelivery.readyDescAwaitingPayment', { count: assetCount })
          : t('order.digitalDelivery.pendingDesc')
        : t('order.digitalDelivery.manualDesc');

  const showRefreshAction =
    (isManualRequired || needsAssetConfiguration) && !isLoading && refreshStatus;
  const actionButtons = (
    <>
      {showManageAction && (
        <Button
          type="button"
          size="sm"
          variant={actionLayout === 'stacked' ? 'default' : 'outline'}
          onClick={() => manageListingSlug && onManageListing?.(manageListingSlug)}
          className={cn('h-10', actionLayout === 'stacked' && 'min-h-[44px] flex-1')}
        >
          <ExternalLink className="w-4 h-4 mr-1.5" />
          {t('order.digitalDelivery.manageAssets')}
        </Button>
      )}
      {showRefreshAction && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={refreshStatus}
          className={cn('h-10', actionLayout === 'stacked' && 'h-11 w-11 shrink-0 px-0')}
          aria-label={t('order.digitalDelivery.refreshStatus')}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
      {showRetryAction && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void onRetryDelivery();
          }}
          disabled={isLoading || isSyncing}
          className={cn('h-10', actionLayout === 'stacked' && 'min-h-[44px] w-full sm:w-auto')}
        >
          <RefreshCw className={cn('w-4 h-4 mr-1.5', isSyncing && 'animate-spin')} />
          {isSyncing ? t('common.processing') : t('order.actions.retryDigitalDelivery')}
        </Button>
      )}
      {showSyncAction && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void onSyncDelivery();
          }}
          disabled={isLoading || isSyncing}
          className={cn('h-10', actionLayout === 'stacked' && 'min-h-[44px] w-full sm:w-auto')}
        >
          <RefreshCw className={cn('w-4 h-4 mr-1.5', isSyncing && 'animate-spin')} />
          {isSyncing ? t('common.processing') : t('order.digitalDelivery.syncAction')}
        </Button>
      )}
    </>
  );
  const hasActionButtons =
    showManageAction || showRefreshAction || showRetryAction || showSyncAction;

  return (
    <Card
      className={cn(
        'p-4 border',
        isAttention ? 'border-warning/30 bg-warning/5' : 'border-success/30 bg-success/5',
        className
      )}
      data-testid="seller-digital-delivery-status"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-md flex items-center justify-center shrink-0',
            isAttention ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
          )}
        >
          <Icon className={cn('w-5 h-5', isLoading && 'animate-spin')} />
        </div>
        <div className="min-w-0 flex-1">
          {actionLayout === 'inline' ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              </div>
              {hasActionButtons && <div className="flex gap-2 shrink-0">{actionButtons}</div>}
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
              {hasActionButtons && <div className="mt-3 flex gap-2">{actionButtons}</div>}
            </>
          )}

          {/* Progressive disclosure: delivered items detail */}
          {isDelivered && orderId && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleToggleExpand}
              >
                {expanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                {expanded
                  ? t('order.digitalDelivery.hideDeliveredItems', {
                      defaultValue: 'Hide delivered items',
                    })
                  : t('order.digitalDelivery.viewDeliveredItems', {
                      defaultValue: 'View delivered items',
                    })}
              </button>

              {expanded && (
                <div className="mt-2 space-y-1.5">
                  {detailLoading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{t('common.loading', { defaultValue: 'Loading…' })}</span>
                    </div>
                  )}
                  {assets?.map(asset => (
                    <DeliveredAssetRow
                      key={asset.id}
                      asset={asset}
                      orderLicenseKeys={licenseKeys ?? []}
                      onCopy={handleCopy}
                    />
                  ))}
                  {!detailLoading && assets?.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('order.digitalDelivery.noItemsFound', {
                        defaultValue: 'No delivery records found.',
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
});

function DeliveredAssetRow({
  asset,
  orderLicenseKeys,
  onCopy,
}: {
  asset: DigitalAssetInfo;
  orderLicenseKeys: MaskedLicenseKey[];
  onCopy: (text: string) => void;
}) {
  const TypeIcon = asset.assetType === 'file' ? FileText : asset.assetType === 'link' ? Link2 : Key;
  const matchingLicenseKeys =
    asset.assetType === 'license_key'
      ? orderLicenseKeys.filter(key => key.orderId && key.orderId.length > 0)
      : [];
  const label =
    asset.fileName ||
    (asset.assetType === 'link'
      ? asset.url
      : asset.assetType === 'license_key' && matchingLicenseKeys[0]
        ? matchingLicenseKeys[0].maskedKey
        : asset.assetType === 'license_key'
          ? asset.fileName || 'License key'
          : asset.assetType);

  const copyValue =
    asset.assetType === 'link'
      ? asset.url
      : asset.assetType === 'license_key'
        ? matchingLicenseKeys[0]?.maskedKey
        : undefined;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-background/60 border border-border/30 text-xs">
      <TypeIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="flex-1 min-w-0 truncate text-foreground">{label}</span>
      {copyValue && (
        <button
          type="button"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onCopy(copyValue)}
        >
          <Copy className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export default SellerDigitalDeliveryStatus;
