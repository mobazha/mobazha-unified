'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, Grid, VStack } from '@/components/layouts';
import { ProductCard, type ProductContractType, type RwaTradeMode } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Layers, Loader2 } from 'lucide-react';
import {
  collectionsApi,
  productDataService,
  getImageUrl,
  useI18n,
  useUserStore,
  useStorefrontMode,
  getStorefrontPeerID,
  productCardPriceFieldsFromListItem,
} from '@mobazha/core';
import type { Collection, ProductListItem } from '@mobazha/core';
import { useProductModal } from '@/hooks';

export default function CollectionDetailPage() {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useUserStore();
  const standalone = useStorefrontMode();
  const peerId = standalone ? getStorefrontPeerID() || profile?.peerID || null : null;
  const { openProduct } = useProductModal();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!peerId || !id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const col = await collectionsApi.getPublishedCollection(peerId, id);
        if (cancelled) return;
        setCollection(col);
        if (col.products && col.products.length > 0) {
          const slugToPosition = new Map(col.products.map(p => [p.listingSlug, p.position]));
          const allListings = await productDataService.getStoreListings(peerId);
          if (cancelled) return;
          const matched = (allListings || []).filter(l => slugToPosition.has(l.slug));
          matched.sort(
            (a, b) => (slugToPosition.get(a.slug) ?? 0) - (slugToPosition.get(b.slug) ?? 0)
          );
          setProducts(matched);
        }
      } catch {
        if (!cancelled) setError(t('admin.collections.fetchError'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [peerId, id, t]);

  if (loading) {
    return (
      <>
        <Header />
        <Container className="py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </Container>
        <Footer />
      </>
    );
  }

  if (error || !collection) {
    return (
      <>
        <Header />
        <Container className="py-8 text-center">
          <p className="text-destructive mb-4">
            {error || t('collections.notFound', { defaultValue: 'Collection not found' })}
          </p>
          <Button variant="outline" onClick={() => router.push('/collections')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <Container className="py-8">
        <VStack gap="lg">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/collections" className="hover:text-foreground transition-colors">
              {t('footer.collections', { defaultValue: 'Collections' })}
            </Link>
            <span>/</span>
            <span className="text-foreground">{collection.title}</span>
          </div>

          {/* Collection header */}
          <div className="space-y-2">
            {collection.image && (
              <img
                src={getImageUrl(collection.image)}
                alt={collection.title}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <h1 className="text-3xl font-bold text-foreground">{collection.title}</h1>
            {collection.description && (
              <p className="text-muted-foreground max-w-2xl">{collection.description}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('admin.collections.productsCount', { count: products.length })}
            </p>
          </div>

          {/* Products grid */}
          {products.length === 0 ? (
            <div className="text-center py-16">
              <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {t('collections.noProducts', { defaultValue: 'No products in this collection' })}
              </p>
            </div>
          ) : (
            <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
              {products.map(product => {
                const priceFields = productCardPriceFieldsFromListItem(product);
                return (
                  <ProductCard
                    key={product.slug}
                    title={product.title}
                    imageUrl={getImageUrl(product.thumbnail?.medium)}
                    price={priceFields.price}
                    currency={priceFields.currencyCode}
                    divisibility={priceFields.divisibility}
                    priceFrom={priceFields.priceFrom}
                    contractType={product.contractType as ProductContractType}
                    rwaTradeMode={product.rwaTradeMode as RwaTradeMode}
                    vendorPeerID={peerId ?? undefined}
                    rating={product.averageRating}
                    reviewCount={product.ratingCount}
                    onClick={() => openProduct(product.slug, peerId ?? undefined)}
                  />
                );
              })}
            </Grid>
          )}
        </VStack>
      </Container>
      <Footer />
    </>
  );
}
