import { stripProductHtml } from '@/lib/ssrProduct';

export interface SsrProfileData {
  peerID?: string;
  name?: string;
  handle?: string;
  about?: string;
  shortDescription?: string;
  avatarHashes?: { medium?: string; small?: string; original?: string };
  headerHashes?: { medium?: string; original?: string };
  stats?: { listingCount?: number; followerCount?: number };
}

/** Plain-text excerpt for OG / Twitter / JSON-LD (never emit raw HTML tags). */
export function profilePlainTextExcerpt(
  profile: Pick<SsrProfileData, 'name' | 'handle' | 'about' | 'shortDescription'>,
  options?: { heroDescription?: string; maxLength?: number; peerId?: string }
): string {
  const maxLength = options?.maxLength ?? 160;
  const name = profile.name || profile.handle || options?.peerId?.slice(0, 12) || 'Store';
  const raw =
    options?.heroDescription?.trim() ||
    profile.shortDescription?.trim() ||
    profile.about?.trim() ||
    '';
  const plain = stripProductHtml(raw).replace(/\s+/g, ' ').trim();
  if (plain) {
    return plain.length > maxLength ? `${plain.slice(0, maxLength - 1).trim()}…` : plain;
  }
  return `Browse products from ${name} on Mobazha`;
}
