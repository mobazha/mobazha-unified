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

// Events emitted by the Telegram WebApp SDK that we subscribe to.
// Full list: https://core.telegram.org/bots/webapps#events-available-for-mini-apps
type TGWebAppEvent =
  | 'viewportChanged'
  | 'themeChanged'
  | 'mainButtonClicked'
  | 'backButtonClicked'
  | 'popupClosed'
  | 'settingsButtonClicked'
  | 'invoiceClosed'
  | 'writeAccessRequested'
  | 'contactRequested'
  | 'biometricManagerUpdated'
  | 'biometricAuthRequested'
  | 'biometricTokenUpdated';

interface TGWebApp {
  initData: string;
  initDataUnsafe: TGInitDataUnsafe;
  version: string;
  themeParams: TGThemeParams;
  // Viewport (A1): present since Bot API 6.1; guard with optional chaining.
  viewportHeight?: number;
  viewportStableHeight?: number;
  isExpanded?: boolean;
  // Closing confirmation (A5): present since Bot API 6.2.
  isClosingConfirmationEnabled?: boolean;
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
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
  onEvent?: (event: TGWebAppEvent, handler: (...args: unknown[]) => void) => void;
  offEvent?: (event: TGWebAppEvent, handler: (...args: unknown[]) => void) => void;
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
  // A5: expose closing-confirmation primitives so hooks (useCloseGuard) can
  // call them from arbitrary screens without reading window.Telegram.WebApp.
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
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
  enableClosingConfirmation: noop,
  disableClosingConfirmation: noop,
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface TGMiniAppProviderProps {
  children: React.ReactNode;
}

function initWebApp(): TGWebApp | null {
  if (typeof window === 'undefined') return null;
  const wa = (window as unknown as { Telegram?: { WebApp?: TGWebApp } }).Telegram?.WebApp ?? null;
  if (!wa) return null;
  // Only signal readiness here; expand / headerColor / viewport listeners
  // are intentionally set up in mount effects (see MVP-3 A1/A2/A3) so that
  // HMR and provider-remount cases re-apply them deterministically.
  wa.ready?.();
  return wa;
}

export function TGMiniAppProvider({ children }: TGMiniAppProviderProps) {
  const [webApp, setWebApp] = useState<TGWebApp | null>(initWebApp);

  // Re-check after mount: if the SDK loaded between the initial useState call
  // and this effect (possible in some WebViews where document.write timing varies),
  // pick it up now rather than staying stuck with null forever.
  useEffect(() => {
    if (webApp) return;
    const wa = initWebApp();
    if (wa) setWebApp(wa); // eslint-disable-line react-hooks/set-state-in-effect -- syncing with external Telegram SDK on window
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  // A5: closing confirmation primitives. Guarded with optional chaining because
  // Bot API < 6.2 / non-Telegram environments won't expose these APIs.
  const enableClosingConfirmation = useCallback(
    () => webApp?.enableClosingConfirmation?.(),
    [webApp]
  );
  const disableClosingConfirmation = useCallback(
    () => webApp?.disableClosingConfirmation?.(),
    [webApp]
  );

  // A2 + A3 — One-shot native-feel bootstrap after the SDK object is available.
  //   * expand()           → start full-screen (no half-screen drag).
  //   * setHeaderColor     → Telegram header matches Mini App surface (no seam).
  //   * setBackgroundColor → background color below the content area.
  // Theme preset values ('secondary_bg_color' / 'bg_color') are preferred over
  // hex for broadest client compatibility (Bot API ≥ 6.1 accepts presets;
  // #rrggbb requires ≥ 6.9).
  useEffect(() => {
    if (!webApp) return;
    webApp.expand?.();
    webApp.setHeaderColor?.('secondary_bg_color');
    webApp.setBackgroundColor?.('bg_color');
  }, [webApp]);

  // A1 — Publish Telegram viewport metrics to CSS custom properties so that
  // bottom-docked CTAs (Checkout / Cart / ProductDetail) can size against
  // `--tg-viewport-stable-h` instead of the unreliable `100vh`.
  //
  // * `--tg-viewport-h`         = current viewport (may animate with keyboard)
  // * `--tg-viewport-stable-h`  = expanded, post-animation height (no keyboard)
  //
  // Non-Telegram environments never write these variables, so `100vh` fallback
  // in consumer CSS (`var(--tg-viewport-stable-h, 100vh)`) remains intact.
  useEffect(() => {
    if (!webApp) return;
    const root = document.documentElement;
    const updateViewport = () => {
      const { viewportHeight, viewportStableHeight } = webApp;
      if (typeof viewportHeight === 'number' && viewportHeight > 0) {
        root.style.setProperty('--tg-viewport-h', `${viewportHeight}px`);
      }
      if (typeof viewportStableHeight === 'number' && viewportStableHeight > 0) {
        root.style.setProperty('--tg-viewport-stable-h', `${viewportStableHeight}px`);
      }
    };
    updateViewport();
    webApp.onEvent?.('viewportChanged', updateViewport);
    return () => {
      webApp.offEvent?.('viewportChanged', updateViewport);
    };
  }, [webApp]);

  // MVP-3 M2 — Unified embedded-attribute + theme-color sync.
  //
  // IMPORTANT: these two concerns MUST be in a single effect with correct
  // ordering. Setting `data-embedded="telegram"` activates CSS rules in
  // globals.css; if TG theme colors aren't populated yet, CSS variable
  // self-references (`var(--tg-*, var(--theme-*))`) become cyclic on
  // <html> (no parent to inherit from) and resolve to the CSS
  // guaranteed-invalid value → text/bg colors fall back to browser defaults
  // → dark text on dark background. Merging the effects ensures --theme-*
  // overrides are written BEFORE the attribute activates any CSS selector.
  //
  // The provider directly writes `--theme-*` properties (the same tokens
  // every component consumes) via inline style on <html>. Inline-style
  // custom properties win over any stylesheet rule, so the TG palette
  // overrides both [data-theme] and [data-theme].dark without needing
  // specificity tricks or self-referencing fallbacks in CSS.

  // Properties we override — used for both application and cleanup.
  const themeOverrideProps = useMemo(
    () => [
      '--theme-background',
      '--theme-backgroundAlt',
      '--theme-surface',
      '--theme-surfaceHover',
      '--theme-textPrimary',
      '--theme-textSecondary',
      '--theme-textMuted',
      '--theme-border',
      '--theme-primary',
      '--theme-accent',
      '--color-muted',
    ],
    []
  );

  useEffect(() => {
    if (!webApp) return;
    const root = document.documentElement;

    const applyTGTheme = () => {
      const tp = webApp.themeParams;
      if (!tp) return;

      // Map TG SDK params → --theme-* tokens. For params that older TG
      // clients don't provide (Bot API < 6.9 / < 6.10), derive reasonable
      // values from the params that ARE always present (bg, text, hint,
      // link, button — available since Bot API 6.1).
      //
      // --color-muted: computed as a blend between bg_color and
      // secondary_bg_color so skeleton loaders inside cards (bg-card =
      // secondary_bg_color) remain visible. Without this, bg-muted and
      // bg-card resolve to the same value and skeletons become invisible.
      const blendHex = (a: string, b: string, ratio = 0.5): string => {
        const parse = (c: string) => {
          const h = c.replace('#', '');
          return [
            parseInt(h.slice(0, 2), 16),
            parseInt(h.slice(2, 4), 16),
            parseInt(h.slice(4, 6), 16),
          ];
        };
        const [r1, g1, b1] = parse(a);
        const [r2, g2, b2] = parse(b);
        const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
        return `#${hex(r1 + (r2 - r1) * ratio)}${hex(g1 + (g2 - g1) * ratio)}${hex(b1 + (b2 - b1) * ratio)}`;
      };

      const bg = tp.bg_color || '#17212b';
      const secBg = tp.secondary_bg_color || bg;
      const mutedColor = bg !== secBg ? blendHex(bg, secBg, 0.4) : undefined;

      const overrides: Record<string, string | undefined> = {
        '--theme-background': tp.bg_color,
        '--theme-backgroundAlt': secBg,
        '--theme-surface': secBg,
        '--theme-surfaceHover': tp.section_bg_color || secBg,
        '--theme-textPrimary': tp.text_color,
        '--theme-textSecondary': tp.subtitle_text_color || tp.hint_color,
        '--theme-textMuted': tp.hint_color,
        '--theme-border': tp.section_bg_color || secBg,
        '--theme-primary': tp.button_color,
        '--theme-accent': tp.accent_text_color || tp.link_color,
        '--color-muted': mutedColor,
      };

      for (const [prop, val] of Object.entries(overrides)) {
        if (val) {
          root.style.setProperty(prop, val);
        }
      }
    };

    // 1. Apply TG palette as inline-style overrides
    applyTGTheme();

    // 2. NOW safe to set data-embedded — CSS selectors using this attribute
    //    for non-color concerns (layout, component visibility) can activate.
    const prev = root.dataset.embedded;
    root.dataset.embedded = 'telegram';

    // 3. Listen for live theme switches (user toggles Telegram dark/light)
    webApp.onEvent?.('themeChanged', applyTGTheme);

    return () => {
      webApp.offEvent?.('themeChanged', applyTGTheme);

      // Clean up inline --theme-* overrides so the base Mobazha theme
      // re-emerges when this provider unmounts (HMR, tests, channel switch).
      for (const prop of themeOverrideProps) {
        root.style.removeProperty(prop);
      }

      if (root.dataset.embedded !== 'telegram') return;
      if (prev === undefined) {
        delete root.dataset.embedded;
      } else {
        root.dataset.embedded = prev;
      }
    };
  }, [webApp, themeOverrideProps]);

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
      enableClosingConfirmation,
      disableClosingConfirmation,
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
    enableClosingConfirmation,
    disableClosingConfirmation,
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
