// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Loader2, Wallet } from 'lucide-react';
import { BrowserProvider, getAddress, isAddress } from 'ethers';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import {
  COLLECTIBLES_COLLATERAL_PROVIDER_ID,
  COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID,
  COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION,
  buildCollateralFundingIdempotencyKey,
  buildCollateralOpenIdempotencyKey,
  resolveCollectibleCollateralExpiresAt,
  resolveCollectibleCollateralExpiryIssueKey,
  executeEvmCollateralFunding,
  hasAnyCollectibleCollateralFields,
  isCollateralOperatorScopeChangedError,
  isCollateralProtectionActive,
  isCollateralRailAssetSupported,
  resolveCollateralAmountDisplay,
  resolveCollateralAmountUserLabel,
  resolveCollateralAssetDisplay,
  resolveCollateralAssetUserLabel,
  resolveCollateralFundingErrorKey,
  resolveCollectibleCollateralDeclarationIssueKey,
  resolveCollectibleDepositProtectionStatus,
  resolveGuaranteeAssetID,
  resolveSourceDepositPrincipalBinding,
  resolveSourceDepositPrincipalBindingI18nKey,
  validateCollectibleCollateralDeclaration,
  truncateAddress,
  useAppKit,
  useCollateralOperator,
  useI18n,
  useUserStore,
  useWallet,
  type CollectibleSourceDeposit,
} from '@mobazha/core';
import { CollectibleCollateralProtectionSummary } from './CollectibleCollateralProtectionSummary';
import { CollectiblesJourneyProgress } from './experience/CollectiblesJourneyProgress';

export interface SourceDepositCollateralFundingSectionProps {
  deposit: CollectibleSourceDeposit;
  onUpdated?: () => void | Promise<void>;
  compact?: boolean;
  className?: string;
}

function formatTimestamp(value: string | undefined, locale: string): string | null {
  if (!value?.trim()) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(parsed)
  );
}

