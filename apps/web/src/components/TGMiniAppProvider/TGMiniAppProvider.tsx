'use client';

import React, { createContext, useContext, useMemo, useCallback, useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Telegram WebApp SDK types (subset used by the provider)
// Full spec: https://core.telegram.org/bots/webapps#initializing-mini-apps
// ---------------------------------------------------------------------------

interface TGMainButton {
  text: string;
  color: string;
  textColor: string;
  isVisible: boolean;
  isActive: boolean;
  isProgressVisible: boolean;
  setText: (text: string) => void;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
  setParams: (params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }) => void;
}

interface TGBackButton {
  isVisible: boolean;
  onClick: (callback: () => void) => void;
  offClick: (callback: () => void) => void;
  show: () => void;
  hide: () => void;
}

interface TGHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

interface TGThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface TGWebApp {
  initData: string;
  themeParams: TGThemeParams;
  MainButton: TGMainButton;
  BackButton: TGBackButton;
  HapticFeedback: TGHapticFeedback;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface TGMiniAppContextValue {
  isAvailable: boolean;
  themeParams: TGThemeParams | null;
  mainButton: TGMainButton | null;
  backButton: TGBackButton | null;
  haptic: TGHapticFeedback | null;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

const TGMiniAppContext = createContext<TGMiniAppContextValue>({
  isAvailable: false,
  themeParams: null,
  mainButton: null,
  backButton: null,
  haptic: null,
  expand: () => {},
  close: () => {},
  setHeaderColor: () => {},
  setBackgroundColor: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TGMiniAppProviderProps {
  children: React.ReactNode;
}

function initWebApp(): TGWebApp | null {
  if (typeof window === 'undefined') return null;
  const wa = (window as unknown as { Telegram?: { WebApp?: TGWebApp } }).Telegram?.WebApp;
  if (!wa?.initData) return null;
  wa.ready?.();
  wa.expand?.();
  return wa;
}

export function TGMiniAppProvider({ children }: TGMiniAppProviderProps) {
  const [webApp] = useState<TGWebApp | null>(initWebApp);

  const expand = useCallback(() => webApp?.expand?.(), [webApp]);
  const close = useCallback(() => webApp?.close?.(), [webApp]);
  const setHeaderColor = useCallback((color: string) => webApp?.setHeaderColor?.(color), [webApp]);
  const setBackgroundColor = useCallback(
    (color: string) => webApp?.setBackgroundColor?.(color),
    [webApp]
  );

  // Sync TG theme colors → CSS custom properties
  useEffect(() => {
    const tp = webApp?.themeParams;
    if (!tp) return;
    const root = document.documentElement;
    const map: Record<string, string | undefined> = {
      '--tg-bg': tp.bg_color,
      '--tg-text': tp.text_color,
      '--tg-hint': tp.hint_color,
      '--tg-link': tp.link_color,
      '--tg-button': tp.button_color,
      '--tg-button-text': tp.button_text_color,
      '--tg-secondary-bg': tp.secondary_bg_color,
      '--tg-header-bg': tp.header_bg_color,
      '--tg-accent-text': tp.accent_text_color,
      '--tg-section-bg': tp.section_bg_color,
      '--tg-section-header': tp.section_header_text_color,
      '--tg-subtitle': tp.subtitle_text_color,
      '--tg-destructive': tp.destructive_text_color,
    };
    Object.entries(map).forEach(([prop, val]) => {
      if (val) root.style.setProperty(prop, val);
    });
  }, [webApp]);

  const value = useMemo<TGMiniAppContextValue>(() => {
    const isAvailable = !!webApp?.initData;

    return {
      isAvailable,
      themeParams: webApp?.themeParams ?? null,
      mainButton: webApp?.MainButton ?? null,
      backButton: webApp?.BackButton ?? null,
      haptic: webApp?.HapticFeedback ?? null,
      expand,
      close,
      setHeaderColor,
      setBackgroundColor,
    };
  }, [webApp, expand, close, setHeaderColor, setBackgroundColor]);

  return <TGMiniAppContext.Provider value={value}>{children}</TGMiniAppContext.Provider>;
}

/**
 * Access Telegram Mini App APIs. Returns a no-op context when
 * the app is running outside of the TG Mini App environment.
 */
export function useTGMiniApp() {
  return useContext(TGMiniAppContext);
}
