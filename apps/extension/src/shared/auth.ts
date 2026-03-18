/**
 * Chrome Extension OAuth via chrome.identity.launchWebAuthFlow.
 *
 * Flow:
 *   1. Build Casdoor authorize URL with extension redirect URI
 *   2. chrome.identity.launchWebAuthFlow (opens popup)
 *   3. Extract code + state from callback URL
 *   4. Exchange for JWT via hosting backend
 *   5. saveToken(jwt)
 */

import {
  getSigninUrl,
  getSignupUrl,
  handleOAuthCallback,
  getUserInfo,
} from '@mobazha/core/services/auth/casdoor';
import {
  saveToken,
  saveUser,
  clearAuth,
  getStoredToken,
  isAuthenticated,
} from '@mobazha/core/services/auth/token';
import type { StoredUser } from '@mobazha/core/services/auth/token';

export interface AuthResult {
  success: boolean;
  user?: StoredUser;
  error?: string;
}

function getExtensionRedirectUrl(): string {
  return chrome.identity.getRedirectURL();
}

function extractOAuthParams(callbackUrl: string): { code: string; state: string } | null {
  try {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    if (code && state) return { code, state };
    return null;
  } catch {
    return null;
  }
}

function launchWebAuthFlow(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, callbackUrl => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!callbackUrl) {
        reject(new Error('No callback URL returned'));
        return;
      }
      resolve(callbackUrl);
    });
  });
}

async function exchangeAndStore(code: string, state: string): Promise<AuthResult> {
  const result = await handleOAuthCallback(code, state);

  if (!result.success || !result.token) {
    return { success: false, error: result.error || 'Token exchange failed' };
  }

  saveToken(result.token);

  let user: StoredUser | undefined;
  try {
    const userInfo = await getUserInfo(result.token);
    if (userInfo) {
      user = {
        id: userInfo.id,
        name: userInfo.name,
        displayName: userInfo.displayName,
        avatar: userInfo.avatar,
      };
      saveUser(user);
    }
  } catch {
    // User info fetch is best-effort
  }

  return { success: true, user };
}

export async function extensionSignIn(): Promise<AuthResult> {
  try {
    const redirectUri = getExtensionRedirectUrl();
    const authUrl = getSigninUrl(redirectUri);

    const callbackUrl = await launchWebAuthFlow(authUrl);
    const params = extractOAuthParams(callbackUrl);

    if (!params) {
      return { success: false, error: 'Missing OAuth parameters in callback' };
    }

    return exchangeAndStore(params.code, params.state);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    if (message.includes('user interaction') || message.includes('canceled')) {
      return { success: false, error: 'Sign in was cancelled' };
    }
    return { success: false, error: message };
  }
}

export async function extensionSignUp(): Promise<AuthResult> {
  try {
    const redirectUri = getExtensionRedirectUrl();
    const authUrl = getSignupUrl(redirectUri);

    const callbackUrl = await launchWebAuthFlow(authUrl);
    const params = extractOAuthParams(callbackUrl);

    if (!params) {
      return { success: false, error: 'Missing OAuth parameters in callback' };
    }

    return exchangeAndStore(params.code, params.state);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    if (message.includes('user interaction') || message.includes('canceled')) {
      return { success: false, error: 'Sign up was cancelled' };
    }
    return { success: false, error: message };
  }
}

export function extensionSignOut(): void {
  clearAuth();
}

export { isAuthenticated, getStoredToken };
