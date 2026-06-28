'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  collectiblesApi,
  resolveCollectibleRedemptionPhase,
  useI18n,
  type CollectiblePrimarySale,
  type CollectibleRedemption,
  type CollectiblePendingMintRecoveryReport,
  type CollectibleHubSlot,
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

  const [pendingRedemptions, setPendingRedemptions] = useState<CollectibleRedemption[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [releaseQueue, setReleaseQueue] = useState<CollectiblePrimarySale[]>([]);
  const [releaseQueueLoading, setReleaseQueueLoading] = useState(false);
  const [releaseRetryLoading, setReleaseRetryLoading] = useState(false);
  const [releaseRetryCount, setReleaseRetryCount] = useState<number | null>(null);

  const [recoveryLimit, setRecoveryLimit] = useState('25');
  const [recoveryRoyaltyBps, setRecoveryRoyaltyBps] = useState('0');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryReport, setRecoveryReport] = useState<CollectiblePendingMintRecoveryReport | null>(
    null
  );

  const [intakeCertNumber, setIntakeCertNumber] = useState('');
  const [intakeGrade, setIntakeGrade] = useState('');
  const [intakeSerial, setIntakeSerial] = useState('');
  const [intakeHubLocation, setIntakeHubLocation] = useState('');
  const [intakeCurrentHolder, setIntakeCurrentHolder] = useState('');
  const [intakeLoading, setIntakeLoading] = useState(false);

  const [hubSlots, setHubSlots] = useState<CollectibleHubSlot[]>([]);
  const [hubSlotsLoading, setHubSlotsLoading] = useState(false);
  const [slotActingId, setSlotActingId] = useState<string | null>(null);
  const [mintHolderDefault, setMintHolderDefault] = useState('');

  const loadRedemptionById = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) return;
      setRedemptionId(trimmed);
      setLoading(true);
      try {
        const result = await collectiblesApi.getCollectibleRedemption(trimmed);
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
    },
    [t, toast]
  );

  const loadRedemption = useCallback(async () => {
    await loadRedemptionById(redemptionId);
  }, [loadRedemptionById, redemptionId]);

  const loadHubSlots = useCallback(async () => {
    setHubSlotsLoading(true);
    try {
      const result = await collectiblesApi.listCollectibleHubSlots({
        page: 1,
        pageSize: 25,
      });
      setHubSlots(result.items ?? []);
    } catch (err) {
      setHubSlots([]);
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.queueLoadFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setHubSlotsLoading(false);
    }
  }, [t, toast]);

  const handleIntake = useCallback(async () => {
    const certNumber = intakeCertNumber.trim();
    if (!certNumber) return;
    setIntakeLoading(true);
    try {
      await collectiblesApi.intakeCollectibleHubSlot({
        certNumber,
        grade: intakeGrade.trim() || undefined,
        serial: intakeSerial.trim() || undefined,
        hubLocation: intakeHubLocation.trim() || undefined,
        currentHolder: intakeCurrentHolder.trim() || undefined,
      });
      setIntakeCertNumber('');
      setIntakeGrade('');
      setIntakeSerial('');
      setIntakeCurrentHolder('');
      toast({ title: t('collectibles.hubOps.intakeSuccess'), variant: 'success' });
      await loadHubSlots();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.intakeFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIntakeLoading(false);
    }
  }, [
    intakeCertNumber,
    intakeCurrentHolder,
    intakeGrade,
    intakeHubLocation,
    intakeSerial,
    loadHubSlots,
    t,
    toast,
  ]);

  const loadPendingRedemptions = useCallback(async () => {
    setPendingLoading(true);
    try {
      const result = await collectiblesApi.listCollectibleHubRedemptions({
        page: 1,
        pageSize: 25,
        status: 'redeem_requested',
      });
      setPendingRedemptions(result.items ?? []);
    } catch (err) {
      setPendingRedemptions([]);
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.queueLoadFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPendingLoading(false);
    }
  }, [t, toast]);

  const loadReleaseQueue = useCallback(async () => {
    setReleaseQueueLoading(true);
    try {
      const result = await collectiblesApi.listCollectiblePrimarySaleReleaseQueue({
        limit: 25,
        retryFailed: true,
      });
      setReleaseQueue(result.items ?? []);
    } catch (err) {
      setReleaseQueue([]);
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.queueLoadFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setReleaseQueueLoading(false);
    }
  }, [t, toast]);

  const handleReleaseRetry = useCallback(async () => {
    setReleaseRetryLoading(true);
    setReleaseRetryCount(null);
    try {
      const result = await collectiblesApi.retryCollectiblePrimarySaleReleases({ limit: 25 });
      setReleaseRetryCount(result.released);
      toast({ title: t('collectibles.hubOps.releaseRetrySuccess'), variant: 'success' });
      await loadReleaseQueue();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.releaseRetryFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setReleaseRetryLoading(false);
    }
  }, [loadReleaseQueue, t, toast]);

  const handleMintSlot = useCallback(
    async (slot: CollectibleHubSlot) => {
      const slotId = slot.hubSlotID;
      const holder = slot.currentHolder?.trim() || mintHolderDefault.trim();
      if (!holder) {
        toast({
          variant: 'destructive',
          title: t('collectibles.hubOps.mintFailed'),
          description: t('collectibles.hubOps.mintHolderRequired'),
        });
        return;
      }
      setSlotActingId(slotId);
      try {
        await collectiblesApi.mintCollectibleHubSlot(slotId, { holder, royaltyBps: 0 });
        toast({ title: t('collectibles.hubOps.mintSuccess'), variant: 'success' });
        await loadHubSlots();
        await loadReleaseQueue();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.hubOps.mintFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSlotActingId(null);
      }
    },
    [loadHubSlots, loadReleaseQueue, mintHolderDefault, t, toast]
  );

  const handleRejectSlot = useCallback(
    async (slotId: string) => {
      setSlotActingId(slotId);
      try {
        await collectiblesApi.rejectCollectibleHubSlot(slotId);
        toast({ title: t('collectibles.hubOps.rejectSuccess'), variant: 'success' });
        await loadHubSlots();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.hubOps.rejectFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSlotActingId(null);
      }
    },
    [loadHubSlots, t, toast]
  );

  const handleShip = useCallback(async () => {
    const id = redemptionId.trim();
    const tracking = trackingNo.trim();
    if (!id || !tracking) return;
    setActing('ship');
    try {
      const updated = await collectiblesApi.shipCollectibleRedemption(id, { trackingNo: tracking });
      setRedemption(updated);
      toast({ title: t('collectibles.hubOps.shipSuccess'), variant: 'success' });
      void loadPendingRedemptions();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.shipFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setActing(null);
    }
  }, [loadPendingRedemptions, redemptionId, trackingNo, t, toast]);

  const handleSettle = useCallback(async () => {
    const id = redemptionId.trim();
    if (!id) return;
    setActing('settle');
    try {
      const updated = await collectiblesApi.settleCollectibleRedemption(id);
      setRedemption(updated);
      toast({ title: t('collectibles.hubOps.settleSuccess'), variant: 'success' });
      void loadPendingRedemptions();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.hubOps.settleFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setActing(null);
    }
  }, [loadPendingRedemptions, redemptionId, t, toast]);

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
  const failedReleases = releaseQueue.filter(sale => sale.releaseStatus === 'failed');
  const mintingSlots = hubSlots.filter(slot => slot.status === 'minting');
  const actionableSlots = hubSlots.filter(
    slot => slot.status === 'received' || slot.status === 'minting'
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <CollectiblesFeatureGuard>
        <div className="flex flex-wrap items-start justify-between gap-3">
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
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/collectibles">{t('collectibles.hubOps.backToCollectibles')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/collectibles/redemptions">{t('collectibles.redemptions.title')}</Link>
            </Button>
          </div>
        </div>

        {failedReleases.length > 0 ? (
          <Card className="border-destructive/40 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">
              {t('collectibles.hubOps.alertReleaseFailed')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {failedReleases.length} ·{' '}
              {failedReleases[0]?.releaseError || failedReleases[0]?.orderID}
            </p>
          </Card>
        ) : null}

        {mintingSlots.length > 0 ? (
          <Card className="border-warning/40 bg-warning/8 p-4">
            <p className="text-sm font-medium text-warning">
              {t('collectibles.hubOps.alertMintPending')}
            </p>
          </Card>
        ) : null}

        <Card className="space-y-4 p-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t('collectibles.hubOps.intakeTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('collectibles.hubOps.intakeSubtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="intake-cert">
                {t('collectibles.hubOps.certNumber')}
              </label>
              <Input
                id="intake-cert"
                value={intakeCertNumber}
                onChange={event => setIntakeCertNumber(event.target.value)}
                placeholder="PSA-12345678"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="intake-grade">
                {t('collectibles.hubOps.grade')}
              </label>
              <Input
                id="intake-grade"
                value={intakeGrade}
                onChange={event => setIntakeGrade(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="intake-serial">
                {t('collectibles.hubOps.serial')}
              </label>
              <Input
                id="intake-serial"
                value={intakeSerial}
                onChange={event => setIntakeSerial(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="intake-location">
                {t('collectibles.hubOps.hubLocation')}
              </label>
              <Input
                id="intake-location"
                value={intakeHubLocation}
                onChange={event => setIntakeHubLocation(event.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="intake-holder">
                {t('collectibles.hubOps.currentHolder')}
              </label>
              <Input
                id="intake-holder"
                value={intakeCurrentHolder}
                onChange={event => setIntakeCurrentHolder(event.target.value)}
                placeholder={t('collectibles.hubOps.currentHolderPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {t('collectibles.hubOps.currentHolderHint')}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void handleIntake()}
            disabled={intakeLoading || !intakeCertNumber.trim()}
          >
            {intakeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('collectibles.hubOps.submitIntake')}
          </Button>
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t('collectibles.hubOps.slotsTitle')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('collectibles.hubOps.slotsSubtitle')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadHubSlots()}
              disabled={hubSlotsLoading}
            >
              {hubSlotsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('collectibles.hubOps.refreshQueue')}
            </Button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="mint-holder-default">
              {t('collectibles.hubOps.mintHolderDefault')}
            </label>
            <Input
              id="mint-holder-default"
              value={mintHolderDefault}
              onChange={event => setMintHolderDefault(event.target.value)}
              placeholder={t('collectibles.hubOps.currentHolderPlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('collectibles.hubOps.mintHolderDefaultHint')}
            </p>
          </div>
          {actionableSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('collectibles.hubOps.queueEmpty')}</p>
          ) : (
            <div className="space-y-2">
              {actionableSlots.map(slot => (
                <div
                  key={slot.hubSlotID}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm ${
                    slot.status === 'minting' ? 'border-warning/40 bg-warning/5' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{slot.certNumber}</p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {slot.hubSlotID}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {t('collectibles.hubOps.slotStatus')}: {slot.status}
                      {slot.grade ? ` · ${slot.grade}` : ''}
                      {slot.currentHolder ? (
                        <>
                          {' · '}
                          {t('collectibles.hubOps.currentHolder')}:{' '}
                          <span className="font-mono text-xs">{slot.currentHolder}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  {slot.status === 'received' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void handleMintSlot(slot)}
                        disabled={slotActingId === slot.hubSlotID}
                      >
                        {slotActingId === slot.hubSlotID ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {t('collectibles.hubOps.mint')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleRejectSlot(slot.hubSlotID)}
                        disabled={slotActingId === slot.hubSlotID}
                      >
                        {t('collectibles.hubOps.reject')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t('collectibles.hubOps.pendingRedemptionsTitle')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('collectibles.hubOps.pendingRedemptionsSubtitle')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadPendingRedemptions()}
              disabled={pendingLoading}
            >
              {pendingLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('collectibles.hubOps.refreshQueue')}
            </Button>
          </div>

          {pendingRedemptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('collectibles.hubOps.queueEmpty')}</p>
          ) : (
            <div className="space-y-2">
              {pendingRedemptions.map(item => {
                const itemPhase = resolveCollectibleRedemptionPhase(item);
                return (
                  <div
                    key={item.redemptionID}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="break-all font-mono text-xs text-foreground">
                        {item.redemptionID}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {itemPhase ? t(`collectibles.tracking.phase.${itemPhase}`) : item.status}
                        {' · '}
                        {item.nftMint}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => void loadRedemptionById(item.redemptionID)}
                    >
                      {t('collectibles.hubOps.selectRedemption')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t('collectibles.hubOps.releaseQueueTitle')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('collectibles.hubOps.releaseQueueSubtitle')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadReleaseQueue()}
                disabled={releaseQueueLoading}
              >
                {releaseQueueLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('collectibles.hubOps.refreshQueue')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleReleaseRetry()}
                disabled={releaseRetryLoading}
              >
                {releaseRetryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('collectibles.hubOps.releaseRetry')}
              </Button>
            </div>
          </div>

          {releaseRetryCount !== null ? (
            <p className="text-sm text-muted-foreground">
              {t('collectibles.hubOps.releaseRetryReleased')}: {releaseRetryCount}
            </p>
          ) : null}

          {releaseQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('collectibles.hubOps.queueEmpty')}</p>
          ) : (
            <div className="space-y-2">
              {releaseQueue.map(sale => (
                <div
                  key={sale.saleID}
                  className={`rounded-md border p-3 text-sm ${
                    sale.releaseStatus === 'failed' || sale.lastMintError
                      ? 'border-destructive/40 bg-destructive/5'
                      : ''
                  }`}
                >
                  <p className="break-all font-mono text-xs text-foreground">{sale.orderID}</p>
                  {(sale.releaseStatus === 'failed' || sale.lastMintError) && (
                    <p className="mt-2 text-xs font-medium text-destructive">
                      {sale.releaseStatus === 'failed'
                        ? t('collectibles.hubOps.alertReleaseFailed')
                        : t('collectibles.hubOps.alertMintError')}
                    </p>
                  )}
                  <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">
                        {t('collectibles.hubOps.releaseStatus')}
                      </dt>
                      <dd className="font-medium text-foreground">{sale.releaseStatus}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t('collectibles.hubOps.hubSlotStatus')}
                      </dt>
                      <dd className="font-medium text-foreground">{sale.hubSlotStatus || '—'}</dd>
                    </div>
                    {sale.releaseError ? (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">
                          {t('collectibles.hubOps.releaseError')}
                        </dt>
                        <dd className="break-words text-foreground">{sale.releaseError}</dd>
                      </div>
                    ) : null}
                    {sale.lastMintError ? (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">
                          {t('collectibles.hubOps.alertMintError')}
                        </dt>
                        <dd className="break-words text-foreground">{sale.lastMintError}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </Card>

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
