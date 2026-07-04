// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';

import {
  isCollectibleWalletMessageSigner,
  signCollectibleWalletChallenge,
} from '../../collectibles/walletBinding';

describe('collectible wallet ownership proof', () => {
  it('signs the server-authored message and returns a base64 Solana signature', async () => {
    const signature = Uint8Array.from({ length: 64 }, (_, index) => index);
    const provider = { signMessage: vi.fn().mockResolvedValue(signature) };

    const encoded = await signCollectibleWalletChallenge({ message: 'Mobazha challenge' }, provider);

    expect(provider.signMessage).toHaveBeenCalledWith(new TextEncoder().encode('Mobazha challenge'));
    expect(Buffer.from(encoded, 'base64')).toEqual(Buffer.from(signature));
  });

  it('accepts providers returning a wrapped signature', async () => {
    const signature = new Uint8Array(64).fill(7);
    await expect(
      signCollectibleWalletChallenge(
        { message: 'challenge' },
        { signMessage: vi.fn().mockResolvedValue({ signature }) }
      )
    ).resolves.toBe(Buffer.from(signature).toString('base64'));
  });

  it('rejects missing signing capability and malformed signatures', async () => {
    expect(isCollectibleWalletMessageSigner({})).toBe(false);
    expect(isCollectibleWalletMessageSigner({ signMessage: vi.fn() })).toBe(true);
    await expect(
      signCollectibleWalletChallenge(
        { message: 'challenge' },
        { signMessage: vi.fn().mockResolvedValue(new Uint8Array(12)) }
      )
    ).rejects.toThrow('invalid Solana signature');
  });
});
