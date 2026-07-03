import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useI18n } from '@mobazha/core';
import { CHUNK_LOAD_ERROR_RE, reloadOnceForChunkError } from '@/lib/chunkLoadError';

function isChunkLoadError(error: unknown): boolean {
  if (error instanceof Error) return CHUNK_LOAD_ERROR_RE.test(error.message);
  if (isRouteErrorResponse(error) && typeof error.statusText === 'string') {
    return CHUNK_LOAD_ERROR_RE.test(error.statusText);
  }
  return false;
}

/**
 * Router-level fallback for lazy route failures (common on Tor / flaky links).
 */
export function RouteChunkErrorFallback() {
  const error = useRouteError();
  const { t } = useI18n();
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    if (!chunkError) return;
    reloadOnceForChunkError();
  }, [chunkError]);

  const message =
    error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? error.statusText || String(error.status)
        : t('common.unexpectedError', { defaultValue: 'Something went wrong' });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          {t('common.loadingInterrupted', { defaultValue: 'Loading interrupted' })}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {chunkError
            ? t('common.slowNetworkRetry', {
                defaultValue: 'The connection is slow. Retrying…',
              })
            : message}
        </p>
        <button
          type="button"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          onClick={() => window.location.reload()}
        >
          {t('common.retry', { defaultValue: 'Retry' })}
        </button>
      </div>
    </div>
  );
}
