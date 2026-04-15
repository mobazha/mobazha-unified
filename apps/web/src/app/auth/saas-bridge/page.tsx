'use client';

import { useEffect } from 'react';
import {
  STANDALONE_OAUTH_BROADCAST_CHANNEL,
  persistSaaSTokenFromOAuthFallback,
  useI18n,
} from '@mobazha/core';

/**
 * SaaS OAuth 在无 window.opener（Tor / 新标签页）时的落地页：
 * Hosting 回调将 token 或 error 写入 URL hash，本页通过 BroadcastChannel 通知发起登录的标签页。
 */
export default function SaasOAuthBridgePage() {
  const { t } = useI18n();

  useEffect(() => {
    const oauthMode = new URLSearchParams(window.location.search).get('oauthMode') || 'bridge';
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
    const hp = new URLSearchParams(hash);
    const token = hp.get('token');
    const error = hp.get('error');

    if (!token && !error) {
      window.location.replace('/');
      return;
    }

    if (typeof globalThis.BroadcastChannel !== 'undefined') {
      const bc = new globalThis.BroadcastChannel(STANDALONE_OAUTH_BROADCAST_CHANNEL);
      if (token) {
        if (oauthMode === 'bridge') {
          persistSaaSTokenFromOAuthFallback(token);
          bc.postMessage({ type: 'saas-bridge-token', token });
        } else {
          bc.postMessage({ type: 'buyer-token', token });
        }
      } else if (error) {
        let msg = error;
        try {
          msg = decodeURIComponent(error.replace(/\+/g, ' '));
        } catch {
          // keep raw
        }
        if (oauthMode === 'bridge') {
          bc.postMessage({ type: 'saas-bridge-error', error: msg });
        } else {
          bc.postMessage({ type: 'buyer-error', error: msg });
        }
      }
      bc.close();
    }

    try {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    } catch {
      // ignore
    }

    const dest = oauthMode === 'bridge' ? '/admin/settings/sales-channels' : '/';
    window.location.replace(dest);
  }, []);

  return (
    <div
      className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground"
      role="status"
    >
      {t('auth.oauthBridgeFinishing', { defaultValue: 'Finishing sign-in…' })}
    </div>
  );
}
