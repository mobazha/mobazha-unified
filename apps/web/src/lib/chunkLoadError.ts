export const CHUNK_LOAD_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return CHUNK_LOAD_ERROR_RE.test(error.message);
}
