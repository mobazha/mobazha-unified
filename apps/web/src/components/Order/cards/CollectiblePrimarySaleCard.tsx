'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Loader2, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useI18n,
  useCollectiblePrimarySale,
  useCollectibleNFT,
  isCollectiblePrimarySaleOrder,
  parseCollectibleOrderMetadata,
  resolveCollectiblePrimarySalePhase,
  resolveCollectiblePrimarySalePhaseMessageKey,
  resolveCollectibleMintErrorMessageKey,
  parseSubmittedMintTxFromError,
  getEnvConfig,
  type CollectiblePrimarySalePhase,
  type Order,
} from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { CollectibleOnChainProof } from '@/components/collectibles/CollectibleOnChainProof';

interface CollectiblePrimarySaleCardProps {
  orderId: string;
  coreOrder?: Order | null;
  enabled?: boolean;
  className?: string;
}

const PHASE_CONFIG: Record<
  CollectiblePrimarySalePhase,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  awaiting_payment: { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  awaiting_bridge: { icon: Clock, color: 'text-warning', bgColor: 'bg-warning/15' },
  awaiting_hub: { icon: Package, color: 'text-info', bgColor: 'bg-info/15' },
  payout_pending: { icon: Loader2, color: 'text-info', bgColor: 'bg-info/15' },
  payout_complete: { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/15' },
  payout_failed: { icon: AlertCircle, color: 'text-destructive', bgColor: 'bg-destructive/15' },
};

function isOrderPaymentVerified(coreOrder?: Order | null): boolean {
  if (!coreOrder) return false;
  if (coreOrder.paymentState?.verificationStatus === 'verified') return true;
  const fundedStates = new Set([
    'AWAITING_SHIPMENT',
    'PARTIALLY_SHIPPED',
    'SHIPPED',
    'COMPLETED',
    'DISPUTED',
    'DECIDED',
    'RESOLVED',
    'PAYMENT_FINALIZED',
  ]);
  return fundedStates.has(coreOrder.state);
}

export function CollectiblePrimarySaleCard({
  orderId,
  coreOrder,
  enabled = true,
  className,
}: CollectiblePrimarySaleCardProps) {
  const { t } = useI18n();
  const fiatMetadata = coreOrder?.paymentState?.fiatMetadata;
  const orderMeta = useMemo(() => parseCollectibleOrderMetadata(fiatMetadata), [fiatMetadata]);
  const isCollectibleOrder = enabled && isCollectiblePrimarySaleOrder(fiatMetadata);
  const paymentVerified = isOrderPaymentVerified(coreOrder);

  const { primarySale, loading, error } = useCollectiblePrimarySale(orderId, isCollectibleOrder);
  const nftMint = primarySale?.nftMint?.trim() || orderMeta?.nftMint;
  const { nft: mintedNft } = useCollectibleNFT(nftMint, isCollectibleOrder && !!nftMint?.trim());

  if (!isCollectibleOrder) {
    return null;
  }

  const phase = resolveCollectiblePrimarySalePhase(primarySale, paymentVerified);
  const phaseMessageKey = resolveCollectiblePrimarySalePhaseMessageKey(phase, primarySale);
  const isHubMinting = phaseMessageKey === 'awaiting_hub_minting';
  const phaseConfig = PHASE_CONFIG[phase];
  const PhaseIcon = isHubMinting ? Loader2 : phaseConfig.icon;
  const certNumber = orderMeta?.certNumber;
  const hubSlotID = primarySale?.hubSlotID || orderMeta?.hubSlotID;
  const mintErrorKey = primarySale?.lastMintError
    ? resolveCollectibleMintErrorMessageKey(primarySale.lastMintError)
    : null;
  const pendingMintTx = parseSubmittedMintTxFromError(primarySale?.lastMintError);

  const phaseMessageI18nKey = `collectibles.primarySale.phase.${phaseMessageKey}` as const;
  const mintErrorI18nKey = mintErrorKey
    ? (`collectibles.primarySale.mintErrors.${mintErrorKey}` as const)
    : null;

  return (
    <Card className={cn('p-4', className)} data-testid="collectible-primary-sale-card">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            phaseConfig.bgColor
          )}
        >
          <PhaseIcon
            className={cn(
              'h-4 w-4',
              phaseConfig.color,
              (phase === 'payout_pending' || isHubMinting) && 'animate-spin'
            )}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('collectibles.primarySale.title')}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{t(phaseMessageI18nKey)}</p>
          </div>

          {(certNumber || hubSlotID) && (
            <dl className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
              {certNumber && (
                <div>
                  <dt className="text-muted-foreground">
                    {t('collectibles.primarySale.certNumber')}
                  </dt>
                  <dd className="font-medium text-foreground">{certNumber}</dd>
                </div>
              )}
              {hubSlotID && (
                <div>
                  <dt className="text-muted-foreground">{t('collectibles.hubSlot')}</dt>
                  <dd className="font-medium text-foreground">{hubSlotID}</dd>
                </div>
              )}
            </dl>
          )}

          {nftMint && (
            <Link
              href={`/collectibles/${encodeURIComponent(nftMint)}`}
              className="inline-flex text-xs font-medium text-primary hover:underline"
            >
              {t('collectibles.primarySale.viewNft')}
            </Link>
          )}

          {mintedNft?.mintTxSignature ? (
            <CollectibleOnChainProof
              className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"
              mintTxSignature={mintedNft.mintTxSignature}
              mintConfirmedSlot={mintedNft.mintConfirmedSlot}
              isDevnet={getEnvConfig().isTestEnv}
            />
          ) : null}

          {primarySale?.lastMintError && mintErrorI18nKey ? (
            <p className="break-words text-xs text-destructive">{t(mintErrorI18nKey)}</p>
          ) : null}

          {pendingMintTx && !mintedNft?.mintTxSignature ? (
            <CollectibleOnChainProof
              className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2"
              mintTxSignature={pendingMintTx}
              isDevnet={getEnvConfig().isTestEnv}
            />
          ) : null}

          {loading && <p className="text-xs text-muted-foreground">{t('common.loading')}</p>}

          {error && phase !== 'payout_failed' && (
            <p className="text-xs text-destructive">{t('collectibles.primarySale.loadFailed')}</p>
          )}

          {phase === 'payout_failed' && primarySale?.releaseError && (
            <p className="text-xs text-muted-foreground">
              {t('collectibles.primarySale.supportHint')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
