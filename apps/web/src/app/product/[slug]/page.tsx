'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container } from '@/components/layouts';
import { ProductDetailDesktop } from '@/components/Product/ProductDetailDesktop';
import { ProductDetailMobile } from '@/components/Product/ProductDetailMobile';
import { ProductBottomBar } from '@/components/Product';
import { useI18n, useUserStore, useWishlist } from '@mobazha/core';
import type { Product, AddWishlistParams } from '@mobazha/core';
import { toast } from '@/components/ui/use-toast';
import { useBreakpoint } from '@mobazha/ui/hooks';

function getStockQuantity(product: Product): number {
  if (!product.item.skus || product.item.skus.length === 0) return 999;
  return product.item.skus.reduce((sum, sku) => sum + (Number(sku.quantity) || 0), 0);
}

function buildWishlistParams(product: Product): AddWishlistParams | null {
  if (!product.vendorID?.peerID || !product.slug) return null;
  return {
    peerID: product.vendorID.peerID,
    slug: product.slug,
    title: product.item?.title || product.slug,
    thumbnail: product.item?.images?.[0]?.small || '',
    price: String(product.item?.price ?? ''),
    currency: product.metadata?.pricingCurrency?.code || '',
  };
}

export default function ProductPage() {
  const { t } = useI18n();
  const params = useParams();
  const searchParams = useSearchParams();
  const { isMobile } = useBreakpoint();

  const slug = params.slug as string;
  const peerID = searchParams.get('peerID') || undefined;

  const { isAuthenticated, profile: currentUserProfile } = useUserStore();

  const [product, setProduct] = useState<Product | null>(null);

  const { isInWishlist, toggleItem } = useWishlist();

  const isOwnProduct =
    isAuthenticated &&
    !!product?.vendorID?.peerID &&
    currentUserProfile?.peerID === product.vendorID.peerID;

  const wishlisted =
    product?.vendorID?.peerID && product?.slug
      ? isInWishlist(product.vendorID.peerID, product.slug)
      : false;

  const stock = useMemo(() => (product ? getStockQuantity(product) : 0), [product]);

  const handleToggleWishlist = useCallback(async () => {
    if (!product) return;
    const p = buildWishlistParams(product);
    if (!p) return;
    const added = await toggleItem(p);
    toast({
      description: added ? t('product.wishlisted') : t('me.wishlistRemove'),
      duration: 1500,
    });
  }, [product, toggleItem, t]);

  const handleProductLoaded = useCallback((loadedProduct: Product | null) => {
    setProduct(loadedProduct);
  }, []);

  // --- Mobile View ---
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('product.details')} />
        <ProductDetailMobile
          slug={slug}
          peerID={peerID}
          onProductLoaded={handleProductLoaded}
          isWishlist={wishlisted}
          onToggleWishlist={handleToggleWishlist}
        />
      </div>
    );
  }

  // --- Desktop View ---
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-4 sm:py-8 pb-24 lg:pb-8">
        <Container size="xl">
          <ProductDetailDesktop
            slug={slug}
            peerID={peerID}
            isModal={false}
            onProductLoaded={handleProductLoaded}
            isWishlist={wishlisted}
            onToggleWishlist={handleToggleWishlist}
          />
        </Container>
      </main>
      <ProductBottomBar
        product={product}
        quantity={1}
        stock={stock}
        isOwnProduct={isOwnProduct}
        isWishlist={wishlisted}
        onToggleWishlist={handleToggleWishlist}
      />
      <Footer />
    </div>
  );
}
