'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CreateNativeMarketplaceRequest,
  MarketplaceAttributionSummary,
  MarketplaceCurationCandidates,
  MarketplaceCurationCandidatesParams,
  MarketplaceCurationItem,
  MarketplaceCurationKind,
  MarketplaceSellerReviewEvent,
  MarketplaceStoreMembership,
  MarketplaceStoreStatus,
  MyMarketplaceMembershipEntry,
  NativeMarketplace,
  UpdateNativeMarketplaceRequest,
  VerifyMarketplaceCustomDomainResponse,
} from '../types/marketplace';
import {
  acceptMarketplaceSellerInvitation,
  createMarketplace,
  createMarketplaceCurationItem,
  deleteMarketplaceCurationItem,
  deleteMarketplace,
  getMarketplace,
  getMarketplaceAttributionSummary,
  getMarketplaceCuration,
  getMarketplaceCurationCandidates,
  getMarketplaceSellerReviewEvents,
  getMarketplaceSellers,
  getMyMarketplaceMemberships,
  getMyMarketplaces,
  inviteMarketplaceSeller,
  reorderMarketplaceCuration,
  updateMarketplaceCurationItem,
  verifyMarketplaceCustomDomain,
  updateMarketplace,
  updateMarketplaceSeller,
} from '../services/api/marketplace';

