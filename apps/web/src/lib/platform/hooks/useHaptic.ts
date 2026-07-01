'use client';

import { useCapabilities } from '../context';
import type { HapticCapability } from '../types';

/**
 * MVP-1 + A4 — Platform-abstract haptic feedback.
 *
 * Telegram → `HapticFeedback.{notificationOccurred,selectionChanged,impactOccurred}`.
 * Web (Android, not iOS Safari) → `navigator.vibrate` patterns.
 * Other / unsupported → silent no-op, `isSupported === false`.
 *
 * @example
 * ```tsx
 * const haptic = useHaptic();
 * const onOrderSubmit = async () => {
 *   try {
 *     await submitOrder();
 *     haptic.success();
 *   } catch {
 *     haptic.error();
 *   }
 * };
 * ```
 */
export function useHaptic(): HapticCapability {
  return useCapabilities().haptic;
}
