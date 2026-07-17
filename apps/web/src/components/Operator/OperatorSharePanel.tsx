'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { useI18n } from '@mobazha/core';
import { getMarketplaceLink } from '@mobazha/core/services/api/marketplace';
import { Copy, Share2 } from 'lucide-react';

/**
 * Resolve a possibly-relative share link to an absolute URL. The share-link API
 * returns a relative path when FrontendURL is unset, so we MUST anchor it to the
 * current origin — never call `new URL(relativePath)` on its own. (WP-B §6.3)
 */
function toAbsoluteUrl(rawUrl: string): string | null {
  const origin =
    typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;
  try {
    return new URL(rawUrl, origin).toString();
  } catch {
    return null;
  }
}

/** Append the operator-share UTM campaign params (WP-B / D6). */
function withOperatorShareUtm(absoluteUrl: string, slug: string): string {
  try {
    const url = new URL(absoluteUrl);
    url.searchParams.set('utm_source', 'operator_share');
    url.searchParams.set('utm_medium', 'community');
    url.searchParams.set('utm_campaign', slug);
    return url.toString();
  } catch {
    return absoluteUrl;
  }
}

/**
 * Post-publish share bar: lets an operator copy the marketplace link (plain or
 * community/UTM) to invite buyers. A single compact row — sharing is a frequent
 * verb, not a destination, so it must not outrank the funnel and earnings cards
 * below it. Clipboard failures reveal a manual-copy input instead of failing
 * silently. (WP-B §6.3)
 */
export function OperatorSharePanel({
  marketplaceId,
  slug,
}: {
  marketplaceId: string;
  slug: string;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [manualCopyValue, setManualCopyValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);
    void (async () => {
      try {
        const link = await getMarketplaceLink(marketplaceId);
        if (cancelled) return;
        setRawUrl(link.url);
      } catch {
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [marketplaceId]);

  const plainLink = useMemo(() => (rawUrl ? toAbsoluteUrl(rawUrl) : null), [rawUrl]);
  const communityLink = useMemo(
    () => (plainLink ? withOperatorShareUtm(plainLink, slug) : null),
    [plainLink, slug]
  );

  const handleCopy = useCallback(
    async (link: string | null) => {
      if (!link) return;
      const copied = await copyToClipboard(link);
      if (copied) {
        setManualCopyValue('');
        toast({
          title: t('marketplace.operator.shareCopySuccess', { defaultValue: 'Link copied' }),
        });
        return;
      }
      // Clipboard blocked — reveal the link so the operator can select and copy it.
      setManualCopyValue(link);
      toast({
        title: t('marketplace.operator.shareCopyFailed', {
          defaultValue: 'Copy failed — select and copy the link below manually',
        }),
        variant: 'destructive',
      });
    },
    [t, toast]
  );

  return (
    <Card data-testid="operator-share-panel">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Share2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">
              {t('marketplace.operator.shareTitle', { defaultValue: 'Share your marketplace' })}
            </span>
            <span className="hidden truncate text-muted-foreground md:inline">
              {t('marketplace.operator.shareDescriptionShort', {
                defaultValue: '— invite buyers and communities',
              })}
            </span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground" data-testid="operator-share-loading">
              {t('marketplace.operator.shareLoading', { defaultValue: 'Preparing your link…' })}
            </p>
          ) : loadFailed || !plainLink ? (
            <p className="text-sm text-muted-foreground" data-testid="operator-share-error">
              {t('marketplace.operator.shareError', {
                defaultValue: 'We could not load your share link. Please try again shortly.',
              })}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleCopy(plainLink)}
                data-testid="operator-share-copy-link"
              >
                <Copy className="mr-2 h-4 w-4" />
                {t('marketplace.operator.shareCopyLink', { defaultValue: 'Copy link' })}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleCopy(communityLink)}
                data-testid="operator-share-copy-community"
              >
                <Share2 className="mr-2 h-4 w-4" />
                {t('marketplace.operator.shareCopyCommunity', {
                  defaultValue: 'Copy community link',
                })}
              </Button>
            </div>
          )}
        </div>
        {manualCopyValue ? (
          <div className="mt-3 space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="operator-share-manual">
              {t('marketplace.operator.shareManualLabel', {
                defaultValue: 'Copy this link manually',
              })}
            </label>
            <Input
              id="operator-share-manual"
              readOnly
              value={manualCopyValue}
              onFocus={event => event.currentTarget.select()}
              data-testid="operator-share-manual-input"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
