import type { Metadata } from 'next';
import {
  resolveListingDisplayPrice,
  formatListingPriceForSchema,
} from '@mobazha/core/utils/listingDisplayPrice';
import { resolveProductPagePeerID } from '@mobazha/core/utils/productUrl';
import { getCanonicalSiteUrl, isNamedStorefrontRequest } from '@/lib/siteUrl';
import {
  buildProductPageUrl,
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
  const scopedPeerID = resolveProductPagePeerID(peerID, product.vendorID?.peerID);
  const canonicalUrl = buildProductPageUrl(canonicalSiteUrl, slug, scopedPeerID);
  const ogImageUrl = buildProductOgImageUrl(canonicalSiteUrl, slug, scopedPeerID);

  const currency =
    product.metadata?.pricingCurrency?.code || product.item.priceCurrency?.code || '';
  const divisibility =
    product.item.priceCurrency?.divisibility ??
    product.metadata?.pricingCurrency?.divisibility ??
    2;
  const displayPrice = resolveListingDisplayPrice({
    basePrice: product.item.price ?? 0,
    skus: product.item.skus,
  });
  const productOtherMeta: Record<string, string> = {};
  if (displayPrice.minAmountString !== '0') {
    productOtherMeta['product:price:amount'] = formatListingPriceForSchema(
      displayPrice.minAmountString,
      divisibility
    );
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
