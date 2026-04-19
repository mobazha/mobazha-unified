'use client';

import { useCapabilities } from '../context';
import type { BackActionCapability } from '../types';

/**
 * MVP-1 + G1 — Platform-abstract back action with LIFO stack semantics.
 *
 * Use for modals / drawers / lightboxes where you want "back closes overlay
 * instead of navigating away".
 *
 * @example Drawer
 * ```tsx
 * function VariantPicker({ open, onClose }) {
 *   const back = useBackAction();
 *   useEffect(() => {
 *     if (!open) return;
 *     return back.pushHandler(onClose); // LIFO: closes this layer first
 *   }, [open, onClose, back]);
 *   if (!open) return null;
 *   return <Drawer>...</Drawer>;
 * }
 * ```
 *
 * @example Page-level (prefer `router.back()` via Next router — only
 * override when you really need bespoke behavior like "discard changes?")
 * ```tsx
 * const back = useBackAction();
 * useEffect(() => back.pushHandler(handleLeaveWithPrompt), [back]);
 * ```
 */
export function useBackAction(): BackActionCapability {
  return useCapabilities().backAction;
}
