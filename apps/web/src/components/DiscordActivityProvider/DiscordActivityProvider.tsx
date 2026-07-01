'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { DiscordSDK, patchUrlMappings } from '@discord/embedded-app-sdk';
import { getEnvConfig } from '@mobazha/core/config/env';
import { HOSTING_API } from '@mobazha/core/config/apiPaths';
import { getHostingUrl } from '@mobazha/core/services/api/config';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  globalName: string | null;
}

interface DiscordActivityContextValue {
  isAvailable: boolean;
  isReady: boolean;
  theme: 'light' | 'dark' | null;
  user: DiscordUser | null;
  accessToken: string | null;
  channelId: string | null;
  guildId: string | null;
  openExternalLink: (url: string) => void;
}

const DiscordActivityContext = createContext<DiscordActivityContextValue>({
  isAvailable: false,
  isReady: false,
  theme: null,
  user: null,
  accessToken: null,
  channelId: null,
  guildId: null,
  openExternalLink: () => {},
});

function isDiscordIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has('frame_id') && params.has('instance_id') && params.has('platform');
  } catch {
    return false;
  }
}

const WALLETCONNECT_MAPPINGS = [
  { prefix: '/walletconnect-rpc', target: 'rpc.walletconnect.org' },
  { prefix: '/walletconnect-rpc-com', target: 'rpc.walletconnect.com' },
  { prefix: '/wc-ws', target: 'relay.walletconnect.org' },
  { prefix: '/wc-ws-com', target: 'relay.walletconnect.com' },
  { prefix: '/walletconnect-pulse', target: 'pulse.walletconnect.org' },
  { prefix: '/walletconnect-pulse-com', target: 'pulse.walletconnect.com' },
  { prefix: '/walletconnect-web3modal', target: 'api.web3modal.org' },
  { prefix: '/walletconnect-web3modal-com', target: 'api.web3modal.com' },
  { prefix: '/walletconnect-verify', target: 'verify.walletconnect.org' },
  { prefix: '/walletconnect-verify-com', target: 'verify.walletconnect.com' },
  { prefix: '/walletconnect-keys', target: 'keys.walletconnect.org' },
  { prefix: '/walletconnect-keys-com', target: 'keys.walletconnect.com' },
  { prefix: '/walletconnect-secure', target: 'secure.walletconnect.org' },
  { prefix: '/walletconnect-secure-com', target: 'secure.walletconnect.com' },
  { prefix: '/github-raw', target: 'raw.githubusercontent.com' },
];

function applyUrlMappings(): void {
  try {
    patchUrlMappings(WALLETCONNECT_MAPPINGS, {
      patchFetch: true,
      patchWebSocket: true,
      patchXhr: true,
      patchSrcAttributes: true,
    });
  } catch {
    // Graceful degradation — WalletConnect may not work in Discord
  }
}

interface DiscordActivityProviderProps {
  children: React.ReactNode;
}

export function DiscordActivityProvider({ children }: DiscordActivityProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [sdkRef, setSdkRef] = useState<DiscordSDK | null>(null);
  const [ready, setReady] = useState(false);

  const isAvailable = useMemo(() => isDiscordIframe(), []);

  useEffect(() => {
    if (!isAvailable) return;

    // Apply URL mappings early for WalletConnect CSP compliance
    applyUrlMappings();

    const env = getEnvConfig();
    const clientId = env.discord?.clientId;
    if (!clientId) {
      console.warn('[Discord] NEXT_PUBLIC_DISCORD_CLIENT_ID not configured');
      setReady(true);
      return;
    }

    let cancelled = false;

    async function init() {
      const sdk = new DiscordSDK(clientId!);
      await sdk.ready();
      if (cancelled) return;

      setSdkRef(sdk);
      setChannelId(sdk.channelId ?? null);
      setGuildId(sdk.guildId ?? null);

      // Sync theme from URL param or system preference
      const params = new URLSearchParams(window.location.search);
      const platformTheme = params.get('theme');
      const resolvedTheme =
        platformTheme === 'dark' || platformTheme === 'light'
          ? platformTheme
          : window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
      setTheme(resolvedTheme);
      document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');

      // OAuth2 flow: authorize → backend token exchange → authenticate
      try {
        const { code } = await sdk.commands.authorize({
          client_id: clientId!,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds'],
        });

        if (!code) throw new Error('No authorization code returned');

        const hostingUrl = getHostingUrl();
        const tokenRes = await fetch(
          `${hostingUrl}${HOSTING_API.AUTH_DISCORD_OAUTH2_TOKEN}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          }
        );

        if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);

        const tokenData = await tokenRes.json();
        const token: string = tokenData.data?.access_token ?? tokenData.access_token;
        if (!token) throw new Error('No access_token in response');

        if (cancelled) return;

        const auth = await sdk.commands.authenticate({ access_token: token });
        if (!auth?.user) throw new Error('authenticate returned no user');

        if (cancelled) return;

        setAccessToken(token);
        setUser({
          id: auth.user.id,
          username: auth.user.username,
          discriminator: auth.user.discriminator ?? '0',
          avatar: auth.user.avatar ?? null,
          globalName: (auth.user as { global_name?: string }).global_name ?? null,
        });

        // Persist for AuthProvider to pick up
        sessionStorage.setItem('discord_access_token', token);
      } catch (err) {
        console.error('[Discord] OAuth flow failed:', err);
      }

      if (!cancelled) setReady(true);
    }

    init().catch((err) => {
      console.error('[Discord] SDK init failed:', err);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [isAvailable]);

  const openExternalLink = useCallback(
    (url: string) => {
      if (sdkRef) {
        sdkRef.commands.openExternalLink({ url }).catch(() => {
          window.open(url, '_blank', 'noopener,noreferrer');
        });
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    [sdkRef]
  );

  const value = useMemo<DiscordActivityContextValue>(
    () => ({
      isAvailable,
      isReady: isAvailable ? ready : false,
      theme,
      user,
      accessToken,
      channelId,
      guildId,
      openExternalLink,
    }),
    [isAvailable, ready, theme, user, accessToken, channelId, guildId, openExternalLink]
  );

  return (
    <DiscordActivityContext.Provider value={value}>{children}</DiscordActivityContext.Provider>
  );
}

/**
 * Access Discord Activity APIs. Returns a no-op context when
 * the app is running outside of Discord.
 */
export function useDiscordActivity() {
  return useContext(DiscordActivityContext);
}
