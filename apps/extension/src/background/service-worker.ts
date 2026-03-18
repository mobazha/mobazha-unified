/**
 * Ext-0: Service Worker
 *
 * Runs in a separate context (no DOM).
 * Responsibilities: extension lifecycle, badge count.
 *
 * Side Panel is opened directly from popup via chrome.sidePanel.open()
 * (requires user gesture context — cannot be forwarded through sendMessage).
 */

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install') {
    chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
  }
});

chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch(() => {
  // Side Panel API not available — popup-only mode
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action === 'setBadge') {
    const count = Number(message.count) || 0;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    sendResponse({ ok: true });
  }
  return false;
});
