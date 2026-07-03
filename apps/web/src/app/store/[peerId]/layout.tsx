import type { Metadata, Viewport } from 'next';
import React from 'react';
import { getCanonicalSiteUrl, getSiteUrl, isNamedStorefrontRequest } from '@/lib/siteUrl';

import { SSR_API_BASE } from '@/lib/ssrApiBase';
import { profilePlainTextExcerpt, type SsrProfileData } from '@/lib/ssrProfile';

const API_BASE = SSR_API_BASE;
const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

type ProfileData = SsrProfileData;

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
  const [profile, storefront, canonicalSiteUrl, namedStorefront] = await Promise.all([
    fetchProfile(peerId),
    fetchStorefrontConfig(peerId),
    getCanonicalSiteUrl(),
    isNamedStorefrontRequest(),
  ]);

  if (!profile) {
    return { title: 'Store Not Found' };
  }

  const heroMeta = extractHeroMeta(storefront);
  const name = profile.name || profile.handle || peerId.slice(0, 12);
  const title = heroMeta.title || `${name}'s Store`;
  const description = profilePlainTextExcerpt(profile, {
    heroDescription: heroMeta.description,
    peerId,
  });

  // Canonical & OG URL always point at the main store host (MS2a.3).
  // Named storefront subdomains share the underlying profile, so we
  // consolidate SEO signals onto the canonical store URL.
  const canonicalUrl = `${canonicalSiteUrl}/store/${peerId}`;
  const ogImageUrl = `${canonicalSiteUrl}/store/${peerId}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    // Named storefronts: noindex to avoid duplicate-content with the main
    // store, follow links so internal navigation signals still propagate.
    ...(namedStorefront && { robots: { index: false, follow: true } }),
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

export async function generateViewport({
  params,
}: {
  params: Promise<{ peerId: string }>;
}): Promise<Viewport> {
  const { peerId } = await params;
  const storefront = await fetchStorefrontConfig(peerId);
  const themeColor = storefront?.theme?.primaryColor;

  return themeColor ? { themeColor } : {};
}

function buildOrganizationLd(profile: ProfileData | null, peerId: string, siteUrl: string) {
  if (!profile) return null;
  const name = profile.name || profile.handle || peerId.slice(0, 12);
  const avatarUrl = getImageUrl(
    profile.avatarHashes?.medium || profile.avatarHashes?.small,
    peerId
  );

  const orgDescription = profilePlainTextExcerpt(profile, { peerId, maxLength: 200 });
  const hasProfileText = !!(profile.shortDescription?.trim() || profile.about?.trim());

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url: `${siteUrl}/store/${peerId}`,
    ...(avatarUrl && { logo: avatarUrl }),
    ...(hasProfileText && { description: orgDescription }),
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
  const [profile, canonicalSiteUrl, currentSiteUrl] = await Promise.all([
    fetchProfile(peerId),
    getCanonicalSiteUrl(),
    getSiteUrl(),
  ]);
  // Organization JSON-LD uses the canonical store URL so the graph node is
  // stable across storefront subdomains (MS2a.3).
  const orgLd = buildOrganizationLd(profile, peerId, canonicalSiteUrl);
  const canonicalUrl = `${canonicalSiteUrl}/store/${peerId}`;
  // oEmbed endpoint lives on the current host; the embedded `url` points
  // at the canonical store URL.
  const oembedUrl = `${currentSiteUrl}/api/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;
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
