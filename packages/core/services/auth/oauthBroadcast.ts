/**
 * Standalone ↔ SaaS OAuth 在无 window.opener 场景下的回传通道（Tor / 新标签页）。
 * 回调页重定向到独立站 /auth/saas-bridge#token=… 后由落地页 BroadcastChannel 通知发起登录的标签页。
 */

export const STANDALONE_OAUTH_BROADCAST_CHANNEL = 'mbz-standalone-oauth';

/** 认为弹窗被用户关闭前需满足的最短等待（避免 Tor/COOP 误报 popup.closed） */
export const STANDALONE_OAUTH_POPUP_CLOSED_GRACE_MS = 2000;

export type StandaloneOauthBroadcastMessage =
  | { type: 'saas-bridge-token'; token: string }
  | { type: 'saas-bridge-error'; error: string }
  | { type: 'buyer-token'; token: string }
  | { type: 'buyer-error'; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

export function parseStandaloneOauthBroadcastMessage(
  data: unknown
): StandaloneOauthBroadcastMessage | null {
  if (!isRecord(data)) return null;
  const t = data.type;
  if (t === 'saas-bridge-token' && typeof data.token === 'string') {
    return { type: 'saas-bridge-token', token: data.token };
  }
  if (t === 'saas-bridge-error' && typeof data.error === 'string') {
    return { type: 'saas-bridge-error', error: data.error };
  }
  if (t === 'buyer-token' && typeof data.token === 'string') {
    return { type: 'buyer-token', token: data.token };
  }
  if (t === 'buyer-error' && typeof data.error === 'string') {
    return { type: 'buyer-error', error: data.error };
  }
  return null;
}
