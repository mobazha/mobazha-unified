import type { Metadata } from 'next';
import React from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.mobazha.org';

interface ProfileData {
  peerID?: string;
  name?: string;
  handle?: string;
  about?: string;
  avatarHashes?: { medium?: string; small?: string; original?: string };
  headerHashes?: { medium?: string; original?: string };
  stats?: { listingCount?: number; followerCount?: number };
}

interface StorefrontData {
  theme?: { primaryColor?: string };
  sections?: Array<{
    type: string;
    visible?: boolean;
    props?: Record<string, unknown>;
  }>;
}

function getImageUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
  return `${API_BASE}/v1/media/images/${hash}`;
}

function unwrapEnvelope<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

async function fetchProfile(peerId: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/profiles/${peerId}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return unwrapEnvelope<ProfileData>(await res.json());
  } catch {
    return null;
  }
}

async function fetchStorefrontConfig(peerId: string): Promise<StorefrontData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/settings/storefront/${peerId}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return unwrapEnvelope<StorefrontData>(await res.json());
  } catch {
    return null;
  }
}

function extractHeroMeta(config: StorefrontData | null): {
  title?: string;
  description?: string;
  imageHash?: string;
} {
  if (!config?.sections) return {};
  const hero = config.sections.find(s => s.type === 'hero' && s.visible !== false);
  if (!hero?.props) return {};
  return {
    title: typeof hero.props.title === 'string' ? hero.props.title : undefined,
    description: typeof hero.props.subtitle === 'string' ? hero.props.subtitle : undefined,
    imageHash:
      typeof hero.props.backgroundImage === 'string' ? hero.props.backgroundImage : undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ peerId: string }>;
}): Promise<Metadata> {
  const { peerId } = await params;
  const [profile, storefront] = await Promise.all([
    fetchProfile(peerId),
    fetchStorefrontConfig(peerId),
  ]);

  if (!profile) {
    return { title: 'Store Not Found' };
  }

  const heroMeta = extractHeroMeta(storefront);
  const name = profile.name || profile.handle || peerId.slice(0, 12);
  const title = heroMeta.title || `${name}'s Store`;
  const description =
    heroMeta.description ||
    (profile.about ? profile.about.slice(0, 160) : `Browse products from ${name} on Mobazha`);

  const avatarUrl = getImageUrl(profile.avatarHashes?.medium || profile.avatarHashes?.small);
  const headerUrl = getImageUrl(profile.headerHashes?.medium || profile.headerHashes?.original);
  const heroImageUrl = getImageUrl(heroMeta.imageHash);
  const ogImage = heroImageUrl || headerUrl || avatarUrl;

  const canonicalUrl = `${SITE_URL}/store/${peerId}`;
  const themeColor = storefront?.theme?.primaryColor;

  return {
    title,
    description,
    ...(themeColor && { themeColor }),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'profile',
      title,
      description,
      url: canonicalUrl,
      ...(ogImage && {
        images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
