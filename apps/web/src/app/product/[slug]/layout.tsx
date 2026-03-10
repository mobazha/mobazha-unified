import type { Metadata } from 'next';
import React from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:15104';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://store.mobazha.org';

interface ProductData {
  slug: string;
  item?: {
    title?: string;
    description?: string;
    images?: Array<{ medium?: string; small?: string; original?: string }>;
    price?: number;
    priceCurrency?: { code?: string };
    condition?: string;
    categories?: string[];
  };
  vendorID?: { peerID?: string; handle?: string };
  hash?: string;
}

function getImageUrl(hash?: string): string | undefined {
  if (!hash) return undefined;
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

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product?.item) {
    return { title: 'Product Not Found' };
  }

  const title = product.item.title || slug;
  const rawDescription = product.item.description || '';
  const description = stripHtml(rawDescription).slice(0, 160) || `Buy ${title} on Mobazha`;
  const canonicalUrl = `${SITE_URL}/product/${slug}`;
  const ogImageUrl = `${SITE_URL}/product/${slug}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: 'website',
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

function buildJsonLd(product: ProductData | null) {
  if (!product?.item) return null;
  const title = product.item.title || product.slug;
  const description = stripHtml(product.item.description || '').slice(0, 500);
  const firstImage = product.item.images?.[0];
  const imageUrl = getImageUrl(firstImage?.medium || firstImage?.original);
  const currency = product.item.priceCurrency?.code || 'USD';
  const price = product.item.price;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description,
    ...(imageUrl && { image: imageUrl }),
    ...(product.vendorID?.handle && {
      brand: { '@type': 'Brand', name: product.vendorID.handle },
    }),
    ...(product.item.condition && {
      itemCondition:
        product.item.condition === 'New'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
    }),
    ...(price !== undefined && {
      offers: {
        '@type': 'Offer',
        price: String(price),
        priceCurrency: currency,
        availability: 'https://schema.org/InStock',
        url: `${SITE_URL}/product/${product.slug}`,
      },
    }),
  };
}

function buildBreadcrumbLd(product: ProductData | null) {
  if (!product?.item) return null;
  const title = product.item.title || product.slug;
  const items: Array<{ '@type': string; position: number; name: string; item?: string }> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${SITE_URL}/marketplace` },
  ];

  if (product.vendorID?.peerID) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: product.vendorID.handle || 'Store',
      item: `${SITE_URL}/store/${product.vendorID.peerID}`,
    });
    items.push({ '@type': 'ListItem', position: 4, name: title });
  } else {
    items.push({ '@type': 'ListItem', position: 3, name: title });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  const jsonLd = buildJsonLd(product);
  const breadcrumbLd = buildBreadcrumbLd(product);
  const canonicalUrl = `${SITE_URL}/product/${slug}`;
  const oembedUrl = `${SITE_URL}/api/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

  return (
    <>
      <link
        rel="alternate"
        type="application/json+oembed"
        href={oembedUrl}
        title={product?.item?.title || slug}
      />
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/<\/script/gi, '<\\/script'),
          }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbLd).replace(/<\/script/gi, '<\\/script'),
          }}
        />
      )}
      {children}
    </>
  );
}
