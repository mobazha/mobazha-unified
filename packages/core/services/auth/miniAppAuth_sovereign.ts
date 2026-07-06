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

export interface TelegramMiniAppStoreContext {
  storePeerId?: string;
  storeHost?: string;
}

function unavailable(): never {
  throw new Error('Hosted mini-app identity is unavailable in a sovereign build');
}

export function appendTelegramMiniAppStoreParams(
  initData: string,
  context?: TelegramMiniAppStoreContext
): string {
  if (!context) return initData;
  const extra: string[] = [];
  if (context.storePeerId?.trim()) {
    extra.push(`store_peer_id=${encodeURIComponent(context.storePeerId.trim())}`);
  }
  if (context.storeHost?.trim()) {
    extra.push(`store_host=${encodeURIComponent(context.storeHost.trim())}`);
  }
  return [initData, ...extra].filter(Boolean).join('&');
}

export function buildTelegramMiniAppStoreContextFromWindow():
  | TelegramMiniAppStoreContext
  | undefined {
  return undefined;
}

export function isInitDataFresh(authDateUnix: number | undefined): boolean {
  return Boolean(authDateUnix && Date.now() - authDateUnix * 1000 < 23 * 60 * 60 * 1000);
}

export function parseBindSessionFromStartParam(startParam: string | undefined): string | null {
  return startParam?.startsWith('bind_') ? startParam.slice(5) : null;
}

export async function checkTelegramUser(): Promise<MiniAppCheckResult> {
  return { exists: false };
}

export async function signinTelegram(): Promise<string> {
  return unavailable();
}

export async function registerTelegram(): Promise<string> {
  return unavailable();
}

export async function checkDiscordUser(): Promise<MiniAppCheckResult> {
  return { exists: false };
}

export async function signinDiscord(): Promise<string> {
  return unavailable();
}

export async function registerDiscord(): Promise<string> {
  return unavailable();
}

export async function startTelegramBind(): Promise<MiniAppBindStartResult> {
  return unavailable();
}

export async function completeTelegramBind(): Promise<string> {
  return unavailable();
}

export async function attemptSilentAuth(): Promise<string | null> {
  return null;
}
