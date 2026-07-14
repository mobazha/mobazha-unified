// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import { en, zh } from '../../i18n/locales';

type StoreCredentialCopy = NonNullable<typeof en.storeCredential>;

const REQUIRED_KEYS: Array<keyof StoreCredentialCopy> = [
  'storeCredentialInvalidTitle',
  'storeCredentialInvalidBody',
  'accountStoreMismatchTitle',
  'accountStoreMismatchBody',
  'accountStoreMismatchSwitch',
  'accountStoreMismatchDisconnect',
  'accountStoreMismatchDisconnectConfirmTitle',
  'accountStoreMismatchDisconnectConfirmBody',
  'accountStoreMismatchDisconnectConfirmCta',
  'accountStoreMismatchDisconnectCancelCta',
  'accountSessionRequiredTitle',
  'accountSessionRequiredBody',
  'accountSessionRequiredCta',
  'rateLimitedTitle',
  'rateLimitedBody',
  'retryCta',
  'reconnectCta',
  'reconnecting',
  'refreshFailed',
  'disconnecting',
  'disconnectFailed',
  'connecting',
  'connectActionFailed',
  'actionFailed',
];

describe('storeCredential copy', () => {
  it('defines every key in both English and Chinese', () => {
    for (const key of REQUIRED_KEYS) {
      expect(en.storeCredential?.[key], `en.storeCredential.${key}`).toBeTruthy();
      expect(zh.storeCredential?.[key], `zh.storeCredential.${key}`).toBeTruthy();
    }
  });

  it('never tells the user to log into Casdoor', () => {
    const all = [
      ...Object.values(en.storeCredential ?? {}),
      ...Object.values(zh.storeCredential ?? {}),
    ]
      .filter((v): v is string => typeof v === 'string')
      .join(' ')
      .toLowerCase();
    expect(all).not.toContain('casdoor');
  });

  it('frames the invalid-credential state as an explicit reconnect action, not an already-done automatic recovery or a re-login', () => {
    const body = en.storeCredential?.storeCredentialInvalidBody ?? '';
    // Recovery is an explicit action the user takes — the copy must NOT claim it
    // already happened automatically before the node confirms success.
    expect(body.toLowerCase()).not.toContain('automatically');
    // It re-registers the store's OWN credential and needs no account sign-in.
    expect(body).toMatch(/do not need to sign in/i);
    expect(body.toLowerCase()).not.toContain('oauth');
    // The honest affordance is a reconnect (re-register the store credential).
    expect(en.storeCredential?.reconnectCta?.toLowerCase()).toContain('reconnect');
  });

  it('offers disconnect for the account-mismatch state and clarifies the store is preserved', () => {
    const body = en.storeCredential?.accountStoreMismatchBody?.toLowerCase() ?? '';
    // A disconnect affordance is now offered alongside switching accounts.
    expect(body).toContain('disconnect');
    expect(en.storeCredential?.accountStoreMismatchDisconnect?.toLowerCase()).toContain(
      'disconnect'
    );
    expect(en.storeCredential?.accountStoreMismatchSwitch?.toLowerCase()).toContain('switch');
    // It must explain disconnect removes only the optional account ownership and
    // the store's data/history remain.
    expect(body).toContain('optional');
    expect(body).toMatch(/remain|keeps working/);
  });

  it('frames Connect as optional for local features but required for this action', () => {
    expect(en.storeCredential?.accountSessionRequiredBody?.toLowerCase()).toContain('optional');
    expect(en.storeCredential?.accountSessionRequiredBody?.toLowerCase()).toContain('connect');
  });

  it('gives rate-limit retry guidance', () => {
    expect(en.storeCredential?.rateLimitedBody?.toLowerCase()).toContain('try again');
    expect(en.storeCredential?.retryCta).toBeTruthy();
  });

  it('surfaces localized action failures that are not raw server strings', () => {
    expect(en.storeCredential?.connectActionFailed).toBeTruthy();
    expect(zh.storeCredential?.connectActionFailed).toBeTruthy();
    expect(en.storeCredential?.refreshFailed).toBeTruthy();
    expect(zh.storeCredential?.refreshFailed).toBeTruthy();
    expect(en.storeCredential?.disconnectFailed).toBeTruthy();
    expect(zh.storeCredential?.disconnectFailed).toBeTruthy();
  });
});
