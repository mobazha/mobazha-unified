'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  useCollectibleActions,
  resolveCollectibleRedemptionPhase,
  resolveSourceDepositOperatorNextActionKey,
  resolveSourceDepositDefaultRefundStatusKey,
  resolveSourceDepositDefaultActionOutcome,
  resolveSourceDepositRejectionReason,
  resolveSourceDepositStatusKey,
  resolveCollectibleValidityDisplayKey,
  isSourceDepositDefaultRefundRefreshEligible,
  isSourceDepositDefaultRefundRetryEligible,
  isSourceDepositMarkDefaultEligible,
  isSourceDepositMintEligible,
  isSourceDepositRecordFirstSaleEligible,
  isSourceDepositReviewPending,
  useI18n,
  type CollectiblePrimarySale,
  type CollectibleRedemption,
  type CollectiblePendingMintRecoveryReport,
  type CollectibleHubSlot,
  type CollectibleSourceDeposit,
} from '@mobazha/core';
import { CollectiblesFeatureGuard } from '@/app/collectibles/CollectiblesFeatureGuard';
import { CollectibleSourceDepositEvidencePhotos } from '@/components/collectibles/CollectibleSourceDepositEvidencePhotos';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Package } from 'lucide-react';

export default function CollectiblesHubOpsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const collectibleActions = useCollectibleActions();

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

  const [sourceCertNumber, setSourceCertNumber] = useState('');
  const [sourceGrade, setSourceGrade] = useState('');
  const [sourceSerial, setSourceSerial] = useState('');
  const [sourceSellerPeerID, setSourceSellerPeerID] = useState('');
  const [sourceHolderWallet, setSourceHolderWallet] = useState('');
  const [sourceGuaranteeAmount, setSourceGuaranteeAmount] = useState('');
  const [sourceGuaranteeCurrency, setSourceGuaranteeCurrency] = useState('');
  const [sourceCreateLoading, setSourceCreateLoading] = useState(false);
  const [sourceDeposits, setSourceDeposits] = useState<CollectibleSourceDeposit[]>([]);
  const [sourceDepositsLoading, setSourceDepositsLoading] = useState(false);
  const [sourceActingId, setSourceActingId] = useState<string | null>(null);
  const [sourceMintHolderDefault, setSourceMintHolderDefault] = useState('');
  const [sourceMintRoyaltyBps, setSourceMintRoyaltyBps] = useState('0');
  const [expandedFirstSaleId, setExpandedFirstSaleId] = useState<string | null>(null);
  const [firstSaleOrderID, setFirstSaleOrderID] = useState('');
  const [firstSaleProtectionRef, setFirstSaleProtectionRef] = useState('');
  const [firstSaleBuyerPeerID, setFirstSaleBuyerPeerID] = useState('');
  const [firstSalePriceAmount, setFirstSalePriceAmount] = useState('');
  const [firstSaleCurrencyCode, setFirstSaleCurrencyCode] = useState('');
  const [firstSaleDivisibility, setFirstSaleDivisibility] = useState('8');
  const [sourceShipTracking, setSourceShipTracking] = useState<Record<string, string>>({});
  const [sourceDefaultReason, setSourceDefaultReason] = useState<Record<string, string>>({});
  const [sourceRejectReason, setSourceRejectReason] = useState<Record<string, string>>({});

  const resetFirstSaleForm = useCallback(() => {
    setFirstSaleOrderID('');
    setFirstSaleProtectionRef('');
    setFirstSaleBuyerPeerID('');
    setFirstSalePriceAmount('');
    setFirstSaleCurrencyCode('');
    setFirstSaleDivisibility('8');
  }, []);

  const toggleFirstSalePanel = useCallback(
    (id: string, isExpanded: boolean) => {
      if (isExpanded) {
        setExpandedFirstSaleId(null);
        return;
      }
      resetFirstSaleForm();
      setExpandedFirstSaleId(id);
    },
    [resetFirstSaleForm]
  );

  const loadRedemptionById = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!trimmed) return;
      setRedemptionId(trimmed);
      setLoading(true);
      try {
        const result = await collectibleActions.getCollectibleRedemption(trimmed);
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
      const result = await collectibleActions.listCollectibleHubSlots({
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

  const loadSourceDeposits = useCallback(async () => {
    setSourceDepositsLoading(true);
    try {
      const result = await collectibleActions.listCollectibleSourceDeposits({
        page: 1,
        pageSize: 25,
      });
      setSourceDeposits(result.items ?? []);
    } catch (err) {
      setSourceDeposits([]);
      toast({
        variant: 'destructive',
        title: t('collectibles.sourceOps.queueLoadFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSourceDepositsLoading(false);
    }
  }, [t, toast]);

  const handleCreateSourceDeposit = useCallback(async () => {
    const certNumber = sourceCertNumber.trim();
    const sellerPeerID = sourceSellerPeerID.trim();
    const holderWallet = sourceHolderWallet.trim();
    if (!certNumber || !sellerPeerID || !holderWallet) return;
    setSourceCreateLoading(true);
    try {
      await collectibleActions.createCollectibleSourceDeposit({
        certNumber,
        grade: sourceGrade.trim() || undefined,
        serial: sourceSerial.trim() || undefined,
        sellerPeerID,
        holderWallet,
        guaranteeAmount: sourceGuaranteeAmount.trim() || undefined,
        guaranteeCurrency: sourceGuaranteeCurrency.trim() || undefined,
      });
      setSourceCertNumber('');
      setSourceGrade('');
      setSourceSerial('');
      setSourceSellerPeerID('');
      setSourceHolderWallet('');
      setSourceGuaranteeAmount('');
      setSourceGuaranteeCurrency('');
      toast({ title: t('collectibles.sourceOps.createSuccess'), variant: 'success' });
      await loadSourceDeposits();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('collectibles.sourceOps.createFailed'),
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSourceCreateLoading(false);
    }
  }, [
    loadSourceDeposits,
    sourceCertNumber,
    sourceGrade,
    sourceGuaranteeAmount,
    sourceGuaranteeCurrency,
    sourceHolderWallet,
    sourceSellerPeerID,
    sourceSerial,
    t,
    toast,
  ]);

  const handleApproveSourceDeposit = useCallback(
    async (id: string) => {
      setSourceActingId(id);
      try {
        await collectibleActions.approveCollectibleSourceDeposit(id);
        toast({ title: t('collectibles.sourceOps.approveSuccess'), variant: 'success' });
        await loadSourceDeposits();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.approveFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSourceActingId(null);
      }
    },
    [loadSourceDeposits, t, toast]
  );

  const handleRejectSourceDeposit = useCallback(
    async (id: string) => {
      const reason = sourceRejectReason[id]?.trim();
      if (!reason) return;
      setSourceActingId(id);
      try {
        await collectibleActions.rejectCollectibleSourceDeposit(id, { reason });
        toast({ title: t('collectibles.sourceOps.rejectSuccess'), variant: 'success' });
        setSourceRejectReason(prev => ({ ...prev, [id]: '' }));
        await loadSourceDeposits();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.rejectFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSourceActingId(null);
      }
    },
    [loadSourceDeposits, sourceRejectReason, t, toast]
  );

  const handleMintSourceDeposit = useCallback(
    async (deposit: CollectibleSourceDeposit) => {
      const id = deposit.sourceDepositID;
      const holder = deposit.holderWallet?.trim() || sourceMintHolderDefault.trim();
      if (!holder) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.mintFailed'),
          description: t('collectibles.sourceOps.mintHolderRequired'),
        });
        return;
      }
      const royaltyBps = Number.parseInt(sourceMintRoyaltyBps, 10);
      setSourceActingId(id);
      try {
        await collectibleActions.mintCollectibleSourceDeposit(id, {
          holder,
          royaltyBps: Number.isFinite(royaltyBps) && royaltyBps >= 0 ? royaltyBps : undefined,
        });
        toast({ title: t('collectibles.sourceOps.mintSuccess'), variant: 'success' });
        await loadSourceDeposits();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.mintFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSourceActingId(null);
      }
    },
    [loadSourceDeposits, sourceMintHolderDefault, sourceMintRoyaltyBps, t, toast]
  );

  const handleRecordFirstSale = useCallback(
    async (id: string) => {
      const orderID = firstSaleOrderID.trim();
      const escrowID = firstSaleProtectionRef.trim();
      const buyerPeerID = firstSaleBuyerPeerID.trim();
      const priceAmount = firstSalePriceAmount.trim();
      const currencyCode = firstSaleCurrencyCode.trim();
      if (!orderID || !escrowID || !buyerPeerID || !priceAmount || !currencyCode) return;
      const divisibility = Number.parseInt(firstSaleDivisibility, 10);
      setSourceActingId(id);
      try {
        await collectibleActions.recordCollectibleSourceDepositFirstSale(id, {
          orderID,
          escrowID,
          buyerPeerID,
          priceAmount,
          currencyCode,
          divisibility: Number.isFinite(divisibility) ? divisibility : undefined,
        });
        toast({ title: t('collectibles.sourceOps.firstSaleSuccess'), variant: 'success' });
        setExpandedFirstSaleId(null);
        resetFirstSaleForm();
        await loadSourceDeposits();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.firstSaleFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSourceActingId(null);
      }
    },
    [
      firstSaleBuyerPeerID,
      firstSaleCurrencyCode,
      firstSaleDivisibility,
      firstSaleOrderID,
      firstSalePriceAmount,
      firstSaleProtectionRef,
      loadSourceDeposits,
      resetFirstSaleForm,
      t,
      toast,
    ]
  );

  const handleShipSourceDeposit = useCallback(
    async (id: string) => {
      const trackingNo = sourceShipTracking[id]?.trim() ?? '';
      if (!trackingNo) return;
      setSourceActingId(id);
      try {
        await collectibleActions.shipCollectibleSourceDeposit(id, { trackingNo });
        toast({ title: t('collectibles.sourceOps.shipSuccess'), variant: 'success' });
        await loadSourceDeposits();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.shipFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSourceActingId(null);
      }
    },
    [loadSourceDeposits, sourceShipTracking, t, toast]
  );

  const handleSettleSourceDeposit = useCallback(
    async (id: string) => {
      setSourceActingId(id);
      try {
        await collectibleActions.settleCollectibleSourceDeposit(id);
        toast({ title: t('collectibles.sourceOps.settleSuccess'), variant: 'success' });
        await loadSourceDeposits();
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.settleFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSourceActingId(null);
      }
    },
    [loadSourceDeposits, t, toast]
  );

  const handleDefaultSourceDeposit = useCallback(
    async (deposit: CollectibleSourceDeposit) => {
      const id = deposit.sourceDepositID;
      const isRefresh = isSourceDepositDefaultRefundRefreshEligible(deposit);
      const isRetry = isSourceDepositDefaultRefundRetryEligible(deposit);
      const defaultReason = sourceDefaultReason[id]?.trim() || deposit.defaultReason?.trim() || '';
      if (!defaultReason) return;

      setSourceActingId(id);
      try {
        const updated = await collectibleActions.defaultCollectibleSourceDeposit(id, {
          defaultReason,
        });
        await loadSourceDeposits();
        const outcome = resolveSourceDepositDefaultActionOutcome(updated);
        if (outcome === 'defaulted') {
          toast({ title: t('collectibles.sourceOps.defaultSuccess'), variant: 'success' });
        } else if (outcome === 'refundPending') {
          toast({
            title: t('collectibles.sourceOps.defaultRefundPending'),
            description: isRefresh
              ? undefined
              : t('collectibles.sourceOps.defaultRefundPendingNotice'),
          });
        } else if (outcome === 'refundFailed') {
          toast({
            variant: 'destructive',
            title: t('collectibles.sourceOps.defaultRefundFailed'),
            description: updated.defaultRefundError?.trim() || undefined,
          });
        } else if (!isRefresh && !isRetry) {
          toast({ title: t('collectibles.sourceOps.defaultSuccess'), variant: 'success' });
        }
      } catch (err) {
        toast({
          variant: 'destructive',
          title: t('collectibles.sourceOps.defaultFailed'),
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setSourceActingId(null);
      }
    },
    [loadSourceDeposits, sourceDefaultReason, t, toast]
  );

  const handleIntake = useCallback(async () => {
    const certNumber = intakeCertNumber.trim();
    if (!certNumber) return;
    setIntakeLoading(true);
    try {
      await collectibleActions.intakeCollectibleHubSlot({
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
      const result = await collectibleActions.listCollectibleHubRedemptions({
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
      const result = await collectibleActions.listCollectiblePrimarySaleReleaseQueue({
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
      const result = await collectibleActions.retryCollectiblePrimarySaleReleases({ limit: 25 });
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
        await collectibleActions.mintCollectibleHubSlot(slotId, { holder, royaltyBps: 0 });
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
        await collectibleActions.rejectCollectibleHubSlot(slotId);
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
      const updated = await collectibleActions.shipCollectibleRedemption(id, {
        trackingNo: tracking,
      });
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
      const updated = await collectibleActions.settleCollectibleRedemption(id);
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
      const report = await collectibleActions.recoverCollectiblePendingMints({
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

        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {t('collectibles.sourceOps.title')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('collectibles.sourceOps.subtitle')}
            </p>
          </div>

          <Card className="space-y-4 p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t('collectibles.sourceOps.createTitle')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('collectibles.sourceOps.createSubtitle')}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="source-cert">
                  {t('collectibles.hubOps.certNumber')}
                </label>
                <Input
                  id="source-cert"
                  value={sourceCertNumber}
                  onChange={event => setSourceCertNumber(event.target.value)}
                  placeholder="PSA-12345678"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="source-grade">
                  {t('collectibles.hubOps.grade')}
                </label>
                <Input
                  id="source-grade"
                  value={sourceGrade}
                  onChange={event => setSourceGrade(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="source-serial">
                  {t('collectibles.hubOps.serial')}
                </label>
                <Input
                  id="source-serial"
                  value={sourceSerial}
                  onChange={event => setSourceSerial(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="source-seller">
                  {t('collectibles.sourceOps.sellerPeerID')}
                </label>
                <Input
                  id="source-seller"
                  value={sourceSellerPeerID}
                  onChange={event => setSourceSellerPeerID(event.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium text-foreground" htmlFor="source-holder">
                  {t('collectibles.sourceOps.holderWallet')}
                </label>
                <Input
                  id="source-holder"
                  value={sourceHolderWallet}
                  onChange={event => setSourceHolderWallet(event.target.value)}
                  placeholder={t('collectibles.sourceOps.holderWalletPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="source-guarantee-amt"
                >
                  {t('collectibles.sourceOps.guaranteeAmount')}
                </label>
                <Input
                  id="source-guarantee-amt"
                  value={sourceGuaranteeAmount}
                  onChange={event => setSourceGuaranteeAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="source-guarantee-cur"
                >
                  {t('collectibles.sourceOps.guaranteeCurrency')}
                </label>
                <Input
                  id="source-guarantee-cur"
                  value={sourceGuaranteeCurrency}
                  onChange={event => setSourceGuaranteeCurrency(event.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={() => void handleCreateSourceDeposit()}
              disabled={
                sourceCreateLoading ||
                !sourceCertNumber.trim() ||
                !sourceSellerPeerID.trim() ||
                !sourceHolderWallet.trim()
              }
            >
              {sourceCreateLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('collectibles.sourceOps.submitCreate')}
            </Button>
          </Card>

          <Card className="space-y-4 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t('collectibles.sourceOps.listTitle')}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('collectibles.sourceOps.listSubtitle')}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadSourceDeposits()}
                disabled={sourceDepositsLoading}
              >
                {sourceDepositsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('collectibles.sourceOps.refreshQueue')}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="source-mint-holder-default"
                >
                  {t('collectibles.hubOps.mintHolderDefault')}
                </label>
                <Input
                  id="source-mint-holder-default"
                  value={sourceMintHolderDefault}
                  onChange={event => setSourceMintHolderDefault(event.target.value)}
                  placeholder={t('collectibles.sourceOps.holderWalletPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-foreground"
                  htmlFor="source-mint-royalty"
                >
                  {t('collectibles.sourceOps.mintRoyaltyBps')}
                </label>
                <Input
                  id="source-mint-royalty"
                  type="number"
                  min={0}
                  max={10000}
                  value={sourceMintRoyaltyBps}
                  onChange={event => setSourceMintRoyaltyBps(event.target.value)}
                />
              </div>
            </div>
            {sourceDeposits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('collectibles.sourceOps.queueEmpty')}
              </p>
            ) : (
              <div className="space-y-3">
                {sourceDeposits.map(deposit => {
                  const id = deposit.sourceDepositID;
                  const canMint = isSourceDepositMintEligible(deposit);
                  const canReview = isSourceDepositReviewPending(deposit);
                  const canRecordFirstSale = isSourceDepositRecordFirstSaleEligible(deposit);
                  const canShip = deposit.status === 'redeem_requested';
                  const canSettle = deposit.status === 'shipped';
                  const canMarkDefault = isSourceDepositMarkDefaultEligible(deposit);
                  const canRefreshDefaultRefund =
                    isSourceDepositDefaultRefundRefreshEligible(deposit);
                  const canRetryDefaultRefund = isSourceDepositDefaultRefundRetryEligible(deposit);
                  const defaultRefundStatusKey = resolveSourceDepositDefaultRefundStatusKey(
                    deposit.defaultRefundStatus
                  );
                  const isExpanded = expandedFirstSaleId === id;

                  return (
                    <div key={id} className="space-y-3 rounded-md border p-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{deposit.certNumber}</p>
                        <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                          {id}
                        </p>
                        <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.depositStatus')}
                            </dt>
                            <dd className="font-medium text-foreground">
                              {t(resolveSourceDepositStatusKey(deposit.status))}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.operatorNextAction')}
                            </dt>
                            <dd className="font-medium text-foreground">
                              {t(resolveSourceDepositOperatorNextActionKey(deposit))}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.releaseStatus')}
                            </dt>
                            <dd className="font-medium text-foreground">
                              {deposit.releaseStatus || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.seller')}
                            </dt>
                            <dd className="break-all font-medium text-foreground">
                              {deposit.sellerPeerID || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.holder')}
                            </dt>
                            <dd className="break-all font-medium text-foreground">
                              {deposit.holderWallet || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.nftMint')}
                            </dt>
                            <dd className="break-all font-medium text-foreground">
                              {deposit.nftMint || '—'}
                            </dd>
                          </div>
                          {deposit.nftMint || deposit.hubTitleValidityStatus ? (
                            <div>
                              <dt className="text-muted-foreground">
                                {t('collectibles.sourceOps.hubTitleValidity')}
                              </dt>
                              <dd className="font-medium text-foreground">
                                {deposit.hubTitleValidityStatus
                                  ? t(
                                      resolveCollectibleValidityDisplayKey(
                                        deposit.hubTitleValidityStatus
                                      )
                                    )
                                  : '—'}
                              </dd>
                            </div>
                          ) : null}
                          {deposit.hubTitleInvalidationReason?.trim() ? (
                            <div className="sm:col-span-2">
                              <dt className="text-muted-foreground">
                                {t('collectibles.validity.invalidationReason')}
                              </dt>
                              <dd className="break-words font-medium text-foreground">
                                {deposit.hubTitleInvalidationReason}
                              </dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.order')}
                            </dt>
                            <dd className="break-all font-medium text-foreground">
                              {deposit.firstSaleOrderID || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.tracking')}
                            </dt>
                            <dd className="break-all font-medium text-foreground">
                              {deposit.trackingNo || '—'}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.defaultReason')}
                            </dt>
                            <dd className="break-words font-medium text-foreground">
                              {deposit.defaultReason || '—'}
                            </dd>
                          </div>
                          {defaultRefundStatusKey ? (
                            <div>
                              <dt className="text-muted-foreground">
                                {t('collectibles.sourceOps.defaultRefundStatus')}
                              </dt>
                              <dd className="font-medium text-foreground">
                                {t(defaultRefundStatusKey)}
                              </dd>
                            </div>
                          ) : null}
                          {deposit.defaultRefundError?.trim() ? (
                            <div className="sm:col-span-2">
                              <dt className="text-muted-foreground">
                                {t('collectibles.sourceOps.defaultRefundError')}
                              </dt>
                              <dd className="break-words font-medium text-destructive">
                                {deposit.defaultRefundError}
                              </dd>
                            </div>
                          ) : null}
                          <div>
                            <dt className="text-muted-foreground">
                              {t('collectibles.sourceOps.rejectionReason')}
                            </dt>
                            <dd className="break-words font-medium text-foreground">
                              {resolveSourceDepositRejectionReason(deposit) || '—'}
                            </dd>
                          </div>
                        </dl>
                        {canReview ? (
                          <CollectibleSourceDepositEvidencePhotos
                            photosJSON={deposit.photosJSON}
                            className="mt-3 border-t border-border pt-3"
                          />
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canReview ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleApproveSourceDeposit(id)}
                              disabled={sourceActingId === id}
                            >
                              {sourceActingId === id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {t('collectibles.sourceOps.approve')}
                            </Button>
                          </>
                        ) : null}
                        {canMint ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleMintSourceDeposit(deposit)}
                            disabled={sourceActingId === id}
                          >
                            {sourceActingId === id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('collectibles.sourceOps.mint')}
                          </Button>
                        ) : null}
                        {canRecordFirstSale ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleFirstSalePanel(id, isExpanded)}
                          >
                            {t('collectibles.sourceOps.recordFirstSale')}
                          </Button>
                        ) : null}
                        {canSettle ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleSettleSourceDeposit(id)}
                            disabled={sourceActingId === id}
                          >
                            {sourceActingId === id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('collectibles.sourceOps.settle')}
                          </Button>
                        ) : null}
                      </div>

                      {canReview ? (
                        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                          <div className="min-w-[12rem] flex-1 space-y-2">
                            <label
                              className="text-sm font-medium text-foreground"
                              htmlFor={`source-reject-${id}`}
                            >
                              {t('collectibles.sourceOps.rejectionReason')}
                            </label>
                            <Input
                              id={`source-reject-${id}`}
                              value={sourceRejectReason[id] ?? ''}
                              onChange={event =>
                                setSourceRejectReason(prev => ({
                                  ...prev,
                                  [id]: event.target.value,
                                }))
                              }
                              placeholder={t('collectibles.sourceOps.rejectionReasonPlaceholder')}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleRejectSourceDeposit(id)}
                            disabled={sourceActingId === id || !sourceRejectReason[id]?.trim()}
                          >
                            {sourceActingId === id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('collectibles.sourceOps.reject')}
                          </Button>
                        </div>
                      ) : null}

                      {canShip ? (
                        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                          <div className="min-w-[12rem] flex-1 space-y-2">
                            <label
                              className="text-sm font-medium text-foreground"
                              htmlFor={`source-ship-${id}`}
                            >
                              {t('collectibles.sourceOps.tracking')}
                            </label>
                            <Input
                              id={`source-ship-${id}`}
                              value={sourceShipTracking[id] ?? ''}
                              onChange={event =>
                                setSourceShipTracking(prev => ({
                                  ...prev,
                                  [id]: event.target.value,
                                }))
                              }
                              placeholder={t('collectibles.sourceOps.trackingPlaceholder')}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleShipSourceDeposit(id)}
                            disabled={sourceActingId === id || !sourceShipTracking[id]?.trim()}
                          >
                            {sourceActingId === id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('collectibles.sourceOps.ship')}
                          </Button>
                        </div>
                      ) : null}

                      {canRefreshDefaultRefund ? (
                        <div className="space-y-3 border-t pt-3">
                          <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
                            <p className="text-sm font-medium text-warning">
                              {t('collectibles.sourceOps.defaultRefundPendingNotice')}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDefaultSourceDeposit(deposit)}
                            disabled={sourceActingId === id || !deposit.defaultReason?.trim()}
                          >
                            {sourceActingId === id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('collectibles.sourceOps.refreshDefaultRefund')}
                          </Button>
                        </div>
                      ) : null}

                      {canRetryDefaultRefund ? (
                        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
                          <div className="w-full rounded-md border border-destructive/30 bg-destructive/10 p-3">
                            <p className="text-sm font-medium text-destructive">
                              {t('collectibles.sourceOps.defaultRefundFailed')}
                            </p>
                            {deposit.defaultRefundError?.trim() ? (
                              <p className="mt-1 break-words text-sm text-destructive/90">
                                {deposit.defaultRefundError}
                              </p>
                            ) : null}
                          </div>
                          <div className="min-w-[12rem] flex-1 space-y-2">
                            <label
                              className="text-sm font-medium text-foreground"
                              htmlFor={`source-default-retry-${id}`}
                            >
                              {t('collectibles.sourceOps.defaultReason')}
                            </label>
                            <Input
                              id={`source-default-retry-${id}`}
                              value={sourceDefaultReason[id] ?? deposit.defaultReason ?? ''}
                              onChange={event =>
                                setSourceDefaultReason(prev => ({
                                  ...prev,
                                  [id]: event.target.value,
                                }))
                              }
                              placeholder={t('collectibles.sourceOps.defaultReasonPlaceholder')}
                            />
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void handleDefaultSourceDeposit(deposit)}
                            disabled={
                              sourceActingId === id ||
                              !(sourceDefaultReason[id]?.trim() || deposit.defaultReason?.trim())
                            }
                          >
                            {sourceActingId === id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('collectibles.sourceOps.retryDefaultRefund')}
                          </Button>
                        </div>
                      ) : null}

                      {canMarkDefault ? (
                        <div className="space-y-3 border-t pt-3">
                          <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
                            <p className="text-sm font-medium text-warning">
                              {t('collectibles.sourceOps.markDefaultVoidNotice')}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="min-w-[12rem] flex-1 space-y-2">
                              <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={`source-default-${id}`}
                              >
                                {t('collectibles.sourceOps.defaultReason')}
                              </label>
                              <Input
                                id={`source-default-${id}`}
                                value={sourceDefaultReason[id] ?? ''}
                                onChange={event =>
                                  setSourceDefaultReason(prev => ({
                                    ...prev,
                                    [id]: event.target.value,
                                  }))
                                }
                                placeholder={t('collectibles.sourceOps.defaultReasonPlaceholder')}
                              />
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => void handleDefaultSourceDeposit(deposit)}
                              disabled={sourceActingId === id || !sourceDefaultReason[id]?.trim()}
                            >
                              {sourceActingId === id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              {t('collectibles.sourceOps.markDefaulted')}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      {isExpanded ? (
                        <div className="space-y-3 border-t pt-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {t('collectibles.sourceOps.firstSaleTitle')}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('collectibles.sourceOps.firstSaleSubtitle')}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-2 sm:col-span-2">
                              <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={`first-sale-order-${id}`}
                              >
                                {t('collectibles.hubOps.orderId')}
                              </label>
                              <Input
                                id={`first-sale-order-${id}`}
                                value={firstSaleOrderID}
                                onChange={event => setFirstSaleOrderID(event.target.value)}
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={`first-sale-protection-${id}`}
                              >
                                {t('collectibles.sourceOps.protectionRefId')}
                              </label>
                              <Input
                                id={`first-sale-protection-${id}`}
                                value={firstSaleProtectionRef}
                                onChange={event => setFirstSaleProtectionRef(event.target.value)}
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={`first-sale-buyer-${id}`}
                              >
                                {t('collectibles.sourceOps.buyerPeerID')}
                              </label>
                              <Input
                                id={`first-sale-buyer-${id}`}
                                value={firstSaleBuyerPeerID}
                                onChange={event => setFirstSaleBuyerPeerID(event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={`first-sale-price-${id}`}
                              >
                                {t('collectibles.sourceOps.priceAmount')}
                              </label>
                              <Input
                                id={`first-sale-price-${id}`}
                                value={firstSalePriceAmount}
                                onChange={event => setFirstSalePriceAmount(event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={`first-sale-currency-${id}`}
                              >
                                {t('collectibles.sourceOps.currencyCode')}
                              </label>
                              <Input
                                id={`first-sale-currency-${id}`}
                                value={firstSaleCurrencyCode}
                                onChange={event => setFirstSaleCurrencyCode(event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label
                                className="text-sm font-medium text-foreground"
                                htmlFor={`first-sale-div-${id}`}
                              >
                                {t('collectibles.sourceOps.divisibility')}
                              </label>
                              <Input
                                id={`first-sale-div-${id}`}
                                type="number"
                                min={0}
                                value={firstSaleDivisibility}
                                onChange={event => setFirstSaleDivisibility(event.target.value)}
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleRecordFirstSale(id)}
                            disabled={
                              sourceActingId === id ||
                              !firstSaleOrderID.trim() ||
                              !firstSaleProtectionRef.trim() ||
                              !firstSaleBuyerPeerID.trim() ||
                              !firstSalePriceAmount.trim() ||
                              !firstSaleCurrencyCode.trim()
                            }
                          >
                            {sourceActingId === id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            {t('collectibles.sourceOps.recordFirstSale')}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
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
