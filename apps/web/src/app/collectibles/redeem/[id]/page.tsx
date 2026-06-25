'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  isCollectibleShipToProtected,
  resolveCollectibleRedemptionPhase,
  useCollectibleRedemption,
  useFeature,
  useI18n,
  getSolanaExplorerTxUrl,
  getEnvConfig,
  truncateAddress,
  type CollectibleRedemptionPhase,
} from '@mobazha/core';
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, Package, Truck } from 'lucide-react';
import { CollectiblesFeatureGuard } from '../../CollectiblesFeatureGuard';

const PHASE_CONFIG: Record<
  CollectibleRedemptionPhase,
  { icon: React.ElementType; color: string; bgColor: string }
> = {
  redeem_requested: { icon: Clock, color: 'text-info', bgColor: 'bg-info/15' },
  shipped: { icon: Truck, color: 'text-warning', bgColor: 'bg-warning/15' },
  settled: { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/15' },
};

function formatDateTime(
  value: string | undefined,
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDate(date);
}

export default function CollectibleRedemptionPage() {
  const params = useParams();
  const idParam = params?.id;
  const redemptionId = Array.isArray(idParam) ? idParam[0] : idParam;
  const { t, formatDate } = useI18n();
  const enabled = useFeature('collectiblesHubEnabled');
  const { redemption, loading, error, refresh } = useCollectibleRedemption(redemptionId, enabled);

  const phase = useMemo(() => resolveCollectibleRedemptionPhase(redemption), [redemption]);
  const phaseConfig = PHASE_CONFIG[phase];
  const PhaseIcon = phaseConfig.icon;

  const submittedAt = formatDateTime(redemption?.createdAt, formatDate);
  const burnAt = formatDateTime(redemption?.burnAt, formatDate);
  const slaDueAt = formatDateTime(redemption?.slaDueAt, formatDate);
  const burnTxExplorerUrl = redemption?.burnTxSignature
    ? getSolanaExplorerTxUrl(redemption.burnTxSignature, getEnvConfig().isTestEnv)
    : '';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('collectibles.tracking.title')} />

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
                <p className="text-sm text-destructive">
                  {error.message || t('collectibles.tracking.loadFailed')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void refresh()}
                >
                  {t('common.refresh')}
                </Button>
              </Card>
            ) : null}

            {redemption ? (
              <div className="space-y-6">
                <Card className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${phaseConfig.bgColor}`}
                    >
                      <PhaseIcon className={`h-5 w-5 ${phaseConfig.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg font-semibold text-foreground">
                        {t('collectibles.tracking.title')}
                      </h1>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {t(`collectibles.tracking.phase.${phase}`)}
                      </p>
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {redemption.redemptionID}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-5">
                  <h2 className="text-sm font-semibold text-foreground">
                    {t('collectibles.tracking.detailsTitle')}
                  </h2>
                  <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">
                        {t('collectibles.tracking.statusLabel')}
                      </dt>
                      <dd className="font-medium text-foreground">
                        {t(`collectibles.tracking.phase.${phase}`)}
                      </dd>
                    </div>
                    {submittedAt ? (
                      <div>
                        <dt className="text-muted-foreground">
                          {t('collectibles.tracking.submittedAt')}
                        </dt>
                        <dd className="font-medium text-foreground">{submittedAt}</dd>
                      </div>
                    ) : null}
                    {burnAt ? (
                      <div>
                        <dt className="text-muted-foreground">
                          {t('collectibles.tracking.burnConfirmed')}
                        </dt>
                        <dd className="font-medium text-foreground">{burnAt}</dd>
                      </div>
                    ) : null}
                    {redemption.burnTxSignature ? (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">
                          {t('collectibles.onChain.burnTx')}
                        </dt>
                        <dd className="font-medium text-foreground">
                          {burnTxExplorerUrl ? (
                            <a
                              href={burnTxExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
                            >
                              {truncateAddress(redemption.burnTxSignature)}
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="sr-only">
                                {t('collectibles.onChain.viewOnExplorer')}
                              </span>
                            </a>
                          ) : (
                            <span className="font-mono text-sm">
                              {truncateAddress(redemption.burnTxSignature)}
                            </span>
                          )}
                        </dd>
                      </div>
                    ) : null}
                    {slaDueAt && phase === 'redeem_requested' ? (
                      <div>
                        <dt className="text-muted-foreground">
                          {t('collectibles.tracking.slaDue')}
                        </dt>
                        <dd className="font-medium text-foreground">{slaDueAt}</dd>
                      </div>
                    ) : null}
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">
                        {t('collectibles.tracking.nftMint')}
                      </dt>
                      <dd className="break-all font-mono text-foreground">
                        <Link
                          href={`/collectibles/${encodeURIComponent(redemption.nftMint)}`}
                          className="text-primary hover:underline"
                        >
                          {redemption.nftMint}
                        </Link>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t('collectibles.redeem.wallet')}</dt>
                      <dd className="font-mono text-foreground">
                        {truncateAddress(redemption.requesterWallet)}
                      </dd>
                    </div>
                    {redemption.trackingNo ? (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">
                          {t('collectibles.tracking.trackingNumber')}
                        </dt>
                        <dd className="font-medium text-foreground">{redemption.trackingNo}</dd>
                      </div>
                    ) : null}
                    {redemption.shipToEncrypted ? (
                      <div className="sm:col-span-2">
                        <dt className="text-muted-foreground">
                          {t('collectibles.tracking.shippingAddress')}
                        </dt>
                        <dd className="whitespace-pre-wrap font-medium text-foreground">
                          {isCollectibleShipToProtected(redemption.shipToEncrypted)
                            ? t('collectibles.tracking.shippingAddressOnFile')
                            : redemption.shipToEncrypted}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </Card>

                {phase !== 'settled' ? (
                  <Card className="border-muted bg-muted/40 p-4">
                    <div className="flex items-start gap-3">
                      <Package className="mt-0.5 h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('collectibles.tracking.inProgressHint')}
                      </p>
                    </div>
                  </Card>
                ) : null}

                <Button asChild variant="outline" size="sm">
                  <Link href={`/collectibles/${encodeURIComponent(redemption.nftMint)}`}>
                    {t('collectibles.tracking.viewCard')}
                  </Link>
                </Button>
              </div>
            ) : null}

            {!loading && !error && !redemption ? (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  {t('collectibles.tracking.notFound')}
                </p>
              </Card>
            ) : null}
          </CollectiblesFeatureGuard>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
