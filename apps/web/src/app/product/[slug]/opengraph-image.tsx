import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Product on Mobazha';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';
const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

interface ProductData {
  slug: string;
  item?: {
    title?: string;
    images?: Array<{ medium?: string; small?: string; original?: string }>;
    price?: number;
    priceCurrency?: { code?: string };
  };
  vendorID?: { peerID?: string; handle?: string };
  metadata?: { pricingCurrency?: { code?: string } };
}

function getImageUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
  if (MEDIA_CDN) return `${MEDIA_CDN}/${hash}`;
  return `${API_BASE}/v1/media/images/${hash}`;
}

async function fetchProduct(slug: string): Promise<ProductData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/listings/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.listing || data || null;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  const title = product?.item?.title || 'Product';
  const currency =
    product?.metadata?.pricingCurrency?.code || product?.item?.priceCurrency?.code || '';
  const price = product?.item?.price;
  const priceText = price !== undefined && currency ? `${price} ${currency}` : '';
  const vendorName = product?.vendorID?.handle || '';
  const firstImage = product?.item?.images?.[0];
  const imageUrl = getImageUrl(firstImage?.medium || firstImage?.original);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '48px',
      }}
    >
      {/* Product image */}
      {imageUrl && (
        <div
          style={{
            width: '360px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src={imageUrl}
            alt=""
            width={340}
            height={340}
            style={{
              borderRadius: '16px',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          />
        </div>
      )}

      {/* Text content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
          paddingLeft: imageUrl ? '40px' : '0',
          gap: '16px',
        }}
      >
        <div
          style={{
            fontSize: '42px',
            fontWeight: 700,
            color: '#f8fafc',
            lineHeight: 1.2,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </div>

        {priceText && (
          <div
            style={{
              fontSize: '36px',
              fontWeight: 600,
              color: '#38bdf8',
            }}
          >
            {priceText}
          </div>
        )}

        {vendorName && (
          <div
            style={{
              fontSize: '22px',
              color: '#94a3b8',
              marginTop: '8px',
            }}
          >
            by {vendorName}
          </div>
        )}

        {/* Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: 'auto',
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
      </div>
    </div>,
    { ...size }
  );
}
