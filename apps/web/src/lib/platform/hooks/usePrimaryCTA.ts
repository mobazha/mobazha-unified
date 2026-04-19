'use client';

import { useCapabilities } from '../context';
import type { PrimaryCTACapability } from '../types';

/**
 * MVP-1 — Platform-abstract primary CTA.
 *
 * Returns the active adapter's `primaryCTA` capability. Business code
 * calls `setText` / `setOnClick` / `setLoading` / `setDisabled` inside an
 * effect to drive the native button (Telegram MainButton today).
 *
 * ### Mental model
 *
 * Think of it as a singleton "bottom CTA slot": one per platform session.
 * The active screen *owns* it — set on mount, clear (setText(undefined)) on
 * unmount. Mis-coordinated pages would race the button; keep CTA usage to
 * a single top-level component per route (like Cart, Checkout,
 * ProductDetail).
 *
 * ### Web fallback
 *
 * On Web the returned capability is a no-op and `isNative` is `false`.
 * Business code should check `cta.isNative` and render its own inline CTA
 * when false — identical to today's behavior pre-abstraction.
 *
 * @example
 * ```tsx
 * const cta = usePrimaryCTA();
 * useEffect(() => {
 *   if (!cta.isNative) return; // Web: render your own JSX button
 *   cta.setText(items.length > 0 ? `Checkout · $${total}` : undefined);
 *   cta.setOnClick(handleCheckout);
 *   cta.setLoading(isSubmitting);
 *   return () => cta.setText(undefined);
 * }, [cta, items.length, total, isSubmitting, handleCheckout]);
 * ```
 */
export function usePrimaryCTA(): PrimaryCTACapability {
  return useCapabilities().primaryCTA;
}
