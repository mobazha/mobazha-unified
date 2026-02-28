'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container } from '@/components/layouts';
import { ProductDetail, ProductBottomBar } from '@/components/Product';
import { useI18n, useUserStore, useChatStore, useWishlist } from '@mobazha/core';
import type { Product, AddWishlistParams } from '@mobazha/core';
import { toast } from '@/components/ui/use-toast';

function getStockQuantity(product: Product): number {
  if (!product.item.skus || product.item.skus.length === 0) {
    return 999;
  }
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
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = params.slug as string;
  const peerID = searchParams.get('peerID') || undefined;

  const { isAuthenticated, profile: currentUserProfile } = useUserStore();
  const openChatDrawer = useChatStore(state => state.openDrawer);

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, _setQuantity] = useState(1);
  void _setQuantity;

  const { isInWishlist, toggleItem } = useWishlist();

  const isOwnProduct =
    isAuthenticated &&
    !!product?.vendorID?.peerID &&
    currentUserProfile?.peerID === product.vendorID.peerID;

  const wishlisted =
    product?.vendorID?.peerID && product?.slug
      ? isInWishlist(product.vendorID.peerID, product.slug)
      : false;

  const stock = useMemo(() => {
    if (!product) return 0;
    return getStockQuantity(product);
  }, [product]);

  const handleToggleWishlist = useCallback(async () => {
    if (!product) return;
    const params = buildWishlistParams(product);
    if (!params) return;
    const added = await toggleItem(params);
    toast({
      description: added ? t('product.wishlisted') : t('me.wishlistRemove'),
      duration: 1500,
    });
  }, [product, toggleItem, t]);

  const handleMessage = useCallback(() => {
    openChatDrawer();
  }, [openChatDrawer]);

  const handleCart = useCallback(() => {
    router.push('/cart');
  }, [router]);

  const handleProductLoaded = useCallback((loadedProduct: Product | null) => {
    setProduct(loadedProduct);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <MobilePageHeader title={t('product.details')} />

      <main className="py-4 sm:py-8 pb-24 lg:pb-8">
        <Container size="xl">
          <ProductDetail
            slug={slug}
            peerID={peerID}
            isModal={false}
            onMessage={handleMessage}
            onCart={handleCart}
            onProductLoaded={handleProductLoaded}
            isWishlist={wishlisted}
            onToggleWishlist={handleToggleWishlist}
          />
        </Container>
      </main>

      <ProductBottomBar
        product={product}
        quantity={quantity}
        stock={stock}
        isOwnProduct={isOwnProduct}
        isWishlist={wishlisted}
        onToggleWishlist={handleToggleWishlist}
      />

      <Footer />
    </div>
  );
}
