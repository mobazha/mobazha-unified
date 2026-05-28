import type { Metadata } from 'next';
import { getCanonicalSiteUrl, isNamedStorefrontRequest } from '@/lib/siteUrl';
import {
  buildProductOgImageUrl,
  fetchSsrProduct,
  stripProductHtml,
  type SsrProductData,
} from '@/lib/ssrProduct';

export async function buildProductPageMetadata(slug: string, peerID?: string): Promise<Metadata> {
  const [product, canonicalSiteUrl, namedStorefront] = await Promise.all([
    fetchSsrProduct(slug, peerID),
    getCanonicalSiteUrl(),
    isNamedStorefrontRequest(),
  ]);

  if (!product?.item) {
    return { title: 'Product Not Found' };
  }

  const title = product.item.title || slug;
  const rawDescription = product.item.description || '';
  const description = stripProductHtml(rawDescription).slice(0, 160) || `Buy ${title} on Mobazha`;
  const canonicalUrl = `${canonicalSiteUrl}/product/${slug}`;
  const ogImageUrl = buildProductOgImageUrl(canonicalSiteUrl, slug, peerID);

  const currency =
    product.metadata?.pricingCurrency?.code || product.item.priceCurrency?.code || '';
  const price = product.item.price;
  const productOtherMeta: Record<string, string> = {};
  if (price !== undefined) {
    productOtherMeta['product:price:amount'] = String(price);
  }
  if (currency) {
    productOtherMeta['product:price:currency'] = currency;
  }
  productOtherMeta['product:availability'] = 'in stock';
  if (product.item.condition) {
    productOtherMeta['product:condition'] =
      product.item.condition.toLowerCase() === 'new' ? 'new' : 'used';
  }
  productOtherMeta['og:type'] = 'product';

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
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
    other: productOtherMeta,
  };
}

export type { SsrProductData };
