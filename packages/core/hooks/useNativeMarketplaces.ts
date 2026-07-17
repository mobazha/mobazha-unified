// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

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
  declineMarketplaceSellerInvitation,
  getMarketplace,
  getMarketplaceAttributionSummary,
  getMarketplaceCuration,
  getMarketplaceCurationCandidates,
  getMarketplaceSellerReviewEvents,
  getMarketplaceSellers,
  leaveMarketplaceMembership,
  getMyMarketplaceMemberships,
  getMyMarketplaces,
  inviteMarketplaceSeller,
  publishMarketplace,
  reorderMarketplaceCuration,
  suspendMarketplace,
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

export interface OperatorMarketplaceCapabilityOptions {
  curation?: boolean;
  sellerReview?: boolean;
  customDomains?: boolean;
  releasePublishing?: boolean;
  attribution?: boolean;
}

export function useOperatorMarketplace(
  marketplaceId?: string,
  capabilities: OperatorMarketplaceCapabilityOptions = {}
) {
  const {
    curation = true,
    sellerReview = true,
    customDomains = true,
    releasePublishing = true,
    attribution = true,
  } = capabilities;
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
  const attributionRequestSeqRef = useRef(0);
  const marketplaceIdRef = useRef(marketplaceId);
  marketplaceIdRef.current = marketplaceId;
  // Operators review different spans (weekly check-ins, campaign windows), so
  // the summary window is caller-adjustable; deltas stay comparable because
  // the backend always mirrors the previous same-length window.
  const [attributionWindowDays, setAttributionWindowDaysState] = useState(30);
  const attributionWindowDaysRef = useRef(30);

  const loadAttributionSummary = useCallback(async (requestMarketplaceId: string) => {
    const requestSeq = ++attributionRequestSeqRef.current;
    setAttributionSummaryLoading(true);
    try {
      const from = new Date(
        Date.now() - attributionWindowDaysRef.current * 24 * 60 * 60 * 1000
      ).toISOString();
      const summary = await getMarketplaceAttributionSummary(requestMarketplaceId, { from });
      if (
        requestSeq !== attributionRequestSeqRef.current ||
        marketplaceIdRef.current !== requestMarketplaceId
      ) {
        return;
      }
      setAttributionSummary(summary);
      setAttributionSummaryError(null);
    } catch (err) {
      if (
        requestSeq !== attributionRequestSeqRef.current ||
        marketplaceIdRef.current !== requestMarketplaceId
      ) {
        return;
      }
      setAttributionSummary(null);
      setAttributionSummaryError(toErrorMessage(err, 'Failed to load attribution summary'));
    } finally {
      if (
        requestSeq === attributionRequestSeqRef.current &&
        marketplaceIdRef.current === requestMarketplaceId
      ) {
        setAttributionSummaryLoading(false);
      }
    }
  }, []);

  const setAttributionWindowDays = useCallback(
    (days: number) => {
      attributionWindowDaysRef.current = days;
      setAttributionWindowDaysState(days);
      if (attribution && marketplaceIdRef.current) {
        void loadAttributionSummary(marketplaceIdRef.current);
      }
    },
    [attribution, loadAttributionSummary]
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
    setCurationLoading(curation);
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
        sellerReview ? getMarketplaceSellerReviewEvents(requestMarketplaceId) : Promise.resolve([]),
        curation ? getMarketplaceCuration(requestMarketplaceId) : Promise.resolve([]),
        curation ? getMarketplaceCurationCandidates(requestMarketplaceId) : Promise.resolve(null),
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
      if (attribution) {
        void loadAttributionSummary(requestMarketplaceId);
      }
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
  }, [attribution, curation, loadAttributionSummary, marketplaceId, sellerReview]);

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
    if (!marketplaceId || !releasePublishing) return null;
    const actionMarketplaceId = marketplaceId;
    setWorking('publish');
    try {
      const updated = await publishMarketplace(actionMarketplaceId);
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setMarketplace(updated);
      }
      return updated;
    } finally {
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setWorking(null);
      }
    }
  }, [marketplaceId, releasePublishing]);

  const suspend = useCallback(async () => {
    if (!marketplaceId || !releasePublishing) return null;
    const actionMarketplaceId = marketplaceId;
    setWorking('suspend');
    try {
      const updated = await suspendMarketplace(actionMarketplaceId);
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setMarketplace(updated);
      }
      return updated;
    } finally {
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setWorking(null);
      }
    }
  }, [marketplaceId, releasePublishing]);

  const resume = useCallback(async () => {
    if (!marketplaceId || !releasePublishing) return null;
    const actionMarketplaceId = marketplaceId;
    setWorking('resume');
    try {
      const updated = await publishMarketplace(actionMarketplaceId);
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setMarketplace(updated);
      }
      return updated;
    } finally {
      if (marketplaceIdRef.current === actionMarketplaceId) {
        setWorking(null);
      }
    }
  }, [marketplaceId, releasePublishing]);

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
      if (!marketplaceId || !sellerReview) return;
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
    [marketplaceId, refresh, sellerReview]
  );

  const verifyCustomDomain =
    useCallback(async (): Promise<VerifyMarketplaceCustomDomainResponse | null> => {
      if (!marketplaceId || !customDomains) return null;
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
    }, [customDomains, marketplaceId, refresh]);

  const addCurationItem = useCallback(
    async (kind: MarketplaceCurationKind, payload: { peerID?: string; listingSlug?: string }) => {
      if (!marketplaceId || !curation) return null;
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
    [curation, marketplaceId, refresh]
  );

  const reorderCurationByKind = useCallback(
    async (kind: MarketplaceCurationKind, itemIDs: number[]) => {
      if (!marketplaceId || !curation) return null;
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
    [curation, marketplaceId, refresh]
  );

  const toggleCurationItem = useCallback(
    async (itemID: number, isActive: boolean) => {
      if (!marketplaceId || !curation) return null;
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
    [curation, marketplaceId, refresh]
  );

  const removeCurationItem = useCallback(
    async (itemID: number) => {
      if (!marketplaceId || !curation) return null;
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
    [curation, marketplaceId, refresh]
  );

  const loadCurationCandidates = useCallback(
    async (params: MarketplaceCurationCandidatesParams = {}) => {
      if (!marketplaceId || !curation) return null;
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
    [curation, marketplaceId]
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
    attributionWindowDays,
    setAttributionWindowDays,
    working,
    refresh,
    publish,
    suspend,
    resume,
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
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const activeMutationRef = useRef<object | null>(null);

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

  const runMembershipMutation = useCallback(
    async (
      marketplaceId: string,
      setActiveId: (id: string | null) => void,
      mutate: () => Promise<unknown>
    ) => {
      if (activeMutationRef.current) {
        throw new Error('A marketplace membership action is already in progress');
      }

      const mutationToken = {};
      activeMutationRef.current = mutationToken;
      setActiveId(marketplaceId);
      try {
        await mutate();
        await refresh();
      } finally {
        if (activeMutationRef.current === mutationToken) {
          activeMutationRef.current = null;
          setActiveId(null);
        }
      }
    },
    [refresh]
  );

  const acceptInvitation = useCallback(
    async (entry: MyMarketplaceMembershipEntry) => {
      const { marketplace, membership } = entry;
      await runMembershipMutation(marketplace.id, setAcceptingId, () =>
        acceptMarketplaceSellerInvitation(marketplace.id, membership.peerID)
      );
    },
    [runMembershipMutation]
  );

  const declineInvitation = useCallback(
    async (entry: MyMarketplaceMembershipEntry) => {
      const { marketplace } = entry;
      await runMembershipMutation(marketplace.id, setDecliningId, () =>
        declineMarketplaceSellerInvitation(marketplace.id)
      );
    },
    [runMembershipMutation]
  );

  const leaveMembership = useCallback(
    async (entry: MyMarketplaceMembershipEntry) => {
      const { marketplace } = entry;
      await runMembershipMutation(marketplace.id, setLeavingId, () =>
        leaveMarketplaceMembership(marketplace.id)
      );
    },
    [runMembershipMutation]
  );

  return {
    memberships,
    pendingInvitations,
    loading,
    loadFailed,
    error,
    acceptingId,
    decliningId,
    leavingId,
    refresh,
    acceptInvitation,
    declineInvitation,
    leaveMembership,
  };
}
