import { describe, expect, it } from 'vitest';

import { appendWebSocketTokenQuery, shouldUseQueryTokenWebSocketAuth } from '../index';

describe('WebSocket auth strategy', () => {
  it('uses query auth for Basic Auth tokens', () => {
    expect(shouldUseQueryTokenWebSocketAuth('wss://app.example/ws', 'basic:YWJj')).toBe(true);
  });

  it('appends token query without leaking raw token in path', () => {
    const url = appendWebSocketTokenQuery('wss://app.example/ws', 'basic:YWJj');
    expect(url).toBe('wss://app.example/ws?token=basic%3AYWJj');
  });

  it('prefers protocol auth for SaaS JWT', () => {
    expect(shouldUseQueryTokenWebSocketAuth('wss://mobazha.org/ws', 'jwt-token')).toBe(false);
  });
});
