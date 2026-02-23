/* eslint-disable no-undef */
/**
 * Standalone store authentication service
 *
 * Buyers on standalone stores authenticate via a popup window that opens
 * the SaaS platform's Casdoor OAuth flow. After authentication, the SaaS
 * callback page posts the JWT back to the standalone store via postMessage.
 *
 * Security model:
 * - postMessage targetOrigin is the standalone store's origin (validated server-side)
 * - event.origin is validated against the configured SaaS URL
 * - Popup detection prevents the flow from being hijacked via direct navigation
 */

import type { IAuthService, AuthResult } from './authService';
import type { AuthMode } from '../../config/env';
import { getEnvConfig } from '../../config/env';

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 650;
const POPUP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface PendingAuth {
  resolve: (result: AuthResult) => void;
  cleanup: () => void;
}

function getSaasUrl(): string {
  const env = getEnvConfig();
  const saasUrl = env.auth.standalone?.saasUrl;
  if (!saasUrl) {
    throw new Error('NEXT_PUBLIC_SAAS_URL is required for standalone auth mode');
  }
  return saasUrl;
}

function getSaasOrigin(saasUrl: string): string {
  try {
    const url = new URL(saasUrl);
    return url.origin;
  } catch {
    return saasUrl;
  }
}

class StandaloneAuthService implements IAuthService {
  private pending: PendingAuth | null = null;

  getAuthMode(): AuthMode {
    return 'standalone';
  }

  needsLoginForm(): boolean {
    return false;
  }

  startLogin(): void {
    // Standalone login is initiated via the async login() method
  }

  /**
   * Opens a popup to the SaaS auth endpoint and waits for the JWT
   * to arrive via postMessage.
   */
  async login(): Promise<AuthResult> {
    if (typeof window === 'undefined') {
      return { success: false, error: 'login() requires a browser environment' };
    }

    // Cancel any pending auth
    this.pending?.cleanup();

    const saasUrl = getSaasUrl();
    const saasOrigin = getSaasOrigin(saasUrl);
    const storeOrigin = window.location.origin;

    const loginUrl = `${saasUrl}/auth/standalone-login?store_origin=${encodeURIComponent(storeOrigin)}`;

    const left = Math.max(0, (window.screen.width - POPUP_WIDTH) / 2);
    const top = Math.max(0, (window.screen.height - POPUP_HEIGHT) / 2);
    const features = `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no`;

    const popup = window.open(loginUrl, 'mobazha-auth', features);
    if (!popup) {
      return { success: false, error: 'Popup was blocked. Please allow popups for this site.' };
    }

    return new Promise<AuthResult>(resolve => {
      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(timeoutId);
        clearInterval(pollId);
        this.pending = null;
        try {
          if (popup && !popup.closed) popup.close();
        } catch {
          // cross-origin close may fail silently
        }
      };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== saasOrigin) return;
        const data = event.data;
        if (!data) return;

        if (data.type === 'mobazha-auth') {
          cleanup();
          resolve({ success: true, token: data.token as string });
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

      const pollId = setInterval(() => {
        try {
          if (popup.closed) {
            cleanup();
            resolve({ success: false, error: 'Login window was closed' });
          }
        } catch {
          // cross-origin access may throw
        }
      }, 500);

      this.pending = { resolve, cleanup };
    });
  }

  hasOAuthCallback(): boolean {
    return false;
  }

  getOAuthParams(): { code: string | null; state: string | null } {
    return { code: null, state: null };
  }

  clearOAuthParams(): void {
    // No URL params to clean in standalone mode
  }

  getLoginRedirectPath(): string {
    if (typeof sessionStorage === 'undefined') return '/';
    const path = sessionStorage.getItem('login_redirect');
    sessionStorage.removeItem('login_redirect');
    return path || '/';
  }
}

export const standaloneAuthService: IAuthService = new StandaloneAuthService();
