// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { useEffect, useRef } from 'react';

/**
 * Calls `onFirstError(field)` once per failed submit, i.e. each time `attempts`
 * increases, with the first error field as it is at that moment.
 *
 * It must not depend on `firstErrorField` itself: that value moves on as the
 * user fixes fields, and re-running then would scroll the page to the next
 * error while they are still typing in the first one.
 */
export function useScrollToFirstError(
  attempts: number,
  firstErrorField: string | undefined,
  onFirstError: (field: string) => void
): void {
  const latest = useRef({ firstErrorField, onFirstError });

  // Declared before the effect below, so the refs are current when it runs.
  useEffect(() => {
    latest.current = { firstErrorField, onFirstError };
  });

  useEffect(() => {
    if (attempts === 0) return;
    const { firstErrorField: field, onFirstError: callback } = latest.current;
    if (field) callback(field);
  }, [attempts]);
}
