// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  createSellerAffiliateReferralSession,
  getProfileDisplayInfo,
  getPublicSellerAffiliateLink,
  truncateAddress,
  useI18n,
  writeSellerAffiliateReferralSession,
} from '@mobazha/core';
import { Header } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DealLinkStatusPanel } from '@/components/DealLink/DealLinkStatusPanel';

type PromoEntryPhase = 'loading' | 'ready' | 'not_found' | 'inactive' | 'error';

export default function SellerAffiliateEntryPage() {
  const { t } = useI18n();
  const params = useParams<{ token: string }>();
  const token = typeof params?.token === 'string' ? params.token : undefined;
  const [phase, setPhase] = useState<PromoEntryPhase>('loading');
  const [sellerPeerID, setSellerPeerID] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);

  const resolveAndRedirect = useCallback(async () => {
    if (!token) {
      setPhase('not_found');
      return;
    }

    setPhase('loading');
    try {
      const link = await getPublicSellerAffiliateLink(token);
      if (link.status !== 'active') {
        setPhase('inactive');
        return;
      }
      const referral = await createSellerAffiliateReferralSession(token);
      writeSellerAffiliateReferralSession(referral);
      setSellerPeerID(referral.sellerPeerID);
      setPhase('ready');
      // Display-only enrichment: a store name reads far better than a raw peer
      // ID, but the referral is already saved either way.
      void getProfileDisplayInfo(referral.sellerPeerID)
        .then(profile => {
          if (profile?.name) setSellerName(profile.name);
        })
        .catch(() => {});
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.toLowerCase() : '';
      setPhase(message.includes('not found') ? 'not_found' : 'error');
    }
  }, [token]);

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

  if (phase === 'loading') {
    return (
      <div className="min-h-dvh bg-background" data-testid="seller-affiliate-entry-loading">
        <Header />
        <Container className="py-8">
          <DealLinkStatusPanel kind="loading" />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('sellerAffiliate.referralSaving')}
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

  if (phase === 'ready') {
    return (
      <div className="min-h-dvh bg-background" data-testid="seller-affiliate-entry-ready">
        <Header />
        <Container className="py-8">
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>{t('sellerAffiliate.referralSaved')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sellerName ? (
                <p className="text-lg font-semibold" data-testid="promo-seller-name">
                  {sellerName}
                </p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                {t('sellerAffiliate.referralDescription')}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {t('sellerAffiliate.seller', { id: truncateAddress(sellerPeerID ?? '') })}
              </p>
              <Button asChild className="min-h-11">
                <a href={`/store/${encodeURIComponent(sellerPeerID ?? '')}`}>
                  {t('sellerAffiliate.browseStore')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <Container className="py-8">
        <DealLinkStatusPanel kind="unknown" onRetry={resolveAndRedirect} />
      </Container>
    </div>
  );
}
