'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  collectiblesApi,
  resolveCollectibleRedemptionPhase,
  useI18n,
  type CollectibleRedemption,
  type CollectiblePendingMintRecoveryReport,
} from '@mobazha/core';
import { CollectiblesFeatureGuard } from '@/app/collectibles/CollectiblesFeatureGuard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Package } from 'lucide-react';

export default function CollectiblesHubOpsPage() {
  const { t } = useI18n();
  const { toast } = useToast();

  const [redemptionId, setRedemptionId] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [redemption, setRedemption] = useState<CollectibleRedemption | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<'ship' | 'settle' | null>(null);
  const [recoveryLimit, setRecoveryLimit] = useState('25');
  const [recoveryRoyaltyBps, setRecoveryRoyaltyBps] = useState('0');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryReport, setRecoveryReport] = useState<CollectiblePendingMintRecoveryReport | null>(
    null
  );

  const loadRedemption = useCallback(async () => {
    const id = redemptionId.trim();
    if (!id) return;
    setLoading(true);
    try {
      const result = await collectiblesApi.getCollectibleRedemption(id);
      setRedemption(result);
      setTrackingNo(result.trackingNo?.trim() ?? '');
    } catch (err) {
      setRedemption(null);
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.loadFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setLoading(false);
    }
  }, [redemptionId, t, toast]);

  const handleShip = useCallback(async () => {
    const id = redemptionId.trim();
    const tracking = trackingNo.trim();
    if (!id || !tracking) return;
    setActing('ship');
    try {
      const updated = await collectiblesApi.shipCollectibleRedemption(id, { trackingNo: tracking });
      setRedemption(updated);
      toast({ title: t('collectibles.hubOps.shipSuccess'), variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.shipFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setActing(null);
    }
  }, [redemptionId, trackingNo, t, toast]);

  const handleSettle = useCallback(async () => {
    const id = redemptionId.trim();
    if (!id) return;
    setActing('settle');
    try {
      const updated = await collectiblesApi.settleCollectibleRedemption(id);
      setRedemption(updated);
      toast({ title: t('collectibles.hubOps.settleSuccess'), variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.settleFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setActing(null);
    }
  }, [redemptionId, t, toast]);

  const handleRecoverMints = useCallback(async () => {
    const limit = Number.parseInt(recoveryLimit, 10);
    const royaltyBps = Number.parseInt(recoveryRoyaltyBps, 10);
    setRecoveryLoading(true);
    try {
      const report = await collectiblesApi.recoverCollectiblePendingMints({
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        royaltyBps: Number.isFinite(royaltyBps) && royaltyBps >= 0 ? royaltyBps : undefined,
      });
      setRecoveryReport(report);
      toast({ title: t('collectibles.hubOps.recoverSuccess'), variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.recoverFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setRecoveryLoading(false);
    }
  }, [recoveryLimit, recoveryRoyaltyBps, t, toast]);

  const phase = redemption ? resolveCollectibleRedemptionPhase(redemption) : null;
  const canShip = phase === 'redeem_requested';
  const canSettle = phase === 'shipped';

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <CollectiblesFeatureGuard>
        <div className="flex items-start gap-3">
          <Package className="mt-1 h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {t('collectibles.hubOps.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('collectibles.hubOps.subtitle')}
            </p>
          </div>
        </div>

        <Card className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="redemption-id">
              {t('collectibles.hubOps.redemptionId')}
            </label>
            <div className="flex gap-2">
              <Input
                id="redemption-id"
                value={redemptionId}
                onChange={event => setRedemptionId(event.target.value)}
                placeholder={t('collectibles.hubOps.redemptionIdPlaceholder')}
              />
              <Button type="button" onClick={() => void loadRedemption()} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('collectibles.hubOps.load')
                )}
              </Button>
            </div>
          </div>

          {redemption ? (
            <dl className="grid grid-cols-1 gap-3 border-t pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">{t('collectibles.tracking.statusLabel')}</dt>
                <dd className="font-medium text-foreground">
                  {phase ? t(`collectibles.tracking.phase.${phase}`) : redemption.status}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('collectibles.tracking.nftMint')}</dt>
                <dd className="break-all font-medium text-foreground">{redemption.nftMint}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">{t('collectibles.redeem.wallet')}</dt>
                <dd className="break-all font-medium text-foreground">
                  {redemption.requesterWallet}
                </dd>
              </div>
            </dl>
          ) : null}
        </Card>

        {redemption ? (
          <Card className="space-y-4 p-4">
            <h2 className="text-sm font-semibold text-foreground">
              {t('collectibles.hubOps.fulfillmentTitle')}
            </h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="tracking-no">
                {t('collectibles.tracking.trackingNumber')}
              </label>
              <Input
                id="tracking-no"
                value={trackingNo}
                onChange={event => setTrackingNo(event.target.value)}
                disabled={!canShip && !canSettle}
                placeholder={t('collectibles.hubOps.trackingPlaceholder')}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleShip()}
                disabled={!canShip || !trackingNo.trim() || acting !== null}
              >
                {acting === 'ship' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('collectibles.hubOps.ship')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleSettle()}
                disabled={!canSettle || acting !== null}
              >
                {acting === 'settle' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('collectibles.hubOps.settle')}
              </Button>
              <Button asChild variant="outline">
                <Link href={`/collectibles/redeem/${redemption.redemptionID}`}>
                  {t('collectibles.hubOps.viewBuyerTracking')}
                </Link>
              </Button>
            </div>

            {!canShip && !canSettle ? (
              <p className="text-sm text-muted-foreground">{t('collectibles.hubOps.noActions')}</p>
            ) : null}
          </Card>
        ) : null}

        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t('collectibles.hubOps.mintRecoveryTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('collectibles.hubOps.mintRecoverySubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="recovery-limit">
                {t('collectibles.hubOps.recoveryLimit')}
              </label>
              <Input
                id="recovery-limit"
                type="number"
                min={1}
                max={100}
                value={recoveryLimit}
                onChange={event => setRecoveryLimit(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="recovery-royalty">
                {t('collectibles.hubOps.royaltyBps')}
              </label>
              <Input
                id="recovery-royalty"
                type="number"
                min={0}
                max={10000}
                value={recoveryRoyaltyBps}
                onChange={event => setRecoveryRoyaltyBps(event.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleRecoverMints()}
              disabled={recoveryLoading}
            >
              {recoveryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('collectibles.hubOps.recoverMints')}
            </Button>
          </div>

          {recoveryReport ? (
            <div className="space-y-3 border-t pt-4">
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">{t('collectibles.hubOps.attempted')}</dt>
                  <dd className="font-medium text-foreground">{recoveryReport.attempted}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('collectibles.hubOps.recovered')}</dt>
                  <dd className="font-medium text-foreground">{recoveryReport.recovered}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('collectibles.hubOps.skipped')}</dt>
                  <dd className="font-medium text-foreground">{recoveryReport.skipped}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('collectibles.hubOps.failed')}</dt>
                  <dd className="font-medium text-foreground">{recoveryReport.failed}</dd>
                </div>
              </dl>

              {recoveryReport.items?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    {t('collectibles.hubOps.recentResults')}
                  </p>
                  <div className="space-y-2">
                    {recoveryReport.items.slice(0, 5).map(item => (
                      <div
                        key={`${item.hubSlotID}-${item.txSignature || item.status}`}
                        className="rounded-md border p-3 text-xs"
                      >
                        <p className="break-all font-mono text-foreground">{item.hubSlotID}</p>
                        <p className="mt-1 text-muted-foreground">{item.status}</p>
                        {item.message ? (
                          <p className="mt-1 break-words text-muted-foreground">{item.message}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </CollectiblesFeatureGuard>
    </div>
  );
}
