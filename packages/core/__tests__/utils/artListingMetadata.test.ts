import { describe, expect, it } from 'vitest';
import {
  extractAuthenticityCertificateUrl,
  isUniquePieceListing,
  parseArtListingSpecs,
  ART_LISTING_UNIQUE_EDITION,
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

describe('parseArtListingSpecs', () => {
  const sample = `<p>Dancing Queen</p><p>Photography: Color, Giclée, Photo and Digital on Paper.</p><p>Photography Size: 20 H x 24 W x 0.2 in</p><p>Ships in a tube</p><p>Each work here will be presented as a "unique" piece.</p>`;

  it('extracts medium, dimensions, shipping, and edition', () => {
    const specs = parseArtListingSpecs(sample);
    expect(specs.map(s => s.key)).toEqual(['medium', 'dimensions', 'shipping', 'edition']);
    expect(specs[0].value).toContain('Giclée');
    expect(specs[1].value).toBe('20 H x 24 W x 0.2 in');
    expect(specs[2].value).toBe('Ships in a tube');
    expect(specs[3].value).toBe(ART_LISTING_UNIQUE_EDITION);
  });
});
