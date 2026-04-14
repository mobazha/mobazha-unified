/**
 * SaaS Bridge — Casdoor JWT acquisition for standalone store admins.
 *
 * Standalone admins authenticate locally via Basic Auth, but account binding
 * requires a Casdoor JWT (since the APIs live on the SaaS platform).
 * This bridge opens a Casdoor popup to obtain a JWT, then caches it
 * for the session so subsequent binding operations don't need another popup.
 *
 * Reuses the same popup mechanism as standaloneAuth.ts (buyer login).
 */

import { getEnvConfig } from '../../config/env';

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 650;
const POPUP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SAAS_JWT_KEY = 'mbz_saas_bridge_jwt';

export interface SaaSBridgeResult {
  success: boolean;
  token?: string;
  error?: string;
}

function getSaasUrl(): string {
  const env = getEnvConfig();
  const saasUrl = env.auth.standalone?.saasUrl;
  if (!saasUrl) {
    throw new Error('NEXT_PUBLIC_SAAS_URL is required for SaaS bridge');
  }
  return saasUrl;
}

function getSaasOrigin(): string {
  try {
    return new URL(getSaasUrl()).origin;
  } catch {
    return getSaasUrl();
  }
}

/**
 * Get the SaaS platform base URL for API calls.
 * Returns the configured SAAS_URL (e.g., "https://app.mobazha.org").
 */
export function getSaaSBaseUrl(): string {
  return getSaasUrl();
}

/**
 * Get cached Casdoor JWT from sessionStorage.
 * Returns null if not cached or expired.
 */
export function getCachedSaaSToken(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(SAAS_JWT_KEY);
  } catch {
    return null;
  }
}

/**
 * Cache Casdoor JWT in sessionStorage.
 */
function cacheSaaSToken(token: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SAAS_JWT_KEY, token);
  } catch {
    // Storage quota exceeded or blocked
  }
}

/**
 * Clear cached Casdoor JWT.
 */
export function clearSaaSToken(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(SAAS_JWT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if we have a cached SaaS JWT.
 */
export function hasSaaSToken(): boolean {
  return !!getCachedSaaSToken();
}

/**
 * Acquire a Casdoor JWT by opening a popup to the SaaS platform.
 * If a cached token exists, returns it immediately without opening a popup.
 *
 * @param forceRefresh - If true, ignores cached token and opens popup
 */
export async function acquireSaaSToken(forceRefresh = false): Promise<SaaSBridgeResult> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'requires browser environment' };
  }

  if (!forceRefresh) {
    const cached = getCachedSaaSToken();
    if (cached) {
      return { success: true, token: cached };
    }
  }

  const saasUrl = getSaasUrl();
  const saasOrigin = getSaasOrigin();
  const storeOrigin = window.location.origin;

  const loginUrl = `${saasUrl}/auth/standalone-login?store_origin=${encodeURIComponent(storeOrigin)}&mode=bridge`;

  const left = Math.max(0, (window.screen.width - POPUP_WIDTH) / 2);
  const top = Math.max(0, (window.screen.height - POPUP_HEIGHT) / 2);
  const features = `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`;

  const popup = window.open(loginUrl, 'mobazha-saas-bridge', features);
  if (!popup) {
    return { success: false, error: 'Popup was blocked. Please allow popups for this site.' };
  }

  return new Promise<SaaSBridgeResult>(resolve => {
    let settled = false;

    const cleanup = () => {
      settled = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timeoutId);
      clearInterval(pollId);
      try {
        if (popup && !popup.closed) popup.close();
      } catch {
        // COOP may block cross-origin close
      }
    };

    const onMessage = (event: globalThis.MessageEvent) => {
      if (event.origin !== saasOrigin) return;
      const data = event.data;
      if (!data) return;

      if (data.type === 'mobazha-auth') {
        cleanup();
        const token = data.token as string;
        cacheSaaSToken(token);
        resolve({ success: true, token });
      } else if (data.type === 'mobazha-auth-error') {
        cleanup();
        resolve({ success: false, error: (data.error as string) || 'Authentication failed' });
      }
    };

    window.addEventListener('message', onMessage);

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve({ success: false, error: 'Authentication timed out' });
    }, POPUP_TIMEOUT_MS);

    // Poll popup.closed to detect user-dismissed popups.
    // Google OAuth sets COOP headers that block cross-origin access to
    // popup.closed, producing browser console warnings. The postMessage
    // path above is the primary token delivery mechanism; this poll is
    // only a fallback for detecting manual popup dismissal.
    const pollId = setInterval(() => {
      if (settled) return;
      try {
        if (popup.closed) {
          cleanup();
          resolve({ success: false, error: 'Login window was closed' });
        }
      } catch {
        // COOP blocks popup.closed — rely on postMessage instead
      }
    }, 500);
  });
}
