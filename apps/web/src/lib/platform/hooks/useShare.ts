'use client';

import { useCapabilities } from '../context';
import type { ShareCapability } from '../types';

/**
 * MVP-1 — Platform-abstract share.
 *
 * Telegram → opens native forward-picker via `t.me/share/url`.
 * Web      → `navigator.share` → clipboard fallback.
 *
 * Result codes:
 *   - `'shared'`   : platform accepted the share (TG always, Web on success)
 *   - `'copied'`   : fell back to clipboard
 *   - `'cancelled'`: user cancelled or neither API is available
 *
 * Consumers should toast-notify on `'copied'` so users know the action
 * completed even though the native sheet wasn't shown.
 *
 * @example
 * ```tsx
 * const { share } = useShare();
 * const onShareListing = async () => {
 *   const result = await share({ url: listingUrl, text: title });
 *   if (result === 'copied') toast(t('linkCopied'));
 * };
 * ```
 */
export function useShare(): ShareCapability {
  return useCapabilities().share;
}
