'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n, cartApi } from '@mobazha/core';
import type { Product } from '@mobazha/core';

export interface ProductBottomBarProps {
  /** 商品数据 */
  product: Product | null;
  /** 购买数量 */
  quantity: number;
  /** 库存数量 */
  stock: number;
  /** 是否是卖家自己的商品 */
  isOwnProduct?: boolean;
  /** 是否已收藏 */
  isWishlist?: boolean;
  /** 切换收藏回调 */
  onToggleWishlist?: () => void;
  /** 购物车商品数量 */
  cartItemCount?: number;
}

export function ProductBottomBar({
  product,
  quantity,
  stock,
  isOwnProduct = false,
  isWishlist = false,
  onToggleWishlist,
  cartItemCount = 0,
}: ProductBottomBarProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // 添加到购物车
  const handleAddToCart = useCallback(async () => {
    if (!product || !product.vendorID?.peerID) return;

    setAddingToCart(true);
    setCartSuccess(false);

    try {
      const result = await cartApi.addToCart(product.vendorID.peerID, {
        slug: product.slug,
        quantity,
      });

      if ('success' in result && result.success) {
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setAddingToCart(false);
    }
  }, [product, quantity]);

  // 立即购买
  const handleBuyNow = useCallback(() => {
    if (!product || !product.vendorID?.peerID) return;

    const checkoutParams = new URLSearchParams({
      slug: product.slug,
      peerID: product.vendorID.peerID,
      quantity: quantity.toString(),
    });

    router.push(`/checkout?${checkoutParams.toString()}`);
  }, [product, quantity, router]);

  // 跳转到消息
  const handleMessage = useCallback(() => {
    if (product?.vendorID?.peerID) {
      router.push(`/chat/${product.vendorID.peerID}`);
    }
  }, [product, router]);

  // 跳转到购物车
  const handleGoToCart = useCallback(() => {
    router.push('/cart');
  }, [router]);

  const handleCopyLink = useCallback(async () => {
    if (!product) return;
    const url = `${window.location.origin}/product/${product.slug}`;
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
            className="flex-1 rounded-lg h-9 text-xs font-medium touch-feedback"
            onClick={() => router.push(`/listing/edit/${product.slug}`)}
          >
            {t('product.editProduct')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg h-9 text-xs font-medium touch-feedback"
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
            className="flex flex-col items-center justify-center w-10 h-10 touch-feedback active:bg-muted/50 rounded-lg"
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
            <span className="text-[9px] text-muted-foreground leading-tight">
              {t('profile.message')}
            </span>
          </button>

          {/* 购物车按钮 */}
          <button
            onClick={handleGoToCart}
            className="flex flex-col items-center justify-center w-10 h-10 touch-feedback active:bg-muted/50 rounded-lg relative"
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
            <span className="text-[9px] text-muted-foreground leading-tight">{t('nav.cart')}</span>
            {cartItemCount > 0 && (
              <span className="absolute top-0 right-0.5 min-w-[16px] h-[16px] bg-destructive text-white text-[9px] font-medium rounded-full flex items-center justify-center px-0.5">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>

          {/* 收藏按钮 */}
          <button
            onClick={onToggleWishlist}
            className="flex flex-col items-center justify-center w-10 h-10 touch-feedback active:bg-muted/50 rounded-lg"
          >
            <svg
              className={`w-5 h-5 ${isWishlist ? 'text-warning fill-warning' : 'text-muted-foreground'}`}
              fill={isWishlist ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <span className="text-[9px] text-muted-foreground leading-tight">
              {t('product.wishlist')}
            </span>
          </button>
        </HStack>

        {/* 右侧操作按钮组 */}
        <HStack gap="sm" className="flex-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-lg h-9 text-xs font-medium touch-feedback border-primary text-primary hover:bg-primary/10"
            onClick={handleAddToCart}
            disabled={addingToCart || stock === 0}
          >
            {addingToCart ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : cartSuccess ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              t('product.addToCart')
            )}
          </Button>

          <Button
            size="sm"
            className="flex-1 rounded-lg h-9 text-xs font-medium touch-feedback"
            onClick={handleBuyNow}
            disabled={stock === 0}
          >
            {t('product.buyNow')}
          </Button>
        </HStack>
      </HStack>
    </div>
  );
}
