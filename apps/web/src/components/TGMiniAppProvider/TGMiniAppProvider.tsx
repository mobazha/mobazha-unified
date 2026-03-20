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

interface TGPopupButton {
  id?: string;
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
  text?: string;
}

interface TGPopupParams {
  title?: string;
  message: string;
  buttons?: TGPopupButton[];
}

interface TGWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TGInitDataUnsafe {
  query_id?: string;
  user?: TGWebAppUser;
  auth_date?: number;
  hash?: string;
  start_param?: string;
}

interface TGWebApp {
  initData: string;
  initDataUnsafe: TGInitDataUnsafe;
  version: string;
  themeParams: TGThemeParams;
  MainButton: TGMainButton;
  BackButton: TGBackButton;
  HapticFeedback: TGHapticFeedback;
  ready: () => void;
  expand: () => void;
  close: () => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  showPopup: (params: TGPopupParams, callback?: (buttonId: string) => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface TGMiniAppContextValue {
  isAvailable: boolean;
  version: string | null;
  initData: string | null;
  initDataUnsafe: TGInitDataUnsafe | null;
  themeParams: TGThemeParams | null;
  mainButton: TGMainButton | null;
  backButton: TGBackButton | null;
  haptic: TGHapticFeedback | null;
  expand: () => void;
  close: () => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  showPopup: (params: TGPopupParams) => Promise<string>;
  showConfirm: (message: string) => Promise<boolean>;
  showAlert: (message: string) => Promise<void>;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
}

const noop = () => {};
const TGMiniAppContext = createContext<TGMiniAppContextValue>({
  isAvailable: false,
  version: null,
  initData: null,
  initDataUnsafe: null,
  themeParams: null,
  mainButton: null,
  backButton: null,
  haptic: null,
  expand: noop,
  close: noop,
  openLink: noop,
  showPopup: () => Promise.resolve(''),
  showConfirm: () => Promise.resolve(false),
  showAlert: () => Promise.resolve(),
  setHeaderColor: noop,
  setBackgroundColor: noop,
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
  if (!wa) return null;
  wa.ready?.();
  wa.expand?.();
  return wa;
}

export function TGMiniAppProvider({ children }: TGMiniAppProviderProps) {
  const [webApp] = useState<TGWebApp | null>(initWebApp);

  const expand = useCallback(() => webApp?.expand?.(), [webApp]);
  const close = useCallback(() => webApp?.close?.(), [webApp]);
  const openLink = useCallback(
    (url: string, options?: { try_instant_view?: boolean }) => webApp?.openLink?.(url, options),
    [webApp]
  );
  const showPopup = useCallback(
    (params: TGPopupParams): Promise<string> =>
      new Promise(resolve => {
        if (webApp?.showPopup) {
          webApp.showPopup(params, buttonId => resolve(buttonId));
        } else {
          resolve('');
        }
      }),
    [webApp]
  );
  const showConfirm = useCallback(
    (message: string): Promise<boolean> =>
      new Promise(resolve => {
        if (webApp?.showConfirm) {
          webApp.showConfirm(message, confirmed => resolve(confirmed));
        } else {
          resolve(false);
        }
      }),
    [webApp]
  );
  const showAlert = useCallback(
    (message: string): Promise<void> =>
      new Promise(resolve => {
        if (webApp?.showAlert) {
          webApp.showAlert(message, () => resolve());
        } else {
          resolve();
        }
      }),
    [webApp]
  );
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
    const isAvailable = !!webApp;

    return {
      isAvailable,
      version: webApp?.version ?? null,
      initData: webApp?.initData ?? null,
      initDataUnsafe: webApp?.initDataUnsafe ?? null,
      themeParams: webApp?.themeParams ?? null,
      mainButton: webApp?.MainButton ?? null,
      backButton: webApp?.BackButton ?? null,
      haptic: webApp?.HapticFeedback ?? null,
      expand,
      close,
      openLink,
      showPopup,
      showConfirm,
      showAlert,
      setHeaderColor,
      setBackgroundColor,
    };
  }, [
    webApp,
    expand,
    close,
    openLink,
    showPopup,
    showConfirm,
    showAlert,
    setHeaderColor,
    setBackgroundColor,
  ]);

  return <TGMiniAppContext.Provider value={value}>{children}</TGMiniAppContext.Provider>;
}

/**
 * Access Telegram Mini App APIs. Returns a no-op context when
 * the app is running outside of the TG Mini App environment.
 */
export function useTGMiniApp() {
  return useContext(TGMiniAppContext);
}

export type { TGPopupButton, TGPopupParams, TGInitDataUnsafe, TGMiniAppContextValue };
