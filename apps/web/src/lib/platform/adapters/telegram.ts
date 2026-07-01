'use client';

import type {
  PlatformCapabilities,
  PrimaryCTACapability,
  BackActionCapability,
  ConfirmCapability,
  HapticCapability,
  ShareCapability,
  ShareResult,
  ScanQRCapability,
  ScanQRResult,
  ConfirmOptions,
  AlertOptions,
} from '../types';
import { BackActionStack } from '../backStack';

/**
 * MVP-1 — Telegram Mini App adapter.
 *
 * The adapter owns stable wrappers over the raw TG SDK so business code can
 * speak in terms of `setText(undefined)` / `pushHandler(fn)` instead of
 * juggling `show()` / `hide()` / `onClick` / `offClick`.
 *
 * Design notes:
 *
 * 1. **SDK injection**. The factory accepts a `TGWebApp | null`, never reads
 *    `window.Telegram.WebApp` itself. This keeps the adapter unit-testable
 *    with JSDOM + a hand-rolled SDK mock, and it lets the React provider
 *    pass the post-ready SDK reference directly.
 *
 * 2. **Single MainButton onClick**. TG's SDK supports multiple onClick
 *    listeners but the semantics are "all fire"; mixing old `useTGMainButton`
 *    handlers and new `usePrimaryCTA` ones would double-call. The adapter
 *    keeps exactly one subscription and swaps the stored `onClick` ref when
 *    `setOnClick` is called. Consumers are responsible for not routing two
 *    separate consumers to the same adapter simultaneously — same rule as
 *    the old hook.
 *
 * 3. **BackAction stack**. The shared `BackActionStack` drives
 *    BackButton.show/hide based on `hasHandler`, and the SDK click is routed
 *    into `stack.trigger()`. When the stack empties we hide the button and
 *    let TG's default close-mini-app behavior resume.
 *
 * 4. **Haptic**. TG's API distinguishes notification vs impact; we map
 *    `success/warning/error → notificationOccurred`, `selectionChange →
 *    selectionChanged`, `impact → impactOccurred`. `isSupported` reflects
 *    whether the SDK exposes HapticFeedback at all (Bot API 6.1+).
 *
 * 5. **Confirm / alert**. Use `showConfirm` / `showAlert` (Bot API 6.2);
 *    fall back to `window.confirm` / `window.alert` if the SDK object
 *    exists but these methods are missing (older clients).
 *
 * 6. **Share**. Route via `openTelegramLink('https://t.me/share/url?...')`
 *    so the user lands in TG's native forward-picker. Returns 'shared'
 *    unconditionally — TG gives no success callback, and treating every
 *    attempt as success matches existing `useShare` behavior.
 */

// SDK types — duplicated here rather than imported from TGMiniAppProvider to
// keep the adapter independent of the provider's internals. Kept in sync by
// convention; mismatch surfaces at the factory call site where the provider
// hands over the object.
export interface TGMainButtonLike {
  setText: (text: string) => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
  show: () => void;
  hide: () => void;
  enable: () => void;
  disable: () => void;
  showProgress: (leaveActive?: boolean) => void;
  hideProgress: () => void;
}

export interface TGBackButtonLike {
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
  show: () => void;
  hide: () => void;
}

export interface TGHapticLike {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  selectionChanged: () => void;
}

export interface TGWebAppLike {
  MainButton?: TGMainButtonLike;
  BackButton?: TGBackButtonLike;
  HapticFeedback?: TGHapticLike;
  showConfirm?: (message: string, cb?: (confirmed: boolean) => void) => void;
  showAlert?: (message: string, cb?: () => void) => void;
  openTelegramLink?: (url: string) => void;
  showScanQrPopup?: (params: { text?: string }, cb?: (text: string) => true | void) => void;
  closeScanQrPopup?: () => void;
  onEvent?: (event: string, cb: () => void) => void;
  offEvent?: (event: string, cb: () => void) => void;
}

