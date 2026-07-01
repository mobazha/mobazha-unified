import { describe, expect, it } from 'vitest';
import { deriveChatSessionTitle, sessionDisplayTitle } from '../../utils/chatSessionTitle';

describe('deriveChatSessionTitle', () => {
  it('trims and collapses whitespace', () => {
    expect(deriveChatSessionTitle('  hello   world  ')).toBe('hello world');
  });

  it('truncates long messages with ellipsis', () => {
    const long = 'a'.repeat(100);
    expect(deriveChatSessionTitle(long)).toMatch(/\.\.\.$/);
    expect(deriveChatSessionTitle(long).length).toBeLessThanOrEqual(83);
  });

  it('returns empty for blank input', () => {
    expect(deriveChatSessionTitle('   \n  ')).toBe('');
  });
});

describe('sessionDisplayTitle', () => {
  it('prefers stored title', () => {
    expect(sessionDisplayTitle('Saved title', 'fallback')).toBe('Saved title');
  });

  it('derives from first message when title missing', () => {
    expect(sessionDisplayTitle('', 'fallback', 'Import products from CSV')).toBe(
      'Import products from CSV'
    );
  });
});
