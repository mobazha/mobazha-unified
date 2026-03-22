import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { EmbedResizer } from '../../_components/EmbedResizer';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';

export const revalidate = 300;

interface ProfileData {
  peerID?: string;
  name?: string;
  handle?: string;
  location?: string;
  about?: string;
  shortDescription?: string;
  avatarHashes?: { medium?: string; small?: string; original?: string };
  headerHashes?: { large?: string; medium?: string; original?: string };
  stats?: { listingCount?: number; averageRating?: number; ratingCount?: number };
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

async function getSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) {
      const proto = h.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`;
    }
  } catch {
    /* fallback below */
  }
  return 'https://app.mobazha.org';
}

async function fetchProfile(peerId: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/profiles/${peerId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return unwrapEnvelope<ProfileData>(await res.json());
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
  const name = profile?.name || profile?.handle || peerId.slice(0, 12);
  return {
    title: `${name} — Mobazha Embed`,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ peerId: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { peerId } = await params;
  const { theme } = await searchParams;
  const [profile, siteUrl] = await Promise.all([fetchProfile(peerId), getSiteUrl()]);
  const isDark = theme === 'dark';

  if (!profile) {
    return (
      <div
        className={`flex items-center justify-center p-8 ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-zinc-500'}`}
      >
        <p>Store not found</p>
      </div>
    );
  }

  const name = profile.name || profile.handle || peerId.slice(0, 12);
  const about = profile.shortDescription || profile.about || '';
  const avatarUrl = getImageUrl(
    profile.avatarHashes?.medium || profile.avatarHashes?.small || profile.avatarHashes?.original
  );
  const headerUrl = getImageUrl(
    profile.headerHashes?.large || profile.headerHashes?.medium || profile.headerHashes?.original
  );
  const listingCount = profile.stats?.listingCount ?? 0;
  const avgRating = profile.stats?.averageRating ?? 0;
  const ratingCount = profile.stats?.ratingCount ?? 0;

  const storeUrl = `${siteUrl}/store/${peerId}?utm_source=embed&utm_medium=iframe&utm_campaign=store_card`;

  const bg = isDark ? 'bg-zinc-900' : 'bg-white';
  const border = isDark ? 'border-zinc-700' : 'border-zinc-200';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const textSecondary = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const textMuted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50';
  const avatarBg = isDark ? 'bg-zinc-800' : 'bg-zinc-100';

  return (
    <div className={`${bg} p-2`}>
      <div
        className={`border ${border} rounded-xl overflow-hidden max-w-[600px] mx-auto`}
        data-testid="embed-store-card"
      >
        {/* Header banner */}
        {headerUrl && (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="h-16 overflow-hidden">
              <img src={headerUrl} alt="" className="w-full h-full object-cover" loading="eager" />
            </div>
          </a>
        )}

        <div className="flex flex-row items-center p-4 gap-3">
          {/* Avatar */}
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-12 h-12 rounded-full object-cover"
                loading="eager"
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full ${avatarBg} flex items-center justify-center`}
              >
                <span className={`text-lg font-bold ${textSecondary}`}>
                  {name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </a>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`block font-semibold text-sm ${textPrimary} hover:underline truncate`}
            >
              {name}
            </a>
            {about && <p className={`text-xs ${textSecondary} mt-0.5 line-clamp-1`}>{about}</p>}
            <div className={`flex items-center gap-1.5 text-xs ${textMuted} mt-0.5 flex-wrap`}>
              {profile.location && (
                <>
                  <span>📍 {profile.location}</span>
                  <span>·</span>
                </>
              )}
              <span>
                {listingCount} {listingCount === 1 ? 'product' : 'products'}
              </span>
              {ratingCount > 0 && (
                <>
                  <span>·</span>
                  <span className="text-yellow-500">★</span>
                  <span>
                    {avgRating.toFixed(1)} ({ratingCount})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="shrink-0 flex flex-col items-center">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border ${border} ${textPrimary} ${hoverBg} transition-colors whitespace-nowrap`}
            >
              Visit Store →
            </a>
            <span className={`text-[10px] ${textMuted} mt-1`}>on Mobazha</span>
          </div>
        </div>
      </div>

      <EmbedResizer />
    </div>
  );
}
