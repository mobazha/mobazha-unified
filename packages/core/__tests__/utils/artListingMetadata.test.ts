import { describe, expect, it } from 'vitest';
import {
  extractAuthenticityCertificateUrl,
  isUniquePieceListing,
} from '../../utils/artListingMetadata';

describe('isUniquePieceListing', () => {
  it('detects unique-piece tag', () => {
    expect(isUniquePieceListing(['fine-art', 'unique-piece', 'photography'])).toBe(true);
  });

  it('returns false for unrelated tags', () => {
    expect(isUniquePieceListing(['fine-art', 'photography'])).toBe(false);
  });
});

describe('extractAuthenticityCertificateUrl', () => {
  it('extracts URL from anchor href', () => {
    const html =
      '<p>Certified by Verisart <a href="https://verisart.com/works/14242c4b-f164-4d90-b615-09431df1e309">link</a></p>';
    expect(extractAuthenticityCertificateUrl(html)).toBe(
      'https://verisart.com/works/14242c4b-f164-4d90-b615-09431df1e309'
    );
  });

  it('extracts plain URL from text', () => {
    expect(
      extractAuthenticityCertificateUrl(
        'See https://verisart.com/works/14242c4b-f164-4d90-b615-09431df1e309 for details'
      )
    ).toBe('https://verisart.com/works/14242c4b-f164-4d90-b615-09431df1e309');
  });

  it('returns null when no certificate URL is present', () => {
    expect(extractAuthenticityCertificateUrl('<p>No certificate here</p>')).toBeNull();
  });
});
