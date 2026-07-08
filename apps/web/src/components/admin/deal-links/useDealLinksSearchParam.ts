'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/** Sync a deal-links query param with the URL (drops param when value equals default). */
export function useDealLinksSearchParam<T extends string>(
  paramName: string,
  resolve: (value: string | null) => T,
  defaultValue: T
): [T, (next: T) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = resolve(searchParams.get(paramName));

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === defaultValue) {
        params.delete(paramName);
      } else {
        params.set(paramName, next);
      }
      const query = params.toString();
      router.replace(query ? `/admin/deal-links?${query}` : '/admin/deal-links');
    },
    [defaultValue, paramName, router, searchParams]
  );

  return [value, setValue];
}
