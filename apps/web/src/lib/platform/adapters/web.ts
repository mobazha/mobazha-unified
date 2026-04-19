'use client';

import { useMemo } from 'react';

import type {
  PlatformCapabilities,
  PrimaryCTACapability,
  BackActionCapability,
  ConfirmCapability,
  HapticCapability,
  ShareCapability,
  ShareResult,
} from '../types';
import { BackActionStack } from '../backStack';
import { noopPrimaryCTA } from './noop';

/**
 * MVP-1 — Web / Standalone adapter.
 *
 * Notes:
 *
 * ### PrimaryCTA: intentionally noop in Web
 *
 * Docs (§3.7) propose a portal-based `<FloatingBottomButton>` so business code
 * can have a single abstract API for bottom CTAs. We deliberately defer that
 * until a business page concretely needs a unified CTA on Web.
 *
 * Today's facts:
 *   - `useTGMainButton` was already a no-op outside Telegram.
 *   - `CheckoutMobile` / `CartMobile` / `ProductDetail` each render their own
 *     bottom CTA for the Web / Mobile-web fallback, with page-specific layout
 *     (address picker, discount, etc). Slotting them into a generic portal
 *     component would change visual design and regress per-page UX.
 *
 * Therefore: `isNative: false` + noop setters. Business code is expected to
 * check `cta.isNative` and fall back to its existing JSX CTA when false. This
 * is functionally identical to today's behavior and keeps MVP-1 scope tight.
 * If a future page needs a truly unified Web CTA, promote this adapter to a
 * portal-backed implementation at that time — the interface won't change.
 *
 * ### BackAction: popstate interception
 *
 * Web back is the browser's history stack. We push a sentinel history entry
 * when the handler stack becomes non-empty and intercept the matching
 * `popstate` to invoke the top handler. When the stack empties we clean up
 * the sentinel. This yields "back closes modal first, then navigates away"
 * parity with the Telegram BackButton behavior.
 *
 * ### Haptic: navigator.vibrate (Android Chrome / Firefox)
 *
 * iOS Safari has no vibration API, so haptic is generally best-effort. We
 * report `isSupported: false` for iOS to avoid callers treating vibrate as a
 * committed feature.
 *
 * ### Share: navigator.share → clipboard fallback
 *
 * Matches the existing `useShare` hook semantics.
 */

/** Sentinel state flag pushed into `history.state` so we can identify our own entry. */
const BACK_STACK_MARKER = '__mobazha_back_sentinel__';
interface BackSentinelState {
  [BACK_STACK_MARKER]?: true;
}

class WebBackActionAdapter implements BackActionCapability {
  readonly isNative = false;
  private readonly stack = new BackActionStack();
  private sentinelPushed = false;
  private listenerBound = false;
  private readonly popHandler: (ev: Event) => void;

  constructor() {
    // `ev` is a PopStateEvent at runtime; typed as the broader `Event` so we
    // avoid referencing a DOM global identifier that ESLint's no-undef doesn't
    // see without extra config. We don't read any PopStateEvent-specific
    // properties here — the event is only used to fence the default browser
    // navigation via `stack.trigger()`.
    this.popHandler = (ev: Event) => {
      if (this.stack.trigger()) {
        // We consumed the back — re-push sentinel so the next Back also lands
        // on our intercept, instead of leaving the history scrolling away.
        // (Browser has already advanced state to whatever was *before* the
        // sentinel, so we need to restore the barrier.)
        if (typeof window !== 'undefined') {
          window.history.pushState({ [BACK_STACK_MARKER]: true } satisfies BackSentinelState, '');
          this.sentinelPushed = true;
        }
      } else {
        // No handler — allow the default navigation (this popstate has
        // already mutated location; React Router / Next router will pick up).
        void ev;
        this.detachIfIdle();
      }
    };
    this.stack.subscribe(hasHandler => {
      if (hasHandler) this.attach();
      else this.detachIfIdle();
    });
  }

