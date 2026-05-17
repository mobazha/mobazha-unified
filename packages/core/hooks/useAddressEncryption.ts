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
  /** True when the vendor has a PGP key configured and encryption is ready. */
  encryptionAvailable: boolean;
  /** True while fetching the vendor's public key. */
  isLoading: boolean;
  /**
   * Encrypts an address object with the vendor's PGP public key.
   * Returns the OpenPGP ASCII-armor ciphertext string.
   * Returns null if encryptionAvailable is false (caller should fall back
   * to plaintext with a warning shown to the user).
   */
  encryptAddress: (address: Record<string, unknown>) => Promise<string | null>;
}

/**
 * Fetches the vendor PGP key from the given gateway URL and returns
 * encryption utilities.
 *
 * @param gatewayUrl  - Base URL of the node gateway (e.g. "http://localhost:4002")
 */
export function useAddressEncryption(gatewayUrl: string): AddressEncryptionState {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!gatewayUrl) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetch(`${gatewayUrl}${NODE_API.SETTINGS_PGP_KEY}`)
      .then(res => {
        if (!res.ok) {
          // 404 means no PGP key configured — not an error.
          return null;
        }
        return res.json();
      })
      .then((data: { data?: { publicKey?: string } } | null) => {
        if (!cancelled && data?.data?.publicKey) {
          setPublicKey(data.data.publicKey);
        }
      })
      .catch(() => {
        // Network error or JSON parse failure — treat as no key.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gatewayUrl]);

  const encryptAddress = useCallback(
    async (address: Record<string, unknown>): Promise<string | null> => {
      if (!publicKey) return null;

      try {
        // Dynamic import so openpgp is not in the initial bundle.
        const { createMessage, encrypt, readKey } = await import('openpgp');

        const vendorKey = await readKey({ armoredKey: publicKey });
        const plaintext = JSON.stringify(address);
        const message = await createMessage({ text: plaintext });

        const ciphertext = await encrypt({
          message,
          encryptionKeys: vendorKey,
        });

        return ciphertext as string;
      } catch (err) {
        console.error('[useAddressEncryption] encryption failed:', err);
        return null;
      }
    },
    [publicKey]
  );

  return {
    encryptionAvailable: publicKey !== null,
    isLoading,
    encryptAddress,
  };
}
