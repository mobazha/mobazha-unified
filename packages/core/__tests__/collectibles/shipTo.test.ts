import { describe, expect, it } from 'vitest';
import {
  COLLECTIBLE_PII_ENVELOPE_PREFIX,
  isCollectibleShipToProtected,
  prepareCollectibleShipToPayload,
} from '../../collectibles/shipTo';

describe('prepareCollectibleShipToPayload', () => {
  it('trims plaintext for server-side encryption', () => {
    expect(prepareCollectibleShipToPayload('  123 Main St\nCity  ')).toBe('123 Main St\nCity');
  });
});

describe('isCollectibleShipToProtected', () => {
  it('detects hosting PII envelope', () => {
    expect(isCollectibleShipToProtected(`${COLLECTIBLE_PII_ENVELOPE_PREFIX}abc`)).toBe(true);
  });

  it('treats legacy plaintext as not protected', () => {
    expect(isCollectibleShipToProtected('123 Main St')).toBe(false);
  });
});
