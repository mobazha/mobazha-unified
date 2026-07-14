// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it } from 'vitest';
import {
  classifyStoreCredentialDenial,
  isStoreCredentialDenial,
} from '../../utils/storeCredentialDenial';
import { ApiError } from '../../services/api/client';

describe('classifyStoreCredentialDenial', () => {
  it('maps STORE_CREDENTIAL_INVALID to a refresh-credential state (no OAuth, no plain retry)', () => {
    const denial = classifyStoreCredentialDenial({ code: 'STORE_CREDENTIAL_INVALID' });
    expect(denial).toMatchObject({
      kind: 'storeCredentialInvalid',
      code: 'STORE_CREDENTIAL_INVALID',
      titleKey: 'storeCredential.storeCredentialInvalidTitle',
      bodyKey: 'storeCredential.storeCredentialInvalidBody',
      // Recovery re-registers the store's OWN signed credential via the local
      // node — never a connect/switch account (OAuth) affordance.
      actions: ['refreshCredential'],
    });
    expect(denial?.actions).not.toContain('switchAccount');
    expect(denial?.actions).not.toContain('connect');
  });

  it('maps ACCOUNT_STORE_MISMATCH to switch-account and disconnect affordances', () => {
    const denial = classifyStoreCredentialDenial({ code: 'ACCOUNT_STORE_MISMATCH' });
    expect(denial?.kind).toBe('accountStoreMismatch');
    // Two honest fixes: switch to the right account, or disconnect the wrong one.
    expect(denial?.actions).toEqual(['switchAccount', 'disconnect']);
  });

  it('maps ACCOUNT_SESSION_REQUIRED to a connect affordance', () => {
    const denial = classifyStoreCredentialDenial({ code: 'ACCOUNT_SESSION_REQUIRED' });
    expect(denial?.kind).toBe('accountSessionRequired');
    expect(denial?.actions).toEqual(['connect']);
  });

  it('maps RATE_LIMITED (by code) to a retry affordance', () => {
    const denial = classifyStoreCredentialDenial({ code: 'RATE_LIMITED', status: 429 });
    expect(denial?.kind).toBe('rateLimited');
    expect(denial?.actions).toEqual(['retry']);
  });

  it('treats HTTP 429 without a code as rate limiting', () => {
    const denial = classifyStoreCredentialDenial({ status: 429 });
    expect(denial?.kind).toBe('rateLimited');
    expect(denial?.code).toBe('RATE_LIMITED');
  });

  it('classifies a real ApiError instance by its direct code/status fields', () => {
    // Guards the duck-typing against the actual thrown shape in client.ts, where
    // `code` and `status` are direct instance properties on ApiError.
    const mismatch = new ApiError('nope', 403, 'ACCOUNT_STORE_MISMATCH');
    expect(classifyStoreCredentialDenial(mismatch)?.kind).toBe('accountStoreMismatch');

    const throttled = new ApiError('slow down', 429);
    expect(classifyStoreCredentialDenial(throttled)?.kind).toBe('rateLimited');

    const unrelated = new ApiError('bad request', 400, 'VALIDATION_ERROR');
    expect(classifyStoreCredentialDenial(unrelated)).toBeNull();
  });

  it('returns null for unrelated errors and non-objects', () => {
    expect(classifyStoreCredentialDenial({ code: 'VALIDATION_ERROR' })).toBeNull();
    expect(classifyStoreCredentialDenial(new Error('boom'))).toBeNull();
    expect(classifyStoreCredentialDenial({ status: 500 })).toBeNull();
    expect(classifyStoreCredentialDenial(null)).toBeNull();
    expect(classifyStoreCredentialDenial('nope')).toBeNull();
  });

  it('isStoreCredentialDenial mirrors classification', () => {
    expect(isStoreCredentialDenial({ code: 'ACCOUNT_STORE_MISMATCH' })).toBe(true);
    expect(isStoreCredentialDenial(new Error('x'))).toBe(false);
  });
});
