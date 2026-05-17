/**
 * PM-3a: Admin-side PGP address decryption component.
 *
 * Renders inside the guest order detail view for the authenticated seller.
 * When an order's shipping address is PGP-encrypted, the admin pastes their
 * private key armored block here and the plaintext is decrypted entirely in
 * the browser — the private key and plaintext never leave the device.
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@mobazha/core';

interface AdminShippingDecryptProps {
  /** The OpenPGP ASCII-armor ciphertext stored in the database. */
  ciphertext: string;
}

interface ParsedAddress {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  addressNotes?: string;
  [key: string]: string | undefined;
}

export function AdminShippingDecrypt({ ciphertext }: AdminShippingDecryptProps) {
  const { t } = useI18n();
  const [privateKeyArmor, setPrivateKeyArmor] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [decryptedAddress, setDecryptedAddress] = useState<ParsedAddress | null>(null);
  const [rawPlaintext, setRawPlaintext] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleDecrypt = async () => {
    if (!privateKeyArmor.trim()) {
      setError(
        t('adminDecrypt.privateKeyRequired', { defaultValue: 'Please paste your private key.' })
      );
      return;
    }
    setIsDecrypting(true);
    setError(null);

    try {
      const { readPrivateKey, readMessage, decrypt, decryptKey } = await import('openpgp');

      let privateKey = await readPrivateKey({ armoredKey: privateKeyArmor });

      if (passphrase) {
        privateKey = await decryptKey({ privateKey, passphrase });
      }

      const message = await readMessage({ armoredMessage: ciphertext });
      const { data } = await decrypt({
        message,
        decryptionKeys: privateKey,
      });

      const plaintext =
        typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array);
      setRawPlaintext(plaintext);

      try {
        const parsed: ParsedAddress = JSON.parse(plaintext);
        setDecryptedAddress(parsed);
      } catch {
        setDecryptedAddress(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Decryption failed';
      setError(
        t('adminDecrypt.decryptionFailed', {
          defaultValue: `Decryption failed: ${msg}. Make sure you are using the correct private key.`,
          message: msg,
        })
      );
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleClearKey = () => {
    setPrivateKeyArmor('');
    setPassphrase('');
    setDecryptedAddress(null);
    setRawPlaintext(null);
    setError(null);
  };

  const handlePrint = () => {
    if (!rawPlaintext && !decryptedAddress) return;
    const addr = decryptedAddress;
    const label = addr
      ? [
          addr.name,
          addr.address,
          `${addr.city}${addr.state ? `, ${addr.state}` : ''}`,
          addr.postalCode,
          addr.country,
          addr.addressNotes,
        ]
          .filter(Boolean)
          .join('\n')
      : (rawPlaintext ?? '');
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(
        `<pre style="font-size:14px;font-family:monospace;padding:24px">${label}</pre>`
      );
      win.document.close();
      win.print();
    }
  };

  if (decryptedAddress || rawPlaintext) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
          <span>🔓</span>
          <span>
            {t('adminDecrypt.decryptedSuccess', {
              defaultValue: 'Address decrypted (in browser only)',
            })}
          </span>
        </div>

        {decryptedAddress ? (
          <div className="bg-muted rounded-md p-3 text-sm space-y-1 font-mono">
            {decryptedAddress.name && <p>{decryptedAddress.name}</p>}
            {decryptedAddress.address && <p>{decryptedAddress.address}</p>}
            {(decryptedAddress.city || decryptedAddress.state) && (
              <p>
                {[decryptedAddress.city, decryptedAddress.state].filter(Boolean).join(', ')}
                {decryptedAddress.postalCode ? ` ${decryptedAddress.postalCode}` : ''}
              </p>
            )}
            {decryptedAddress.country && <p>{decryptedAddress.country}</p>}
            {decryptedAddress.addressNotes && (
              <p className="text-muted-foreground">{decryptedAddress.addressNotes}</p>
            )}
          </div>
        ) : (
          <pre className="bg-muted rounded-md p-3 text-sm font-mono whitespace-pre-wrap break-all">
            {rawPlaintext}
          </pre>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            🖨️ {t('adminDecrypt.printLabel', { defaultValue: 'Print Label' })}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClearKey}>
            {t('adminDecrypt.clearAndClose', { defaultValue: 'Clear & Close' })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
        <span>🔒</span>
        <span>
          {t('adminDecrypt.encryptedNotice', {
            defaultValue:
              'Shipping address is PGP-encrypted. Decrypt with your private key (stays in browser).',
          })}
        </span>
      </div>

      {!showKey ? (
        <Button variant="outline" size="sm" onClick={() => setShowKey(true)}>
          {t('adminDecrypt.decryptButton', { defaultValue: 'Decrypt Address' })}
        </Button>
      ) : (
        <div className="space-y-2 border rounded-md p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {t('adminDecrypt.privateKeyHint', {
              defaultValue:
                'Paste your PGP private key (ASCII armor). The key and plaintext never leave your browser.',
            })}
          </p>

          <Textarea
            rows={6}
            placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----"
            value={privateKeyArmor}
            onChange={e => setPrivateKeyArmor(e.target.value)}
            className="font-mono text-xs"
            spellCheck={false}
          />

          <input
            type="password"
            className="w-full rounded border px-3 py-1.5 text-sm bg-background"
            placeholder={t('adminDecrypt.passphrasePlaceholder', {
              defaultValue: 'Passphrase (leave blank if none)',
            })}
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleDecrypt} disabled={isDecrypting}>
              {isDecrypting
                ? t('adminDecrypt.decrypting', { defaultValue: 'Decrypting…' })
                : t('adminDecrypt.decryptNow', { defaultValue: 'Decrypt' })}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowKey(false);
                setPrivateKeyArmor('');
                setPassphrase('');
                setError(null);
              }}
            >
              {t('adminDecrypt.cancel', { defaultValue: 'Cancel' })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
