'use client';

import { useCapabilities } from '../context';
import type { ConfirmCapability } from '../types';

/**
 * MVP-1 — Platform-abstract confirmation dialog.
 *
 * Telegram → native `showConfirm` / `showAlert` (Bot API 6.2+).
 * Web      → `window.confirm` / `window.alert` as the MVP baseline;
 *            swap to `<AlertDialog>` in a later iteration without API change.
 *
 * @example
 * ```tsx
 * const { confirm } = useConfirm();
 * const handleDelete = async () => {
 *   const ok = await confirm({ message: t('confirmDelete') });
 *   if (ok) deleteItem();
 * };
 * ```
 */
export function useConfirm(): ConfirmCapability {
  return useCapabilities().confirm;
}
