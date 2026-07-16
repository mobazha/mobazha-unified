// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as ordersApi from '../services/api/orders';
import type { OnrampProviderOption } from '../services/api/orders';
import type { OnrampFundingSourceView, PaymentSession } from '../types';

const ACTIVE_STATUSES = new Set(['created', 'awaiting_payment', 'processing', 'delivering']);
const lastMountRefreshAt = new Map<string, number>();
const MOUNT_REFRESH_MIN_GAP_MS = 5_000;
const REFRESH_INTERVAL_MS = 10_000;

function sameSource(a: OnrampFundingSourceView | null, b: OnrampFundingSourceView | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.providerID === b.providerID &&
    a.onrampOrderID === b.onrampOrderID &&
    a.status === b.status &&
    a.deliverToBuyerWallet === b.deliverToBuyerWallet &&
    a.buyerWalletAddress === b.buyerWalletAddress &&
    a.buyerActionURL === b.buyerActionURL &&
    a.disclosure === b.disclosure &&
    a.updatedAt === b.updatedAt
  );
}

export interface UseOnrampFundingOptions {
  orderID?: string;
  paymentSession: PaymentSession | null;
  vendorPeerID?: string;
  /** Receives a refreshed session after an onramp lifecycle transition. */
  onPaymentSessionUpdated?: (session: PaymentSession) => void;
}

export interface UseOnrampFundingResult {
  source: OnrampFundingSourceView | null;
  directProviders: OnrampProviderOption[] | null;
  initiationBusy: boolean;
  initiationHidden: boolean;
  refreshing: boolean;
  refreshError: boolean;
  resolvedWithoutView: boolean;
  initiateDirect: () => Promise<OnrampFundingSourceView | null>;
  refresh: () => Promise<void>;
}

/**
 * Owns onramp discovery, idempotent initiation, source resilience, and polling.
 * UI components consume this controller and never call order APIs directly.
 */
