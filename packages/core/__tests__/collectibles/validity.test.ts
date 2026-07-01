// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  isCollectibleNFTCredentialActionBlocked,
  isCollectibleNFTVoided,
  normalizeCollectibleNFTValidityStatus,
  resolveCollectibleNFTValidityStatus,
  resolveCollectibleValidityDisplayKey,
} from '../../collectibles/validity';

describe('collectible NFT validity', () => {
  it('preserves unknown validity status values for forward compatibility', () => {
    expect(normalizeCollectibleNFTValidityStatus('archived')).toBe('archived');
    expect(resolveCollectibleValidityDisplayKey('archived')).toBe('collectibles.validity.unknown');
  });

  it('derives burned status from burnAt when validityStatus is absent', () => {
    expect(
      resolveCollectibleNFTValidityStatus({
        burnAt: '2026-01-01T00:00:00Z',
      })
    ).toBe('burned');
  });

  it('prefers explicit validityStatus over burnAt', () => {
    expect(
      resolveCollectibleNFTValidityStatus({
        validityStatus: 'voided',
        burnAt: '2026-01-01T00:00:00Z',
      })
    ).toBe('voided');
  });

  it('blocks credential actions for voided NFTs', () => {
    expect(isCollectibleNFTVoided({ validityStatus: 'voided' })).toBe(true);
    expect(isCollectibleNFTCredentialActionBlocked({ validityStatus: 'voided' })).toBe(true);
    expect(isCollectibleNFTCredentialActionBlocked({ validityStatus: 'active' })).toBe(false);
  });
});
