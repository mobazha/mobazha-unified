// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  resolveCollateralAmountDisplay,
  resolveCollateralAmountUserLabel,
  resolveCollateralAssetDisplay,
  resolveCollateralAssetUserLabel,
  resolveCollateralProtectionStatusI18nKey,
  resolveCollectibleDepositProtectionStatus,
  type CollateralAccount,
  type CollateralProtectionStatus,
  type CollectibleSourceDeposit,
  type OrderCollateralVerifiedAllocationEvidence,
  useI18n,
} from '@mobazha/core';
import {
  CollectiblesTechnicalDetails,
  type CollectiblesTechnicalDetailRow,
} from './experience/CollectiblesTechnicalDetails';

export type CollectibleCollateralProtectionVariant = 'seller' | 'buyer' | 'operator';

export interface CollectibleCollateralProtectionSummaryProps {
  deposit: Pick<
    CollectibleSourceDeposit,
    'guaranteeAmount' | 'guaranteeCurrency' | 'collateralRequirementStatus'
  >;
  account?: CollateralAccount | null;
  verifiedAllocation?: OrderCollateralVerifiedAllocationEvidence | null;
  compact?: boolean;
  variant?: CollectibleCollateralProtectionVariant;
  className?: string;
}

const STATUS_VARIANT: Record<
  CollateralProtectionStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  'verified-allocation': 'default',
  funding: 'outline',
  declared: 'secondary',
  unsecured: 'secondary',
  impaired: 'destructive',
  expired: 'destructive',
};

const VARIANT_HINT_KEYS: Record<CollectibleCollateralProtectionVariant, string> = {
  seller: 'collectibles.collateral.protection.sellerHint',
  buyer: 'collectibles.collateral.protection.buyerHint',
  operator: 'collectibles.collateral.protection.operatorHint',
};

function formatTimestamp(value: string | undefined, locale: string): string | null {
  if (!value?.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(parsed)
  );
}

