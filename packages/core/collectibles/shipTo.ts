/** Server-side PII envelope prefix (hosting `internal/collectibles/pii.go`). */
export const COLLECTIBLE_PII_ENVELOPE_PREFIX = 'pii:v1:';

/** Plaintext shipping address for hosting to encrypt at rest (B4). */
export function prepareCollectibleShipToPayload(value: string): string {
  return value.trim();
}

export function isCollectibleShipToProtected(value: string | undefined | null): boolean {
  const trimmed = value?.trim() ?? '';
  return trimmed.startsWith(COLLECTIBLE_PII_ENVELOPE_PREFIX);
}
