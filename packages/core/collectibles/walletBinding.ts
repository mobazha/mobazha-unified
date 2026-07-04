// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { CollectibleWalletChallenge } from '../services/api/collectibles';

export interface CollectibleWalletMessageSigner {
  signMessage(message: Uint8Array): Promise<Uint8Array | { signature: Uint8Array } | string>;
}

export function isCollectibleWalletMessageSigner(
  provider: unknown
): provider is CollectibleWalletMessageSigner {
  return (
    !!provider &&
    typeof provider === 'object' &&
    typeof (provider as Record<string, unknown>).signMessage === 'function'
  );
}

export async function signCollectibleWalletChallenge(
  challenge: Pick<CollectibleWalletChallenge, 'message'>,
  provider: CollectibleWalletMessageSigner
): Promise<string> {
  const message = challenge.message?.trim();
  if (!message) {
    throw new Error('Wallet ownership challenge is missing');
  }
  const result = await provider.signMessage(new TextEncoder().encode(message));
  if (typeof result === 'string') {
    if (!result.trim()) throw new Error('Wallet returned an empty signature');
    return result.trim();
  }
  const signature = result instanceof Uint8Array ? result : result?.signature;
  if (!(signature instanceof Uint8Array) || signature.length !== 64) {
    throw new Error('Wallet returned an invalid Solana signature');
  }
  return bytesToBase64(signature);
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}
