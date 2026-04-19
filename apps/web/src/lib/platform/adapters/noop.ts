import type {
  PlatformCapabilities,
  PrimaryCTACapability,
  BackActionCapability,
  ConfirmCapability,
  HapticCapability,
  ShareCapability,
} from '../types';

/**
 * MVP-1 — Noop platform adapter.
 *
 * Used for:
 *  - SSR (no window / no DOM) — hooks still mount without error.
 *  - Unit tests that don't exercise platform integration.
 *  - Unknown/unsupported channels as a defensive fallback.
 *
 * All capability methods are no-ops or resolve to neutral values. `confirm`
 * resolves `false` (safer default — destructive actions don't auto-confirm)
 * and `share` resolves `'cancelled'`.
 */

const noopFn = () => {};

export const noopPrimaryCTA: PrimaryCTACapability = {
  setText: noopFn,
  setOnClick: noopFn,
  setLoading: noopFn,
  setDisabled: noopFn,
  isNative: false,
};

export const noopBackAction: BackActionCapability = {
  pushHandler: () => noopFn,
  setHandler: () => noopFn,
  isNative: false,
};

export const noopConfirm: ConfirmCapability = {
  confirm: () => Promise.resolve(false),
  alert: () => Promise.resolve(),
};

export const noopHaptic: HapticCapability = {
  success: noopFn,
  warning: noopFn,
  error: noopFn,
  selectionChange: noopFn,
  impact: noopFn,
  isSupported: false,
};

export const noopShare: ShareCapability = {
  share: () => Promise.resolve('cancelled'),
};

export const noopCapabilities: PlatformCapabilities = {
  primaryCTA: noopPrimaryCTA,
  backAction: noopBackAction,
  confirm: noopConfirm,
  haptic: noopHaptic,
  share: noopShare,
  channel: 'web',
};
