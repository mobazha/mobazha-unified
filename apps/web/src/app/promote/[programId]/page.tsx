'use client';

import React, { useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Copy, Loader2, Share2 } from 'lucide-react';
import {
  buildDealPromotionEntryHref,
  formatAttributionWindowDays,
  formatCommissionRateFromBPS,
  setLoginRedirectPath,
  useDealPromotionLink,
  useI18n,
  useUserStore,
} from '@mobazha/core';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';

export default function PromoteProgramPage() {
  const params = useParams<{ programId: string }>();
  const programId = typeof params?.programId === 'string' ? params.programId : undefined;
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const { link, promotion, shareHref, loading, error, ensureLink } = useDealPromotionLink(
    programId,
    isAuthenticated
  );

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
          <p className="text-muted-foreground">{t('promote.manualReviewOnlyNotice')}</p>
          {promotion ? (
            <dl className="grid gap-3 border-t border-primary/15 pt-3 sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">{t('promote.commissionRate')}</dt>
                <dd className="font-medium">
                  {t('promote.commissionValue', {
                    percent: formatCommissionRateFromBPS(promotion.commissionRateBPS),
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('promote.attributionWindow')}</dt>
                <dd className="font-medium">
                  {t('promote.windowDaysValue', {
                    count: formatAttributionWindowDays(promotion.attributionWindowSeconds) ?? 1,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('promote.currency')}</dt>
                <dd className="font-medium">{promotion.currency}</dd>
              </div>
            </dl>
          ) : null}
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
                onClick={() => void ensureLink()}
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
                  path: buildDealPromotionEntryHref(link.publicToken),
                })}
              </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
