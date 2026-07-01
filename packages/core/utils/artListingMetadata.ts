const UNIQUE_PIECE_TAGS = new Set(['unique-piece', 'unique', 'one-of-one', '1-of-1']);

export type ArtListingSpecKey = 'medium' | 'dimensions' | 'shipping' | 'edition';

export interface ArtListingSpecRow {
  key: ArtListingSpecKey;
  value: string;
}

/** Sentinel value — render with product.artSpecs.uniqueEdition i18n. */
export const ART_LISTING_UNIQUE_EDITION = '__unique_edition__';

const VERISART_URL_PATTERN =
  /https?:\/\/(?:www\.)?verisart\.com\/works\/[a-f0-9-]+(?:\/[^\s"'<>]*)?/i;

const VERISART_HREF_PATTERN =
  /href=["'](https?:\/\/(?:www\.)?verisart\.com\/works\/[a-f0-9-]+(?:\/[^"']*)?)["']/i;

/** True when listing tags mark a one-of-a-kind artwork. */
export function isUniquePieceListing(tags: readonly string[] | undefined): boolean {
  if (!tags?.length) return false;
  return tags.some(tag => UNIQUE_PIECE_TAGS.has(tag.toLowerCase().trim()));
}

/** Extract Verisart (or similar) certificate URL embedded in listing HTML. */
export function extractAuthenticityCertificateUrl(html: string | undefined | null): string | null {
  if (!html?.trim()) return null;
  const hrefMatch = html.match(VERISART_HREF_PATTERN);
  if (hrefMatch?.[1]) return hrefMatch[1];
  const plainMatch = html.match(VERISART_URL_PATTERN);
  return plainMatch?.[0] ?? null;
}

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractParagraphTexts(html: string): string[] {
  const matches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) ?? [];
  if (matches.length === 0) {
    const plain = stripHtmlToPlain(html);
    return plain ? [plain] : [];
  }
  return matches.map(paragraph => stripHtmlToPlain(paragraph));
}

/** Parse sn6op-style artwork description HTML into structured spec rows. */
export function parseArtListingSpecs(html: string | undefined | null): ArtListingSpecRow[] {
  if (!html?.trim()) return [];

  const specs: ArtListingSpecRow[] = [];
  const paragraphs = extractParagraphTexts(html);

  for (const text of paragraphs) {
    if (!text) continue;

    if (/^(Photography|Medium):/i.test(text)) {
      const value = text.replace(/^(Photography|Medium):\s*/i, '').trim();
      if (value) specs.push({ key: 'medium', value });
      continue;
    }

    if (/(?:Photography )?Size:\s*.+\bx.+/i.test(text) || /\d+\s*H\s*x\s*\d+\s*W/i.test(text)) {
      const value = text.replace(/^(?:Photography )?Size:\s*/i, '').trim();
      if (value) specs.push({ key: 'dimensions', value });
      continue;
    }

    if (/^Ships in/i.test(text)) {
      specs.push({ key: 'shipping', value: text });
      continue;
    }

    if (/unique.*piece|no limited edition|numbered edition/i.test(text)) {
      specs.push({ key: 'edition', value: ART_LISTING_UNIQUE_EDITION });
    }
  }

  const seen = new Set<ArtListingSpecKey>();
  return specs.filter(row => {
    if (seen.has(row.key)) return false;
    seen.add(row.key);
    return true;
  });
}
