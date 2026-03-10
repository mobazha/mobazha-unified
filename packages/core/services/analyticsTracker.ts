/**
 * Visitor Analytics Tracker — sends page view and interaction events
 * to the store's backend for conversion funnel and traffic analysis.
 *
 * Events are batched and flushed periodically or on page unload
 * to minimize network requests.
 */

import { NODE_API } from '../config/apiPaths';
import { getGatewayUrl } from './api/config';

export interface AnalyticsEvent {
  eventType: 'page_view' | 'product_view' | 'add_to_cart' | 'checkout_start';
  pagePath: string;
  productSlug?: string;
  referrer?: string;
}

const STORAGE_VISITOR_KEY = 'mbz-visitor-id';
const STORAGE_SESSION_KEY = 'mbz-session-id';
const FLUSH_INTERVAL_MS = 10_000;
const MAX_BATCH_SIZE = 20;

let visitorId: string | null = null;
let sessionId: string | null = null;
const eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let currentPeerID: string | null = null;
let boundFlush: (() => void) | null = null;
let boundVisibilityHandler: (() => void) | null = null;

function isTrackingAllowed(): boolean {
  if (typeof navigator === 'undefined') return true;
  const dnt = navigator.doNotTrack ?? (navigator as unknown as Record<string, string>).msDoNotTrack;
  return dnt !== '1' && dnt !== 'yes';
}

function generateId(): string {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getVisitorId(): string {
  if (visitorId) return visitorId;
  try {
    visitorId = localStorage.getItem(STORAGE_VISITOR_KEY);
    if (!visitorId) {
      visitorId = generateId();
      localStorage.setItem(STORAGE_VISITOR_KEY, visitorId);
    }
  } catch {
    visitorId = generateId();
  }
  return visitorId;
}

function getSessionId(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem(STORAGE_SESSION_KEY, sessionId);
    }
  } catch {
    sessionId = generateId();
  }
  return sessionId;
}

function flush(): void {
  if (eventQueue.length === 0 || !currentPeerID) return;

  const batch = eventQueue.splice(0, MAX_BATCH_SIZE);
  const payload = JSON.stringify({
    events: batch.map(e => ({
      ...e,
      sessionId: getSessionId(),
      visitorId: getVisitorId(),
    })),
  });

  const url = `${getGatewayUrl()}${NODE_API.ANALYTICS_EVENTS(currentPeerID)}`;

  // Use fetch with keepalive for reliable delivery.
  // sendBeacon with application/json triggers CORS preflight which it cannot handle.
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function removeListeners(): void {
  if (boundFlush) {
    window.removeEventListener('beforeunload', boundFlush);
    boundFlush = null;
  }
  if (boundVisibilityHandler) {
    document.removeEventListener('visibilitychange', boundVisibilityHandler);
    boundVisibilityHandler = null;
  }
}

export function initTracker(peerID: string): void {
  if (typeof window === 'undefined') return;
  if (!isTrackingAllowed()) return;

  currentPeerID = peerID;

  if (!flushTimer) {
    flushTimer = setInterval(flush, FLUSH_INTERVAL_MS);
    boundFlush = flush;
    boundVisibilityHandler = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('beforeunload', boundFlush);
    document.addEventListener('visibilitychange', boundVisibilityHandler);
  }
}

export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  if (!isTrackingAllowed()) return;
  eventQueue.push(event);
  if (eventQueue.length >= MAX_BATCH_SIZE) flush();
}

export function stopTracker(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flush();
  removeListeners();
}
