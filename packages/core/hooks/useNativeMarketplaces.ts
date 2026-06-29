'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CreateNativeMarketplaceRequest,
  MarketplaceStoreMembership,
  MarketplaceStoreStatus,
  MyMarketplaceMembershipEntry,
  NativeMarketplace,
} from '../types/marketplace';
import {
  acceptMarketplaceSellerInvitation,
  createMarketplace,
  getMarketplace,
  getMarketplaceSellers,
  getMyMarketplaceMemberships,
  getMyMarketplaces,
  inviteMarketplaceSeller,
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
  const [loading, setLoading] = useState(Boolean(marketplaceId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const requestSeqRef = useRef(0);
  const marketplaceIdRef = useRef(marketplaceId);
  marketplaceIdRef.current = marketplaceId;

  const refresh = useCallback(async () => {
    const requestMarketplaceId = marketplaceId;

    if (requestMarketplaceId !== marketplaceIdRef.current) {
      return;
    }

    const requestSeq = ++requestSeqRef.current;

    if (!requestMarketplaceId) {
      setMarketplace(null);
      setStores([]);
      setLoading(false);
      setLoadFailed(false);
      setError(null);
      return;
    }

    setLoading(true);
    setLoadFailed(false);
    setError(null);
    try {
      const [nextMarketplace, memberships] = await Promise.all([
        getMarketplace(requestMarketplaceId),
        getMarketplaceSellers(requestMarketplaceId),
      ]);
      if (
        requestSeq !== requestSeqRef.current ||
        marketplaceIdRef.current !== requestMarketplaceId
      ) {
        return;
      }
      setMarketplace(nextMarketplace);
      setStores(memberships);
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
    } finally {
      if (
        requestSeq === requestSeqRef.current &&
        marketplaceIdRef.current === requestMarketplaceId
      ) {
        setLoading(false);
      }
    }
  }, [marketplaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setWorking(null);
  }, [marketplaceId]);

  const counts = useMemo(
    () => ({
      waiting: stores.filter(
        store =>
          store.status === 'invited' || store.status === 'accepted' || store.status === 'applied'
      ).length,
      approved: stores.filter(store => store.status === 'approved').length,
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
      status: Extract<MarketplaceStoreStatus, 'approved' | 'rejected' | 'suspended'>
    ) => {
      if (!marketplaceId) return;
      const actionMarketplaceId = marketplaceId;
      setWorking(`${status}:${store.peerID}`);
      try {
        await updateMarketplaceSeller(actionMarketplaceId, store.peerID, { status });
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

  return {
    marketplace,
    stores,
    counts,
    loading,
    loadFailed,
    error,
    working,
    refresh,
    publish,
    invite,
    reviewSeller,
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