function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useMyOperatorMarketplaces(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;
  const [marketplaces, setMarketplaces] = useState<NativeMarketplace[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    try {
      setMarketplaces(await getMyMarketplaces());
    } catch (err) {
      setLoadFailed(true);
      setError(toErrorMessage(err, 'Failed to load marketplaces'));
      setMarketplaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  const create = useCallback(async (data: CreateNativeMarketplaceRequest) => {
    return createMarketplace(data);
  }, []);

  return {
    marketplaces,
    loading,
    loadFailed,
    error,
    refresh,
    create,
  };
}

export function useOperatorMarketplace(marketplaceId?: string) {
  const [marketplace, setMarketplace] = useState<NativeMarketplace | null>(null);
  const [stores, setStores] = useState<MarketplaceStoreMembership[]>([]);
  const [reviewEvents, setReviewEvents] = useState<MarketplaceSellerReviewEvent[]>([]);
  const [curationItems, setCurationItems] = useState<MarketplaceCurationItem[]>([]);
  const [curationCandidates, setCurationCandidates] =
    useState<MarketplaceCurationCandidates | null>(null);
  const [curationLoading, setCurationLoading] = useState(false);
  const [curationCandidatesLoading, setCurationCandidatesLoading] = useState(false);
  const [curationError, setCurationError] = useState<string | null>(null);
  const [attributionSummary, setAttributionSummary] =
    useState<MarketplaceAttributionSummary | null>(null);
  const [loading, setLoading] = useState(Boolean(marketplaceId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewEventsError, setReviewEventsError] = useState<string | null>(null);
  const [attributionSummaryError, setAttributionSummaryError] = useState<string | null>(null);
  const [attributionSummaryLoading, setAttributionSummaryLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const curationCandidatesRequestSeqRef = useRef(0);
  const marketplaceIdRef = useRef(marketplaceId);
  marketplaceIdRef.current = marketplaceId;

  const loadAttributionSummary = useCallback(
    async (requestMarketplaceId: string, requestSeq: number) => {
      setAttributionSummaryLoading(true);
      try {
        const summary = await getMarketplaceAttributionSummary(requestMarketplaceId);
        if (
          requestSeq !== requestSeqRef.current ||
          marketplaceIdRef.current !== requestMarketplaceId
        ) {
          return;
        }
        setAttributionSummary(summary);
        setAttributionSummaryError(null);
      } catch (err) {
        if (
          requestSeq !== requestSeqRef.current ||
          marketplaceIdRef.current !== requestMarketplaceId
        ) {
          return;
        }
        setAttributionSummary(null);
        setAttributionSummaryError(toErrorMessage(err, 'Failed to load attribution summary'));
      } finally {
        if (
          requestSeq === requestSeqRef.current &&
          marketplaceIdRef.current === requestMarketplaceId
        ) {
          setAttributionSummaryLoading(false);
        }
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    const requestMarketplaceId = marketplaceId;

    if (requestMarketplaceId !== marketplaceIdRef.current) {
      return;
    }

    const requestSeq = ++requestSeqRef.current;
    const candidatesRequestSeq = ++curationCandidatesRequestSeqRef.current;

    if (!requestMarketplaceId) {
      setMarketplace(null);
      setStores([]);
      setReviewEvents([]);
      setCurationItems([]);
      setCurationCandidates(null);
      setCurationLoading(false);
      setCurationCandidatesLoading(false);
      setCurationError(null);
      setAttributionSummary(null);
      setLoading(false);
      setLoadFailed(false);
      setError(null);
      setReviewEventsError(null);
      setAttributionSummaryError(null);
      setAttributionSummaryLoading(false);
      return;
    }

    setLoading(true);
    setLoadFailed(false);
    setError(null);
    setReviewEventsError(null);
    setCurationItems([]);
    setCurationCandidates(null);
    setCurationError(null);
    setCurationLoading(true);
    setCurationCandidatesLoading(false);
    setAttributionSummary(null);
    setAttributionSummaryError(null);
    setAttributionSummaryLoading(false);
    try {
      const [
        marketplaceResult,
        membershipsResult,
        reviewEventsResult,
        curationResult,
        candidatesResult,
      ] = await Promise.allSettled([
        getMarketplace(requestMarketplaceId),
        getMarketplaceSellers(requestMarketplaceId),
        getMarketplaceSellerReviewEvents(requestMarketplaceId),
        getMarketplaceCuration(requestMarketplaceId),
        getMarketplaceCurationCandidates(requestMarketplaceId),
      ]);
      if (
        requestSeq !== requestSeqRef.current ||
        marketplaceIdRef.current !== requestMarketplaceId
      ) {
        return;
      }
      if (marketplaceResult.status === 'rejected') {
        throw marketplaceResult.reason;
      }
      if (membershipsResult.status === 'rejected') {
        throw membershipsResult.reason;
      }

      setMarketplace(marketplaceResult.value);
      setStores(membershipsResult.value);
      if (reviewEventsResult.status === 'fulfilled') {
        setReviewEvents(reviewEventsResult.value);
        setReviewEventsError(null);
      } else {
        setReviewEventsError(
          toErrorMessage(reviewEventsResult.reason, 'Failed to load review events')
        );
      }
      if (curationResult.status === 'fulfilled') {
        setCurationItems(curationResult.value);
      } else {
        setCurationItems([]);
      }
      const candidatesRequestIsCurrent =
        curationCandidatesRequestSeqRef.current === candidatesRequestSeq;
      if (candidatesRequestIsCurrent) {
        if (candidatesResult.status === 'fulfilled') {
          setCurationCandidates(candidatesResult.value);
        } else {
          setCurationCandidates(null);
        }
      }
      if (
        curationResult.status === 'fulfilled' &&
        (!candidatesRequestIsCurrent || candidatesResult.status === 'fulfilled')
      ) {
        setCurationError(null);
      } else {
        const source =
          curationResult.status === 'rejected'
            ? curationResult.reason
            : candidatesRequestIsCurrent && candidatesResult.status === 'rejected'
              ? candidatesResult.reason
              : new Error('Failed to load curation');
        setCurationError(toErrorMessage(source, 'Failed to load curation'));
      }
      void loadAttributionSummary(requestMarketplaceId, requestSeq);
    } catch (err) {
      if (
        requestSeq !== requestSeqRef.current ||
        marketplaceIdRef.current !== requestMarketplaceId
      ) {
        return;
      }
      setLoadFailed(true);
      setError(toErrorMessage(err, 'Failed to load marketplace'));
      setMarketplace(null);
      setStores([]);
      setReviewEvents([]);
      setCurationItems([]);
      setCurationCandidates(null);
      setCurationLoading(false);
      setCurationCandidatesLoading(false);
      setCurationError(null);
      setAttributionSummary(null);
      setReviewEventsError(null);
      setAttributionSummaryError(null);
      setAttributionSummaryLoading(false);
    } finally {
      if (
        requestSeq === requestSeqRef.current &&
        marketplaceIdRef.current === requestMarketplaceId
      ) {
        setLoading(false);
        setCurationLoading(false);
      }
    }
  }, [loadAttributionSummary, marketplaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setWorking(null);
  }, [marketplaceId]);

  useEffect(() => {
    setReviewEvents([]);
    setReviewEventsError(null);
    setCurationItems([]);
    setCurationCandidates(null);
    setCurationLoading(false);
    setCurationCandidatesLoading(false);
    setCurationError(null);
    setAttributionSummary(null);
    setAttributionSummaryError(null);
    setAttributionSummaryLoading(false);
  }, [marketplaceId]);

  const counts = useMemo(
    () => ({
      applied: stores.filter(store => store.status === 'applied').length,
      invited: stores.filter(store => store.status === 'invited').length,
      approved: stores.filter(store => store.status === 'approved').length,
      rejected: stores.filter(store => store.status === 'rejected').length,
      suspended: stores.filter(store => store.status === 'suspended').length,
      waiting: stores.filter(
        store =>
          store.status === 'invited' || store.status === 'accepted' || store.status === 'applied'
      ).length,
    }),
    [stores]
  );

  const publish = useCallback(async () => {
    if (!marketplaceId) return null;
    const actionMarketplaceId = marketplaceId;
    setWorking('publish');
    try {
      const updated = await updateMarketplace(actionMarketplaceId, { status: 'published' });
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setMarketplace(updated);
      }
      return updated;
    } finally {
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setWorking(null);
      }
    }
  }, [marketplaceId]);

  const update = useCallback(
    async (data: UpdateNativeMarketplaceRequest) => {
      if (!marketplaceId) return null;
      const actionMarketplaceId = marketplaceId;
      setWorking('update');
      try {
        const updated = await updateMarketplace(actionMarketplaceId, data);
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setMarketplace(updated);
        }
        return updated;
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    },
    [marketplaceId]
  );

  const archive = useCallback(async () => {
    if (!marketplaceId) return null;
    const actionMarketplaceId = marketplaceId;
    setWorking('archive');
    try {
      const result = await deleteMarketplace(actionMarketplaceId);
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setMarketplace(prev => (prev ? { ...prev, status: 'archived' } : null));
      }
      return result;
    } finally {
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setWorking(null);
      }
    }
  }, [marketplaceId]);

  const invite = useCallback(
    async (peerID: string) => {
      if (!marketplaceId) return;
      const actionMarketplaceId = marketplaceId;
      setWorking('invite');
      try {
        await inviteMarketplaceSeller(actionMarketplaceId, { peerID });
        if (marketplaceIdRef.current === actionMarketplaceId) {
          await refresh();
        }
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    },
    [marketplaceId, refresh]
  );

  const reviewSeller = useCallback(
    async (
      store: MarketplaceStoreMembership,
      status: Extract<MarketplaceStoreStatus, 'approved' | 'rejected' | 'suspended'>,
      reason?: string
    ) => {
      if (!marketplaceId) return;
      const actionMarketplaceId = marketplaceId;
      setWorking(`${status}:${store.peerID}`);
      try {
        await updateMarketplaceSeller(actionMarketplaceId, store.peerID, { status, reason });
        if (marketplaceIdRef.current === actionMarketplaceId) {
          await refresh();
        }
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    },
    [marketplaceId, refresh]
  );

  const verifyCustomDomain =
    useCallback(async (): Promise<VerifyMarketplaceCustomDomainResponse | null> => {
      if (!marketplaceId) return null;
      const actionMarketplaceId = marketplaceId;
      setWorking('verifyCustomDomain');
      try {
        const result = await verifyMarketplaceCustomDomain(actionMarketplaceId);
        if (marketplaceIdRef.current === actionMarketplaceId && result.verified) {
          await refresh();
        }
        return result;
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    }, [marketplaceId, refresh]);

  const addCurationItem = useCallback(
    async (kind: MarketplaceCurationKind, payload: { peerID?: string; listingSlug?: string }) => {
      if (!marketplaceId) return null;
      const actionMarketplaceId = marketplaceId;
      setWorking(`curation:add:${kind}`);
      try {
        const created = await createMarketplaceCurationItem(actionMarketplaceId, {
          kind,
          peerID: payload.peerID,
          listingSlug: payload.listingSlug,
        });
        if (marketplaceIdRef.current === actionMarketplaceId) {
          await refresh();
        }
        return created;
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    },
    [marketplaceId, refresh]
  );

  const reorderCurationByKind = useCallback(
    async (kind: MarketplaceCurationKind, itemIDs: number[]) => {
      if (!marketplaceId) return null;
      const actionMarketplaceId = marketplaceId;
      setWorking(`curation:reorder:${kind}`);
      try {
        const updated = await reorderMarketplaceCuration(actionMarketplaceId, { kind, itemIDs });
        if (marketplaceIdRef.current === actionMarketplaceId) {
          await refresh();
        }
        return updated;
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    },
    [marketplaceId, refresh]
  );

  const toggleCurationItem = useCallback(
    async (itemID: number, isActive: boolean) => {
      if (!marketplaceId) return null;
      const actionMarketplaceId = marketplaceId;
      setWorking(`curation:toggle:${itemID}`);
      try {
        const updated = await updateMarketplaceCurationItem(actionMarketplaceId, itemID, {
          isActive,
        });
        if (marketplaceIdRef.current === actionMarketplaceId) {
          await refresh();
        }
        return updated;
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    },
    [marketplaceId, refresh]
  );

  const removeCurationItem = useCallback(
    async (itemID: number) => {
      if (!marketplaceId) return null;
      const actionMarketplaceId = marketplaceId;
      setWorking(`curation:remove:${itemID}`);
      try {
        const result = await deleteMarketplaceCurationItem(actionMarketplaceId, itemID);
        if (marketplaceIdRef.current === actionMarketplaceId) {
          await refresh();
        }
        return result;
      } finally {
        if (marketplaceIdRef.current === actionMarketplaceId) {
          setWorking(null);
        }
      }
    },
    [marketplaceId, refresh]
  );

  const loadCurationCandidates = useCallback(
    async (params: MarketplaceCurationCandidatesParams = {}) => {
      if (!marketplaceId) return null;
      const actionMarketplaceId = marketplaceId;
      const requestSeq = ++curationCandidatesRequestSeqRef.current;
      setCurationCandidatesLoading(true);
      try {
        const result = await getMarketplaceCurationCandidates(actionMarketplaceId, params);
        if (
          marketplaceIdRef.current !== actionMarketplaceId ||
          curationCandidatesRequestSeqRef.current !== requestSeq
        ) {
          return null;
        }
        setCurationCandidates(result);
        return result;
      } catch (err) {
        if (
          marketplaceIdRef.current !== actionMarketplaceId ||
          curationCandidatesRequestSeqRef.current !== requestSeq
        ) {
          return null;
        }
        throw err;
      } finally {
        if (
          marketplaceIdRef.current === actionMarketplaceId &&
          curationCandidatesRequestSeqRef.current === requestSeq
        ) {
          setCurationCandidatesLoading(false);
        }
      }
    },
    [marketplaceId]
  );

  return {
    marketplace,
    stores,
    reviewEvents,
    curationItems,
    curationCandidates,
    curationLoading,
    curationCandidatesLoading,
    curationError,
    attributionSummary,
    counts,
    loading,
    loadFailed,
    error,
    reviewEventsError,
    attributionSummaryError,
    attributionSummaryLoading,
    working,
    refresh,
    publish,
    update,
    archive,
    invite,
    reviewSeller,
    verifyCustomDomain,
    addCurationItem,
    reorderCurationByKind,
    toggleCurationItem,
    removeCurationItem,
    loadCurationCandidates,
  };
}

export function useMyMarketplaceMemberships(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;
  const [memberships, setMemberships] = useState<MyMarketplaceMembershipEntry[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setError(null);
    try {
      setMemberships(await getMyMarketplaceMemberships());
    } catch (err) {
      setLoadFailed(true);
      setError(toErrorMessage(err, 'Failed to load marketplace memberships'));
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void refresh();
    }
  }, [autoLoad, refresh]);

  const pendingInvitations = useMemo(
    () => memberships.filter(entry => entry.membership.status === 'invited'),
    [memberships]
  );

  const acceptInvitation = useCallback(
    async (entry: MyMarketplaceMembershipEntry) => {
      const { marketplace, membership } = entry;
      setAcceptingId(marketplace.id);
      try {
        await acceptMarketplaceSellerInvitation(marketplace.id, membership.peerID);
        await refresh();
      } finally {
        setAcceptingId(null);
      }
    },
    [refresh]
  );

  return {
    memberships,
    pendingInvitations,
    loading,
    loadFailed,
    error,
    acceptingId,
    refresh,
    acceptInvitation,
  };
}