class TGPrimaryCTA implements PrimaryCTACapability {
  readonly isNative = true;
  private currentText: string | undefined;
  private currentOnClick: (() => void) | undefined;
  private currentLoading = false;
  private currentDisabled = false;
  private readonly boundClick: () => void;
  private clickSubscribed = false;

  constructor(private readonly button: TGMainButtonLike) {
    this.boundClick = () => {
      this.currentOnClick?.();
    };
  }

  setText(text: string | undefined): void {
    this.currentText = text;
    if (text === undefined) {
      // Hide button + drop click subscription so we don't leak listeners.
      if (this.clickSubscribed) {
        this.button.offClick(this.boundClick);
        this.clickSubscribed = false;
      }
      this.button.hide();
      return;
    }
    this.button.setText(text);
    this.button.show();
    if (!this.clickSubscribed) {
      this.button.onClick(this.boundClick);
      this.clickSubscribed = true;
    }
    // Re-apply disabled / loading after show() — TG resets some state.
    this.applyDisabled();
    this.applyLoading();
  }

  setOnClick(fn: (() => void) | undefined): void {
    // We never add/remove TG listeners here — the adapter owns exactly one
    // subscription (see class doc). Just swap the ref.
    this.currentOnClick = fn;
  }

  setLoading(loading: boolean): void {
    if (this.currentLoading === loading) return;
    this.currentLoading = loading;
    this.applyLoading();
  }

  setDisabled(disabled: boolean): void {
    if (this.currentDisabled === disabled) return;
    this.currentDisabled = disabled;
    this.applyDisabled();
  }

  private applyLoading(): void {
    if (this.currentText === undefined) return;
    if (this.currentLoading) this.button.showProgress(true);
    else this.button.hideProgress();
  }

  private applyDisabled(): void {
    if (this.currentText === undefined) return;
    if (this.currentDisabled) this.button.disable();
    else this.button.enable();
  }

  /** Idempotent teardown — called when provider unmounts. */
  destroy(): void {
    if (this.clickSubscribed) {
      this.button.offClick(this.boundClick);
      this.clickSubscribed = false;
    }
    this.button.hide();
  }
}

class TGBackAction implements BackActionCapability {
  readonly isNative = true;
  private readonly stack = new BackActionStack();
  private readonly boundClick: () => void;
  private clickSubscribed = false;
  private readonly unsubscribeObserver: () => void;

  constructor(private readonly button: TGBackButtonLike) {
    this.boundClick = () => {
      // G1 invariant: trigger top handler. If stack is unexpectedly empty at
      // click time (race between pop and native event), do nothing — hiding
      // will catch up on next observer tick.
      this.stack.trigger();
    };
    this.unsubscribeObserver = this.stack.subscribe(hasHandler => {
      if (hasHandler) {
        this.button.show();
        if (!this.clickSubscribed) {
          this.button.onClick(this.boundClick);
          this.clickSubscribed = true;
        }
      } else {
        if (this.clickSubscribed) {
          this.button.offClick(this.boundClick);
          this.clickSubscribed = false;
        }
        this.button.hide();
      }
    });
  }

  pushHandler(fn: () => void): () => void {
    return this.stack.push(fn);
  }

  setHandler(fn: (() => void) | undefined): () => void {
    if (!fn) return () => {};
    return this.stack.push(fn);
  }

  destroy(): void {
    this.unsubscribeObserver();
    if (this.clickSubscribed) {
      this.button.offClick(this.boundClick);
      this.clickSubscribed = false;
    }
    this.button.hide();
  }

  /** Exposed for tests. */
  get _size(): number {
    return this.stack.size;
  }
}

