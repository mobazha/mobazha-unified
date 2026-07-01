'use client';

import { useEffect, useRef, useCallback } from 'react';
import { initTracker, trackEvent, stopTracker } from '../services/analyticsTracker';

/**
 * useVisitorTracker — initializes the analytics tracker for a given store
 * and auto-tracks page views on route changes.
 *
 * @param peerID — the store's peer ID (used for API routing)
 * @param pagePath — current page path (should change on route navigation)
 * @param options — optional: productSlug for product pages
 */
export function useVisitorTracker(
  peerID: string | undefined,
  pagePath: string,
  options?: { productSlug?: string }
) {
  const lastTrackedPath = useRef<string>('');

  useEffect(() => {
    if (!peerID) return;
    initTracker(peerID);
    return () => {
      stopTracker();
    };
  }, [peerID]);

  useEffect(() => {
    if (!peerID || !pagePath) return;
    if (pagePath === lastTrackedPath.current) return;
    lastTrackedPath.current = pagePath;

    const eventType = options?.productSlug ? 'product_view' : 'page_view';

    trackEvent({
      eventType,
      pagePath,
      productSlug: options?.productSlug,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
  }, [peerID, pagePath, options?.productSlug]);

  const trackAddToCart = useCallback(
    (productSlug: string) => {
      trackEvent({
        eventType: 'add_to_cart',
        pagePath,
        productSlug,
      });
    },
    [pagePath]
  );

  const trackCheckoutStart = useCallback(() => {
    trackEvent({
      eventType: 'checkout_start',
      pagePath,
    });
  }, [pagePath]);

  return { trackAddToCart, trackCheckoutStart };
}
