'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import {
  productDataService,
  profileApi,
  cartApi,
  getImageUrl,
  useI18n,
  useCurrency,
} from '@mobazha/core';
import type { Product, ProductRating, UserProfile } from '@mobazha/core';

// 星星评分组件
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-3 h-3 sm:w-4 sm:h-4',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6',
  }[size];

  return (
    <HStack gap="xs" align="center">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`${sizeClass} ${i < Math.floor(rating) ? 'text-amber-500' : 'text-slate-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </HStack>
  );
}

// 获取库存数量（从 SKU 计算）
function getStockQuantity(product: Product): number {
  if (!product.item.skus || product.item.skus.length === 0) {
    return 999; // 默认无限库存
  }
  return product.item.skus.reduce((sum, sku) => sum + (sku.quantity || 0), 0);
}

// 检查是否免运费
function hasFreeShipping(product: Product): boolean {
  if (!product.shippingOptions) return false;
  return product.shippingOptions.some(opt => opt.services.some(svc => svc.price === 0));
}

// 获取预计送达时间
function getEstimatedDelivery(product: Product): string | null {
  if (!product.shippingOptions || product.shippingOptions.length === 0) return null;
  const firstService = product.shippingOptions[0]?.services[0];
  return firstService?.estimatedDelivery || null;
}

export interface ProductDetailProps {
  /** 商品 slug */
  slug: string;
  /** 卖家 peerID */
  peerID?: string;
  /** 是否为弹框模式 */
  isModal?: boolean;
  /** 关闭弹框回调 */
  onClose?: () => void;
  /** 跳转到消息回调 */
  onMessage?: () => void;
  /** 跳转到购物车回调 */
  onCart?: () => void;
}

export function ProductDetail({
  slug,
  peerID,
  isModal = false,
  onClose,
  onMessage,
  onCart,
}: ProductDetailProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { formatPrice, renderPairedPrice } = useCurrency();

  // 状态管理
  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [_isWishlist, _setIsWishlist] = useState(false);
  void _isWishlist; // Reserved for future wishlist feature

  // 获取商品数据
  useEffect(() => {
    const fetchProductData = async () => {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        // 获取商品详情
        const productData = await productDataService.getProduct(slug, peerID);

        if (!productData) {
          setError(t('product.notFound'));
          setIsLoading(false);
          return;
        }

        setProduct(productData);

        // 获取卖家信息
        const vendorPeerID = productData.vendorID?.peerID;
        if (vendorPeerID) {
          try {
            const vendorData = await profileApi.getProfile(vendorPeerID);
            setVendor(vendorData);
          } catch (err) {
            console.error('Failed to fetch vendor:', err);
          }

          // 获取商品评价
          try {
            const ratingsData = await productDataService.getProductRatings(slug, vendorPeerID);
            if (Array.isArray(ratingsData)) {
              setRatings(ratingsData);
            }
          } catch (err) {
            console.error('Failed to fetch ratings:', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError(t('common.error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [slug, peerID, t]);

  // 计算图片 URL 数组
  const imageUrls = useMemo(() => {
    if (!product?.item?.images) return [];
    return product.item.images
      .map(img => getImageUrl(img.medium) || getImageUrl(img.large) || getImageUrl(img.original))
      .filter((url): url is string => !!url);
  }, [product]);

  // 计算价格信息
  const priceInfo = useMemo(() => {
    if (!product)
      return { price: 0, currency: 'USD', formattedPrice: '$0.00', pairedPrice: '$0.00' };
    const price = Number(product.item.price) || 0;
    const currency = product.metadata?.pricingCurrency?.code || 'USD';
    const formattedPrice = formatPrice(price, currency);
    const pairedPrice = renderPairedPrice(price, currency);
    return { price, currency, formattedPrice, pairedPrice };
  }, [product, formatPrice, renderPairedPrice]);

  // 确保 ratings 是数组
  const safeRatings = useMemo(() => {
    return Array.isArray(ratings) ? ratings : [];
  }, [ratings]);

  // 计算平均评分
  const averageRating = useMemo(() => {
    if (safeRatings.length === 0) return 0;
    const sum = safeRatings.reduce((acc, r) => acc + (r.overall || 0), 0);
    return sum / safeRatings.length;
  }, [safeRatings]);

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
        setTimeout(() => setCartSuccess(false), 3000);
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

    // 构建购买参数并导航到 checkout 页面
    const checkoutParams = new URLSearchParams({
      slug: product.slug,
      peerID: product.vendorID.peerID,
      quantity: quantity.toString(),
    });

    // 如果在弹框模式，先关闭弹框
    if (isModal && onClose) {
      onClose();
    }

    router.push(`/checkout?${checkoutParams.toString()}`);
  }, [product, quantity, isModal, onClose, router]);

  // 切换收藏 (reserved for future use)
  const _handleToggleWishlist = useCallback(() => {
    _setIsWishlist(prev => !prev);
    // TODO: 实际的收藏 API 调用
  }, []);

  // 跳转到消息 (reserved for future use)
  const _handleMessage = useCallback(() => {
    if (onMessage) {
      onMessage();
    } else if (vendor?.peerID) {
      router.push(`/chat/${vendor.peerID}`);
    }
  }, [onMessage, vendor, router]);

  // 跳转到购物车 (reserved for future use)
  const _handleGoToCart = useCallback(() => {
    if (onCart) {
      onCart();
    } else {
      router.push('/cart');
    }
  }, [onCart, router]);

  // 暂时标记为使用
  void _handleToggleWishlist;
  void _handleMessage;
  void _handleGoToCart;

  // 加载状态
  if (isLoading) {
    return (
      <div className={isModal ? 'p-4 sm:p-6' : ''}>
        <Grid cols={2} colsMobile={1} gap="lg">
          <Skeleton variant="rounded" className="aspect-square" />
          <VStack gap="md" align="stretch">
            <Skeleton variant="text" height={40} width="80%" />
            <Skeleton variant="text" height={24} width="40%" />
            <Skeleton variant="text" height={100} />
            <Skeleton variant="rounded" height={200} />
          </VStack>
        </Grid>
      </div>
    );
  }

  // 错误状态
  if (error || !product) {
    return (
      <div
        className={`flex items-center justify-center ${isModal ? 'min-h-[300px]' : 'min-h-[60vh]'}`}
      >
        <div className="text-center">
          <svg
            className="w-16 h-16 text-muted-foreground mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-muted-foreground mb-4">{error || t('product.notFound')}</p>
          {isModal ? (
            <Button onClick={onClose}>{t('common.close')}</Button>
          ) : (
            <Link href="/marketplace">
              <Button>{t('common.backToMarket')}</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  const stock = getStockQuantity(product);
  const freeShipping = hasFreeShipping(product);
  const estimatedDelivery = getEstimatedDelivery(product);
  const vendorPeerID = product.vendorID?.peerID;
  const acceptedCurrencies = product.metadata?.acceptedCurrencies || [];
  const tags = product.item.tags || [];
  const category = product.item.categories?.[0] || '';

  return (
    <div className={isModal ? 'overflow-y-auto max-h-[85vh]' : ''}>
      <div className={isModal ? 'p-4 sm:p-6' : ''}>
        {/* Breadcrumb - 非弹框模式显示 */}
        {!isModal && (
          <nav className="hidden sm:flex items-center gap-2 text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-emerald-600">
              {t('nav.home')}
            </Link>
            <span>/</span>
            <Link href="/marketplace" className="hover:text-emerald-600">
              {t('nav.market')}
            </Link>
            {category && (
              <>
                <span>/</span>
                <Link
                  href={`/marketplace?category=${category.toLowerCase()}`}
                  className="hover:text-emerald-600"
                >
                  {category}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">{product.item.title}</span>
          </nav>
        )}

        <div
          className={`grid grid-cols-1 ${isModal ? 'lg:grid-cols-2' : 'lg:grid-cols-2'} gap-4 sm:gap-8 lg:gap-12`}
        >
          {/* Image Gallery */}
          <div className="space-y-3 sm:space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-card">
              {imageUrls.length > 0 ? (
                <img
                  src={imageUrls[selectedImage] || imageUrls[0]}
                  alt={product.item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {imageUrls.length > 1 && (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
                {imageUrls.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md sm:rounded-lg overflow-hidden border-2 transition-all touch-feedback ${
                      selectedImage === index
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-4 sm:space-y-6">
            {/* Title & Rating */}
            <div>
              <h1
                className={`${isModal ? 'text-lg sm:text-xl lg:text-2xl' : 'text-xl sm:text-2xl lg:text-3xl'} font-bold text-foreground mb-2`}
              >
                {product.item.title}
              </h1>
              <HStack gap="sm" align="center">
                <StarRating rating={averageRating} />
                <span className="text-sm text-muted-foreground ml-1">
                  {averageRating.toFixed(1)} ({safeRatings.length} {t('product.reviews')})
                </span>
              </HStack>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
                {priceInfo.pairedPrice}
              </span>
            </div>

            {/* Shipping */}
            <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
              {freeShipping ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {t('product.freeShipping')}
                </span>
              ) : (
                <span className="text-muted-foreground">{t('product.shippingAtCheckout')}</span>
              )}
              {estimatedDelivery && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="text-muted-foreground">
                    {t('product.estDelivery')}: {estimatedDelivery}
                  </span>
                </>
              )}
            </div>

            {/* Contract Type Badge */}
            {product.metadata?.contractType && (
              <div className="flex gap-2">
                <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  {product.metadata.contractType.replace('_', ' ')}
                </span>
                {product.item.condition && (
                  <span className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {product.item.condition.replace('_', ' ')}
                  </span>
                )}
              </div>
            )}

            {/* Quantity & Add to Cart - 桌面端显示 */}
            <Card className="space-y-3 sm:space-y-4 p-4 sm:p-6 hidden lg:block">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('product.quantity')}
                </span>
                <HStack gap="sm" align="center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border border-border flex items-center justify-center hover:bg-surface-hover touch-feedback"
                  >
                    -
                  </button>
                  <span className="w-10 sm:w-12 text-center font-medium text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border border-border flex items-center justify-center hover:bg-surface-hover touch-feedback"
                  >
                    +
                  </button>
                </HStack>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {stock > 0 ? `${stock} ${t('product.inStock')}` : t('product.outOfStock')}
              </span>

              <VStack gap="xs">
                <Button
                  size="default"
                  className="w-full touch-feedback"
                  onClick={handleAddToCart}
                  disabled={addingToCart || stock === 0}
                >
                  {addingToCart ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('common.loading')}
                    </span>
                  ) : cartSuccess ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {t('product.addedToCart')}
                    </span>
                  ) : (
                    t('product.addToCart')
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className="w-full touch-feedback"
                  onClick={handleBuyNow}
                  disabled={stock === 0}
                >
                  {t('product.buyNow')}
                </Button>
              </VStack>

              {/* Accepted Currencies */}
              {acceptedCurrencies.length > 0 && (
                <div className="pt-3 sm:pt-4 border-t border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {t('product.acceptedCurrencies')}:{' '}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {acceptedCurrencies.join(', ')}
                  </span>
                </div>
              )}
            </Card>

            {/* Vendor Info */}
            <Card className="p-4 sm:p-6">
              <Link href={`/store/${vendorPeerID}`} className="touch-feedback block">
                <HStack gap="sm" align="center">
                  <Avatar
                    src={getImageUrl(vendor?.avatarHashes?.medium)}
                    name={vendor?.name || vendorPeerID?.slice(0, 8) || 'Vendor'}
                    size="md"
                    className="w-10 h-10 sm:w-12 sm:h-12"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm sm:text-base">
                      {vendor?.name || vendorPeerID?.slice(0, 8)}
                    </h3>
                    {vendor?.location && (
                      <p className="text-xs sm:text-sm text-muted-foreground">{vendor.location}</p>
                    )}
                    {vendor?.stats && (
                      <HStack gap="xs" align="center" className="mt-0.5">
                        <span className="text-amber-500 text-sm">★</span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {vendor.stats.averageRating?.toFixed(1) || '0'} (
                          {vendor.stats.ratingCount || 0} {t('product.reviews')})
                        </span>
                      </HStack>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="flex-shrink-0 text-xs">
                    {t('product.viewStore')}
                  </Button>
                </HStack>
              </Link>
            </Card>
          </div>
        </div>

        {/* Description & Reviews */}
        <div
          className={`mt-6 sm:mt-12 grid grid-cols-1 ${isModal ? 'lg:grid-cols-1' : 'lg:grid-cols-3'} gap-4 sm:gap-8`}
        >
          {/* Description */}
          <div className={isModal ? '' : 'lg:col-span-2'}>
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                {t('product.description')}
              </h2>
              <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none">
                {product.item.description.split('\n').map((paragraph, i) => (
                  <p key={i} className="text-sm sm:text-base text-muted-foreground mb-3">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Terms & Refund Policy */}
              {(product.termsAndConditions || product.refundPolicy) && (
                <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-border space-y-4">
                  {product.termsAndConditions && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {t('product.termsAndConditions')}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {product.termsAndConditions}
                      </p>
                    </div>
                  )}
                  {product.refundPolicy && (
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {t('product.refundPolicy')}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {product.refundPolicy}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-border">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {t('product.tags')}:{' '}
                  </span>
                  <div className="inline-flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {tags.map(tag => (
                      <Link
                        key={tag}
                        href={`/marketplace?tag=${tag}`}
                        className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm bg-muted text-muted-foreground rounded-full hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors touch-feedback"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Reviews Summary - 非弹框模式或单独展示 */}
          {!isModal && (
            <div>
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                  {t('product.reviews')}
                </h2>

                {/* Rating Summary */}
                <div className="text-center mb-4 sm:mb-6">
                  <div className="text-3xl sm:text-4xl font-bold text-foreground">
                    {averageRating.toFixed(1)}
                  </div>
                  <HStack gap="xs" justify="center" className="my-1.5 sm:my-2">
                    <StarRating rating={averageRating} />
                  </HStack>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {safeRatings.length} {t('product.reviews')}
                  </p>
                </div>

                {/* Recent Reviews */}
                {safeRatings.length > 0 ? (
                  <VStack gap="sm">
                    {safeRatings.slice(0, 3).map(review => (
                      <div
                        key={review.ratingID}
                        className="pb-3 sm:pb-4 border-b border-border last:border-0"
                      >
                        <HStack gap="xs" align="center" className="mb-1.5">
                          <Avatar
                            name={
                              review.buyerID?.handle ||
                              review.buyerID?.peerID?.slice(0, 8) ||
                              'Anonymous'
                            }
                            size="sm"
                            className="w-6 h-6 sm:w-8 sm:h-8"
                          />
                          <span className="font-medium text-foreground text-sm">
                            {review.anonymous
                              ? t('product.anonymous')
                              : review.buyerID?.handle ||
                                review.buyerID?.peerID?.slice(0, 8) ||
                                'User'}
                          </span>
                          <HStack gap="xs" className="ml-auto">
                            <StarRating rating={review.overall} size="sm" />
                          </HStack>
                        </HStack>
                        {review.review && (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {review.review}
                          </p>
                        )}
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5">
                          {new Date(review.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </VStack>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    {t('product.noReviews')}
                  </p>
                )}

                {safeRatings.length > 3 && (
                  <Button variant="ghost" className="w-full mt-3 sm:mt-4 text-sm touch-feedback">
                    {t('product.viewAllReviews')}
                  </Button>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 移动端底部操作栏占位空间 */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}

// 导出内部使用的数据和函数，供 BottomBar 使用
export { getStockQuantity, hasFreeShipping, getEstimatedDelivery, StarRating };
