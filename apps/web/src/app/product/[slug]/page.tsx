import type { Metadata } from 'next';
import ProductPageClient from './ProductPageClient';
import { buildProductPageMetadata } from '@/lib/productPageMetadata';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ peerID?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { peerID } = await searchParams;
  return buildProductPageMetadata(slug, peerID);
}

export default function ProductPage() {
  return <ProductPageClient />;
}
