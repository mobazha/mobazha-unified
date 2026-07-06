/**
 * PM-3a: Address encryption hook for Guest Checkout.
 *
 * Fetches the vendor's OpenPGP public key and provides a function to
 * encrypt a shipping address object client-side before sending it to
 * the server. The server stores only the ciphertext and cannot decrypt it.
 *
 * Usage:
 *   const { encryptionAvailable, encryptAddress, isLoading } =
 *     useAddressEncryption(getGatewayUrl());
 *
 * Design constraints:
 * - openpgp is dynamically imported to avoid bundle bloat on pages that
 *   don't use encryption.
 * - The private key NEVER touches the network; decryption is Admin-only
 *   in the browser.
 */

import { useCallback, useEffect, useState } from 'react';

import { NODE_API } from '../config/apiPaths';

export interface AddressEncryptionState {
  status: 'idle' | 'loading' | 'ready' | 'missing' | 'error';
  /** True when the vendor has a PGP key configured and encryption is ready. */
  encryptionAvailable: boolean;
  /** True while fetching the vendor's public key. */
  isLoading: boolean;
  /**
   * Encrypts an address object with the vendor's PGP public key.
   * Returns the OpenPGP ASCII-armor ciphertext string.
   * Throws when encryption is unavailable; sovereign physical checkout must
   * remain paused rather than sending a plaintext delivery address.
   */
  fingerprint?: string;
  error?: string;
  encryptAddress: (address: Record<string, unknown>) => Promise<string>;
}

/**
 * Fetches the vendor PGP key from the given gateway URL and returns
 * encryption utilities.
 *
 * @param gatewayUrl  - Base URL of the node gateway (e.g. "http://localhost:4002")
 */
export function useAddressEncryption(gatewayUrl: string): AddressEncryptionState {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>();
  const [status, setStatus] = useState<AddressEncryptionState['status']>('idle');
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gatewayUrl) {
      setIsLoading(false);
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setStatus('loading');
    setError(undefined);
    setPublicKey(null);
    setFingerprint(undefined);

    fetch(`${gatewayUrl}${NODE_API.SETTINGS_PGP_KEY}`)
      .then(async res => {
        if (res.status === 404) {
          if (!cancelled) setStatus('missing');
          return null;
        }
        if (!res.ok) throw new Error(`address protection key request failed (${res.status})`);
        return res.json() as Promise<{
          data?: { publicKey?: string; fingerprint?: string };
        }>;
      })
      .then(async data => {
        if (cancelled || !data) return;
        const key = data.data?.publicKey?.trim();
        if (!key) throw new Error('seller address protection key is missing');
        const { readKey } = await import('openpgp');
        const parsed = await readKey({ armoredKey: key });
        if (cancelled) return;
        setPublicKey(key);
        setFingerprint(data.data?.fingerprint || parsed.getFingerprint().toUpperCase());
        setStatus('ready');
      })
      .catch(cause => {
        if (cancelled) return;
        setPublicKey(null);
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'address protection key unavailable');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gatewayUrl]);

  const encryptAddress = useCallback(
    async (address: Record<string, unknown>): Promise<string> => {
      if (!publicKey || status !== 'ready') {
        throw new Error('shipping address encryption is not ready');
      }
      const { createMessage, encrypt, readKey } = await import('openpgp');
      const vendorKey = await readKey({ armoredKey: publicKey });
      const message = await createMessage({ text: JSON.stringify(address) });
      return (await encrypt({ message, encryptionKeys: vendorKey })) as string;
    },
    [publicKey, status]
  );

  return {
    status,
    encryptionAvailable: status === 'ready',
    isLoading,
    fingerprint,
    error,
    encryptAddress,
  };
}
