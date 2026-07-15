// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Loader2, Share2, ScrollText } from 'lucide-react';
import {
  getProfileDisplayInfo,
  getPublicSellerAffiliateProgram,
  sellerAffiliateAttributionWindowCopy,
  setLoginRedirectPath,
  useI18n,
  useSellerAffiliateLink,
  useUserStore,
} from '@mobazha/core';
import { useRouter } from 'next/navigation';
import { Header } from '@/components';
import { AffiliateRailChips } from '@/components/SellerAffiliate/AffiliateRailChips';
import { PromoteStorefront } from '@/components/SellerAffiliate/PromoteStorefront';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import Link from 'next/link';

export default function PromoteProgramPage() {
  const params = useParams<{ sellerPeerID: string; programId: string }>();
  const sellerPeerID = typeof params?.sellerPeerID === 'string' ? params.sellerPeerID : undefined;
  const programId = typeof params?.programId === 'string' ? params.programId : undefined;
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const { link, loading, error, ensureLink } = useSellerAffiliateLink();
  const [program, setProgram] = useState<{
    programID: string;
    rate: number;
    windowSeconds: number;
    sellerPeerID: string;
  } | null>(null);
  const [programLoading, setProgramLoading] = useState(Boolean(sellerPeerID && programId));
  const [programError, setProgramError] = useState(false);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const shareHref =
    link && typeof window !== 'undefined'
      ? `${window.location.origin}/promo/${encodeURIComponent(sellerPeerID ?? '')}/${encodeURIComponent(link.publicToken)}`
      : null;

  const loadProgram = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      if (!isAuthenticated || !sellerPeerID || !programId) return;
      if (isCurrent()) {
        setProgramLoading(true);
        setProgramError(false);
      }
      try {
        const details = await getPublicSellerAffiliateProgram(sellerPeerID);
        if (
          details.programID !== programId ||
          details.sellerPeerID !== sellerPeerID ||
          details.status !== 'active'
        ) {
          throw new Error('program not found');
        }
        if (isCurrent()) {
          setProgram({
            programID: details.programID,
            rate: details.commissionRateBPS / 100,
            windowSeconds: details.attributionWindowSeconds,
            sellerPeerID: details.sellerPeerID,
          });
        }
      } catch {
        if (isCurrent()) {
          setProgram(null);
          setProgramError(true);
        }
      } finally {
        if (isCurrent()) {
          setProgramLoading(false);
        }
      }
    },
    [isAuthenticated, programId, sellerPeerID]
  );

  useEffect(() => {
    let current = true;
    void loadProgram(() => current);
    return () => {
      current = false;
    };
  }, [loadProgram]);

  // Resolve the seller's display name so the promoter can see whose store the
  // link promotes; the raw peer ID means nothing to a non-technical user.
  const termsSellerPeerID = program?.sellerPeerID;
  useEffect(() => {
    if (!termsSellerPeerID) return;
    let cancelled = false;
    void getProfileDisplayInfo(termsSellerPeerID)
      .then(profile => {
        if (!cancelled && profile?.name) setSellerName(profile.name);
      })
      .catch(() => {
        // Display-only enrichment: the page stays fully usable without a name.
      });
    return () => {
      cancelled = true;
    };
  }, [termsSellerPeerID]);

  const activeTerms = program;
  const showTermsUnavailable = !activeTerms && programError;

  const handleRequireAuth = useCallback(() => {
    if (!sellerPeerID || !programId) return;
    const returnPath = `/promote/${encodeURIComponent(sellerPeerID)}/${encodeURIComponent(programId)}`;
    setLoginRedirectPath(returnPath);
    router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [programId, router, sellerPeerID]);

  const handleCopy = useCallback(async () => {
    if (!shareHref) return;
    const copied = await copyToClipboard(shareHref);
    toast({
      variant: copied ? 'success' : 'destructive',
      title: copied ? t('promote.copySuccess') : t('promote.copyFailed'),
    });
  }, [shareHref, t, toast]);

  const handleShare = useCallback(async () => {
    if (!shareHref || !link) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: t('promote.shareTitle'),
          text: t('promote.shareText'),
          url: shareHref,
        });
        return;
      } catch {
        // fall through to copy
      }
    }
    await handleCopy();
  }, [handleCopy, link, shareHref, t]);

  // A promoter-facing growth surface must render inside the full app shell —
  // a bare card on a blank canvas reads as an unfinished widget, offers no
  // navigation, and carries no brand trust for someone deciding to promote.
  if (!sellerPeerID || !programId) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-sm text-destructive">{t('promote.invalidProgram')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh bg-background">
        <Header />
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-8" data-testid="promote-auth-required">
          <h1 className="text-2xl font-semibold tracking-tight">{t('promote.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('promote.authRequired')}</p>
          <Button type="button" className="min-h-11" onClick={handleRequireAuth}>
            {t('promote.signInCta')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8" data-testid="promote-program-page">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('promote.title')}</h1>
          {sellerName && activeTerms ? (
            <p className="text-sm font-medium" data-testid="promote-seller-name">
              <Link
                href={`/store/${encodeURIComponent(activeTerms.sellerPeerID)}`}
                className="text-primary hover:underline"
              >
                {t('promote.promotingStore', { name: sellerName })}
              </Link>
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">{t('promote.subtitle')}</p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-2 p-4 text-sm leading-6">
            <p className="font-medium">{t('promote.disclosureTitle')}</p>
            <p className="text-muted-foreground">{t('promote.disclosureBody')}</p>
            <p className="text-muted-foreground">{t('sellerAffiliate.programLinkDescription')}</p>
          </CardContent>
        </Card>

        {activeTerms ? (
          <PromoteStorefront
            sellerPeerID={activeTerms.sellerPeerID}
            commissionRateBPS={Math.round(activeTerms.rate * 100)}
          />
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('promote.directLinkTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || programLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('promote.loadingLink')}
              </div>
            ) : null}
            {error || programError ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{t('promote.linkFailed')}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    if (programError) void loadProgram();
                    else if (sellerPeerID && programId) void ensureLink(sellerPeerID, programId);
                  }}
                >
                  {t('promote.retry')}
                </Button>
              </div>
            ) : null}
            {link && shareHref ? (
              <>
                <p className="break-all rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  {shareHref}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('promote.entryPathHint', {
                    path: `/promo/${sellerPeerID}/${link.publicToken}`,
                  })}
                </p>
                {activeTerms ? (
                  <div
                    className="space-y-1 rounded-lg border border-primary/20 bg-primary/5 p-3"
                    data-testid="promote-earn-terms"
                  >
                    <p className="text-sm font-medium">{t('promote.termsTitle')}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('promote.termsRate', { rate: String(activeTerms.rate) })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                        // Render the window in its exact unit ("1 hour", "7 days") —
                        // rounding a sub-day window up to days would misstate terms.
                        const copy = sellerAffiliateAttributionWindowCopy(
                          activeTerms.windowSeconds
                        );
                        return t('promote.termsWindowExact', { window: t(copy.key, copy.params) });
                      })()}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('promote.termsLastTouch')}</p>
                  </div>
                ) : showTermsUnavailable ? (
                  <p className="text-xs text-muted-foreground">{t('promote.termsUnavailable')}</p>
                ) : null}
                {link.payoutRails?.length ? (
                  <div className="space-y-1" data-testid="promote-payout-rails">
                    <p className="text-sm font-medium">{t('sellerAffiliate.payoutRailsTitle')}</p>
                    <AffiliateRailChips rails={link.payoutRails} />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="min-h-11"
                    onClick={() => void handleCopy()}
                    data-testid="promote-copy-link"
                  >
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('promote.copyCta')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11"
                    onClick={() => void handleShare()}
                    data-testid="promote-share-link"
                  >
                    <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    {t('promote.shareCta')}
                  </Button>
                </div>
              </>
            ) : null}
            {!loading && !programLoading && !error && !programError && !link && activeTerms ? (
              <Button
                type="button"
                className="min-h-11"
                onClick={() =>
                  sellerPeerID && programId && void ensureLink(sellerPeerID, programId)
                }
              >
                {t('sellerAffiliate.createLink')}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <Card data-testid="promote-commissions-link-card">
          <CardHeader>
            <CardTitle className="text-base">{t('promote.commissionsLinkTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('promote.commissionsLinkBody')}</p>
            <Button type="button" variant="outline" className="min-h-11" asChild>
              <Link href="/promote/commissions" data-testid="promote-commissions-link">
                <ScrollText className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('promote.commissionsLinkCta')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
