import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError } from './chunkLoadError';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrap React.lazy with retries for slow / flaky networks (e.g. Tor).
 * On persistent chunk mismatch after deploy, reload once per session.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options?: { retries?: number; delayMs?: number }
): LazyExoticComponent<T> {
  const retries = options?.retries ?? 3;
  const delayMs = options?.delayMs ?? 800;

  return lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error;
        if (attempt < retries - 1) {
          await sleep(delayMs * (attempt + 1));
        }
      }
    }

    if (isChunkLoadError(lastError)) {
      const reloadKey = 'mobazha:chunk-reload';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
        await sleep(Number.POSITIVE_INFINITY);
      }
    }

    throw lastError;
  });
}
