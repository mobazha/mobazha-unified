// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Loader2, Share2, ScrollText } from 'lucide-react';
import {
  getPublicSellerAffiliateLink,
  setLoginRedirectPath,
  useI18n,
  useSellerAffiliateLink,
  useUserStore,
} from '@mobazha/core';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import Link from 'next/link';

export default function PromoteProgramPage() {
  const params = useParams<{ programId: string }>();
  const programId = typeof params?.programId === 'string' ? params.programId : undefined;
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const { link, loading, error, ensureLink } = useSellerAffiliateLink();
  const [terms, setTerms] = useState<{ token: string; rate: number; days: number } | null>(null);
  const [termsErrorToken, setTermsErrorToken] = useState<string | null>(null);
  const shareHref =
    link && typeof window !== 'undefined'
      ? `${window.location.origin}/promo/${encodeURIComponent(link.publicToken)}`
      : null;

  const publicToken = link?.publicToken;
  useEffect(() => {
    if (!publicToken) return;
    let cancelled = false;
    void getPublicSellerAffiliateLink(publicToken)
      .then(details => {
        if (cancelled) return;
        setTerms({
          token: publicToken,
          rate: details.commissionRateBPS / 100,
          days: Math.max(1, Math.round(details.attributionWindowSeconds / 86400)),
        });
      })
      .catch(() => {
        if (!cancelled) setTermsErrorToken(publicToken);
      });
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  // Derive at render time (keyed on the current token) instead of resetting
  // state inside the effect, so a token change never shows stale terms.
  const activeTerms = terms && terms.token === publicToken ? terms : null;
  const showTermsUnavailable =
    !activeTerms && Boolean(publicToken) && termsErrorToken === publicToken;

  const handleRequireAuth = useCallback(() => {
    if (!programId) return;
    const returnPath = `/promote/${encodeURIComponent(programId)}`;
    setLoginRedirectPath(returnPath);
    router.push(`/login?redirect=${encodeURIComponent(returnPath)}`);
  }, [programId, router]);

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

  if (!programId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-destructive">{t('promote.invalidProgram')}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8" data-testid="promote-auth-required">
        <h1 className="text-2xl font-semibold tracking-tight">{t('promote.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('promote.authRequired')}</p>
        <Button type="button" className="min-h-11" onClick={handleRequireAuth}>
          {t('promote.signInCta')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8" data-testid="promote-program-page">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('promote.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('promote.subtitle')}</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-2 p-4 text-sm leading-6">
          <p className="font-medium">{t('promote.disclosureTitle')}</p>
          <p className="text-muted-foreground">{t('promote.disclosureBody')}</p>
          <p className="text-muted-foreground">{t('sellerAffiliate.programLinkDescription')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('promote.directLinkTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('promote.loadingLink')}
            </div>
          ) : null}
          {error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{t('promote.linkFailed')}</p>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => programId && void ensureLink(programId)}
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
                  path: `/promo/${link.publicToken}`,
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
                    {t('promote.termsWindow', { days: String(activeTerms.days) })}
                  </p>
                  <p className="text-xs text-muted-foreground">{t('promote.termsLastTouch')}</p>
                </div>
              ) : showTermsUnavailable ? (
                <p className="text-xs text-muted-foreground">{t('promote.termsUnavailable')}</p>
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
          {!loading && !error && !link ? (
            <Button
              type="button"
              className="min-h-11"
              onClick={() => programId && void ensureLink(programId)}
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
  );
}
