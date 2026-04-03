import type { Metadata } from 'next';
import React from 'react';
import { getSiteUrl } from '@/lib/siteUrl';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';
const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

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

function getImageUrl(hash?: string, storeHint?: string): string | undefined {
  if (!hash) return undefined;
  if (MEDIA_CDN && !storeHint) return `${MEDIA_CDN}/${hash}`;
  const base = `${API_BASE}/v1/media/images/${hash}`;
  return storeHint ? `${base}?store=${encodeURIComponent(storeHint)}` : base;
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
  const [profile, storefront, siteUrl] = await Promise.all([
    fetchProfile(peerId),
    fetchStorefrontConfig(peerId),
    getSiteUrl(),
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

  const canonicalUrl = `${siteUrl}/store/${peerId}`;
  const themeColor = storefront?.theme?.primaryColor;
  const ogImageUrl = `${siteUrl}/store/${peerId}/opengraph-image`;

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
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

function buildOrganizationLd(profile: ProfileData | null, peerId: string, siteUrl: string) {
  if (!profile) return null;
  const name = profile.name || profile.handle || peerId.slice(0, 12);
  const avatarUrl = getImageUrl(
    profile.avatarHashes?.medium || profile.avatarHashes?.small,
    peerId
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: `${siteUrl}/store/${peerId}`,
    ...(avatarUrl && { logo: avatarUrl }),
    ...(profile.about && { description: profile.about.slice(0, 200) }),
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ peerId: string }>;
}) {
  const { peerId } = await params;
  const [profile, siteUrl] = await Promise.all([fetchProfile(peerId), getSiteUrl()]);
  const orgLd = buildOrganizationLd(profile, peerId, siteUrl);
  const canonicalUrl = `${siteUrl}/store/${peerId}`;
  const oembedUrl = `${siteUrl}/api/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
  const storeName = profile?.name || profile?.handle || peerId.slice(0, 12);

  return (
    <>
      <link
        rel="alternate"
        type="application/json+oembed"
        href={oembedUrl}
        title={`${storeName}'s Store`}
      />
      {orgLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgLd).replace(/<\/script/gi, '<\\/script'),
          }}
        />
      )}
      {children}
    </>
  );
}
