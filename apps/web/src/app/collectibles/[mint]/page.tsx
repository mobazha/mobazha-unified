'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/components/ui/use-toast';
import {
  collectiblesApi,
  getEnvConfig,
  isCollectiblesPublicCatalogUnavailableError,
  prepareCollectibleShipToPayload,
  resolveCollectibleCatalogDisplay,
  shouldQueryCollectibleRedemptionByMint,
  signCollectibleBurnTransaction,
  useAppKit,
  useCollectibleNFT,
  useCollectibleRedemptionByMint,
  useI18n,
  useUserStore,
  truncateAddress,
} from '@mobazha/core';
import { ArrowLeft, CheckCircle2, Circle, Loader2, RefreshCw } from 'lucide-react';
import { CollectibleOnChainProof } from '@/components/collectibles/CollectibleOnChainProof';

export default function CollectibleDetailPage() {
  const params = useParams();
  const mintParam = params?.mint;
  const mint = Array.isArray(mintParam) ? mintParam[0] : mintParam;
  const { t } = useI18n();
  const { toast } = useToast();
  const { isAuthenticated } = useUserStore();
  const { nft, loading, error, refresh } = useCollectibleNFT(mint, true);
  const catalogUnavailable = !!error && isCollectiblesPublicCatalogUnavailableError(error);
  const detailReady = !loading && !catalogUnavailable;
  const redemptionLookupEnabled = shouldQueryCollectibleRedemptionByMint(isAuthenticated, nft);
  const { redemption: existingRedemption } = useCollectibleRedemptionByMint(
    nft?.burnAt ? nft.nftMint : undefined,
    redemptionLookupEnabled
  );
  const { address, isConnected, isInitializing, connectSolana, getWalletProvider, chain } =
    useAppKit();

  const [shipTo, setShipTo] = useState('');
  const [redeemStep, setRedeemStep] = useState<'idle' | 'binding' | 'burning' | 'submitting'>(
    'idle'
  );
  const [redemptionId, setRedemptionId] = useState<string | null>(null);

  const holderWallet = address || '';
  const expectedHolderWallet = nft?.hubSlot?.currentHolder?.trim() || '';
  const isDevnetNetwork =
    nft?.network?.trim().toLowerCase() === 'devnet' || getEnvConfig().isTestEnv;
  const isSolanaWallet =
    isConnected &&
    !!holderWallet &&
    !holderWallet.startsWith('0x') &&
    (chain?.chainNamespace === 'solana' || chain?.chainNamespace === undefined);
  const isExpectedHolder = !expectedHolderWallet || holderWallet.trim() === expectedHolderWallet;

  const display = useMemo(
    () => (nft ? resolveCollectibleCatalogDisplay(nft, t) : null),
    [nft, t]
  );

  const canRedeem = useMemo(
    () =>
      !!nft &&
      display?.redeemable &&
      !display.credentialActionsBlocked &&
      !nft.burnAt &&
      isSolanaWallet &&
      isExpectedHolder &&
      shipTo.trim().length > 8,
    [nft, display?.redeemable, display?.credentialActionsBlocked, isSolanaWallet, isExpectedHolder, shipTo]
  );

  const isVoidedCredential = display?.credentialActionsBlocked && display.validityStatus === 'voided';
  const isBurnedCredential = Boolean(nft?.burnAt) || display?.validityStatus === 'burned';

  const walletStepDone = isSolanaWallet && isExpectedHolder;
  const addressStepDone = shipTo.trim().length > 8;

  const handleRedeem = useCallback(async () => {
    if (!nft?.nftMint || !holderWallet) return;
    setRedeemStep('binding');
    try {
      await collectiblesApi.bindCollectibleWallet({
        wallet: holderWallet,
        nftMint: nft.nftMint,
      });

      setRedeemStep('burning');
      const burnTx = await collectiblesApi.buildCollectibleBurnTx(nft.nftMint, holderWallet);
      const burnSignature = await signCollectibleBurnTransaction({
        burnTx,
        walletProvider: getWalletProvider() ?? undefined,
        walletAddress: holderWallet,
        isDevnet: isDevnetNetwork,
      });

      setRedeemStep('submitting');
      const redemption = await collectiblesApi.createCollectibleRedemption({
        nftMint: nft.nftMint,
        requesterWallet: holderWallet,
        burnTxSignature: burnSignature,
        shipToEncrypted: prepareCollectibleShipToPayload(shipTo),
      });

      setRedemptionId(redemption.redemptionID);
      toast({
        title: t('collectibles.redeem.successTitle'),
        description: t('collectibles.redeem.successDesc'),
        variant: 'success',
      });
      void refresh();
    } catch (err) {
      console.error('[collectibles] redeem failed', err);
      toast({
        title: t('collectibles.redeem.failedTitle'),
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setRedeemStep('idle');
    }
  }, [
    getWalletProvider,
    holderWallet,
    isDevnetNetwork,
    nft,
    refresh,
    shipTo,
    t,
    toast,
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('collectibles.detailTitle')} />

      <main className="py-4 sm:py-8">
        <Container size="md">
          {loading && !catalogUnavailable ? (
            <div
              className="flex items-center justify-center py-20"
              data-testid="collectibles-detail-loading"
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : catalogUnavailable ? (
            <Card
              className="mx-auto max-w-lg p-6 text-center"
              data-testid="collectibles-feature-disabled"
            >
              <p className="text-sm text-muted-foreground">{t('collectibles.featureDisabled')}</p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/">{t('common.back')}</Link>
              </Button>
            </Card>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
                <Link href="/collectibles">
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                  {t('collectibles.backToList')}
                </Link>
              </Button>

              {error && detailReady ? (
                <Card className="mb-4 border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm text-destructive">{error.message}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => void refresh()}
                    disabled={loading}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('common.refresh')}
                  </Button>
                </Card>
              ) : null}

              {loading && !nft ? (
                <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
              ) : null}

              {nft && display ? (
                <div className="space-y-6" data-testid="collectibles-detail-content">
                  <Card className="overflow-hidden p-0">
                    {display.imageUrl ? (
                      <div className="aspect-[4/3] w-full bg-muted">
                        <img
                          src={display.imageUrl}
                          alt={display.displayName}
                          className="h-full w-full object-contain p-4"
                        />
                      </div>
                    ) : null}
                    <div className="p-5">
                      <h1 className="text-xl font-semibold text-foreground">{display.displayName}</h1>
                      {display.grade ? (
                        <p className="mt-1 text-sm text-muted-foreground">{display.grade}</p>
                      ) : null}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge variant="secondary">{t(display.custodyStatusKey)}</Badge>
                        <Badge
                          variant={
                            display.validityStatus === 'voided'
                              ? 'destructive'
                              : display.validityStatus === 'burned'
                                ? 'outline'
                                : 'default'
                          }
                          data-testid="collectible-validity-badge"
                        >
                          {t(display.validityStatusKey)}
                        </Badge>
                        {!display.credentialActionsBlocked ? (
                          <Badge variant={display.redeemable ? 'default' : 'outline'}>
                            {display.redeemable
                              ? t('collectibles.catalog.redeemableYes')
                              : t('collectibles.catalog.redeemableNo')}
                          </Badge>
                        ) : null}
                      </div>
                      {isVoidedCredential ? (
                        <div
                          className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3"
                          data-testid="collectible-voided-notice"
                        >
                          <p className="text-sm font-medium text-destructive">
                            {t('collectibles.validity.voidedDetailTitle')}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {t('collectibles.validity.voidedDetailBody')}
                          </p>
                          {nft.invalidationReason?.trim() ? (
                            <p className="mt-2 text-sm text-foreground">
                              {t('collectibles.validity.invalidationReason')}:{' '}
                              {nft.invalidationReason}
                            </p>
                          ) : null}
                          {nft.invalidatedAt?.trim() ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('collectibles.validity.invalidatedAt')}: {nft.invalidatedAt}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </Card>

                  <Accordion type="single" collapsible className="rounded-lg border border-border px-4">
                    <AccordionItem value="on-chain-proof" className="border-0">
                      <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                        {t('collectibles.catalog.onChainProofTitle')}
                      </AccordionTrigger>
                      <AccordionContent>
                        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">{t('collectibles.redeem.mint')}</dt>
                            <dd className="break-all font-mono text-foreground">{nft.nftMint}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">{t('collectibles.hubSlot')}</dt>
                            <dd className="font-medium text-foreground">{nft.hubSlotID}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">{t('collectibles.chain')}</dt>
                            <dd className="font-medium text-foreground">
                              {nft.network || nft.chain || 'solana'}
                            </dd>
                          </div>
                          {nft.metadataURI ? (
                            <div className="sm:col-span-2">
                              <dt className="text-muted-foreground">{t('collectibles.metadata')}</dt>
                              <dd className="break-all font-medium text-foreground">
                                {nft.metadataURI}
                              </dd>
                            </div>
                          ) : null}
                        </dl>
                        <CollectibleOnChainProof
                          className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2"
                          mintTxSignature={nft.mintTxSignature}
                          mintConfirmedSlot={nft.mintConfirmedSlot}
                          mintTxExplorerURL={nft.mintTxExplorerURL}
                          isDevnet={isDevnetNetwork}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {isVoidedCredential ? null : isBurnedCredential ? (
                    <Card className="space-y-3 border-muted bg-muted/40 p-4">
                      <p className="text-sm text-muted-foreground">
                        {t('collectibles.alreadyRedeemed')}
                      </p>
                      {existingRedemption ? (
                        <Button asChild variant="link" className="h-auto p-0 text-primary">
                          <Link
                            href={`/collectibles/redeem/${encodeURIComponent(existingRedemption.redemptionID)}`}
                          >
                            {t('collectibles.redeem.viewTracking')}
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild variant="link" className="h-auto p-0 text-primary">
                          <Link href="/collectibles/redemptions">
                            {t('collectibles.redemptions.title')}
                          </Link>
                        </Button>
                      )}
                    </Card>
                  ) : display?.redeemable && !display.credentialActionsBlocked ? (
                    <Card className="p-5">
                      <h2 className="text-base font-semibold text-foreground">
                        {t('collectibles.redeem.title')}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t('collectibles.redeem.description')}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t('collectibles.redeem.holderOnlyNote')}
                      </p>

                      <ol className="mt-4 space-y-4">
                        <li className="flex gap-3">
                          {walletStepDone ? (
                            <CheckCircle2
                              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                              aria-hidden
                            />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {t('collectibles.redeem.stepWallet')}
                            </p>
                            {isSolanaWallet ? (
                              <div className="mt-2 space-y-2">
                                <p className="font-mono text-sm text-muted-foreground">
                                  {truncateAddress(holderWallet)}
                                </p>
                                {expectedHolderWallet ? (
                                  <p className="text-xs text-muted-foreground">
                                    {t('collectibles.redeem.expectedHolder')}:{' '}
                                    <span className="font-mono">
                                      {truncateAddress(expectedHolderWallet)}
                                    </span>
                                  </p>
                                ) : null}
                                {!isExpectedHolder ? (
                                  <p className="text-sm text-destructive">
                                    {t('collectibles.redeem.walletMismatch')}
                                  </p>
                                ) : null}
                              </div>
                            ) : isConnected ? (
                              <div className="mt-2 space-y-2">
                                <p className="text-sm text-muted-foreground">
                                  {t('collectibles.redeem.solanaWalletRequired')}
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void connectSolana()}
                                  disabled={isInitializing}
                                >
                                  {isInitializing
                                    ? t('collectibles.redeem.connecting')
                                    : t('collectibles.redeem.connectWallet')}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => void connectSolana()}
                                disabled={isInitializing}
                              >
                                {isInitializing
                                  ? t('collectibles.redeem.connecting')
                                  : t('collectibles.redeem.connectWallet')}
                              </Button>
                            )}
                          </div>
                        </li>

                        <li className="flex gap-3">
                          {walletStepDone ? (
                            <CheckCircle2
                              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                              aria-hidden
                            />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {t('collectibles.redeem.stepVerify')}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('collectibles.redeem.stepVerifyDesc')}
                            </p>
                          </div>
                        </li>

                        <li className="flex gap-3">
                          {addressStepDone ? (
                            <CheckCircle2
                              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                              aria-hidden
                            />
                          ) : (
                            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                          )}
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor="collectible-ship-to"
                              className="text-sm font-medium text-foreground"
                            >
                              {t('collectibles.redeem.stepAddress')}
                            </label>
                            <Textarea
                              id="collectible-ship-to"
                              value={shipTo}
                              onChange={event => setShipTo(event.target.value)}
                              placeholder={t('collectibles.redeem.shippingPlaceholder')}
                              rows={4}
                              className="mt-2"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('collectibles.redeem.shippingPrivacy')}
                            </p>
                          </div>
                        </li>

                        <li className="flex gap-3">
                          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {t('collectibles.redeem.stepSubmit')}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t('collectibles.redeem.stepSubmitDesc')}
                            </p>
                            <Button
                              type="button"
                              className="mt-3 w-full sm:w-auto"
                              disabled={!canRedeem || redeemStep !== 'idle'}
                              onClick={() => void handleRedeem()}
                            >
                              {redeemStep === 'idle'
                                ? t('collectibles.redeem.submit')
                                : t('collectibles.redeem.processing')}
                            </Button>
                          </div>
                        </li>
                      </ol>
                    </Card>
                  ) : null}

                  {redemptionId && !isVoidedCredential ? (
                    <Card className="border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm text-foreground">
                        {t('collectibles.redeem.trackingLabel')}:{' '}
                        <span className="font-mono">{redemptionId}</span>
                      </p>
                      <Button asChild variant="link" className="mt-2 h-auto p-0 text-primary">
                        <Link href={`/collectibles/redeem/${encodeURIComponent(redemptionId)}`}>
                          {t('collectibles.redeem.viewTracking')}
                        </Link>
                      </Button>
                    </Card>
                  ) : null}
                </div>
              ) : !loading && !error && mint ? (
                <Card className="p-6 text-center" data-testid="collectibles-detail-empty">
                  <p className="text-sm text-muted-foreground">{t('collectibles.empty')}</p>
                </Card>
              ) : null}
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
