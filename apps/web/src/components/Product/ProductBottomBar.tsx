'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import {
  useI18n,
  useCartStore,
  useChatStore,
  selectUnreadCountByPeerID,
  buildProductHref,
} from '@mobazha/core';
import type { OrderItemOption, Product, ProductSku } from '@mobazha/core';
import { useHaptic } from '@/lib/platform';

export interface ProductBottomBarProps {
  /** 商品数据 */
  product: Product | null;
  /** 购买数量 */
  quantity: number;
  /** 库存数量 */
  stock: number;
  /** 当前是否存在买家可选规格 */
  hasVariants?: boolean;
  /** 当前已选规格 */
  selectedOptions?: Record<string, string>;
  /** 当前已匹配 SKU */
  selectedSku?: ProductSku | null;
  /** 是否是卖家自己的商品 */
  isOwnProduct?: boolean;
  /** 是否已收藏 */
  isWishlist?: boolean;
  /** 切换收藏回调 */
  onToggleWishlist?: () => void;
  /** 卖家是否配置了支付方式 */
  paymentAvailable?: boolean;
}

export function ProductBottomBar({
  product,
  quantity,
  stock,
  hasVariants = false,
  selectedOptions = {},
  selectedSku = null,
  isOwnProduct = false,
  isWishlist = false,
  onToggleWishlist,
  paymentAvailable = true,
}: ProductBottomBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [cartSuccess, setCartSuccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const haptic = useHaptic();
  const addCartItem = useCartStore(state => state.addItem);
  const cartItemCount = useCartStore(state => state.getItemCount());
  const openDrawerWithPeer = useChatStore(state => state.openDrawerWithPeer);
  const vendorUnreadCount = useChatStore(selectUnreadCountByPeerID(product?.vendorID?.peerID));

  const orderOptions: OrderItemOption[] | undefined =
    hasVariants && Object.keys(selectedOptions).length > 0
      ? Object.entries(selectedOptions).map(([name, value]) => ({ name, value }))
      : undefined;
  const effectiveStock = selectedSku?.quantity != null ? Number(selectedSku.quantity) || 0 : stock;
  const isRwaProduct = product?.metadata?.contractType === 'RWA_TOKEN';
  const purchaseDisabled = effectiveStock === 0 || !paymentAvailable || isRwaProduct;

  const handleAddToCart = useCallback(() => {
    if (!product || !product.vendorID?.peerID) return;
    if (product.metadata?.contractType === 'RWA_TOKEN') return;

    const thumbnail = selectedSku?.images?.[0] ??
      product.item?.images?.[0] ?? {
        tiny: '',
        small: '',
        medium: '',
        large: '',
        original: '',
      };
    const price = Number(selectedSku?.price ?? product.item?.price) || 0;
    const currency = product.metadata?.pricingCurrency?.code || 'USD';
    const divisibility = product.metadata?.pricingCurrency?.divisibility ?? 2;

    addCartItem({
      listing: {
        slug: product.slug,
        title: product.item?.title || product.slug,
        thumbnail,
        price: { amount: price, currency: { code: currency, divisibility } },
        vendorPeerID: product.vendorID.peerID,
        vendorName: product.vendorID?.name || product.vendorID?.handle,
      },
      quantity,
      options: orderOptions,
    });

    haptic.impact('light');
    setCartSuccess(true);
    setTimeout(() => setCartSuccess(false), 2000);
  }, [product, selectedSku, quantity, orderOptions, addCartItem, haptic]);

  // 立即购买
  const handleBuyNow = useCallback(() => {
    if (!product || !product.vendorID?.peerID) return;
    if (product.metadata?.contractType === 'RWA_TOKEN') return;

    const checkoutParams = new URLSearchParams({
      slug: product.slug,
      peerID: product.vendorID.peerID,
      quantity: quantity.toString(),
    });
    if (orderOptions && orderOptions.length > 0) {
      checkoutParams.set(
        'options',
        orderOptions.map(option => `${option.name}:${option.value}`).join(',')
      );
    }

    router.push(`/checkout?${checkoutParams.toString()}`);
  }, [product, quantity, orderOptions, router]);

  const handleMessage = useCallback(() => {
    const vendorPeerID = product?.vendorID?.peerID;
    if (vendorPeerID) {
      openDrawerWithPeer(vendorPeerID, product?.vendorID?.name || product?.vendorID?.handle);
    }
  }, [
    product?.vendorID?.peerID,
    product?.vendorID?.name,
    product?.vendorID?.handle,
    openDrawerWithPeer,
  ]);

  // 跳转到购物车
  const handleGoToCart = useCallback(() => {
    router.push('/cart');
  }, [router]);

  const handleCopyLink = useCallback(async () => {
    if (!product) return;
    const url = buildProductHref(product.slug, product.vendorID?.peerID, {
      baseUrl: window.location.origin,
    });
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [product]);

  if (!product) return null;

  if (isOwnProduct) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-3 py-2.5 z-50 lg:hidden pb-safe">
        <HStack gap="sm" align="center">
          <Button
            size="sm"
            className="flex-1 rounded-lg h-11 text-sm font-medium touch-feedback"
            onClick={() => router.push(`/listing/edit/${product.slug}`)}
          >
            {t('product.editProduct')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg h-11 text-sm font-medium touch-feedback"
            onClick={handleCopyLink}
          >
            {linkCopied ? t('product.linkCopied') : t('product.shareLink')}
          </Button>
        </HStack>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-3 py-2.5 z-50 lg:hidden pb-safe">
      <HStack gap="xs" align="center">
        {/* 左侧图标按钮组 */}
        <HStack gap="none" className="flex-shrink-0">
          {/* 消息按钮 */}
          <button
            onClick={handleMessage}
            className="relative flex flex-col items-center justify-center w-11 h-11 touch-feedback active:bg-muted/50 rounded-lg"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-xs text-muted-foreground leading-tight">
              {t('profile.message')}
            </span>
            {vendorUnreadCount > 0 && (
              <span className="absolute top-0 right-0.5 min-w-[16px] h-[16px] bg-destructive text-white text-[9px] font-medium rounded-full flex items-center justify-center px-0.5">
                {vendorUnreadCount > 99 ? '99+' : vendorUnreadCount}
              </span>
            )}
          </button>

          {/* 购物车按钮 */}
          <button
            onClick={handleGoToCart}
            className="flex flex-col items-center justify-center w-11 h-11 touch-feedback active:bg-muted/50 rounded-lg relative"
          >
            <svg
              className="w-5 h-5 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-xs text-muted-foreground leading-tight">{t('nav.cart')}</span>
            {cartItemCount > 0 && (
              <span className="absolute top-0 right-0.5 min-w-[16px] h-[16px] bg-destructive text-white text-[9px] font-medium rounded-full flex items-center justify-center px-0.5">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>

          {/* 收藏按钮 */}
          <button
            onClick={onToggleWishlist}
            className="flex flex-col items-center justify-center w-11 h-11 touch-feedback active:bg-muted/50 rounded-lg"
          >
            <Heart
              className={`w-5 h-5 ${isWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`}
            />
            <span className="text-xs text-muted-foreground leading-tight">
              {t('product.wishlist')}
            </span>
          </button>
        </HStack>

        {/* 右侧操作按钮组 */}
        <HStack gap="sm" className="flex-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg h-11 text-sm font-medium touch-feedback border-primary text-primary hover:bg-primary/10"
            onClick={handleAddToCart}
            disabled={purchaseDisabled}
          >
            {cartSuccess ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : effectiveStock === 0 ? (
              t('product.outOfStock')
            ) : !paymentAvailable ? (
              t('payment.paymentUnavailable')
            ) : (
              t('product.addToCart')
            )}
          </Button>

          <Button
            size="sm"
            className="flex-1 rounded-lg h-11 text-sm font-medium touch-feedback"
            onClick={handleBuyNow}
            disabled={purchaseDisabled}
          >
            {t('product.buyNow')}
          </Button>
        </HStack>
      </HStack>
    </div>
  );
}
