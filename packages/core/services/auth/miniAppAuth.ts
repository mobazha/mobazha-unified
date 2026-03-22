/**
 * Mini App Authentication Service
 *
 * Handles Telegram Mini App and Discord Activity authentication flows:
 * - Check if platform user has an existing account
 * - Silent sign-in for returning users
 * - One-click registration for new users
 * - Account binding (link platform identity to existing Casdoor account)
 * - initData expiry pre-check
 * - start_param detection for binding deep link returns
 */

import { HOSTING_API } from '../../config/apiPaths';
import { request, ApiError } from '../api/client';
import { getHostingUrl } from '../api/config';

export type MiniAppPlatform = 'telegram' | 'discord';

export interface MiniAppSigninResult {
  token: string;
}

export interface MiniAppCheckResult {
  exists: boolean;
}

export interface MiniAppBindStartResult {
  oauthUrl: string;
  sessionId: string;
}

const INITDATA_MAX_AGE_MS = 23 * 60 * 60 * 1000; // 23 hours (1h safety margin from 24h server limit)

/**
 * Check if initData is close to expiry.
 * Telegram initData has a 24-hour server-side validation window.
 * Returns true if the data is still fresh enough for API calls.
 */
export function isInitDataFresh(authDateUnix: number | undefined): boolean {
  if (!authDateUnix) return false;
  const elapsed = Date.now() - authDateUnix * 1000;
  return elapsed < INITDATA_MAX_AGE_MS;
}

/**
 * Parse start_param from TG initDataUnsafe for binding flow detection.
 * Returns the sessionId if it's a binding return, otherwise null.
 *
 * Deep link format: t.me/bot/app?startapp=bind_SESSIONID
 * initDataUnsafe.start_param = "bind_SESSIONID"
 */
export function parseBindSessionFromStartParam(startParam: string | undefined): string | null {
  if (!startParam) return null;
  if (startParam.startsWith('bind_')) {
    return startParam.slice(5);
  }
  return null;
}

function hostingUrl(path: string): string {
  return `${getHostingUrl()}${path}`;
}

/**
 * Check if a Telegram user has an existing account.
 * Returns { exists: true } if bound, { exists: false } if anonymous.
 *
 * Backend: POST /platform/v1/auth/telegram/check-mini-app-user
 * initData is sent as query string (backend reads r.URL.RawQuery).
 */
export async function checkTelegramUser(initData: string): Promise<MiniAppCheckResult> {
  const url = hostingUrl(`${HOSTING_API.AUTH_TELEGRAM_CHECK_MINI_APP_USER}?${initData}`);
  const result = await request<boolean>(url, {
    method: 'POST',
  });
  return { exists: !!result };
}

/**
 * Sign in or register a Telegram user via Mini App initData.
 * Always creates a Casdoor user if one doesn't exist.
 * SaaS node is provisioned implicitly by SaaSNodeResolver on first /v1/* request.
 *
 * Backend: POST /platform/v1/auth/telegram/mini-app-signin?{initData}
 */
export async function signinTelegram(initData: string): Promise<string> {
  const url = hostingUrl(`${HOSTING_API.AUTH_TELEGRAM_MINI_APP_SIGNIN}?${initData}`);
  return request<string>(url, {
    method: 'POST',
  });
}

/**
 * Alias for signinTelegram (kept for semantic clarity in registration flows).
 */
export async function registerTelegram(initData: string): Promise<string> {
  return signinTelegram(initData);
}

/**
 * Check if a Discord user has an existing account.
 *
 * Backend: POST /platform/v1/auth/discord/check-user
 */
export async function checkDiscordUser(accessToken: string): Promise<MiniAppCheckResult> {
  const url = hostingUrl(HOSTING_API.AUTH_DISCORD_CHECK_USER);
  const result = await request<boolean>(url, {
    method: 'POST',
    body: { access_token: accessToken },
  });
  return { exists: !!result };
}

/**
 * Silent sign-in for a returning Discord user.
 * Uses create=false in body to avoid creating a new account.
 *
 * Backend: POST /platform/v1/auth/discord/mini-app-signin
 */
export async function signinDiscord(accessToken: string, create: boolean = false): Promise<string> {
  const url = hostingUrl(HOSTING_API.AUTH_DISCORD_MINI_APP_SIGNIN);
  return request<string>(url, {
    method: 'POST',
    body: { access_token: accessToken, create },
  });
}

/**
 * Register a new Discord user (creates account + returns JWT).
 */
export async function registerDiscord(accessToken: string): Promise<string> {
  return signinDiscord(accessToken, true);
}

/**
 * Start the account binding flow for Telegram.
 * Returns an OAuth URL to open in an external browser and a sessionId for tracking.
 *
 * Backend: POST /platform/v1/auth/telegram/bind-start
 */
export async function startTelegramBind(initData: string): Promise<MiniAppBindStartResult> {
  const url = hostingUrl(`${HOSTING_API.AUTH_TELEGRAM_BIND_START}?${initData}`);
  return request<MiniAppBindStartResult>(url, {
    method: 'POST',
  });
}

/**
 * Complete the binding flow after returning from deep link.
 * Called when Mini App reopens with start_param = "bind_SESSIONID".
 *
 * Backend: POST /platform/v1/auth/telegram/bind-result
 * Expects initData as query string + JSON body with sessionId.
 */
export async function completeTelegramBind(initData: string, sessionId: string): Promise<string> {
  const url = hostingUrl(`${HOSTING_API.AUTH_TELEGRAM_BIND_RESULT}?${initData}`);
  return request<string>(url, {
    method: 'POST',
    body: { sessionId },
  });
}

/**
 * Attempt silent authentication for a Mini App user.
 * Flow: check-user → signin (if exists) → token.
 * Returns null if the user doesn't have an account (anonymous mode).
 */
export async function attemptSilentAuth(
  platform: MiniAppPlatform,
  platformCredential: string
): Promise<string | null> {
  try {
    const checkFn = platform === 'telegram' ? checkTelegramUser : checkDiscordUser;
    const { exists } = await checkFn(platformCredential);
    if (!exists) return null;

    const signinFn = platform === 'telegram' ? signinTelegram : signinDiscord;
    return await signinFn(platformCredential);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