export function CollectibleCollateralProtectionSummary({
  deposit,
  account,
  verifiedAllocation = null,
  compact = false,
  variant = 'seller',
  className,
}: CollectibleCollateralProtectionSummaryProps) {
  const { t, locale } = useI18n();

  const hasDeclaration = Boolean(
    deposit.guaranteeAmount?.trim() ||
    deposit.guaranteeCurrency?.trim() ||
    deposit.collateralRequirementStatus?.trim()
  );
  const status = useMemo((): CollateralProtectionStatus => {
    if (verifiedAllocation) return 'verified-allocation';
    return resolveCollectibleDepositProtectionStatus({ deposit, account });
  }, [account, deposit, verifiedAllocation]);

  if (!hasDeclaration && !account && !verifiedAllocation) {
    return null;
  }

  const statusKey = resolveCollateralProtectionStatusI18nKey(status);
  const assetID =
    verifiedAllocation?.assetID?.trim() ||
    account?.assetID?.trim() ||
    deposit.guaranteeCurrency?.trim() ||
    null;
  const requiredAmount =
    verifiedAllocation?.amount?.trim() ||
    account?.requiredAmount?.trim() ||
    deposit.guaranteeAmount?.trim() ||
    null;
  const fundedAmount = verifiedAllocation ? undefined : account?.fundedAmount?.trim();
  const assetDisplay = resolveCollateralAssetDisplay(assetID ?? undefined);
  const requiredDisplay = resolveCollateralAmountDisplay(
    requiredAmount ?? undefined,
    assetID ?? undefined
  );
  const fundedDisplay = resolveCollateralAmountDisplay(fundedAmount, assetID ?? undefined);
  const expiresLabel = formatTimestamp(verifiedAllocation?.expiresAt ?? account?.expiresAt, locale);
  const fundingState = account?.funding?.state?.trim();
  const fundingError = account?.funding?.lastErrorCode?.trim();

  const hintKey = verifiedAllocation
    ? 'collectibles.collateral.protection.verifiedAllocationHint'
    : status === 'active'
      ? 'collectibles.collateral.protection.activeHint'
      : VARIANT_HINT_KEYS[variant];

  const technicalRows: CollectiblesTechnicalDetailRow[] = verifiedAllocation
    ? [
        {
          labelKey: 'collectibles.collateral.fields.assetId',
          value: verifiedAllocation.assetID,
          mono: true,
        },
        {
          labelKey: 'collectibles.collateral.fields.allocatedAmountBase',
          value: verifiedAllocation.amount,
          mono: true,
        },
        {
          labelKey: 'collectibles.collateral.fields.issuerPeerId',
          value: verifiedAllocation.issuerPeerID,
          mono: true,
        },
        {
          labelKey: 'collectibles.collateral.fields.extensionId',
          value: verifiedAllocation.extensionID,
          mono: true,
        },
        {
          labelKey: 'collectibles.collateral.fields.extensionRevision',
          value: String(verifiedAllocation.extensionRevision),
        },
        {
          labelKey: 'collectibles.collateral.fields.allocationRevision',
          value: String(verifiedAllocation.allocationRevision),
        },
        {
          labelKey: 'collectibles.collateral.fields.collateralRevision',
          value: String(verifiedAllocation.collateralRevision),
        },
        {
          labelKey: 'collectibles.collateral.fields.issuedAt',
          value: verifiedAllocation.issuedAt,
        },
        {
          labelKey: 'collectibles.collateral.fields.accountExpiresAt',
          value: verifiedAllocation.accountExpiresAt,
        },
      ]
    : [
        {
          labelKey: 'collectibles.collateral.fields.assetId',
          value: assetDisplay?.technicalAssetID ?? assetID ?? '',
          mono: true,
        },
        {
          labelKey: 'collectibles.collateral.fields.requiredAmountBase',
          value: requiredAmount ?? '',
          mono: true,
        },
        {
          labelKey: 'collectibles.collateral.fields.fundedAmountBase',
          value: fundedAmount ?? '',
          mono: true,
        },
        {
          labelKey: 'collectibles.collateral.fields.accountState',
          value: account?.state?.trim() ?? '',
        },
        {
          labelKey: 'collectibles.collateral.fields.fundingState',
          value: fundingState ?? '',
        },
        {
          labelKey: 'collectibles.collateral.fields.fundingError',
          value: fundingError ?? '',
          mono: true,
        },
      ];

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-muted/20',
        compact ? 'space-y-2 p-2.5' : 'space-y-3 p-3',
        className
      )}
      data-testid="collectible-collateral-protection-summary"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
          {t('collectibles.collateral.protection.title')}
        </p>
        <Badge
          variant={STATUS_VARIANT[status]}
          data-testid="collectible-collateral-protection-badge"
        >
          {t(statusKey)}
        </Badge>
      </div>

      <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
        {t(hintKey)}
      </p>

      {(assetDisplay || requiredDisplay || fundedDisplay || expiresLabel) && (
        <dl
          className={cn(
            'grid grid-cols-1 gap-2 sm:grid-cols-2',
            compact ? 'text-[11px]' : 'text-xs'
          )}
        >
          {assetDisplay ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t('collectibles.collateral.fields.guaranteeAsset')}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {resolveCollateralAssetUserLabel(assetDisplay, t)}
              </dd>
            </div>
          ) : null}
          {requiredDisplay ? (
            <div>
              <dt className="text-muted-foreground">
                {t(
                  verifiedAllocation
                    ? 'collectibles.collateral.fields.allocatedAmount'
                    : 'collectibles.collateral.fields.requiredAmount'
                )}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {resolveCollateralAmountUserLabel(requiredDisplay, t)}
              </dd>
            </div>
          ) : null}
          {fundedDisplay && !verifiedAllocation ? (
            <div>
              <dt className="text-muted-foreground">
                {t('collectibles.collateral.fields.fundedAmount')}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {resolveCollateralAmountUserLabel(fundedDisplay, t)}
              </dd>
            </div>
          ) : null}
          {expiresLabel ? (
            <div>
              <dt className="text-muted-foreground">
                {t(
                  verifiedAllocation
                    ? 'collectibles.collateral.fields.credentialExpiresAt'
                    : 'collectibles.collateral.fields.expiresAt'
                )}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">{expiresLabel}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {!compact ? <CollectiblesTechnicalDetails rows={technicalRows} /> : null}
    </div>
  );
}
