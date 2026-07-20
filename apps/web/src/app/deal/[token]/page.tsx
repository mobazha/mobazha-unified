'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ImageIcon, ShieldCheck, Store } from 'lucide-react';
import {
  buildDealLinkPaymentHref,
  clearSellerAffiliateReferralSession,
  formatUserName,
  getCurrencySymbol,
  getImageUrl,
  resolveDealLinkAcceptanceWindowDays,
  resolveDealLinkProtectionWindowDays,
  readSellerAffiliateReferralSession,
  setLoginRedirectPath,
  useCurrency,
  useDealLinkCheckout,
  useI18n,
  useProfile,
  useUserStore,
} from '@mobazha/core';
import { Header } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DealLinkBottomBar } from '@/components/DealLink/DealLinkBottomBar';
import { DealLinkCountdown } from '@/components/DealLink/DealLinkCountdown';
import { DealLinkFeeBreakdown } from '@/components/DealLink/DealLinkFeeBreakdown';
import { DealLinkStatusPanel } from '@/components/DealLink/DealLinkStatusPanel';

function resolveDealPath(token: string): string {
  return `/deal/${encodeURIComponent(token)}`;
}

function DealLinkProductImage({ src, title }: { src?: string; title: string }) {
  return <DealLinkProductImageContent key={src ?? 'missing'} src={src} title={title} />;
}

