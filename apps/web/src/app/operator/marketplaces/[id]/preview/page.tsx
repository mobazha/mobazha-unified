'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  derivePublicMarketplaceCurationRefs,
  useCommunityMarketplaceEnrichment,
  useI18n,
  type PublicMarketplaceListingRef,
  type PublicNativeMarketplaceDetail,
} from '@mobazha/core';
import { getMarketplacePreview } from '@mobazha/core/services/api/marketplace';
import { Header, Footer } from '@/components';
import { CommunityListingCard, CommunitySellerCard } from '@/components/CommunityMarketplace';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';

function isRenderablePreview<T extends { failed: boolean }>(preview: T | undefined): preview is T {
  return preview !== undefined && !preview.failed;
}

export default function MarketplaceOperatorPreviewPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const { t } = useI18n();
  const missingIdMessage = t('marketplace.operator.previewMissingId');
  const loadFailedMessage = t('marketplace.operator.previewLoadFailed');
  const [detail, setDetail] = useState<PublicNativeMarketplaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!id) {
      setError(missingIdMessage);
      setLoading(false);
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getMarketplacePreview(id);
      setDetail(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : loadFailedMessage);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, loadFailedMessage, missingIdMessage]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  const curationRefs = useMemo(() => derivePublicMarketplaceCurationRefs(detail), [detail]);
  const listingRefs = useMemo<PublicMarketplaceListingRef[]>(() => {
    const seen = new Set<string>();
    const refs: PublicMarketplaceListingRef[] = [];
    const push = (ref: PublicMarketplaceListingRef) => {
      const key = `${ref.peerID}:${ref.slug}`;
      if (seen.has(key)) return;
      seen.add(key);
      refs.push(ref);
    };
    curationRefs.bannerListingRefs.forEach(push);
    curationRefs.curatedListingRefs.forEach(push);
    curationRefs.fallbackListingRefs.forEach(push);
    return refs;
  }, [curationRefs]);

  const sellerPeerIDs = useMemo(
    () =>
      Array.from(
        new Set([
          ...curationRefs.curatedSellerPeerIDs,
          ...curationRefs.fallbackSellerPeerIDs,
          ...listingRefs.map(item => item.peerID),
        ])
      ),
    [curationRefs.curatedSellerPeerIDs, curationRefs.fallbackSellerPeerIDs, listingRefs]
  );

  const { listingPreviews, sellerProfiles } = useCommunityMarketplaceEnrichment(
    listingRefs,
    sellerPeerIDs
  );

  const previewLookup = useMemo(() => {
    const map = new Map<string, (typeof listingPreviews)[number]>();
    for (const preview of listingPreviews) {
      map.set(`${preview.peerID}:${preview.slug}`, preview);
    }
    return map;
  }, [listingPreviews]);

  const bannerPreviews = useMemo(
    () =>
      curationRefs.bannerListingRefs
        .map(ref => previewLookup.get(`${ref.peerID}:${ref.slug}`))
        .filter(isRenderablePreview),
    [curationRefs.bannerListingRefs, previewLookup]
  );
  const curatedPreviews = useMemo(
    () =>
      curationRefs.curatedListingRefs
        .map(ref => previewLookup.get(`${ref.peerID}:${ref.slug}`))
        .filter(isRenderablePreview),
    [curationRefs.curatedListingRefs, previewLookup]
  );
  const sellerPeerSet = useMemo(
    () => new Set(curationRefs.curatedSellerPeerIDs),
    [curationRefs.curatedSellerPeerIDs]
  );
  const curatedSellers = useMemo(
    () => (detail?.sellers ?? []).filter(seller => sellerPeerSet.has(seller.peerID)),
    [detail?.sellers, sellerPeerSet]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <Container size="xl" className="space-y-6">
          <Link
            href={`/operator/marketplaces/${id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            data-testid="operator-preview-back-link"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('marketplace.operator.backToMarketplaceDetail')}
          </Link>

          <Card data-testid="operator-preview-draft-notice">
            <CardContent className="space-y-1 py-4">
              <p className="text-sm font-semibold">
                {t('marketplace.operator.previewDraftNoticeTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('marketplace.operator.previewDraftNoticeDesc')}
              </p>
            </CardContent>
          </Card>

          {loading ? (
            <Card data-testid="operator-preview-loading">
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin" />
              </CardContent>
            </Card>
          ) : null}

          {!loading && error ? (
            <Card data-testid="operator-preview-error">
              <CardContent className="space-y-4 py-10 text-center">
                <p className="text-muted-foreground">
                  {t('marketplace.operator.previewLoadFailed')}
                </p>
                <Button onClick={() => void loadPreview()} data-testid="operator-preview-retry">
                  {t('common.retry')}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {!loading && !error && detail ? (
            <>
              <Card data-testid="operator-preview-identity">
                <CardHeader>
                  <CardTitle>{detail.marketplace.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detail.marketplace.bannerURL ? (
                    <img
                      src={detail.marketplace.bannerURL}
                      alt=""
                      className="h-36 w-full rounded-md object-cover"
                    />
                  ) : null}
                  {detail.marketplace.logoURL ? (
                    <img
                      src={detail.marketplace.logoURL}
                      alt={detail.marketplace.name}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {detail.marketplace.description || t('marketplace.operator.noDescription')}
                  </p>
                </CardContent>
              </Card>

              <section data-testid="operator-preview-banners" className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {t('marketplace.operator.previewBannersTitle')}
                </h2>
                {bannerPreviews.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {bannerPreviews.map(preview => (
                      <CommunityListingCard
                        key={`banner-${preview.key}`}
                        preview={preview}
                        sellerProfile={sellerProfiles[preview.peerID]}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('marketplace.operator.previewEmptyBanners')}
                  </p>
                )}
              </section>

              <section data-testid="operator-preview-listings" className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {t('marketplace.operator.previewListingsTitle')}
                </h2>
                {curatedPreviews.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {curatedPreviews.map(preview => (
                      <CommunityListingCard
                        key={`curated-${preview.key}`}
                        preview={preview}
                        sellerProfile={sellerProfiles[preview.peerID]}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('marketplace.operator.previewEmptyListings')}
                  </p>
                )}
              </section>

              <section data-testid="operator-preview-sellers" className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {t('marketplace.operator.previewSellersTitle')}
                </h2>
                {curatedSellers.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {curatedSellers.map(seller => (
                      <CommunitySellerCard
                        key={seller.peerID}
                        seller={seller}
                        profile={sellerProfiles[seller.peerID]}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t('marketplace.operator.previewEmptySellers')}
                  </p>
                )}
              </section>
            </>
          ) : null}
        </Container>
      </main>
      <Footer />
    </div>
  );
}
