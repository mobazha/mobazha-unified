export const CHUNK_LOAD_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed/i;

/** Shared by lazyWithRetry and RouteChunkErrorFallback to cap auto-reloads per session. */
export const CHUNK_RELOAD_SESSION_KEY = 'mobazha:chunk-reload';

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return CHUNK_LOAD_ERROR_RE.test(error.message);
}

/** Reload at most once per session after deploy/chunk mismatch. Returns true if reload was triggered. */
export function reloadOnceForChunkError(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  if (sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)) return false;
  sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, '1');
  window.location.reload();
  return true;
}
