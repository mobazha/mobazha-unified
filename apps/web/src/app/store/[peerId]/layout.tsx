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

function getImageUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
  return `${API_BASE}/v1/media/images/${hash}`;
}

async function fetchProfile(peerId: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/profiles/${peerId}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ peerId: string }>;
}): Promise<Metadata> {
  const { peerId } = await params;
  const profile = await fetchProfile(peerId);

  if (!profile) {
    return { title: 'Store Not Found' };
  }

  const name = profile.name || profile.handle || peerId.slice(0, 12);
  const title = `${name}'s Store`;
  const description = profile.about
    ? profile.about.slice(0, 160)
    : `Browse products from ${name} on Mobazha`;
  const avatarUrl = getImageUrl(profile.avatarHashes?.medium || profile.avatarHashes?.small);
  const headerUrl = getImageUrl(profile.headerHashes?.medium || profile.headerHashes?.original);
  const ogImage = headerUrl || avatarUrl;

  const canonicalUrl = `${SITE_URL}/store/${peerId}`;

  return {
    title,
    description,
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