function DealLinkProductImageContent({ src, title }: { src?: string; title: string }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>(src ? 'loading' : 'failed');

  useEffect(() => {
    if (!src || status !== 'loading') return;
    const timeout = window.setTimeout(() => setStatus('failed'), 5000);
    return () => window.clearTimeout(timeout);
  }, [src, status]);

  return (
    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-border bg-muted sm:aspect-square sm:max-w-[180px]">
      {status !== 'loaded' ? (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted"
          aria-hidden="true"
        >
          <ImageIcon className="h-9 w-9 text-muted-foreground/50" />
        </div>
      ) : null}
      {src && status !== 'failed' ? (
        <img
          src={src}
          alt={t('dealLink.productImageAlt', { product: title })}
          className={`h-full w-full object-cover transition-opacity ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
          loading="eager"
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('failed')}
        />
      ) : null}
    </div>
  );
}

export default function DealLinkPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : undefined;
  const router = useRouter();
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const affiliateReferral = useMemo(() => readSellerAffiliateReferralSession(), []);

  const handleRequireAuth = useCallback(() => {
    if (!token) return;
    const returnPath = resolveDealPath(token);
    setLoginRedirectPath(returnPath);
    router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [router, token]);

  const handleAccepted = useCallback(
    (orderID: string) => {
      router.push(buildDealLinkPaymentHref(orderID));
    },
    [router]
  );

  const checkout = useDealLinkCheckout(token, {
    isAuthenticated,
    affiliateReferral,
    onRequireAuth: handleRequireAuth,
    onAccepted: handleAccepted,
    onClearAffiliateReferral: clearSellerAffiliateReferralSession,
  });

  const deal = checkout.deal;
  const quote = checkout.quote;

  const catalog = deal?.catalog;
  const productTitle = catalog?.title || deal?.title || '';
  // Signed listing VendorID.name is often empty in SaaS; fall back to live profile.
  const needsSellerProfile = Boolean(deal?.sellerPeerID) && !catalog?.sellerName?.trim();
  const { profile: sellerProfile } = useProfile(needsSellerProfile ? deal!.sellerPeerID : null);
  const sellerName = formatUserName(
    {
      name: catalog?.sellerName?.trim() || sellerProfile?.name || sellerProfile?.handle,
      peerID: deal?.sellerPeerID,
    },
    { prefix: t('dealLink.storeIdPrefix'), fallback: t('dealLink.sellerFallback') }
  );
  const productImage = getImageUrl(catalog?.image);
  const sellerAvatar = getImageUrl(catalog?.sellerAvatar || sellerProfile?.avatarHashes?.tiny);
  const acceptedCurrencies = catalog?.acceptedCurrencies?.filter(Boolean) ?? [];

  const acceptanceDays = deal ? resolveDealLinkAcceptanceWindowDays(deal) : undefined;
  const protectionDays = deal ? resolveDealLinkProtectionWindowDays(deal) : undefined;

  if (!token) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="not_found" />
        </Container>
      </div>
    );
  }

  if (checkout.phase === 'loading') {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="loading" />
        </Container>
      </div>
    );
  }

  if (checkout.phase === 'not_found') {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="not_found" onRetry={checkout.reloadDeal} />
        </Container>
      </div>
    );
  }

  if (checkout.phase === 'expired' || checkout.dealExpired) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="expired" onRetry={checkout.reloadDeal} />
        </Container>
      </div>
    );
  }

  if (checkout.phase === 'inactive') {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="inactive" onRetry={checkout.reloadDeal} />
        </Container>
      </div>
    );
  }

  if (checkout.phase === 'error') {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel
            kind={checkout.pageError ?? 'unknown'}
            onRetry={checkout.reloadDeal}
          />
        </Container>
      </div>
    );
  }

  if (!deal) {
    return null;
  }

  const showQuoteError = checkout.quoteExpired || checkout.quoteError;
  const totalAmount = quote?.buyerTotal ?? deal.priceAmount;
  const totalCurrency = quote?.priceCurrency ?? deal.priceCurrency;

  return (
    <div
      className="min-h-dvh overflow-x-hidden bg-background pb-28 md:pb-10"
      data-testid="deal-link-page"
    >
      <Header />
      <Container className="py-6 md:py-10">
        <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="min-w-0 space-y-6">
            <section className="space-y-3" aria-labelledby="deal-link-summary-heading">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {catalog ? <DealLinkProductImage src={productImage} title={productTitle} /> : null}
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">{t('dealLink.pageEyebrow')}</p>
                  <h1
                    id="deal-link-summary-heading"
                    className="text-2xl font-semibold tracking-tight break-words md:text-3xl"
                  >
                    {productTitle}
                  </h1>
                  {deal.description ? (
                    <p className="text-sm leading-6 text-muted-foreground break-words md:text-base">
                      {deal.description}
                    </p>
                  ) : null}
                </div>
              </div>

              <Card>
                <CardContent className="space-y-4 p-4 md:p-5">
                  {!catalog ? (
                    <div className="text-base font-medium break-words">{productTitle}</div>
                  ) : null}
                  <div className="flex min-w-0 items-center gap-2.5 text-sm text-muted-foreground">
                    {sellerAvatar ? (
                      <img
                        src={sellerAvatar}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted"
                        aria-hidden="true"
                      >
                        <Store className="h-4 w-4" />
                      </span>
                    )}
                    <span
                      className="min-w-0 truncate font-medium text-foreground"
                      data-testid="deal-link-seller-name"
                    >
                      {sellerName}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t(`dealLink.deliveryType.${deal.deliveryType}`, {
                      defaultValue: t('dealLink.deliveryType.unknown'),
                    })}
                  </div>
                  <div className="text-lg font-semibold text-primary tabular-nums">
                    {formatPrice(deal.priceAmount, deal.priceCurrency)}
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('dealLink.acceptedPaymentsLabel')}
                    </div>
                    {acceptedCurrencies.length > 0 ? (
                      <ul
                        className="flex flex-wrap gap-2"
                        aria-label={t('dealLink.acceptedPaymentsLabel')}
                      >
                        {acceptedCurrencies.map(currencyCode => {
                          const symbol = getCurrencySymbol(currencyCode);
                          const label =
                            symbol === currencyCode ? currencyCode : `${symbol} ${currencyCode}`;
                          return (
                            <li key={currencyCode}>
                              <span className="inline-flex min-h-7 items-center rounded-full border border-border bg-muted/40 px-2.5 text-xs font-medium text-foreground">
                                {label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t('dealLink.acceptedPaymentsFallback')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card data-testid="deal-link-terms-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('dealLink.termsTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground">
                      {t('dealLink.acceptanceWindow')}
                    </div>
                    <div className="font-medium">
                      {acceptanceDays
                        ? t('dealLink.windowDays', { count: acceptanceDays })
                        : t('dealLink.windowUnavailable')}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('dealLink.protectionWindow')}
                    </div>
                    <div className="font-medium">
                      {protectionDays
                        ? t('dealLink.windowDays', { count: protectionDays })
                        : t('dealLink.windowUnavailable')}
                    </div>
                  </div>
                </div>
                {deal.terms.deliverables?.length ? (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('dealLink.deliverables')}
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-foreground">
                      {deal.terms.deliverables.map((deliverable, index) => (
                        <li key={`${index}-${deliverable}`}>{deliverable}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {deal.terms.refund ? (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      {t('dealLink.refundTerms')}
                    </div>
                    <p className="text-foreground">
                      {t(`dealLink.refund.${deal.terms.refund}`, {
                        defaultValue: deal.terms.refund.replaceAll('_', ' '),
                      })}
                    </p>
                  </div>
                ) : null}
                {deal.terms.notes ? (
                  <p className="leading-6 text-muted-foreground">{String(deal.terms.notes)}</p>
                ) : (
                  <p className="leading-6 text-muted-foreground">{t('dealLink.termsDefault')}</p>
                )}
              </CardContent>
            </Card>

            <Card
              className="border-primary/20 bg-primary/5"
              data-testid="deal-link-payment-neutral-banner"
            >
              <CardContent className="space-y-2 p-4 text-sm leading-6">
                <p className="font-medium">{t('dealLink.paymentNeutralTitle')}</p>
                <p className="text-muted-foreground">{t('dealLink.paymentNeutralBody')}</p>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {showQuoteError ? (
              <DealLinkStatusPanel
                kind={checkout.quoteExpired ? 'quote_expired' : 'quote_error'}
                onRetry={checkout.refreshQuote}
              />
            ) : null}

            <DealLinkCountdown expiresAt={quote?.expiresAt ?? deal.expiresAt} />

            <DealLinkFeeBreakdown quote={quote} loading={checkout.quoteLoading} />

            <div className="hidden md:block">
              <Button
                type="button"
                size="lg"
                className="min-h-11 w-full min-w-0"
                disabled={!checkout.canAccept || checkout.acceptLoading}
                onClick={checkout.acceptDeal}
                data-testid="deal-link-accept-desktop"
                aria-label={t('dealLink.acceptCta')}
              >
                {checkout.acceptLoading ? t('dealLink.accepting') : t('dealLink.acceptCta')}
              </Button>
              {!isAuthenticated ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('dealLink.authRequiredHint')}
                </p>
              ) : null}
              {checkout.acceptError ? (
                <p className="mt-2 text-sm text-destructive" data-testid="deal-link-accept-error">
                  {t('dealLink.acceptFailed')}
                </p>
              ) : null}
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              {t('dealLink.sameCurrencyNotice')}
            </p>
          </aside>
        </div>
      </Container>

      {quote ? (
        <DealLinkBottomBar
          total={totalAmount}
          currency={totalCurrency}
          onAccept={checkout.acceptDeal}
          disabled={!checkout.canAccept}
          loading={checkout.acceptLoading}
        />
      ) : null}
    </div>
  );
}