class TGConfirm implements ConfirmCapability {
  constructor(private readonly sdk: TGWebAppLike) {}
  confirm(opts: ConfirmOptions): Promise<boolean> {
    if (!this.sdk.showConfirm) {
      return Promise.resolve(
        typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm(opts.message)
          : false
      );
    }
    return new Promise(resolve => {
      this.sdk.showConfirm!(opts.message, confirmed => resolve(!!confirmed));
    });
  }
  alert(opts: AlertOptions): Promise<void> {
    if (!this.sdk.showAlert) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert(opts.message);
      }
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.sdk.showAlert!(opts.message, () => resolve());
    });
  }
}

class TGHaptic implements HapticCapability {
  readonly isSupported: boolean;
  constructor(private readonly hf: TGHapticLike | undefined) {
    this.isSupported = !!hf;
  }
  success(): void {
    this.hf?.notificationOccurred('success');
  }
  warning(): void {
    this.hf?.notificationOccurred('warning');
  }
  error(): void {
    this.hf?.notificationOccurred('error');
  }
  selectionChange(): void {
    this.hf?.selectionChanged();
  }
  impact(style: 'light' | 'medium' | 'heavy'): void {
    this.hf?.impactOccurred(style);
  }
}

class TGShare implements ShareCapability {
  constructor(private readonly sdk: TGWebAppLike) {}
  async share(opts: { url: string; text?: string; title?: string }): Promise<ShareResult> {
    if (!this.sdk.openTelegramLink) return 'cancelled';
    const params = new URLSearchParams();
    params.set('url', opts.url);
    if (opts.text) params.set('text', opts.text);
    // t.me/share/url is stable for years; see https://core.telegram.org/api/links#share-links
    this.sdk.openTelegramLink(`https://t.me/share/url?${params.toString()}`);
    return 'shared';
  }
}

class TGScanQR implements ScanQRCapability {
  readonly isSupported: boolean;
  constructor(private readonly sdk: TGWebAppLike) {
    this.isSupported = typeof sdk.showScanQrPopup === 'function';
  }

  scan(opts?: { text?: string }): Promise<{ result: ScanQRResult; data?: string }> {
    if (!this.isSupported || !this.sdk.showScanQrPopup) {
      return Promise.resolve({ result: 'unsupported' });
    }

    return new Promise(resolve => {
      let settled = false;

      const onClosed = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ result: 'closed' });
      };

      const cleanup = () => {
        this.sdk.offEvent?.('scanQrPopupClosed', onClosed);
      };

      this.sdk.onEvent?.('scanQrPopupClosed', onClosed);

      this.sdk.showScanQrPopup!(opts ?? {}, (text: string) => {
        if (settled) return;
        settled = true;
        cleanup();
        this.sdk.closeScanQrPopup?.();
        resolve({ result: 'scanned', data: text });
        return true;
      });
    });
  }
}

export interface TelegramAdapter extends PlatformCapabilities {
  /** Release TG SDK subscriptions. Safe to call multiple times. */
  destroy(): void;
}

export function createTelegramAdapter(sdk: TGWebAppLike): TelegramAdapter {
  // Guard against partial SDK shapes. MainButton + BackButton are Bot API 6.0;
  // if they're genuinely missing, treat the whole adapter as non-native and
  // throw loudly — this indicates the caller picked the TG adapter in a
  // non-TG env, which is a programming error, not a runtime fallback case.
  if (!sdk.MainButton || !sdk.BackButton) {
    throw new Error('[platform/telegram] SDK is missing MainButton/BackButton');
  }
  const primaryCTA = new TGPrimaryCTA(sdk.MainButton);
  const backAction = new TGBackAction(sdk.BackButton);
  const confirm = new TGConfirm(sdk);
  const haptic = new TGHaptic(sdk.HapticFeedback);
  const share = new TGShare(sdk);
  const scanQR = new TGScanQR(sdk);

  return {
    primaryCTA,
    backAction,
    confirm,
    haptic,
    share,
    scanQR,
    channel: 'telegram',
    destroy(): void {
      primaryCTA.destroy();
      backAction.destroy();
    },
  };
}
