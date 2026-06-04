import { ImageResponse } from 'next/og';

export const alt = 'Store on Mobazha';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

import { SSR_API_BASE } from '@/lib/ssrApiBase';

const API_BASE = SSR_API_BASE;
const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

interface ProfileData {
  peerID?: string;
  name?: string;
  handle?: string;
  about?: string;
  avatarHashes?: { medium?: string; small?: string; original?: string };
  stats?: { listingCount?: number; followerCount?: number };
}

function getImageUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
  if (MEDIA_CDN) return `${MEDIA_CDN}/${hash}`;
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

export default async function Image({ params }: { params: Promise<{ peerId: string }> }) {
  const { peerId } = await params;
  const profile = await fetchProfile(peerId);

  const name = profile?.name || profile?.handle || peerId.slice(0, 12);
  const about = profile?.about?.slice(0, 120) || '';
  const avatarUrl = getImageUrl(profile?.avatarHashes?.medium || profile?.avatarHashes?.small);
  const listingCount = profile?.stats?.listingCount ?? 0;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '48px',
        gap: '24px',
      }}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          width={120}
          height={120}
          style={{
            borderRadius: '50%',
            objectFit: 'cover',
            border: '3px solid rgba(255,255,255,0.15)',
          }}
        />
      ) : (
        <div
          style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Store name */}
      <div
        style={{
          fontSize: '48px',
          fontWeight: 700,
          color: '#f8fafc',
          textAlign: 'center',
          lineHeight: 1.2,
        }}
      >
        {name}
      </div>

      {/* About text */}
      {about && (
        <div
          style={{
            fontSize: '22px',
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.4,
          }}
        >
          {about}
        </div>
      )}

      {/* Stats */}
      {listingCount > 0 && (
        <div
          style={{
            fontSize: '18px',
            color: '#64748b',
            display: 'flex',
            gap: '6px',
          }}
        >
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>{listingCount}</span>
          <span>products</span>
        </div>
      )}

      {/* Branding */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: '24px',
        }}
      >
        <div
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#64748b',
            letterSpacing: '0.05em',
          }}
        >
          MOBAZHA
        </div>
        <div
          style={{
            fontSize: '14px',
            color: '#475569',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid #334155',
          }}
        >
          Decentralized Marketplace
        </div>
      </div>
    </div>,
    { ...size }
  );
}
