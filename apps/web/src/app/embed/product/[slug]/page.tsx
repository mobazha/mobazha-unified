import React from 'react';
import type { Metadata } from 'next';
import {
  buildEmbedProductHref,
  resolveListingDisplayPrice,
  formatListingPriceForSchema,
} from '@mobazha/core';
import { EmbedResizer } from '../../_components/EmbedResizer';
import { getSiteUrl } from '@/lib/siteUrl';

import { SSR_API_BASE } from '@/lib/ssrApiBase';

const API_BASE = SSR_API_BASE;

export const revalidate = 300;

interface ProductData {
  slug: string;
  item?: {
    title?: string;
    description?: string;
    images?: Array<{ medium?: string; small?: string; original?: string }>;
    price?: number;
    skus?: Array<{ price?: string }>;
    priceCurrency?: { code?: string; divisibility?: number };
  };
  vendorID?: { peerID?: string; handle?: string };
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

async function fetchProduct(slug: string, peerID: string): Promise<ProductData | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/listings/${peerID}/${slug}?usecache=true`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const raw = unwrapEnvelope<{ listing?: ProductData } & ProductData>(await res.json());
    return raw?.listing ?? raw ?? null;
  } catch {
    return null;
  }
}

function formatStandardPrice(standardAmount: string, currency: string): string {
  const trimmed = standardAmount.trim();
  if (!trimmed || trimmed === '0') return '';
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 8,
      }).format(asNumber);
    } catch {
      // fall through to string label
    }
  }
  return `${trimmed} ${currency}`;
}

function resolveEmbedDisplayPrice(item: NonNullable<ProductData['item']>): string {
  const currency = item.priceCurrency?.code?.trim();
  const divisibility = item.priceCurrency?.divisibility ?? 2;
  const snapshot = resolveListingDisplayPrice({
    basePrice: item.price ?? 0,
    skus: item.skus,
  });
  if (snapshot.minAmountString === '0' || !currency) {
    return currency ? '' : '—';
  }
  const formatted = formatStandardPrice(
    formatListingPriceForSchema(snapshot.minAmountString, divisibility),
    currency
  );
  return snapshot.hasPriceRange ? `From ${formatted}` : formatted;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[^;]+;/g, ' ')
    .trim();
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ peerID?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { peerID } = await searchParams;
  if (!peerID) return { title: 'Mobazha Embed', robots: { index: false, follow: false } };
  const product = await fetchProduct(slug, peerID);
  const title = product?.item?.title || slug;
  return {
    title: `${title} — Mobazha Embed`,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ peerID?: string; theme?: string }>;
}) {
  const { slug } = await params;
  const { peerID, theme } = await searchParams;
  const isDark = theme === 'dark';

  if (!peerID) {
    return (
      <div
        className={`flex items-center justify-center p-8 ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-zinc-500'}`}
      >
        <p>Missing peerID parameter</p>
      </div>
    );
  }

  const [product, siteUrl] = await Promise.all([fetchProduct(slug, peerID), getSiteUrl()]);

  if (!product?.item) {
    return (
      <div
        className={`flex items-center justify-center p-8 ${isDark ? 'bg-zinc-900 text-zinc-400' : 'bg-white text-zinc-500'}`}
      >
        <p>Product not found</p>
      </div>
    );
  }

  const { item, vendorID } = product;
  const firstImage = item.images?.[0];
  const imageUrl = getImageUrl(firstImage?.medium || firstImage?.small || firstImage?.original);
  const title = item.title || slug;
  const price = resolveEmbedDisplayPrice(item);
  const description = item.description ? stripHtml(item.description).slice(0, 100) : '';
  const vendorName = vendorID?.handle || '';
  const vendorPeerID = peerID || vendorID?.peerID || '';

  const productUrl = buildEmbedProductHref(slug, vendorPeerID || undefined, siteUrl);

  const storeUrl = vendorPeerID
    ? `${siteUrl}/store/${vendorPeerID}?utm_source=embed&utm_medium=iframe&utm_campaign=product_card`
    : '';

  const bg = isDark ? 'bg-zinc-900' : 'bg-white';
  const border = isDark ? 'border-zinc-700' : 'border-zinc-200';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const textSecondary = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const textMuted = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const hoverBg = isDark ? 'hover:bg-zinc-800' : 'hover:bg-zinc-50';

  return (
    <div className={`${bg} p-2`}>
      <div
        className={`border ${border} rounded-xl overflow-hidden max-w-[600px] mx-auto`}
        data-testid="embed-product-card"
      >
        <div className="flex flex-row">
          {/* Image */}
          {imageUrl && (
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] overflow-hidden"
            >
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </a>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
            <div>
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`block font-semibold text-sm leading-tight ${textPrimary} hover:underline line-clamp-2`}
              >
                {title}
              </a>
              {description && (
                <p className={`text-xs ${textSecondary} mt-1 line-clamp-2`}>{description}</p>
              )}
            </div>

            <div className="mt-2">
              {price && <span className={`font-bold text-base ${textPrimary}`}>{price}</span>}
              {vendorName && storeUrl && (
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block text-xs ${textMuted} mt-0.5 hover:underline truncate`}
                >
                  {vendorName}
                </a>
              )}
            </div>
          </div>

          {/* CTA */}
          <div
            className={`shrink-0 flex flex-col items-center justify-center p-3 border-l border-dashed ${border}`}
          >
            <a
              href={productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border ${border} ${textPrimary} ${hoverBg} transition-colors whitespace-nowrap`}
            >
              View →
            </a>
            <span className={`text-[10px] ${textMuted} mt-1.5`}>on Mobazha</span>
          </div>
        </div>
      </div>

      <EmbedResizer />
    </div>
  );
}
