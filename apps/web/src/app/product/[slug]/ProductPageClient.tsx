'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container } from '@/components/layouts';
import { ProductDetailDesktop } from '@/components/Product/ProductDetailDesktop';
import { ProductDetailMobile } from '@/components/Product/ProductDetailMobile';
import { ProductBottomBar } from '@/components/Product';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import {
  useI18n,
  useUserStore,
  useWishlist,
  usePaymentMethods,
  getProductPeerIDParam,
  isHosted,
  startCasdoorLogin,
} from '@mobazha/core';
import type { Product, AddWishlistParams, ProductSku } from '@mobazha/core';
import { toast } from '@/components/ui/use-toast';
import { useBreakpoint, usePlatform } from '@mobazha/ui/hooks';
import { useRouter } from 'next/navigation';

const SITE_TITLE_SUFFIX = 'Mobazha';

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

export default function ProductPageClient() {
  const { t } = useI18n();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMobile } = useBreakpoint();
  const { isTGMiniApp, isEmbeddedApp } = usePlatform();

  const slug = params.slug as string;
  const peerID = getProductPeerIDParam(searchParams);

  const { isAuthenticated, profile: currentUserProfile } = useUserStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [purchaseState, setPurchaseState] = useState<{
    quantity: number;
    hasVariants: boolean;
    selectedOptions: Record<string, string>;
    selectedSku: ProductSku | null;
  }>({
    quantity: 1,
    hasVariants: false,
    selectedOptions: {},
    selectedSku: null,
  });

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

  const vendorPeerID = peerID || product?.vendorID?.peerID;
  const {
    crypto: vendorCrypto,
    activeFiat: vendorActiveFiat,
    isLoading: pmLoading,
  } = usePaymentMethods(vendorPeerID);
  const paymentAvailable = pmLoading || vendorCrypto.length > 0 || vendorActiveFiat.length > 0;

  // SSR metadata may miss peerID-scoped listings; sync tab title after client fetch.
  useEffect(() => {
    if (!product?.item?.title) return;
    document.title = `${product.item.title} | ${SITE_TITLE_SUFFIX}`;
  }, [product?.item?.title]);

  const handleLoginRedirect = useCallback(() => {
    setShowLoginSheet(false);
    if (isTGMiniApp || isEmbeddedApp) {
      router.push('/');
    } else if (isHosted()) {
      startCasdoorLogin();
    } else {
      router.push('/login');
    }
  }, [isTGMiniApp, isEmbeddedApp, router]);

  const handleToggleWishlist = useCallback(async () => {
    if (!product) return;
    if (!isAuthenticated) {
      if (isMobile) {
        setShowLoginSheet(true);
      } else {
        handleLoginRedirect();
      }
      return;
    }
    const p = buildWishlistParams(product);
    if (!p) return;
    const added = await toggleItem(p);
    toast({
      description: added ? t('product.wishlisted') : t('me.wishlistRemove'),
      duration: 1500,
    });
  }, [product, toggleItem, t, isAuthenticated, isMobile, handleLoginRedirect]);

  const handleProductLoaded = useCallback((loadedProduct: Product | null) => {
    setProduct(loadedProduct);
  }, []);

  const loginPromptSheet = (
    <BottomSheet open={showLoginSheet} onClose={() => setShowLoginSheet(false)}>
      <div className="px-6 py-6 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('common.loginToSave')}</h3>
        <p className="text-sm text-muted-foreground mb-6">{t('common.loginToSaveDesc')}</p>
        <button
          onClick={handleLoginRedirect}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium text-[15px] active:opacity-80 transition-opacity"
        >
          {isTGMiniApp || isEmbeddedApp ? t('login.createAccount') : t('login.loginRegister')}
        </button>
        <button
          onClick={() => setShowLoginSheet(false)}
          className="w-full py-3 mt-2 text-muted-foreground font-medium text-[15px] active:opacity-80 transition-opacity"
        >
          {t('common.cancel')}
        </button>
      </div>
    </BottomSheet>
  );

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
        {loginPromptSheet}
      </div>
    );
  }

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
            onPurchaseStateChange={setPurchaseState}
            isWishlist={wishlisted}
            onToggleWishlist={handleToggleWishlist}
          />
        </Container>
      </main>
      <ProductBottomBar
        product={product}
        quantity={purchaseState.quantity}
        stock={stock}
        hasVariants={purchaseState.hasVariants}
        selectedOptions={purchaseState.selectedOptions}
        selectedSku={purchaseState.selectedSku}
        isOwnProduct={isOwnProduct}
        isWishlist={wishlisted}
        onToggleWishlist={handleToggleWishlist}
        paymentAvailable={paymentAvailable}
      />
      <Footer />
    </div>
  );
}
