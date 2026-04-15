import { describe, it, expect } from 'vitest';
import { parseStandaloneOauthBroadcastMessage } from '../../../services/auth/oauthBroadcast';

describe('oauthBroadcast', () => {
  it('parses valid saas-bridge-token', () => {
    expect(parseStandaloneOauthBroadcastMessage({ type: 'saas-bridge-token', token: 'x' })).toEqual(
      {
        type: 'saas-bridge-token',
        token: 'x',
      }
    );
  });

  it('parses buyer-token', () => {
    expect(parseStandaloneOauthBroadcastMessage({ type: 'buyer-token', token: 'y' })).toEqual({
      type: 'buyer-token',
      token: 'y',
    });
  });

  it('returns null for unknown payloads', () => {
    expect(parseStandaloneOauthBroadcastMessage({ type: 'evil', token: 'z' })).toBeNull();
    expect(parseStandaloneOauthBroadcastMessage(null)).toBeNull();
  });
});
