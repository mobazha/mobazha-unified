/**
 * MVP-1 Platform capability abstractions.
 *
 * See docs/miniapp/MINIAPP_MVP_EXECUTION.md §3 for the full rationale.
 *
 * Rules:
 *  1. Business code only imports from `@/lib/platform` (or one of its hooks).
 *     It must never read `window.Telegram.WebApp` or branch on channel.
 *  2. Adapters (TG / Web / Discord) implement these interfaces. Unsupported
 *     operations should degrade to no-ops, not throw.
 *  3. These capabilities are intentionally narrow — they abstract *only* what
 *     business code already calls. Do not add speculative surface area; grow
 *     the interfaces when a concrete use-case appears.
 */

export interface PrimaryCTACapability {
  /** Set the button label. `undefined` hides the button. */
  setText(text: string | undefined): void;
  /** Set the click handler. `undefined` disables clicks (button may stay visible as loading). */
  setOnClick(fn: (() => void) | undefined): void;
  /** Toggle progress indicator (TG spinner / Web shimmer). */
  setLoading(loading: boolean): void;
  /** Toggle disabled state (greyed-out, non-clickable). */
  setDisabled(disabled: boolean): void;
  /** True iff the host exposes a native bottom CTA (Telegram MainButton). */
  readonly isNative: boolean;
}

export interface BackActionCapability {
  /**
   * G1 — LIFO stack of back handlers.
   *
   * Push a handler, receive a cleanup function. The top-most handler executes
   * on back; the rest stay stacked and resurface as layers are popped.
   *
   * Semantics:
   *  - stack non-empty → native BackButton visible, triggers top handler only
   *    (no bubbling, no router.back).
   *  - stack empty    → BackButton hides; browser back / TG close takes over.
   *
   * Typical usage: push on drawer/modal open, return the cleanup from the
   * same effect so closing the layer pops the stack.
   */
  pushHandler(fn: () => void): () => void;
  /**
   * Convenience shim for page-level (single) back handlers; internally
   * equivalent to `pushHandler`. Prefer `pushHandler` in new code.
   *
   * @deprecated use `pushHandler`
   */
  setHandler(fn: (() => void) | undefined): () => void;
  /** True iff the host exposes a native back affordance (Telegram BackButton). */
  readonly isNative: boolean;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  okText?: string;
  cancelText?: string;
}

export interface AlertOptions {
  title?: string;
  message: string;
  okText?: string;
}

export interface ConfirmCapability {
  confirm(opts: ConfirmOptions): Promise<boolean>;
  alert(opts: AlertOptions): Promise<void>;
}

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';

export interface HapticCapability {
  success(): void;
  warning(): void;
  error(): void;
  selectionChange(): void;
  impact(style: HapticImpactStyle): void;
  /** True if the host can produce real haptic feedback. Methods are safe to call either way. */
  readonly isSupported: boolean;
}

export interface ShareOptions {
  url: string;
  text?: string;
  title?: string;
}

export type ShareResult = 'shared' | 'copied' | 'cancelled';

export interface ShareCapability {
  share(opts: ShareOptions): Promise<ShareResult>;
}

export type PlatformChannel = 'telegram' | 'discord' | 'web' | 'standalone';

export interface PlatformCapabilities {
  primaryCTA: PrimaryCTACapability;
  backAction: BackActionCapability;
  confirm: ConfirmCapability;
  haptic: HapticCapability;
  share: ShareCapability;
  /**
   * Channel identifier. Business code should NOT branch on this — it's
   * exposed for analytics, logging, and debugging only.
   */
  readonly channel: PlatformChannel;
}
