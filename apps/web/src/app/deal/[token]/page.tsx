'use client';

import React, { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, Store } from 'lucide-react';
import {
  buildDealLinkPaymentHref,
  formatUserName,
  resolveDealLinkAcceptanceWindowDays,
  resolveDealLinkProtectionWindowDays,
  setLoginRedirectPath,
  useCurrency,
  useDealLinkCheckout,
  useI18n,
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

export default function DealLinkPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : undefined;
  const router = useRouter();
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);

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
    onRequireAuth: handleRequireAuth,
    onAccepted: handleAccepted,
  });

  const deal = checkout.deal;
  const quote = checkout.quote;

  const sellerFallback = t('dealLink.sellerFallback');
  const sellerName = deal?.sellerPeerID
    ? formatUserName({ peerID: deal.sellerPeerID }, { fallback: sellerFallback, truncateChars: 6 })
    : sellerFallback;

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
    <div className="min-h-dvh bg-background pb-28 md:pb-10" data-testid="deal-link-page">
      <Header />
      <Container className="py-6 md:py-10">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-6">
            <section className="space-y-3" aria-labelledby="deal-link-summary-heading">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('dealLink.pageEyebrow')}</p>
                <h1
                  id="deal-link-summary-heading"
                  className="text-2xl font-semibold tracking-tight md:text-3xl"
                >
                  {deal.title}
                </h1>
                {deal.description ? (
                  <p className="text-sm leading-6 text-muted-foreground md:text-base">
                    {deal.description}
                  </p>
                ) : null}
              </div>

              <Card>
                <CardContent className="space-y-3 p-4 md:p-5">
                  <div className="text-base font-medium">{deal.title}</div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span data-testid="deal-link-seller-name">{sellerName}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t(`dealLink.deliveryType.${deal.deliveryType}`, {
                      defaultValue: t('dealLink.deliveryType.unknown'),
                    })}
                  </div>
                  <div className="text-lg font-semibold text-primary tabular-nums">
                    {formatPrice(deal.priceAmount, deal.priceCurrency)}
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
                className="min-h-11 w-full"
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
