export const TRANSIENT_NETWORK_RE = /Failed to fetch|NetworkError|Load failed/i;

type ApiLikeError = Error & { status?: number; code?: string };

function asApiError(error: unknown): ApiLikeError | null {
  if (!(error instanceof Error) || error.name !== 'ApiError') return null;
  return error as ApiLikeError;
}

/**
 * True when a single GET retry may succeed (Tor flake, upstream blip).
 * Excludes request timeouts and store-offline 503s so UI can degrade promptly.
 */
export function isTransientRequestError(error: unknown): boolean {
  const apiError = asApiError(error);
  if (apiError) {
    if (apiError.status === 502 || apiError.status === 504) return true;
    if (apiError.status === 503) {
      return apiError.code !== 'STORE_UNAVAILABLE' && apiError.code !== 'SERVICE_UNAVAILABLE';
    }
    return false;
  }
  if (error instanceof Error) {
    if (error.name === 'AbortError') return false;
    return TRANSIENT_NETWORK_RE.test(error.message);
  }
  return false;
}
