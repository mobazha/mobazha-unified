const UNIQUE_PIECE_TAGS = new Set(['unique-piece', 'unique', 'one-of-one', '1-of-1']);

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
