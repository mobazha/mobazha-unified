/**
 * Ext-2: Service Worker
 *
 * Responsibilities:
 *   - Extension lifecycle (install, badge init)
 *   - Order polling via chrome.alarms → desktop notifications
 *   - Notification click → open Side Panel to order detail
 *   - Badge count management (message from Popup/SidePanel)
 */

import {
  pollOrders,
  startPolling,
  stopPolling,
  isOrderAlarm,
  clearUnreadCount,
} from './order-tracker';

// ── Install ──

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
  }

  // Begin polling if user is already logged in (e.g. extension update)
  chrome.storage.local.get('authToken', ({ authToken }) => {
    if (authToken) startPolling();
  });
});

// ── Side Panel config ──

chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch(() => {
  // Side Panel API not available
});

// ── Alarms → poll orders ──

chrome.alarms.onAlarm.addListener(alarm => {
  if (isOrderAlarm(alarm.name)) {
    pollOrders();
  }
});

// ── Notification click → open Side Panel to order detail ──

chrome.notifications.onClicked.addListener(async notificationId => {
  chrome.notifications.clear(notificationId);

  const orderID = notificationId.replace('order-', '');
  if (!orderID) return;

  await chrome.storage.session.set({ pendingRoute: `/orders/${orderID}` });

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id != null) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch {
    chrome.tabs.create({ url: `https://test-new.mobazha.org/orders/${orderID}` });
  }
});

// ── Messages from Popup / Side Panel ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message?.action) return false;

  switch (message.action) {
    case 'setBadge': {
      const count = Number(message.count) || 0;
      chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
      sendResponse({ ok: true });
      break;
    }

    case 'startPolling':
      startPolling(message.intervalMinutes);
      sendResponse({ ok: true });
      break;

    case 'stopPolling':
      stopPolling();
      sendResponse({ ok: true });
      break;

    case 'clearUnread':
      clearUnreadCount();
      sendResponse({ ok: true });
      break;

    case 'pollNow':
      pollOrders().then(() => sendResponse({ ok: true }));
      return true; // async response
  }

  return false;
});

// ── Start polling on Service Worker wake (if logged in) ──

chrome.storage.local.get('authToken', ({ authToken }) => {
  if (authToken) startPolling();
});
