/**
 * Ext-0: Minimal Service Worker
 *
 * Service Worker runs in a separate context (no DOM).
 * Responsibilities: extension lifecycle events, future OAuth token exchange.
 */

chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Lifecycle event — no action needed for Ext-0
  }
});

chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: false }).catch(() => {
  // Side Panel API not available — fallback to popup-only mode
});
