'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  collectiblesApi,
  resolveCollectibleRedemptionPhase,
  useI18n,
  type CollectibleRedemption,
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
      </CollectiblesFeatureGuard>
    </div>
  );
}
