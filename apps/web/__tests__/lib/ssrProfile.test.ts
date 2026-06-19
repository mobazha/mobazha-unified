import { describe, expect, it } from 'vitest';
import { profilePlainTextExcerpt } from '@/lib/ssrProfile';

describe('profilePlainTextExcerpt', () => {
  it('prefers shortDescription over HTML about', () => {
    const text = profilePlainTextExcerpt({
      name: 'sn6op',
      shortDescription: 'Unique abstract photography.',
      about: '<p>Should not appear raw</p>',
    });
    expect(text).toBe('Unique abstract photography.');
    expect(text).not.toContain('<p>');
  });

  it('strips HTML from about when shortDescription is empty', () => {
    const text = profilePlainTextExcerpt({
      name: 'sn6op',
      about:
        '<p>This is sn6op...</p><p>Welcome to the primary market of collections and independent single works of mine.</p>',
    });
    expect(text).toContain('Welcome to the primary market');
    expect(text).not.toContain('<p>');
    expect(text).not.toContain('</p>');
  });

  it('falls back to browse message when profile has no text', () => {
    expect(profilePlainTextExcerpt({ name: 'Alice' })).toBe(
      'Browse products from Alice on Mobazha'
    );
  });
});