export function useOnrampFunding({
  orderID,
  paymentSession,
  vendorPeerID,
  onPaymentSessionUpdated,
}: UseOnrampFundingOptions): UseOnrampFundingResult {
  const [source, setSource] = useState<OnrampFundingSourceView | null>(null);
  const [providers, setProviders] = useState<OnrampProviderOption[] | null>(null);
  const [initiationBusy, setInitiationBusy] = useState(false);
  const [initiationHidden, setInitiationHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [pollingStopped, setPollingStopped] = useState(false);

  const sourceRef = useRef<OnrampFundingSourceView | null>(null);
  const refreshInFlightOrderRef = useRef<string | null>(null);
  const pollingStoppedRef = useRef(false);
  const orderIDRef = useRef(orderID);
  const previousOrderIDRef = useRef(orderID);
  orderIDRef.current = orderID;

  const paymentSessionUpdatedRef = useRef(onPaymentSessionUpdated);
  useEffect(() => {
    paymentSessionUpdatedRef.current = onPaymentSessionUpdated;
  }, [onPaymentSessionUpdated]);

  // Seed from any session carrying the buyer-side source, but preserve the
  // durable local view when a vendor-routed session projection omits it.
  useEffect(() => {
    const next = paymentSession?.onrampFunding ?? null;
    if (!next || sameSource(sourceRef.current, next)) return;
    sourceRef.current = next;
    pollingStoppedRef.current = false;
    setPollingStopped(false);
    setSource(next);
  }, [paymentSession?.onrampFunding]);

  useEffect(() => {
    if (previousOrderIDRef.current === orderID) return;
    previousOrderIDRef.current = orderID;
    sourceRef.current = null;
    pollingStoppedRef.current = false;
    refreshInFlightOrderRef.current = null;
    setSource(null);
    setProviders(null);
    setInitiationBusy(false);
    setInitiationHidden(false);
    setRefreshing(false);
    setRefreshError(false);
    setPollingStopped(false);
  }, [orderID]);

  const targetKey =
    paymentSession?.fundingTarget?.type === 'address'
      ? [
          orderID ?? '',
          paymentSession.fundingTarget.assetID,
          paymentSession.fundingTarget.address ?? '',
          paymentSession.fundingTarget.amount,
        ].join('|')
      : '';
  const targetKeyRef = useRef('');
  useEffect(() => {
    if (!targetKey) return;
    if (targetKeyRef.current && targetKeyRef.current !== targetKey) {
      const previousOrderID = targetKeyRef.current.split('|', 1)[0];
      const next = previousOrderID === orderID ? (paymentSession?.onrampFunding ?? null) : null;
      sourceRef.current = next;
      pollingStoppedRef.current = false;
      setSource(next);
      setProviders(null);
      setInitiationHidden(false);
      setPollingStopped(false);
    }
    targetKeyRef.current = targetKey;
  }, [orderID, paymentSession?.onrampFunding, targetKey]);

  const discoveryTarget =
    paymentSession?.status === 'awaiting_funds' && paymentSession.fundingTarget?.type === 'address'
      ? (paymentSession.fundingTarget.address ?? '')
      : '';

  useEffect(() => {
    setProviders(null);
    if (!orderID || !discoveryTarget) return;
    let cancelled = false;
    void ordersApi
      .getOrderOnrampProviders(orderID, { vendorPeerID })
      .then(list => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [discoveryTarget, orderID, vendorPeerID]);

  const directProviders = useMemo(
    () => providers?.filter(provider => provider.deliverToTarget) ?? null,
    [providers]
  );

  const refreshPaymentSession = useCallback(async () => {
    if (!orderID) return;
    try {
      const session = await ordersApi.getOrderPaymentSession(orderID, { vendorPeerID });
      if (session && orderIDRef.current === orderID) {
        paymentSessionUpdatedRef.current?.(session);
      }
    } catch {
      // The lifecycle view remains useful even if the wider session refresh is
      // temporarily unavailable; its own readiness poll will retry separately.
    }
  }, [orderID, vendorPeerID]);

  const refresh = useCallback(async () => {
    if (!orderID || refreshInFlightOrderRef.current === orderID || !sourceRef.current) return;
    refreshInFlightOrderRef.current = orderID;
    setRefreshing(true);
    try {
      const next = await ordersApi.refreshOrderOnrampFunding(orderID, { vendorPeerID });
      if (orderIDRef.current !== orderID) return;
      setRefreshError(false);
      if (!next) {
        if (!pollingStoppedRef.current) {
          pollingStoppedRef.current = true;
          setPollingStopped(true);
          void refreshPaymentSession();
        }
        return;
      }
      pollingStoppedRef.current = false;
      setPollingStopped(false);
      if (!sameSource(next, sourceRef.current)) {
        sourceRef.current = next;
        setSource(next);
        void refreshPaymentSession();
      }
    } catch {
      if (orderIDRef.current === orderID) setRefreshError(true);
    } finally {
      if (refreshInFlightOrderRef.current === orderID) {
        refreshInFlightOrderRef.current = null;
      }
      if (orderIDRef.current === orderID) setRefreshing(false);
    }
  }, [orderID, refreshPaymentSession, vendorPeerID]);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const isActive = Boolean(source && ACTIVE_STATUSES.has(source.status) && !pollingStopped);
  useEffect(() => {
    if (!isActive || !orderID) return;
    const last = lastMountRefreshAt.get(orderID) ?? 0;
    if (Date.now() - last >= MOUNT_REFRESH_MIN_GAP_MS) {
      lastMountRefreshAt.set(orderID, Date.now());
      void refreshRef.current();
    }
    const interval = window.setInterval(() => {
      lastMountRefreshAt.set(orderID, Date.now());
      void refreshRef.current();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [isActive, orderID]);

  const initiateDirect = useCallback(async () => {
    const chosen = directProviders?.[0];
    if (!orderID || !chosen) {
      setInitiationHidden(true);
      return null;
    }
    setInitiationBusy(true);
    try {
      const next = await ordersApi.initiateOrderOnrampFunding({
        orderId: orderID,
        providerID: chosen.providerID,
        fiatCurrency: chosen.fiatCurrencies?.[0] ?? 'USD',
        deliverToBuyerWallet: false,
        vendorPeerID,
      });
      if (orderIDRef.current !== orderID) return null;
      if (!next) {
        setInitiationHidden(true);
        return null;
      }
      sourceRef.current = next;
      setSource(next);
      return next;
    } catch (error) {
      if (orderIDRef.current === orderID) setInitiationHidden(true);
      throw error;
    } finally {
      if (orderIDRef.current === orderID) setInitiationBusy(false);
    }
  }, [directProviders, orderID, vendorPeerID]);

  return {
    source,
    directProviders,
    initiationBusy,
    initiationHidden,
    refreshing,
    refreshError,
    resolvedWithoutView: Boolean(source && ACTIVE_STATUSES.has(source.status) && pollingStopped),
    initiateDirect,
    refresh,
  };
}
