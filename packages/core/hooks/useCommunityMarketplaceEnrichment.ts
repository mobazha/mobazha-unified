'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PublicMarketplaceListingRef } from '../types/marketplace';
import { getPublicListing } from '../services/api/products';
import { fetchPublicProfilesBatch } from '../services/api/profile';
import { getImageUrl } from '../services/api/config';
import { formatListingSlugTitle } from '../utils/communityMarketplace';
import { resolveCollectibleListingImageUrl } from '../curation/collectibleMarketplace';

export interface CommunityListingPreview {
  key: string;
  slug: string;
  peerID: string;
  title: string;
  imageUrl?: string;
  price?: number;
  currency?: string;
  divisibility?: number;
  vendorName?: string;
  categories?: string[];
  tags?: string[];
  loading: boolean;
  failed: boolean;
}

export interface CommunitySellerProfile {
  peerID: string;
  displayName: string;
  avatarUrl?: string;
  shortDescription?: string;
}

function listingKey(ref: PublicMarketplaceListingRef): string {
  return `${ref.peerID}:${ref.slug}`;
}

export function useCommunityMarketplaceEnrichment(
  listingRefs: PublicMarketplaceListingRef[],
  sellerPeerIDs: string[]
) {
  const [listingPreviews, setListingPreviews] = useState<Record<string, CommunityListingPreview>>(
    {}
  );
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, CommunitySellerProfile>>({});
  const [listingsLoading, setListingsLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const listingKeys = useMemo(
    () => listingRefs.map(ref => listingKey(ref)).join(','),
    [listingRefs]
  );

  const sellerKeys = useMemo(
    () => [...new Set(sellerPeerIDs.filter(Boolean))].sort().join(','),
    [sellerPeerIDs]
  );

  const listingRefsRef = useRef(listingRefs);
  listingRefsRef.current = listingRefs;
  const sellerPeerIDsRef = useRef(sellerPeerIDs);
  sellerPeerIDsRef.current = sellerPeerIDs;

  useEffect(() => {
    if (!listingKeys) {
      setListingPreviews({});
      setListingsLoading(false);
      return;
    }

    const refs = listingRefsRef.current;
    let cancelled = false;
    setListingsLoading(true);

    const initial: Record<string, CommunityListingPreview> = {};
    for (const ref of refs) {
      const key = listingKey(ref);
      initial[key] = {
        key,
        slug: ref.slug,
        peerID: ref.peerID,
        title: formatListingSlugTitle(ref.slug),
        loading: true,
        failed: false,
      };
    }
    setListingPreviews(initial);

    void (async () => {
      const results = await Promise.allSettled(
        refs.map(async ref => {
          const key = listingKey(ref);
          try {
            const { listing } = await getPublicListing(ref.slug, ref.peerID);
            const title = listing?.item?.title || formatListingSlugTitle(ref.slug);
            const tags = listing?.item?.tags?.filter(Boolean) ?? [];
            const categories = listing?.item?.productType?.trim()
              ? [listing.item.productType.trim()]
              : [];
            const thumb = listing?.item?.images?.[0];
            const apiImageUrl =
              typeof thumb === 'string'
                ? getImageUrl(thumb, ref.peerID) || getImageUrl(thumb) || undefined
                : thumb
                  ? getImageUrl(thumb.small || thumb.medium, ref.peerID) ||
                    getImageUrl(thumb.small || thumb.medium) ||
                    undefined
                  : undefined;
            const imageUrl = resolveCollectibleListingImageUrl(ref.slug, apiImageUrl);
            return {
              key,
              slug: ref.slug,
              peerID: ref.peerID,
              title,
              imageUrl,
              price: listing?.item?.price,
              currency: listing?.metadata?.pricingCurrency?.code,
              divisibility: listing?.metadata?.pricingCurrency?.divisibility,
              vendorName: listing?.vendorID?.name || listing?.vendorID?.handle,
              categories,
              tags,
              loading: false,
              failed: !listing,
            } satisfies CommunityListingPreview;
          } catch {
            return {
              key,
              slug: ref.slug,
              peerID: ref.peerID,
              title: formatListingSlugTitle(ref.slug),
              loading: false,
              failed: true,
            } satisfies CommunityListingPreview;
          }
        })
      );

      if (cancelled) return;

      const next: Record<string, CommunityListingPreview> = { ...initial };
      for (const result of results) {
        if (result.status === 'fulfilled') {
          next[result.value.key] = result.value;
        }
      }
      setListingPreviews(next);
      setListingsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [listingKeys]);

  useEffect(() => {
    if (!sellerKeys) {
      setSellerProfiles({});
      setProfilesLoading(false);
      return;
    }

    const peerIDs = [...new Set(sellerPeerIDsRef.current.filter(Boolean))];
    let cancelled = false;
    setProfilesLoading(true);

    void (async () => {
      try {
        const profiles = await fetchPublicProfilesBatch(peerIDs);
        if (cancelled) return;
        const next: Record<string, CommunitySellerProfile> = {};
        for (const profile of profiles) {
          const avatarHash =
            profile.avatarHashes?.medium ||
            profile.avatarHashes?.small ||
            profile.avatarHashes?.tiny;
          next[profile.peerID] = {
            peerID: profile.peerID,
            displayName: profile.name?.trim() || '',
            avatarUrl: avatarHash
              ? getImageUrl(avatarHash, profile.peerID) || getImageUrl(avatarHash) || undefined
              : undefined,
            shortDescription: profile.shortDescription,
          };
        }
        setSellerProfiles(next);
      } catch {
        if (!cancelled) setSellerProfiles({});
      } finally {
        if (!cancelled) setProfilesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sellerKeys]);

  const orderedListingPreviews = useMemo(
    () =>
      listingRefs.map(ref => {
        const key = listingKey(ref);
        return (
          listingPreviews[key] ?? {
            key,
            slug: ref.slug,
            peerID: ref.peerID,
            title: formatListingSlugTitle(ref.slug),
            loading: listingsLoading,
            failed: false,
          }
        );
      }),
    [listingRefs, listingPreviews, listingsLoading]
  );

  return {
    listingPreviews: orderedListingPreviews,
    sellerProfiles,
    listingsLoading,
    profilesLoading,
  };
}