  private attach(): void {
    if (typeof window === 'undefined') return;
    if (!this.listenerBound) {
      window.addEventListener('popstate', this.popHandler);
      this.listenerBound = true;
    }
    if (!this.sentinelPushed) {
      window.history.pushState({ [BACK_STACK_MARKER]: true } satisfies BackSentinelState, '');
      this.sentinelPushed = true;
    }
  }

  private detachIfIdle(): void {
    if (this.stack.hasHandler) return;
    if (typeof window === 'undefined') return;
    if (this.listenerBound) {
      window.removeEventListener('popstate', this.popHandler);
      this.listenerBound = false;
    }
    // Pop the sentinel entry so the user's next "back" navigates normally.
    if (this.sentinelPushed) {
      const state = window.history.state as BackSentinelState | null;
      if (state && state[BACK_STACK_MARKER]) {
        window.history.back();
      }
      this.sentinelPushed = false;
    }
  }

  pushHandler(fn: () => void): () => void {
    return this.stack.push(fn);
  }

  setHandler(fn: (() => void) | undefined): () => void {
    if (!fn) return () => {};
    return this.stack.push(fn);
  }

  /** Exposed for tests / debugging. */
  get _size(): number {
    return this.stack.size;
  }
}

class WebConfirmAdapter implements ConfirmCapability {
  confirm(opts: {
    title?: string;
    message: string;
    okText?: string;
    cancelText?: string;
  }): Promise<boolean> {
    if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return Promise.resolve(false);
    }
    // Native browser confirm — MVP baseline. A future enhancement can replace
    // this with `<AlertDialog>` in the shared UI kit; the API is stable.
    return Promise.resolve(window.confirm(opts.message));
  }
  alert(opts: { title?: string; message: string; okText?: string }): Promise<void> {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(opts.message);
    }
    return Promise.resolve();
  }
}

function detectIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iP(hone|od|ad)/.test(ua);
}

class WebHapticAdapter implements HapticCapability {
  readonly isSupported: boolean;
  constructor() {
    this.isSupported =
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function' &&
      !detectIosSafari();
  }
  private v(pattern: number | number[]): void {
    if (!this.isSupported) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration can throw SecurityError when the page isn't focused.
    }
  }
  success(): void {
    this.v([10, 30, 10]);
  }
  warning(): void {
    this.v([20, 40, 20]);
  }
  error(): void {
    this.v([40, 60, 40]);
  }
  selectionChange(): void {
    this.v(5);
  }
  impact(style: 'light' | 'medium' | 'heavy'): void {
    this.v(style === 'light' ? 8 : style === 'medium' ? 15 : 25);
  }
}

class WebShareAdapter implements ShareCapability {
  async share(opts: { url: string; text?: string; title?: string }): Promise<ShareResult> {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ url: opts.url, text: opts.text, title: opts.title });
        return 'shared';
      } catch (err) {
        // AbortError = user cancelled. Any other error → fall through to clipboard.
        const name = (err as { name?: string } | null)?.name;
        if (name === 'AbortError') return 'cancelled';
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(opts.url);
        return 'copied';
      } catch {
        /* fall through */
      }
    }
    return 'cancelled';
  }
}

export function createWebAdapter(overrides?: {
  primaryCTA?: PrimaryCTACapability;
}): PlatformCapabilities {
  return {
    primaryCTA: overrides?.primaryCTA ?? noopPrimaryCTA,
    backAction: new WebBackActionAdapter(),
    confirm: new WebConfirmAdapter(),
    haptic: new WebHapticAdapter(),
    share: new WebShareAdapter(),
    channel: 'web',
  };
}

// ---- React-integrated variant (hooks consumers) ---------------------------

/**
 * React hook variant — creates a stable per-component adapter reference.
 * Kept separate from `createWebAdapter` so the provider can instantiate once
 * per provider mount without React dependency inside the factory.
 *
 * Note: empty `[]` deps mean the adapter is created exactly once per mount.
 * We use `useMemo` instead of `useRef` + lazy-init because React strictly
 * forbids reading/writing ref.current during render (react-hooks/refs).
 */
export function useWebAdapter(): PlatformCapabilities {
  return useMemo(() => createWebAdapter(), []);
}
