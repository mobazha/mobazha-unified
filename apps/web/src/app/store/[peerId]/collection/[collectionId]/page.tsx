'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, Grid, VStack } from '@/components/layouts';
import { ProductCard, type ProductContractType, type RwaTradeMode } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Layers, Loader2 } from 'lucide-react';
import { collectionsApi, productDataService, useI18n, getImageUrl } from '@mobazha/core';
import type { Collection, ProductListItem } from '@mobazha/core';
import { useProductModal } from '@/hooks';

export default function StoreCollectionPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { openProduct } = useProductModal();
  const peerId = params.peerId as string;
  const collectionId = params.collectionId as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!collectionId) return;
    let cancelled = false;
    (async () => {
      try {
        const col = await collectionsApi.getPublishedCollection(collectionId);
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
  }, [collectionId, peerId, t]);

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
          <p className="text-destructive mb-4">{error || t('admin.collections.fetchError')}</p>
          <Button variant="outline" onClick={() => router.push(`/store/${peerId}`)}>
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
            <Link href={`/store/${peerId}`} className="hover:text-foreground transition-colors">
              {t('common.store')}
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
              <p className="text-muted-foreground">{t('admin.collections.noProducts')}</p>
            </div>
          ) : (
            <Grid cols={{ default: 2, sm: 2, md: 3, lg: 4 }} gap="md">
              {products.map(product => (
                <ProductCard
                  key={product.slug}
                  slug={product.slug}
                  title={product.title}
                  price={product.price}
                  currency={product.pricingCurrency}
                  image={product.thumbnail}
                  contractType={product.contractType as ProductContractType}
                  rwaTradeMode={product.rwaTradeMode as RwaTradeMode}
                  peerID={peerId}
                  averageRating={product.averageRating}
                  ratingCount={product.ratingCount}
                  onClick={() => openProduct(product.slug, peerId)}
                />
              ))}
            </Grid>
          )}
        </VStack>
      </Container>
      <Footer />
    </>
  );
}
