'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Discord Embedded App SDK types (subset)
// Full spec: https://discord.com/developers/docs/activities/overview
// ---------------------------------------------------------------------------

interface DiscordTheme {
  theme: 'light' | 'dark';
}

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
  channelId: string | null;
  guildId: string | null;
  openExternalLink: (url: string) => void;
}

const DiscordActivityContext = createContext<DiscordActivityContextValue>({
  isAvailable: false,
  isReady: false,
  theme: null,
  user: null,
  channelId: null,
  guildId: null,
  openExternalLink: () => {},
});

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function isDiscordIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has('frame_id') && params.has('instance_id') && params.has('platform');
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface DiscordActivityProviderProps {
  children: React.ReactNode;
}

export function DiscordActivityProvider({ children }: DiscordActivityProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [channelId] = useState<string | null>(null);
  const [guildId] = useState<string | null>(null);

  const isAvailable = useMemo(() => isDiscordIframe(), []);

  // Scaffold: isReady mirrors isAvailable directly.
  // When the real SDK is integrated, isReady will be set via setState after `await discordSdk.ready()`.
  const isReady = isAvailable;

  useEffect(() => {
    if (!isAvailable) return;

    // Discord theme sync → CSS variables + dark mode class
    const syncTheme = (t: DiscordTheme) => {
      setTheme(t.theme);
      const root = document.documentElement;
      if (t.theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // TODO: Initialize @discord/embedded-app-sdk when available
    // const discordSdk = new DiscordSDK(clientId);
    // await discordSdk.ready();
    // discordSdk.subscribe('ACTIVITY_LAYOUT_MODE_UPDATE', ...);
    // const auth = await discordSdk.commands.authorize({...});
    // setUser(auth.user);
    // setChannelId(discordSdk.channelId);
    // setGuildId(discordSdk.guildId);
    // setIsReady(true);
    // discordSdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', ...);

    // Placeholder: detect initial theme from URL params
    const params = new URLSearchParams(window.location.search);
    const platformTheme = params.get('theme');
    if (platformTheme === 'dark' || platformTheme === 'light') {
      syncTheme({ theme: platformTheme });
    } else {
      syncTheme({
        theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      });
    }

    void setUser;
  }, [isAvailable]);

  const openExternalLink = useCallback(
    (url: string) => {
      // TODO: Use discordSdk.commands.openExternalLink(url) when SDK available
      if (isAvailable) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    },
    [isAvailable]
  );

  const value = useMemo<DiscordActivityContextValue>(
    () => ({
      isAvailable,
      isReady,
      theme,
      user,
      channelId,
      guildId,
      openExternalLink,
    }),
    [isAvailable, isReady, theme, user, channelId, guildId, openExternalLink]
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
