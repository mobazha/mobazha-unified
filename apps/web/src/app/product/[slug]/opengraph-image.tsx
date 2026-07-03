import { ImageResponse } from 'next/og';
import { fetchSsrProduct, getSsrProductMediaUrl } from '@/lib/ssrProduct';
import { getRequestSearchParam } from '@/lib/requestUrl';

export const alt = 'Product on Mobazha';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // opengraph-image only receives params (not searchParams); peerID comes from proxy header.
  const peerID = await getRequestSearchParam('peerID');
  const product = await fetchSsrProduct(slug, peerID);

  const title = product?.item?.title || 'Product';
  const currency =
    product?.metadata?.pricingCurrency?.code || product?.item?.priceCurrency?.code || '';
  const price = product?.item?.price;
  const priceText = price !== undefined && currency ? `${price} ${currency}` : '';
  const vendorName = product?.vendorID?.handle || '';
  const firstImage = product?.item?.images?.[0];
  const imageUrl = getSsrProductMediaUrl(firstImage?.medium || firstImage?.original);
  const isDigital = product?.metadata?.contractType === 'DIGITAL_GOOD';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        padding: '48px',
        position: 'relative',
      }}
    >
      {isDigital && (
        <div
          style={{
            position: 'absolute',
            top: '32px',
            right: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: 'rgba(56, 189, 248, 0.15)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#7dd3fc',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Digital
        </div>
      )}
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
