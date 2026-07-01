// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  generateAttributionUUID,
  getOrCreateNativeMarketplaceJourneyState,
  readNativeMarketplaceSentEventKeys,
  writeNativeMarketplaceSentEventKeys,
} from '../curation/nativeMarketplaceAttribution';
import { submitPublicMarketplaceAttributionEvent } from '../services/api/marketplace';
import type { MarketplaceAttributionEventType } from '../types/marketplace';

interface NativeMarketplaceAttributionEventInput {
  listingSlug?: string;
  peerID?: string;
}
interface TrackEventOptions {
  dedupeKey?: string;
}

export interface NativeMarketplaceAttributionTracker {
  trackImpression: () => void;
  trackListingClick: (input: { listingSlug?: string; peerID?: string }) => void;
  trackCheckoutHandoff: (input: { listingSlug?: string; peerID?: string }) => void;
}

export function useNativeMarketplaceAttribution(
  marketplaceID?: string | null
): NativeMarketplaceAttributionTracker {
  const sentEventKeysRef = useRef<Set<string>>(new Set());
  const inFlightEventKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!marketplaceID) {
      sentEventKeysRef.current = new Set();
      inFlightEventKeysRef.current = new Set();
      return;
    }
    sentEventKeysRef.current = new Set(readNativeMarketplaceSentEventKeys(marketplaceID));
    inFlightEventKeysRef.current = new Set();
  }, [marketplaceID]);

  const trackEvent = useCallback(
    (
      eventType: MarketplaceAttributionEventType,
      input: NativeMarketplaceAttributionEventInput = {},
      options: TrackEventOptions = {}
    ) => {
      if (!marketplaceID || typeof window === 'undefined') return;

      if (eventType !== 'impression' && (!input.listingSlug || !input.peerID)) {
        return;
      }

      const dedupeKey = options.dedupeKey;
      if (dedupeKey) {
        if (
          sentEventKeysRef.current.has(dedupeKey) ||
          inFlightEventKeysRef.current.has(dedupeKey)
        ) {
          return;
        }
        inFlightEventKeysRef.current.add(dedupeKey);
      }

      const journey = getOrCreateNativeMarketplaceJourneyState({
        marketplaceID,
        searchParams: new URLSearchParams(window.location.search),
        referrer: document.referrer,
      });

      void submitPublicMarketplaceAttributionEvent(marketplaceID, {
        eventID: generateAttributionUUID(),
        journeyID: journey.journeyID,
        eventType,
        listingSlug: input.listingSlug,
        peerID: input.peerID,
        source: journey.source,
        medium: journey.medium,
        campaign: journey.campaign,
        referrerHost: journey.referrerHost,
      })
        .then(() => {
          if (!dedupeKey) return;
          sentEventKeysRef.current.add(dedupeKey);
          writeNativeMarketplaceSentEventKeys(
            marketplaceID,
            Array.from(sentEventKeysRef.current.values())
          );
        })
        .catch(() => {
          // Best-effort only: attribution failures must never block browse/checkout flow.
        })
        .finally(() => {
          if (!dedupeKey) return;
          inFlightEventKeysRef.current.delete(dedupeKey);
        });
    },
    [marketplaceID]
  );

  const trackImpression = useCallback(() => {
    trackEvent('impression', {}, { dedupeKey: 'impression' });
  }, [trackEvent]);

  const trackListingClick = useCallback(
    (input: { listingSlug?: string; peerID?: string }) => {
      trackEvent('listing_click', input);
    },
    [trackEvent]
  );

  const trackCheckoutHandoff = useCallback(
    (input: { listingSlug?: string; peerID?: string }) => {
      trackEvent('checkout_handoff', input);
    },
    [trackEvent]
  );

  return {
    trackImpression,
    trackListingClick,
    trackCheckoutHandoff,
  };
}