export function SourceDepositCollateralFundingSection({
  deposit,
  onUpdated,
  compact = false,
  className,
}: SourceDepositCollateralFundingSectionProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const profile = useUserStore(state => state.profile);
  const {
    address: appKitAddress,
    isConnected: appKitConnected,
    isInitializing: appKitInitializing,
    connectEVM,
    getWalletProvider,
  } = useAppKit();
  const { getSigner } = useWallet();

  const hasAnyCollateralFields = hasAnyCollectibleCollateralFields(deposit);
  const declarationValidation = useMemo(
    () => validateCollectibleCollateralDeclaration(deposit),
    [deposit]
  );
  const hasValidDeclaration = declarationValidation.valid;
  const guaranteeAssetID = useMemo(
    () => resolveGuaranteeAssetID(deposit.guaranteeCurrency),
    [deposit.guaranteeCurrency]
  );
  const accountBinding = useMemo(() => {
    const assetID = guaranteeAssetID;
    const requiredAmount = deposit.guaranteeAmount?.trim();
    if (!assetID || !requiredAmount) return null;
    return {
      providerID: COLLECTIBLES_COLLATERAL_PROVIDER_ID,
      resourceID: deposit.sourceDepositID,
      assetID,
      requiredAmount,
      policyID: COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID,
      policyVersion: COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION,
    };
  }, [deposit.guaranteeAmount, deposit.sourceDepositID, guaranteeAssetID]);
  const collateralExpiresAt = useMemo(
    () => resolveCollectibleCollateralExpiresAt(deposit.createdAt),
    [deposit.createdAt]
  );
  const principalBinding = useMemo(
    () =>
      resolveSourceDepositPrincipalBinding({
        depositSellerPeerID: deposit.sellerPeerID,
        currentPrincipalPeerID: profile?.peerID,
      }),
    [deposit.sellerPeerID, profile?.peerID]
  );
  const principalBindingAllowed = principalBinding.allowed;
  const collateralOperatorEnabled = hasValidDeclaration && principalBindingAllowed;
  const collateralOperatorScopeKey = profile?.peerID?.trim() ?? '';
  const {
    capabilities,
    account,
    bindingMismatch,
    fundingTarget,
    loading,
    error,
    findResourceAccount,
    openAccount,
    prepareFundingTarget,
    reconcileFunding,
    refreshCapabilities,
    clearError,
  } = useCollateralOperator({
    enabled: collateralOperatorEnabled,
    scopeKey: collateralOperatorScopeKey,
  });

  const guardedAccount = principalBindingAllowed ? account : null;

  const [principalDestination, setPrincipalDestination] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);

  const protectionStatus = useMemo(
    () => resolveCollectibleDepositProtectionStatus({ deposit, account: guardedAccount }),
    [deposit, guardedAccount]
  );

  const evmConnected = appKitConnected && isAddress(appKitAddress ?? '');
  const evmAddress = appKitAddress?.trim() ?? '';

  const assetSupportedOnRail = useMemo(
    () => isCollateralRailAssetSupported(capabilities, guaranteeAssetID),
    [capabilities, guaranteeAssetID]
  );

  useEffect(() => {
    if (!collateralOperatorEnabled || !accountBinding) return;
    void findResourceAccount(accountBinding).catch(() => undefined);
  }, [accountBinding, collateralOperatorEnabled, findResourceAccount]);

  useEffect(() => {
    if (evmAddress && !principalDestination.trim()) {
      setPrincipalDestination(evmAddress);
    }
  }, [evmAddress, principalDestination]);

  const handleCopy = useCallback(async (field: string, value: string) => {
    const ok = await copyToClipboard(value);
    if (!ok) return;
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const notifyError = useCallback(
    (cause: unknown, fallbackKey: string) => {
      if (isCollateralOperatorScopeChangedError(cause)) return;
      const key = resolveCollateralFundingErrorKey(cause, fallbackKey);
      setActionErrorKey(key);
      toast({
        title: t('common.error'),
        description: t(key),
        variant: 'destructive',
      });
    },
    [t, toast]
  );

  const handleConnectEvmWallet = useCallback(async () => {
    clearError();
    setActionErrorKey(null);
    const result = await connectEVM();
    if (!result.success) {
      notifyError(result.error, 'collectibles.collateral.funding.connectEvmFailed');
    }
  }, [clearError, connectEVM, notifyError]);

  const notifyPrincipalBindingBlocked = useCallback(() => {
    if (principalBinding.allowed) return;
    const key = resolveSourceDepositPrincipalBindingI18nKey(principalBinding.issue);
    setActionErrorKey(key);
    toast({
      title: t('common.error'),
      description: t(key),
      variant: 'destructive',
    });
  }, [principalBinding, t, toast]);

  const handleOpenAccount = useCallback(async () => {
    if (!principalBindingAllowed) {
      notifyPrincipalBindingBlocked();
      return;
    }
    if (!hasValidDeclaration) {
      const issueKey =
        declarationValidation.valid === false
          ? resolveCollectibleCollateralDeclarationIssueKey(declarationValidation.issue)
          : 'collectibles.collateral.funding.invalidDeclarationFallback';
      notifyError(null, issueKey);
      return;
    }
    const assetID = guaranteeAssetID;
    const requiredAmount = deposit.guaranteeAmount?.trim();
    if (!assetID || !requiredAmount) {
      notifyError(null, 'collectibles.collateral.funding.invalidDeclarationFallback');
      return;
    }
    if (capabilities && !assetSupportedOnRail) {
      notifyError(null, 'collectibles.collateral.funding.unsupportedAsset');
      return;
    }
    if (!collateralExpiresAt.valid) {
      notifyError(null, resolveCollectibleCollateralExpiryIssueKey(collateralExpiresAt.issue));
      return;
    }
    const expiresAt = collateralExpiresAt.expiresAt;
    setActionLoading(true);
    setActionErrorKey(null);
    try {
      await openAccount({
        providerID: COLLECTIBLES_COLLATERAL_PROVIDER_ID,
        resourceID: deposit.sourceDepositID,
        assetID,
        requiredAmount,
        policyID: COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID,
        policyVersion: COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION,
        idempotencyKey: buildCollateralOpenIdempotencyKey({
          sourceDepositID: deposit.sourceDepositID,
          assetID,
          requiredAmount,
          policyID: COLLECTIBLES_SOURCE_CUSTODY_POLICY_ID,
          policyVersion: COLLECTIBLES_SOURCE_CUSTODY_POLICY_VERSION,
          expiresAt,
        }),
        expiresAt,
      });
      toast({
        title: t('common.success'),
        description: t('collectibles.collateral.funding.openSuccess'),
        variant: 'success',
      });
      await onUpdated?.();
    } catch (cause) {
      notifyError(cause, 'collectibles.collateral.funding.openFailed');
    } finally {
      setActionLoading(false);
    }
  }, [
    assetSupportedOnRail,
    capabilities,
    collateralExpiresAt,
    declarationValidation,
    deposit,
    guaranteeAssetID,
    hasValidDeclaration,
    notifyError,
    notifyPrincipalBindingBlocked,
    onUpdated,
    openAccount,
    principalBindingAllowed,
    t,
    toast,
  ]);

  const resolveFundingSigner = useCallback(async () => {
    if (!evmConnected) {
      throw new Error('collectibles.collateral.funding.connectEvmFailed');
    }
    const walletProvider = getWalletProvider();
    if (walletProvider) {
      const browserProvider = new BrowserProvider(walletProvider as never);
      return browserProvider.getSigner();
    }
    const signer = await getSigner();
    if (!signer) {
      throw new Error('collectibles.collateral.funding.signerUnavailable');
    }
    return signer;
  }, [evmConnected, getSigner, getWalletProvider]);

  const handlePrepareFunding = useCallback(async () => {
    if (!principalBindingAllowed) {
      notifyPrincipalBindingBlocked();
      return;
    }
    const collateralID = guardedAccount?.collateralID?.trim();
    if (!collateralID) return;
    if (!evmConnected) {
      notifyError(null, 'collectibles.collateral.funding.connectEvmFailed');
      return;
    }

    let normalizedPrincipal: string;
    try {
      normalizedPrincipal = getAddress(principalDestination.trim());
    } catch {
      notifyError(null, 'collectibles.collateral.funding.invalidPrincipalAddress');
      return;
    }

    if (normalizedPrincipal.toLowerCase() !== evmAddress.toLowerCase()) {
      notifyError(null, 'collectibles.collateral.funding.principalMustMatchWallet');
      return;
    }

    setActionLoading(true);
    setActionErrorKey(null);
    try {
      await prepareFundingTarget(collateralID, {
        principalDestination: normalizedPrincipal,
        idempotencyKey: buildCollateralFundingIdempotencyKey({
          sourceDepositID: deposit.sourceDepositID,
          collateralID,
          principalDestination: normalizedPrincipal,
        }),
      });
      setConfirmOpen(true);
    } catch (cause) {
      notifyError(cause, 'collectibles.collateral.funding.prepareFailed');
    } finally {
      setActionLoading(false);
    }
  }, [
    guardedAccount?.collateralID,
    deposit.sourceDepositID,
    evmAddress,
    evmConnected,
    notifyError,
    notifyPrincipalBindingBlocked,
    prepareFundingTarget,
    principalBindingAllowed,
    principalDestination,
  ]);

  const handleConfirmFunding = useCallback(async () => {
    if (!principalBindingAllowed) {
      notifyPrincipalBindingBlocked();
      return;
    }
    if (!fundingTarget) return;
    setActionLoading(true);
    setActionErrorKey(null);
    try {
      const signer = await resolveFundingSigner();
      await executeEvmCollateralFunding(signer, fundingTarget);
      const collateralID = guardedAccount?.collateralID?.trim() ?? fundingTarget.collateralID;
      if (collateralID) {
        await reconcileFunding(collateralID);
      }
      setConfirmOpen(false);
      toast({
        title: t('common.success'),
        description: t('collectibles.collateral.funding.fundSuccess'),
        variant: 'success',
      });
      await onUpdated?.();
    } catch (cause) {
      notifyError(cause, 'collectibles.collateral.funding.fundFailed');
    } finally {
      setActionLoading(false);
    }
  }, [
    guardedAccount?.collateralID,
    fundingTarget,
    notifyError,
    notifyPrincipalBindingBlocked,
    onUpdated,
    principalBindingAllowed,
    reconcileFunding,
    resolveFundingSigner,
    t,
    toast,
  ]);

  const handleReconcile = useCallback(async () => {
    if (!principalBindingAllowed) {
      notifyPrincipalBindingBlocked();
      return;
    }
    const collateralID = guardedAccount?.collateralID?.trim();
    if (!collateralID) return;
    setActionLoading(true);
    setActionErrorKey(null);
    try {
      await reconcileFunding(collateralID);
      toast({
        title: t('common.success'),
        description: t('collectibles.collateral.funding.reconcileSuccess'),
        variant: 'success',
      });
      await onUpdated?.();
    } catch (cause) {
      notifyError(cause, 'collectibles.collateral.funding.reconcileFailed');
    } finally {
      setActionLoading(false);
    }
  }, [
    guardedAccount?.collateralID,
    notifyError,
    notifyPrincipalBindingBlocked,
    onUpdated,
    principalBindingAllowed,
    reconcileFunding,
    t,
    toast,
  ]);

  if (!hasAnyCollateralFields) {
    return null;
  }

  const invalidDeclarationIssue =
    declarationValidation.valid === false ? declarationValidation.issue : null;
  const capabilitiesUnavailable = capabilities != null && !capabilities.available;
  const unsupportedAsset =
    hasValidDeclaration &&
    capabilities?.available &&
    guaranteeAssetID != null &&
    !assetSupportedOnRail;
  const accountState = guardedAccount?.state?.trim().toLowerCase();
  const needsFunding =
    guardedAccount &&
    !isCollateralProtectionActive(protectionStatus) &&
    (accountState === 'pending-funding' ||
      protectionStatus === 'funding' ||
      protectionStatus === 'declared');
  const canOpenAccount =
    principalBindingAllowed &&
    capabilities?.available &&
    !guardedAccount &&
    !bindingMismatch &&
    !capabilitiesUnavailable &&
    !unsupportedAsset &&
    collateralExpiresAt.valid;
  const canPrepareFunding =
    Boolean(guardedAccount?.collateralID) &&
    needsFunding &&
    principalBindingAllowed &&
    !bindingMismatch &&
    !capabilitiesUnavailable &&
    !unsupportedAsset &&
    evmConnected;
  const canReconcile =
    Boolean(guardedAccount?.collateralID) &&
    principalBindingAllowed &&
    !bindingMismatch &&
    (accountState === 'pending-funding' || protectionStatus === 'funding');

  const targetExpiry = formatTimestamp(fundingTarget?.expiresAt, locale);
  const fundingAssetDisplay = resolveCollateralAssetDisplay(fundingTarget?.assetID);
  const fundingAmountDisplay = resolveCollateralAmountDisplay(
    fundingTarget?.amount,
    fundingTarget?.assetID
  );
  const hookErrorKey = error
    ? resolveCollateralFundingErrorKey(error, 'collectibles.collateral.funding.prepareFailed')
    : null;

  const fundingStageId = isCollateralProtectionActive(protectionStatus)
    ? 'active'
    : canReconcile || protectionStatus === 'funding'
      ? 'reconcile'
      : canPrepareFunding || needsFunding
        ? 'fund'
        : canOpenAccount
          ? 'open'
          : 'declare';

  const fundingCompletedSteps =
    fundingStageId === 'active'
      ? ['declare', 'open', 'fund', 'active']
      : fundingStageId === 'reconcile' || fundingStageId === 'fund'
        ? ['declare', 'open']
        : fundingStageId === 'open'
          ? ['declare']
          : [];

  return (
    <div
      className={cn(
        'mt-3 space-y-3 rounded-md border border-border bg-muted/10',
        compact ? 'p-2.5' : 'p-3',
        className
      )}
      data-testid="source-deposit-collateral-funding-section"
    >
      <div className="space-y-2">
        <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
          {t('collectibles.collateral.funding.stageTitle')}
        </p>
        <CollectiblesJourneyProgress
          steps={[
            {
              id: 'declare',
              labelKey: 'collectibles.collateral.funding.stages.declare',
            },
            { id: 'open', labelKey: 'collectibles.collateral.funding.stages.open' },
            { id: 'fund', labelKey: 'collectibles.collateral.funding.stages.fund' },
            { id: 'active', labelKey: 'collectibles.collateral.funding.stages.active' },
          ]}
          currentStepId={fundingStageId}
          completedStepIds={fundingCompletedSteps}
          ariaLabelKey="collectibles.collateral.funding.stageAria"
        />
      </div>

      <CollectibleCollateralProtectionSummary
        deposit={deposit}
        account={guardedAccount}
        compact={compact}
        variant="seller"
      />

      <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
        {t('collectibles.collateral.funding.solanaCustodyNote')}
      </p>

      {invalidDeclarationIssue ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-testid="collateral-invalid-declaration"
        >
          {t(resolveCollectibleCollateralDeclarationIssueKey(invalidDeclarationIssue))}
        </p>
      ) : null}

      {hasValidDeclaration && !principalBindingAllowed ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-testid="collateral-principal-binding-blocked"
        >
          {t(resolveSourceDepositPrincipalBindingI18nKey(principalBinding.issue))}
        </p>
      ) : null}

      {hasValidDeclaration &&
      principalBindingAllowed &&
      loading &&
      !guardedAccount &&
      !capabilities ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('common.loading')}
        </div>
      ) : null}

      {hasValidDeclaration && capabilitiesUnavailable ? (
        <p className="text-xs text-destructive" role="status">
          {t('collectibles.collateral.funding.capabilitiesUnavailable')}
        </p>
      ) : null}

      {unsupportedAsset ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-testid="collateral-unsupported-asset"
        >
          {t('collectibles.collateral.funding.unsupportedAsset')}
        </p>
      ) : null}

      {hasValidDeclaration && bindingMismatch ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-testid="collateral-binding-mismatch"
        >
          {t('collectibles.collateral.funding.accountBindingMismatch')}
        </p>
      ) : null}

      {hasValidDeclaration && !collateralExpiresAt.valid ? (
        <p
          className="text-xs text-destructive"
          role="alert"
          data-testid="collateral-invalid-created-at"
        >
          {t(resolveCollectibleCollateralExpiryIssueKey(collateralExpiresAt.issue))}
        </p>
      ) : null}

      {actionErrorKey ? (
        <p className="text-xs text-destructive" role="alert" data-testid="collateral-action-error">
          {t(actionErrorKey)}
        </p>
      ) : null}

      {hookErrorKey && !actionErrorKey ? (
        <p className="text-xs text-destructive" role="alert">
          {t(hookErrorKey)}
        </p>
      ) : null}

      {hasValidDeclaration && canOpenAccount ? (
        <Button
          type="button"
          size="sm"
          disabled={actionLoading || loading}
          onClick={() => void handleOpenAccount()}
          data-testid="collateral-open-account"
        >
          {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('collectibles.collateral.funding.openAccount')}
        </Button>
      ) : null}

      {hasValidDeclaration && needsFunding && !unsupportedAsset ? (
        <div className="space-y-2">
          <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
            {t('collectibles.collateral.funding.evmWalletTitle')}
          </p>
          <p className={cn('text-muted-foreground', compact ? 'text-[11px]' : 'text-xs')}>
            {t('collectibles.collateral.funding.evmWalletDesc')}
          </p>

          {evmConnected ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-2">
              <Wallet className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="font-mono text-xs text-foreground">
                {truncateAddress(evmAddress)}
              </span>
              <span className="ml-auto text-xs text-success">
                {t('collectibles.collateral.funding.evmConnected')}
              </span>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={appKitInitializing || actionLoading}
              onClick={() => void handleConnectEvmWallet()}
              data-testid="collateral-connect-evm"
            >
              {appKitInitializing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wallet className="mr-2 h-4 w-4" aria-hidden />
              )}
              {t('collectibles.collateral.funding.connectEvm')}
            </Button>
          )}

          {canPrepareFunding ? (
            <>
              <label
                className="text-xs font-medium text-foreground"
                htmlFor={`collateral-principal-${deposit.sourceDepositID}`}
              >
                {t('collectibles.collateral.funding.principalDestination')}
              </label>
              <Input
                id={`collateral-principal-${deposit.sourceDepositID}`}
                value={principalDestination}
                onChange={event => setPrincipalDestination(event.target.value)}
                autoComplete="off"
                data-testid="collateral-principal-input"
              />

              <Button
                type="button"
                size="sm"
                disabled={actionLoading || loading || !principalDestination.trim()}
                onClick={() => void handlePrepareFunding()}
                data-testid="collateral-prepare-funding"
              >
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {t('collectibles.collateral.funding.prepareTarget')}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {hasValidDeclaration && canReconcile ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actionLoading || loading}
          onClick={() => void handleReconcile()}
          data-testid="collateral-reconcile-funding"
        >
          {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('collectibles.collateral.funding.reconcile')}
        </Button>
      ) : null}

      {hasValidDeclaration && principalBindingAllowed ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => {
            if (!principalBindingAllowed) {
              notifyPrincipalBindingBlocked();
              return;
            }
            void refreshCapabilities().catch(() => undefined);
            if (accountBinding) {
              void findResourceAccount(accountBinding).catch(() => undefined);
            }
          }}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('collectibles.collateral.funding.refreshStatus')}
        </Button>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('collectibles.collateral.funding.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('collectibles.collateral.funding.confirmBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {fundingTarget ? (
            <div className="space-y-2 text-left text-xs text-muted-foreground">
              <dl className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                {fundingAssetDisplay ? (
                  <div>
                    <dt className="font-medium text-foreground">
                      {t('collectibles.collateral.fields.guaranteeAsset')}
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {resolveCollateralAssetUserLabel(fundingAssetDisplay, t)}
                    </dd>
                  </div>
                ) : null}
                {fundingAmountDisplay ? (
                  <div>
                    <dt className="font-medium text-foreground">
                      {t('collectibles.collateral.fields.requiredAmount')}
                    </dt>
                    <dd className="mt-0.5 text-foreground">
                      {resolveCollateralAmountUserLabel(fundingAmountDisplay, t)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-medium text-foreground">
                    {t('collectibles.collateral.fields.assetId')}
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-[11px] text-muted-foreground">
                    {fundingTarget.assetID}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">
                    {t('collectibles.collateral.fields.requiredAmountBase')}
                  </dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {fundingTarget.amount}
                  </dd>
                </div>
                {fundingTarget.destination ? (
                  <div>
                    <dt className="font-medium text-foreground">
                      {t('collectibles.collateral.fields.destination')}
                    </dt>
                    <dd className="mt-0.5 flex items-start justify-between gap-2 break-all font-mono text-foreground">
                      <span>{fundingTarget.destination}</span>
                      <button
                        type="button"
                        className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => void handleCopy('destination', fundingTarget.destination!)}
                        aria-label={t('common.copy')}
                      >
                        {copiedField === 'destination' ? (
                          <Check className="h-3 w-3 text-primary" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </dd>
                  </div>
                ) : null}
                {targetExpiry ? (
                  <div>
                    <dt className="font-medium text-foreground">
                      {t('collectibles.collateral.fields.expiresAt')}
                    </dt>
                    <dd className="mt-0.5 text-foreground">{targetExpiry}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              disabled={actionLoading}
              onClick={() => void handleConfirmFunding()}
              data-testid="collateral-confirm-fund"
            >
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('collectibles.collateral.funding.confirmFund')}
            </Button>
            <AlertDialogCancel disabled={actionLoading}>{t('common.cancel')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
