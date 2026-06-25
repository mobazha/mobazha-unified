'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  collectiblesApi,
  getEnvConfig,
  signCollectibleBurnTransaction,
  useAppKit,
  useCollectibleNFT,
  useFeature,
  useI18n,
  truncateAddress,
} from '@mobazha/core';
import { ArrowLeft, Package } from 'lucide-react';
import { CollectiblesFeatureGuard } from '../CollectiblesFeatureGuard';

function encodeShipToPayload(value: string): string {
  if (typeof window === 'undefined') return value;
  try {
    return window.btoa(unescape(encodeURIComponent(value.trim())));
  } catch {
    return value.trim();
  }
}

export default function CollectibleDetailPage() {
  const params = useParams();
  const mintParam = params?.mint;
  const mint = Array.isArray(mintParam) ? mintParam[0] : mintParam;
  const { t } = useI18n();
  const { toast } = useToast();
  const enabled = useFeature('collectiblesHubEnabled');
  const { nft, loading, error, refresh } = useCollectibleNFT(mint, enabled);
  const { address, isConnected, isInitializing, connectSolana, getWalletProvider, chain } =
    useAppKit();

  const [shipTo, setShipTo] = useState('');
  const [redeemStep, setRedeemStep] = useState<'idle' | 'binding' | 'burning' | 'submitting'>(
    'idle'
  );
  const [redemptionId, setRedemptionId] = useState<string | null>(null);

  const holderWallet = address || '';
  const isSolanaWallet =
    isConnected &&
    !!holderWallet &&
    !holderWallet.startsWith('0x') &&
    (chain?.chainNamespace === 'solana' || chain?.chainNamespace === undefined);

  const canRedeem = useMemo(
    () => enabled && !!nft && !nft.burnAt && isSolanaWallet && shipTo.trim().length > 8,
    [enabled, nft, isSolanaWallet, shipTo]
  );

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
        isDevnet: getEnvConfig().isTestEnv,
      });

      setRedeemStep('submitting');
      const redemption = await collectiblesApi.createCollectibleRedemption({
        nftMint: nft.nftMint,
        requesterWallet: holderWallet,
        burnTxSignature: burnSignature,
        shipToEncrypted: encodeShipToPayload(shipTo),
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
  }, [getWalletProvider, holderWallet, nft, refresh, shipTo, t, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('collectibles.detailTitle')} />

      <main className="py-4 sm:py-8">
        <Container size="md">
          <CollectiblesFeatureGuard enabled={enabled}>
            <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
              <Link href="/collectibles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('collectibles.backToList')}
              </Link>
            </Button>

            {loading ? (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            ) : null}

            {error ? (
              <Card className="border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{error.message}</p>
              </Card>
            ) : null}

            {nft ? (
              <div className="space-y-6">
                <Card className="p-5">
                  <div className="flex items-start gap-3">
                    <Package className="mt-1 h-5 w-5 text-primary" />
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg font-semibold text-foreground">
                        {t('collectibles.tokenizedCard')}
                      </h1>
                      <p className="mt-1 break-all font-mono text-sm text-muted-foreground">
                        {nft.nftMint}
                      </p>
                      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-muted-foreground">{t('collectibles.hubSlot')}</dt>
                          <dd className="font-medium text-foreground">{nft.hubSlotID}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">{t('collectibles.chain')}</dt>
                          <dd className="font-medium text-foreground">{nft.chain || 'solana'}</dd>
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
                    </div>
                  </div>
                </Card>

                {nft.burnAt ? (
                  <Card className="border-muted bg-muted/40 p-4">
                    <p className="text-sm text-muted-foreground">
                      {t('collectibles.alreadyRedeemed')}
                    </p>
                  </Card>
                ) : (
                  <Card className="p-5">
                    <h2 className="text-base font-semibold text-foreground">
                      {t('collectibles.redeem.title')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('collectibles.redeem.description')}
                    </p>

                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-sm font-medium text-foreground">
                          {t('collectibles.redeem.wallet')}
                        </p>
                        {isSolanaWallet ? (
                          <p className="font-mono text-sm text-muted-foreground">
                            {truncateAddress(holderWallet)}
                          </p>
                        ) : isConnected ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              {t('collectibles.redeem.solanaWalletRequired')}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
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
                            onClick={() => void connectSolana()}
                            disabled={isInitializing}
                          >
                            {isInitializing
                              ? t('collectibles.redeem.connecting')
                              : t('collectibles.redeem.connectWallet')}
                          </Button>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="collectible-ship-to"
                          className="mb-2 block text-sm font-medium text-foreground"
                        >
                          {t('collectibles.redeem.shippingAddress')}
                        </label>
                        <Textarea
                          id="collectible-ship-to"
                          value={shipTo}
                          onChange={event => setShipTo(event.target.value)}
                          placeholder={t('collectibles.redeem.shippingPlaceholder')}
                          rows={4}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('collectibles.redeem.shippingPrivacy')}
                        </p>
                      </div>

                      <Button
                        type="button"
                        className="w-full sm:w-auto"
                        disabled={!canRedeem || redeemStep !== 'idle'}
                        onClick={() => void handleRedeem()}
                      >
                        {redeemStep === 'idle'
                          ? t('collectibles.redeem.submit')
                          : t('collectibles.redeem.processing')}
                      </Button>
                    </div>
                  </Card>
                )}

                {redemptionId ? (
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
            ) : null}
          </CollectiblesFeatureGuard>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
