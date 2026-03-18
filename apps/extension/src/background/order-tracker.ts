/**
 * Ext-2: Order state tracker for Service Worker.
 *
 * Polls purchases/sales APIs on a chrome.alarms schedule,
 * diffs state changes, fires desktop notifications, updates badge.
 *
 * Runs entirely in Service Worker context (no DOM, no localStorage).
 * Auth token is synced from Popup/SidePanel via chrome.storage.local.
 */

const ALARM_NAME = 'mbz-order-poll';
const GATEWAY_URL = 'https://test-new.mobazha.org/v1';
const DEFAULT_POLL_MINUTES = 5;
const MAX_TRACKED_ORDERS = 200;

// ── Types ──

interface OrderSnapshot {
  orderID: string;
  state: string;
  title: string;
  role: 'buyer' | 'seller';
}

interface StoredData {
  authToken?: string;
  orderStates?: OrderSnapshot[];
  lastPollTime?: number;
  unreadCount?: number;
  pollIntervalMinutes?: number;
}

interface ApiOrderItem {
  orderID: string;
  state: string;
  title: string;
  slug: string;
}

interface StateChange {
  orderID: string;
  title: string;
  role: 'buyer' | 'seller';
  oldState: string;
  newState: string;
}

// ── Human-readable state labels ──

const STATE_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  AWAITING_PAYMENT: 'Awaiting Payment',
  AWAITING_PICKUP: 'Awaiting Pickup',
  AWAITING_FULFILLMENT: 'Awaiting Fulfillment',
  PARTIALLY_FULFILLED: 'Partially Fulfilled',
  FULFILLED: 'Shipped',
  COMPLETED: 'Completed',
  CANCELED: 'Canceled',
  DECLINED: 'Declined',
  REFUNDED: 'Refunded',
  DISPUTED: 'Disputed',
  DECIDED: 'Decision Made',
  RESOLVED: 'Resolved',
  PAYMENT_FINALIZED: 'Payment Finalized',
  PROCESSING_ERROR: 'Processing Error',
};

function stateLabel(state: string): string {
  return STATE_LABELS[state] || state;
}

// ── API helpers (raw fetch, no DOM dependencies) ──

async function fetchWithAuth<T>(path: string, token: string): Promise<T | null> {
  try {
    const resp = await fetch(`${GATEWAY_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return (json.data ?? json) as T;
  } catch {
    return null;
  }
}

async function fetchOrders(
  token: string
): Promise<{ purchases: ApiOrderItem[]; sales: ApiOrderItem[] }> {
  const [purchasesRaw, salesRaw] = await Promise.all([
    fetchWithAuth<{ purchases?: ApiOrderItem[] }>('/purchases?limit=50', token),
    fetchWithAuth<{ sales?: ApiOrderItem[] }>('/sales?limit=50', token),
  ]);

  return {
    purchases: purchasesRaw?.purchases ?? [],
    sales: salesRaw?.sales ?? [],
  };
}

// ── State diff ──

function diffStates(
  oldSnaps: OrderSnapshot[],
  purchases: ApiOrderItem[],
  sales: ApiOrderItem[]
): { changes: StateChange[]; newSnaps: OrderSnapshot[] } {
  const oldMap = new Map(oldSnaps.map(s => [s.orderID, s]));
  const changes: StateChange[] = [];
  const newSnaps: OrderSnapshot[] = [];

  const process = (items: ApiOrderItem[], role: 'buyer' | 'seller') => {
    for (const item of items) {
      const snap: OrderSnapshot = {
        orderID: item.orderID,
        state: item.state,
        title: item.title || item.slug || item.orderID,
        role,
      };
      newSnaps.push(snap);

      const old = oldMap.get(item.orderID);
      if (old && old.state !== item.state) {
        changes.push({
          orderID: item.orderID,
          title: snap.title,
          role,
          oldState: old.state,
          newState: item.state,
        });
      }
    }
  };

  process(purchases, 'buyer');
  process(sales, 'seller');

  if (newSnaps.length > MAX_TRACKED_ORDERS) {
    newSnaps.length = MAX_TRACKED_ORDERS;
  }

  return { changes, newSnaps };
}

// ── Notifications ──

function notifyStateChange(change: StateChange): void {
  const roleLabel = change.role === 'buyer' ? 'Purchase' : 'Sale';
  const title = `${roleLabel} Update`;
  const message = `"${change.title}" → ${stateLabel(change.newState)}`;

  chrome.notifications.create(`order-${change.orderID}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title,
    message,
    priority: 1,
  });
}

// ── Badge ──

function updateBadge(count: number): void {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
}

// ── Main poll cycle ──

export async function pollOrders(): Promise<void> {
  const stored: StoredData = await chrome.storage.local.get([
    'authToken',
    'orderStates',
    'unreadCount',
  ]);

  if (!stored.authToken) return;

  const { purchases, sales } = await fetchOrders(stored.authToken);
  if (purchases.length === 0 && sales.length === 0) return;

  const oldSnaps = stored.orderStates ?? [];
  const { changes, newSnaps } = diffStates(oldSnaps, purchases, sales);

  const isFirstPoll = oldSnaps.length === 0;
  if (!isFirstPoll) {
    for (const change of changes) {
      notifyStateChange(change);
    }
  }

  const newUnread = (stored.unreadCount ?? 0) + (isFirstPoll ? 0 : changes.length);
  updateBadge(newUnread);

  await chrome.storage.local.set({
    orderStates: newSnaps,
    lastPollTime: Date.now(),
    unreadCount: newUnread,
  });
}

// ── Alarm lifecycle ──

export function startPolling(intervalMinutes = DEFAULT_POLL_MINUTES): void {
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: 0.1,
    periodInMinutes: intervalMinutes,
  });
}

export function stopPolling(): void {
  chrome.alarms.clear(ALARM_NAME);
}

export function isOrderAlarm(alarmName: string): boolean {
  return alarmName === ALARM_NAME;
}

export function clearUnreadCount(): void {
  chrome.storage.local.set({ unreadCount: 0 });
  updateBadge(0);
}
