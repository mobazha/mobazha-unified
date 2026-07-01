import React from 'react';
import {
  resolveProductPagePeerID,
  resolveListingDisplayPrice,
  formatListingPriceForSchema,
} from '@mobazha/core';
import { getCanonicalSiteUrl, getSiteUrl } from '@/lib/siteUrl';
import { getRequestSearchParam } from '@/lib/requestUrl';
import {
  buildProductPageUrl,
  fetchSsrProduct,
  getSsrProductMediaUrl,
  stripProductHtml,
  type SsrProductData,
} from '@/lib/ssrProduct';

function buildJsonLd(product: SsrProductData | null, siteUrl: string, peerID?: string) {
  if (!product?.item) return null;
  const title = product.item.title || product.slug;
  const description = stripProductHtml(product.item.description || '').slice(0, 500);
  const firstImage = product.item.images?.[0];
  const imageUrl = getSsrProductMediaUrl(firstImage?.medium || firstImage?.original);
  const currency = product.item.priceCurrency?.code?.trim();
  const divisibility = product.item.priceCurrency?.divisibility ?? 2;
  const displayPrice = resolveListingDisplayPrice({
    basePrice: product.item.price ?? 0,
    skus: product.item.skus,
  });
  const hasOffer = displayPrice.minAmountString !== '0' && !!currency;
  const price = hasOffer
    ? formatListingPriceForSchema(displayPrice.minAmountString, divisibility)
    : undefined;

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
    ...(hasOffer &&
      price && {
        offers: {
          '@type': 'Offer',
          price,
          priceCurrency: currency,
          availability: 'https://schema.org/InStock',
          url: buildProductPageUrl(siteUrl, product.slug, peerID),
        },
      }),
  };
}

function buildBreadcrumbLd(product: SsrProductData | null, siteUrl: string) {
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
  const peerID = await getRequestSearchParam('peerID');
  const [product, canonicalSiteUrl, currentSiteUrl] = await Promise.all([
    fetchSsrProduct(slug, peerID),
    getCanonicalSiteUrl(),
    getSiteUrl(),
  ]);
  const scopedPeerID = resolveProductPagePeerID(peerID, product?.vendorID?.peerID);
  const jsonLd = buildJsonLd(product, canonicalSiteUrl, scopedPeerID);
  const breadcrumbLd = buildBreadcrumbLd(product, canonicalSiteUrl);
  const oembedDiscoverUrl = buildProductPageUrl(currentSiteUrl, slug, scopedPeerID);
  const oembedUrl = `${currentSiteUrl}/api/oembed?url=${encodeURIComponent(oembedDiscoverUrl)}&format=json`;

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
