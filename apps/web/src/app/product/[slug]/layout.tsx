import type { Metadata } from 'next';
import React from 'react';
import { getCanonicalSiteUrl, getSiteUrl, isNamedStorefrontRequest } from '@/lib/siteUrl';

import { SSR_API_BASE } from '@/lib/ssrApiBase';

const API_BASE = SSR_API_BASE;
const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;

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
  const [product, canonicalSiteUrl, namedStorefront] = await Promise.all([
    fetchProduct(slug),
    getCanonicalSiteUrl(),
    isNamedStorefrontRequest(),
  ]);

  if (!product?.item) {
    return { title: 'Product Not Found' };
  }

  const title = product.item.title || slug;
  const rawDescription = product.item.description || '';
  const description = stripHtml(rawDescription).slice(0, 160) || `Buy ${title} on Mobazha`;
  // Canonical & OG URL always point at the main store domain (MS2a.3) —
  // named storefronts share the underlying product so we consolidate SEO
  // signals onto the canonical host. Breadcrumbs/JSON-LD `url` fields also
  // use the canonical host for consistency.
  const canonicalUrl = `${canonicalSiteUrl}/product/${slug}`;
  const ogImageUrl = `${canonicalSiteUrl}/product/${slug}/opengraph-image`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    // Named storefronts (subdomain variants that filter the main store) are
    // marked noindex so search engines only crawl the canonical URL. Links
    // remain followable so internal navigation and buyer shares still work.
    ...(namedStorefront && { robots: { index: false, follow: true } }),
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

function buildJsonLd(product: ProductData | null, siteUrl: string) {
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
        url: `${siteUrl}/product/${product.slug}`,
      },
    }),
  };
}

function buildBreadcrumbLd(product: ProductData | null, siteUrl: string) {
  if (!product?.item) return null;
  const title = product.item.title || product.slug;
  const items: Array<{ '@type': string; position: number; name: string; item?: string }> = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Marketplace', item: `${siteUrl}/marketplace` },
  ];

  if (product.vendorID?.peerID) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: product.vendorID.handle || 'Store',
      item: `${siteUrl}/store/${product.vendorID.peerID}`,
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
  const [product, canonicalSiteUrl, currentSiteUrl] = await Promise.all([
    fetchProduct(slug),
    getCanonicalSiteUrl(),
    getSiteUrl(),
  ]);
  // JSON-LD and breadcrumb items reference the canonical store URL so
  // Schema.org graphs don't fork per storefront subdomain (MS2a.3).
  const jsonLd = buildJsonLd(product, canonicalSiteUrl);
  const breadcrumbLd = buildBreadcrumbLd(product, canonicalSiteUrl);
  const canonicalUrl = `${canonicalSiteUrl}/product/${slug}`;
  // oEmbed endpoint must live on the *current* host — it's served by this
  // Next.js deployment regardless of which storefront the user hit. Only the
  // `url` parameter points at the canonical product URL.
  const oembedUrl = `${currentSiteUrl}/api/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

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
