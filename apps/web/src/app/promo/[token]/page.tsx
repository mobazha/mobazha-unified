'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  buildDealLinkBrowseHref,
  buildStoredDealAttributionClaim,
  classifyDealPromotionError,
  clearStoredDealAttributionClaim,
  extractDealTokenFromPublicPath,
  getPublicDealPromotionLink,
  issueDealAttributionClaim,
  useI18n,
  writeStoredDealAttributionClaim,
} from '@mobazha/core';
import { Header } from '@/components';
import { Container } from '@/components/layouts';
import { DealLinkStatusPanel } from '@/components/DealLink/DealLinkStatusPanel';

type PromoEntryPhase = 'loading' | 'redirecting' | 'not_found' | 'inactive' | 'error';

export default function DealPromotionEntryPage() {
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : undefined;
  const router = useRouter();
  const { t } = useI18n();
  const [phase, setPhase] = useState<PromoEntryPhase>('loading');
  const [errorKind, setErrorKind] = useState<'not_found' | 'inactive' | 'network' | 'unknown'>(
    'unknown'
  );

  const resolveAndRedirect = useCallback(async () => {
    if (!token) {
      setPhase('not_found');
      setErrorKind('not_found');
      return;
    }

    setPhase('loading');
    clearStoredDealAttributionClaim();
    try {
      const promotion = await getPublicDealPromotionLink(token);
      const dealToken = extractDealTokenFromPublicPath(promotion.dealPublicPath);
      if (!dealToken) {
        setPhase('error');
        setErrorKind('unknown');
        return;
      }

      const claim = await issueDealAttributionClaim(token);
      writeStoredDealAttributionClaim(
        buildStoredDealAttributionClaim(claim, dealToken, {
          attributionWindowSeconds: promotion.attributionWindowSeconds,
        })
      );
      setPhase('redirecting');
      router.replace(buildDealLinkBrowseHref(dealToken));
    } catch (error) {
      const kind = classifyDealPromotionError(error);
      setErrorKind(
        kind === 'not_found'
          ? 'not_found'
          : kind === 'inactive' || kind === 'expired'
            ? 'inactive'
            : kind === 'network'
              ? 'network'
              : 'unknown'
      );
      setPhase(kind === 'not_found' ? 'not_found' : kind === 'inactive' ? 'inactive' : 'error');
    }
  }, [router, token]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void resolveAndRedirect(), 0);
    return () => window.clearTimeout(timeout);
  }, [resolveAndRedirect]);

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

  if (phase === 'loading' || phase === 'redirecting') {
    return (
      <div className="min-h-dvh bg-background" data-testid="deal-promotion-entry-loading">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="loading" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {phase === 'redirecting'
              ? t('dealPromotion.entryRedirecting')
              : t('dealPromotion.entryResolving')}
          </p>
        </Container>
      </div>
    );
  }

  if (phase === 'not_found') {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="not_found" onRetry={resolveAndRedirect} />
        </Container>
      </div>
    );
  }

  if (phase === 'inactive') {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="inactive" onRetry={resolveAndRedirect} />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <Container className="py-8">
        <DealLinkStatusPanel
          kind={errorKind === 'network' ? 'network' : 'unknown'}
          onRetry={resolveAndRedirect}
        />
      </Container>
    </div>
  );
}
