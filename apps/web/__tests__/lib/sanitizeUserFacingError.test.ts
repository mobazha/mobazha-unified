import { describe, expect, it } from 'vitest';
import {
  isWalletNotProvisionedMessage,
  sanitizeUserFacingError,
} from '../../src/lib/sanitizeUserFacingError';

describe('sanitizeUserFacingError', () => {
  it('maps JSON.parse failures to generic wallet message', () => {
    const result = sanitizeUserFacingError(
      'JSON.parse: unexpected character at line 1 column 1 of the JSON data'
    );
    expect(result).toContain('Could not load wallet data');
  });

  it('maps not provisioned backend errors', () => {
    const result = sanitizeUserFacingError('monero wallet not provisioned');
    expect(result.toLowerCase()).toContain('not set up');
  });

  it('passes through unknown seller-safe messages', () => {
    const result = sanitizeUserFacingError('Monero wallet is syncing');
    expect(result).toBe('Monero wallet is syncing');
  });
});

describe('isWalletNotProvisionedMessage', () => {
  it('detects provisioned errors', () => {
    expect(isWalletNotProvisionedMessage('monero wallet not provisioned')).toBe(true);
    expect(isWalletNotProvisionedMessage('connected')).toBe(false);
  });
});
