'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  MarketplaceSellerReviewEvent,
  NativeMarketplaceSellerApplication,
  PublicNativeMarketplace,
} from '../types/marketplace';
import {
  applyToNativeMarketplace,
  getMarketplaceMembershipReviewEvents,
  markMarketplaceReviewEventRead,
  getNativeMarketplaceSellerApplication,
  getPublicMarketplaceDetail,
  withdrawNativeMarketplaceSellerApplication,
} from '../services/api/marketplace';

export function useNativeMarketplaceSell(identifier?: string) {
  const [marketplace, setMarketplace] = useState<PublicNativeMarketplace | null>(null);
  const [application, setApplication] = useState<NativeMarketplaceSellerApplication | null>(null);
  const [reviewEvents, setReviewEvents] = useState<MarketplaceSellerReviewEvent[]>([]);
  const [loading, setLoading] = useState(Boolean(identifier));
  const [error, setError] = useState<string | null>(null);
  const [reviewEventsLoading, setReviewEventsLoading] = useState(false);
  const [reviewEventsError, setReviewEventsError] = useState<string | null>(null);
  const [readingReviewEventID, setReadingReviewEventID] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const identifierRef = useRef(identifier);
  const applicationRef = useRef<NativeMarketplaceSellerApplication | null>(null);
  const reviewEventsRef = useRef<MarketplaceSellerReviewEvent[]>([]);
  const markReadInFlightRef = useRef<Map<string, Promise<MarketplaceSellerReviewEvent | null>>>(
    new Map()
  );
  identifierRef.current = identifier;
  applicationRef.current = application;
  reviewEventsRef.current = reviewEvents;

  const refreshReviewEvents = useCallback(
    async (marketplaceID?: string) => {
      const requestIdentifier = identifier;
      const requestGeneration = loadGenerationRef.current;
      const isStale = () =>
        requestGeneration !== loadGenerationRef.current ||
        identifierRef.current !== requestIdentifier;

      if (!requestIdentifier) {
        setReviewEvents([]);
        setReviewEventsError(null);
        setReviewEventsLoading(false);
        return [] as MarketplaceSellerReviewEvent[];
      }

      const membershipMarketplaceID =
        marketplaceID ?? applicationRef.current?.membership?.marketplaceID;
      if (!membershipMarketplaceID) {
        setReviewEvents([]);
        setReviewEventsError(null);
        setReviewEventsLoading(false);
        return [] as MarketplaceSellerReviewEvent[];
      }

      setReviewEventsLoading(true);
      setReviewEventsError(null);
      try {
        const events = await getMarketplaceMembershipReviewEvents(membershipMarketplaceID, {
          limit: 50,
        });
        if (isStale()) return reviewEventsRef.current;
        setReviewEvents(events);
        setReviewEventsError(null);
        return events;
      } catch (err) {
        if (isStale()) return reviewEventsRef.current;
        setReviewEventsError(err instanceof Error ? err.message : 'Failed to load review updates');
        return reviewEventsRef.current;
      } finally {
        if (!isStale()) {
          setReviewEventsLoading(false);
        }
      }
    },
    [identifier]
  );

  const load = useCallback(async () => {
    if (!identifier) {
      loadGenerationRef.current += 1;
      markReadInFlightRef.current.clear();
      setMarketplace(null);
      setApplication(null);
      setReviewEvents([]);
      setLoading(false);
      setError(null);
      setReviewEventsLoading(false);
      setReviewEventsError(null);
      setReadingReviewEventID(null);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    markReadInFlightRef.current.clear();

    setMarketplace(null);
    setApplication(null);
    setReviewEvents([]);
    setLoading(true);
    setError(null);
    setReviewEventsError(null);
    setReadingReviewEventID(null);

    const isStale = () => generation !== loadGenerationRef.current;

    try {
      const detail = await getPublicMarketplaceDetail(identifier, { pageSize: 1 });
      if (isStale()) return;

      setMarketplace(detail.marketplace);

      try {
        const app = await getNativeMarketplaceSellerApplication(identifier);
        if (isStale()) return;
        setApplication(app);
        if (app.membership?.marketplaceID) {
          await refreshReviewEvents(app.membership.marketplaceID);
        } else {
          setReviewEvents([]);
          setReviewEventsError(null);
          setReviewEventsLoading(false);
        }
      } catch (err) {
        if (isStale()) return;
        setError(err instanceof Error ? err.message : 'Failed to load seller application');
        setApplication(null);
        setReviewEvents([]);
        setReviewEventsError(null);
        setReviewEventsLoading(false);
      }
    } catch (err) {
      if (isStale()) return;
      setError(err instanceof Error ? err.message : 'Failed to load marketplace');
      setMarketplace(null);
      setApplication(null);
    } finally {
      if (!isStale()) {
        setLoading(false);
      }
    }
  }, [identifier, refreshReviewEvents]);

  useEffect(() => {
    void load();
    return () => {
      loadGenerationRef.current += 1;
    };
  }, [load]);

  const submitApplication = useCallback(
    async (productGroupIDs: number[]) => {
      if (!identifier) {
        throw new Error('Marketplace identifier is required');
      }
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const app = await applyToNativeMarketplace(identifier, productGroupIDs);
        setApplication(app);
        return app;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to submit application';
        setSubmitError(message);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [identifier]
  );

  const withdrawApplication = useCallback(async () => {
    if (!identifier) {
      throw new Error('Marketplace identifier is required');
    }
    setIsWithdrawing(true);
    setWithdrawError(null);
    try {
      const app = await withdrawNativeMarketplaceSellerApplication(identifier);
      setApplication(app);
      return app;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to withdraw application';
      setWithdrawError(message);
      throw err;
    } finally {
      setIsWithdrawing(false);
    }
  }, [identifier]);

  const markReviewEventRead = useCallback(
    async (eventID: string | number) => {
      if (!identifier) {
        throw new Error('Marketplace identifier is required');
      }

      const membership = applicationRef.current?.membership;
      if (!membership?.marketplaceID) return null;

      const eventIdString = String(eventID);
      const inflightKey = `${membership.marketplaceID}:${eventIdString}`;
      const existingEvent = reviewEventsRef.current.find(
        event => String(event.id) === eventIdString
      );
      if (!existingEvent) return null;
      if (existingEvent.readAt) return existingEvent;

      const inflight = markReadInFlightRef.current.get(inflightKey);
      if (inflight) {
        return inflight;
      }

      const requestIdentifier = identifier;
      const requestGeneration = loadGenerationRef.current;
      const isStale = () =>
        requestGeneration !== loadGenerationRef.current ||
        identifierRef.current !== requestIdentifier;

      const requestPromise = (async () => {
        setReadingReviewEventID(eventIdString);
        try {
          const updated = await markMarketplaceReviewEventRead(membership.marketplaceID, eventID);
          if (isStale()) return null;

          const readAt = updated.readAt || new Date().toISOString();
          const stableUpdatedEvent: MarketplaceSellerReviewEvent = {
            ...existingEvent,
            ...updated,
            readAt,
          };
          const nextEvents = reviewEventsRef.current.map(event =>
            String(event.id) === eventIdString ? { ...event, ...stableUpdatedEvent } : event
          );

          reviewEventsRef.current = nextEvents;
          setReviewEvents(nextEvents);
          setApplication(prev => {
            if (!prev?.membership) return prev;
            if (prev.membership.marketplaceID !== membership.marketplaceID) return prev;
            return {
              ...prev,
              membership: {
                ...prev.membership,
                unreadReviewCount: Math.max(0, prev.membership.unreadReviewCount - 1),
              },
            };
          });
          return stableUpdatedEvent;
        } finally {
          markReadInFlightRef.current.delete(inflightKey);
          if (!isStale()) {
            setReadingReviewEventID(prev => (prev === eventIdString ? null : prev));
          }
        }
      })();

      markReadInFlightRef.current.set(inflightKey, requestPromise);
      return requestPromise;
    },
    [identifier]
  );

  return {
    marketplace,
    application,
    reviewEvents,
    loading,
    error,
    reviewEventsLoading,
    reviewEventsError,
    readingReviewEventID,
    isSubmitting,
    isWithdrawing,
    submitError,
    withdrawError,
    refresh: load,
    refreshReviewEvents,
    submitApplication,
    withdrawApplication,
    markReviewEventRead,
  };
}
