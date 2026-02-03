'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { cn } from '@/lib/utils';
import {
  productDataService,
  profileApi,
  cartApi,
  getImageUrl,
  useI18n,
  useCurrency,
  universalSwapService,
  decodeHtmlEntities,
  sanitizeHtml,
} from '@mobazha/core';
import type { Product, ProductRating, UserProfile } from '@mobazha/core';
import {
  getProductWithDedup,
  getProfileWithDedup,
  getRatingsWithDedup,
} from '@/utils/requestDedup';
import { VerifiedModeratorBadge } from './VerifiedModeratorBadge';
import { ShippingOptionsSection } from './ShippingOptionsSection';
import { MoreFromStore } from './MoreFromStore';
import { RwaAssetDetail } from '@/components/RwaToken';

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
          className={`${sizeClass} ${i < Math.floor(rating) ? 'text-amber-500' : 'text-muted-foreground/40'}`}
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
  /** 商品数据加载完成回调 */
  onProductLoaded?: (product: Product | null) => void;
}

export function ProductDetail({
  slug,
  peerID,
  isModal = false,
  onClose,
  onMessage,
  onCart,
  onProductLoaded,
}: ProductDetailProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { formatPrice, renderPairedPrice } = useCurrency();

  // 状态管理
  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(true); // 评论独立加载状态
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [_isWishlist, _setIsWishlist] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [rwaChainData, setRwaChainData] = useState<{
    totalAmount?: string;
    availableAmount?: string;
    status?: string;
  } | null>(null);
  void _isWishlist; // Reserved for future wishlist feature

  // 存储回调函数的 ref，避免在依赖数组中引用
  const onProductLoadedRef = useRef(onProductLoaded);
  onProductLoadedRef.current = onProductLoaded;

  // 用于跟踪已加载的数据，防止重复请求
  const loadedDataRef = useRef<string | null>(null);
  const loadedRatingsRef = useRef<string | null>(null);
  const loadedRwaChainDataRef = useRef<string | null>(null);

  // 加载 RWA 链上份额数据
  useEffect(() => {
    if (!product) return;

    // 检查是否是 RWA Token 商品
    const contractType = product.metadata?.contractType;
    if (contractType !== 'RWA_TOKEN') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = product.metadata as any;
    const rwaListingId = metadata?.rwaListingId;
    if (!rwaListingId || rwaListingId === '0' || rwaListingId === 0) {
      return;
    }

    // 防止重复加载
    const chainDataKey = `${product.slug}-${rwaListingId}`;
    if (loadedRwaChainDataRef.current === chainDataKey) return;

    const blockchain = product.item?.blockchain || 'sepolia';
    let isCancelled = false;

    const loadChainData = async () => {
      try {
        // 使用只读模式初始化 - 不需要钱包连接
        await universalSwapService.initializeReadOnly(blockchain, true);
        const listing = await universalSwapService.getListing(rwaListingId.toString());

        if (isCancelled) return;

        // 如果 listing 不存在，跳过
        if (!listing) {
          return;
        }

        loadedRwaChainDataRef.current = chainDataKey;

        setRwaChainData({
          totalAmount: listing.totalAmount,
          availableAmount: listing.availableAmount,
          status: listing.status,
        });
      } catch (error) {
        console.error('加载 RWA 链上份额数据失败:', error);
        // 不影响页面显示，静默失败
      }
    };

    loadChainData();

    return () => {
      isCancelled = true;
    };
  }, [product]);

  // 获取商品数据（不包含评论，评论单独加载）
  useEffect(() => {
    // 生成唯一的请求标识
    const requestKey = `${slug}-${peerID || ''}`;

    // 如果已经加载过相同的数据，直接返回
    if (loadedDataRef.current === requestKey) {
      return;
    }

    // 用于取消过期请求的标志
    let isCancelled = false;

    const fetchProductData = async () => {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      try {
        // 获取商品详情（使用去重函数）
        const productData = await getProductWithDedup(slug, peerID, () =>
          productDataService.getProduct(slug, peerID)
        );

        // 检查请求是否已被取消
        if (isCancelled) return;

        if (!productData) {
          setError(t('product.notFound'));
          setIsLoading(false);
          onProductLoadedRef.current?.(null);
          return;
        }

        // 标记数据已加载
        loadedDataRef.current = requestKey;

        setProduct(productData);
        onProductLoadedRef.current?.(productData);

        // 获取卖家信息（不阻塞商品显示）
        const vendorPeerID = productData.vendorID?.peerID;
        if (vendorPeerID) {
          try {
            // 使用去重函数
            const vendorData = await getProfileWithDedup(vendorPeerID, () =>
              profileApi.getProfile(vendorPeerID)
            );
            if (!isCancelled && vendorData) {
              setVendor(vendorData);
            }
          } catch (err) {
            console.error('Failed to fetch vendor:', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        if (!isCancelled) {
          setError(t('common.error'));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProductData();

    // 清理函数：取消过期请求，但不重置已加载数据的标记
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t 函数变化不应该触发重新获取数据
  }, [slug, peerID]);

  // 独立获取评论数据（不阻塞商品页面渲染）
  useEffect(() => {
    // 需要 product 数据才能获取评论
    if (!product) return;

    const vendorPeerID = product.vendorID?.peerID;
    if (!vendorPeerID) return;

    // 生成唯一的请求标识
    const ratingsKey = `ratings-${slug}-${vendorPeerID}`;

    // 如果已经加载过相同的评论数据，直接返回
    if (loadedRatingsRef.current === ratingsKey) {
      return;
    }

    let isCancelled = false;

    const fetchRatings = async () => {
      setRatingsLoading(true);

      try {
        const ratingsData = await getRatingsWithDedup(slug, vendorPeerID, () =>
          productDataService.getProductRatings(slug, vendorPeerID)
        );

        if (!isCancelled && Array.isArray(ratingsData)) {
          // 标记评论数据已加载
          loadedRatingsRef.current = ratingsKey;
          setRatings(ratingsData as ProductRating[]);
        }
      } catch (err) {
        console.error('Failed to fetch ratings:', err);
      } finally {
        if (!isCancelled) {
          setRatingsLoading(false);
        }
      }
    };

    fetchRatings();

    return () => {
      isCancelled = true;
    };
  }, [product, slug]);

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
  const rwaTradeMode = product.metadata?.rwaTradeMode;
  const rwaEscrowTimeoutSeconds =
    product.metadata?.rwaEscrowTimeoutSeconds || product.metadata?.escrowTimeoutSeconds || 86400;
  const tags = product.item.tags || [];
  const category = product.item.categories?.[0] || '';

  return (
    <div className={isModal ? 'overflow-y-auto max-h-[85vh]' : ''}>
      {/* 弹框模式顶部商家栏 - 不使用 sticky，避免遮挡图片 */}
      {isModal && vendor && (
        <div className="bg-background border-b border-border px-4 py-3 pr-14">
          <div className="flex items-center justify-between">
            <Link
              href={`/store/${vendorPeerID}`}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <Avatar
                src={getImageUrl(vendor?.avatarHashes?.small)}
                name={vendor?.name || vendorPeerID?.slice(0, 8) || 'Vendor'}
                size="sm"
                className="w-9 h-9 flex-shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">
                  {vendor?.name || vendorPeerID?.slice(0, 8)}
                </h3>
                <span className="text-xs text-primary hover:underline">
                  {t('product.goToStore')}
                </span>
              </div>
            </Link>
            <HStack gap="xs" className="flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => router.push(`/chat/${vendorPeerID}`)}
              >
                {t('profile.message')}
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                {t('profile.follow')}
              </Button>
            </HStack>
          </div>
        </div>
      )}

      <div className={isModal ? 'p-4 sm:p-6' : ''}>
        {/* Breadcrumb - 非弹框模式显示 */}
        {!isModal && (
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary">
              {t('nav.home')}
            </Link>
            <span>/</span>
            <Link href="/marketplace" className="hover:text-primary">
              {t('nav.market')}
            </Link>
            {category && (
              <>
                <span>/</span>
                <Link
                  href={`/marketplace?category=${category.toLowerCase()}`}
                  className="hover:text-primary"
                >
                  {category}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">
              {decodeHtmlEntities(product.item.title)}
            </span>
          </nav>
        )}

        <div
          className={`grid grid-cols-1 ${isModal ? 'lg:grid-cols-2' : 'lg:grid-cols-2'} gap-4 sm:gap-8 lg:gap-12`}
        >
          {/* Image Gallery */}
          <div className={isModal ? 'space-y-2' : 'space-y-3 sm:space-y-4'}>
            {/* Main Image - 弹窗模式使用 object-contain 保持图片完整显示 */}
            <div
              className={`relative ${isModal ? 'aspect-[4/3]' : 'aspect-square'} rounded-xl sm:rounded-2xl overflow-hidden bg-muted cursor-pointer group`}
              onClick={() => imageUrls.length > 0 && setIsImagePreviewOpen(true)}
            >
              {imageUrls.length > 0 ? (
                <>
                  <img
                    src={imageUrls[selectedImage] || imageUrls[0]}
                    alt={product.item.title}
                    className={`w-full h-full transition-transform group-hover:scale-105 ${isModal ? 'object-contain' : 'object-cover'}`}
                  />
                  {/* 放大提示 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </div>
                  </div>
                </>
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

            {/* Thumbnails & View Photos */}
            <div className="flex items-center gap-2 sm:gap-3">
              {imageUrls.length > 1 && (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto flex-1">
                  {imageUrls.slice(0, isModal ? 4 : imageUrls.length).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 ${isModal ? 'w-14 h-14' : 'w-16 h-16 sm:w-20 sm:h-20'} rounded-md sm:rounded-lg overflow-hidden border-2 transition-all touch-feedback ${
                        selectedImage === index
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-border'
                      }`}
                    >
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {/* 查看图片链接 */}
              {imageUrls.length > 0 && (
                <button
                  onClick={() => setIsImagePreviewOpen(true)}
                  className="text-sm text-primary hover:underline whitespace-nowrap flex-shrink-0"
                >
                  {t('product.viewPhotos', { count: imageUrls.length })}
                </button>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className={cn('space-y-3', isModal ? 'space-y-2.5' : 'sm:space-y-4')}>
            {/* Title & Rating */}
            <div>
              <h1
                className={cn(
                  'font-bold text-foreground leading-tight',
                  isModal ? 'text-base lg:text-lg mb-1' : 'text-lg sm:text-xl lg:text-2xl mb-1.5'
                )}
              >
                {decodeHtmlEntities(product.item.title)}
              </h1>
              <HStack gap="sm" align="center">
                <StarRating rating={averageRating} size={isModal ? 'sm' : 'md'} />
                <span className={cn('text-muted-foreground ml-1', isModal ? 'text-xs' : 'text-sm')}>
                  {averageRating.toFixed(1)} ({safeRatings.length} {t('product.reviews')})
                </span>
              </HStack>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  'font-bold text-primary',
                  isModal ? 'text-lg lg:text-xl' : 'text-xl sm:text-2xl lg:text-3xl'
                )}
              >
                {priceInfo.pairedPrice}
              </span>
            </div>

            {/* Shipping - 仅对实物商品显示 */}
            {product.metadata?.contractType === 'PHYSICAL_GOOD' && (
              <div
                className={cn(
                  'flex items-center gap-2 flex-wrap',
                  isModal ? 'text-xs' : 'text-xs sm:text-sm'
                )}
              >
                {freeShipping ? (
                  <span className="inline-flex items-center gap-1 text-primary font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground">
                      {t('product.estDelivery')}: {estimatedDelivery}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Product Attributes Panel */}
            <div className={cn('flex flex-wrap', isModal ? 'gap-1.5' : 'gap-2 sm:gap-2.5')}>
              {/* Type Badge - 使用 primary 主题色增强对比度 */}
              {product.metadata?.contractType && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20',
                    isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs sm:text-sm'
                  )}
                >
                  <span className="font-medium">{t('product.type')}:</span>
                  <span>
                    {product.metadata.contractType === 'PHYSICAL_GOOD' && t('product.physicalGood')}
                    {product.metadata.contractType === 'DIGITAL_GOOD' && t('product.digitalGood')}
                    {product.metadata.contractType === 'SERVICE' && t('product.serviceType')}
                    {product.metadata.contractType === 'CRYPTOCURRENCY' &&
                      t('product.cryptocurrency')}
                    {product.metadata.contractType === 'RWA_TOKEN' &&
                      (t('product.rwaToken') || 'RWA Token')}
                    {![
                      'PHYSICAL_GOOD',
                      'DIGITAL_GOOD',
                      'SERVICE',
                      'CRYPTOCURRENCY',
                      'RWA_TOKEN',
                    ].includes(product.metadata.contractType) &&
                      product.metadata.contractType.replace('_', ' ')}
                  </span>
                </div>
              )}
              {/* Condition Badge */}
              {product.item.condition && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-muted text-foreground border border-border',
                    isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs sm:text-sm'
                  )}
                >
                  <span className="font-medium">{t('product.condition')}:</span>
                  <span>{product.item.condition.replace('_', ' ')}</span>
                </div>
              )}
              {/* Weight Badge */}
              {product.item.grams !== undefined && product.item.grams > 0 && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-muted text-foreground border border-border',
                    isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs sm:text-sm'
                  )}
                >
                  <span className="font-medium">{t('product.weight')}:</span>
                  <span>{t('product.weightGrams', { weight: product.item.grams })}</span>
                </div>
              )}
            </div>

            {/* RWA 资产详情 - 仅对 RWA_TOKEN 类型商品显示 */}
            {product.metadata?.contractType === 'RWA_TOKEN' && (
              <RwaAssetDetail
                product={product}
                compact={isModal}
                showPurchaseHint={true}
                rwaTradeMode={rwaTradeMode}
                escrowTimeoutSeconds={rwaEscrowTimeoutSeconds}
                acceptedCurrencies={acceptedCurrencies}
                chainData={rwaChainData}
              />
            )}

            {/* Tags - 放在商品属性后面 */}
            {tags.length > 0 && (
              <div className={cn('space-y-1.5', isModal && 'space-y-1')}>
                <span
                  className={cn(
                    'font-medium text-muted-foreground',
                    isModal ? 'text-xs' : 'text-xs sm:text-sm'
                  )}
                >
                  {t('product.tags')}
                </span>
                <div className={cn('flex flex-wrap', isModal ? 'gap-1' : 'gap-1.5 sm:gap-2')}>
                  {tags.map(tag => (
                    <Link
                      key={tag}
                      href={`/marketplace?tag=${tag}`}
                      className={cn(
                        'border border-border bg-background text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors touch-feedback',
                        isModal
                          ? 'px-2 py-0.5 text-xs'
                          : 'px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm'
                      )}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Moderator Badge */}
            <VerifiedModeratorBadge moderatorPeerIDs={product.moderators} />

            {/* Quantity & Add to Cart - 桌面端显示 */}
            <Card
              className={cn(
                'space-y-3 p-4 hidden lg:block',
                stock === 0 && 'border-destructive/30 bg-destructive/5'
              )}
            >
              {/* 缺货提示 - 醒目显示 */}
              {stock === 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <svg
                    className="w-4 h-4 text-destructive flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-destructive">
                    {t('product.outOfStock')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('product.quantity')}
                </span>
                <HStack gap="sm" align="center">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={stock === 0}
                    className={cn(
                      'w-8 h-8 rounded-lg border border-border flex items-center justify-center touch-feedback transition-colors',
                      stock === 0 ? 'opacity-50 cursor-not-allowed bg-muted' : 'hover:bg-muted'
                    )}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={stock}
                    value={quantity}
                    disabled={stock === 0}
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        setQuantity(Math.min(stock, val));
                      }
                    }}
                    className={cn(
                      'w-14 h-8 text-center font-medium text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                      stock === 0 && 'opacity-50 cursor-not-allowed bg-muted'
                    )}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                    disabled={stock === 0}
                    className={cn(
                      'w-8 h-8 rounded-lg border border-border flex items-center justify-center touch-feedback transition-colors',
                      stock === 0 ? 'opacity-50 cursor-not-allowed bg-muted' : 'hover:bg-muted'
                    )}
                  >
                    +
                  </button>
                </HStack>
              </div>

              {/* 库存数量 - 仅在有库存时显示 */}
              {stock > 0 && (
                <span className="text-xs text-muted-foreground">
                  {stock} {t('product.inStock')}
                </span>
              )}

              <VStack gap="xs">
                <Button
                  size="default"
                  className={cn(
                    'w-full touch-feedback',
                    stock === 0 && 'opacity-50 cursor-not-allowed'
                  )}
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
                  ) : stock === 0 ? (
                    t('product.outOfStock')
                  ) : (
                    t('product.addToCart')
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  className={cn(
                    'w-full touch-feedback',
                    stock === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={handleBuyNow}
                  disabled={stock === 0}
                >
                  {t('product.buyNow')}
                </Button>
              </VStack>

              {/* Accepted Currencies */}
              {acceptedCurrencies.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {t('product.acceptedCurrencies')}:{' '}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {acceptedCurrencies.join(', ')}
                  </span>
                </div>
              )}
            </Card>

            {/* Vendor Info - 非弹框模式显示（弹框模式已在顶部显示） */}
            {!isModal && (
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
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {vendor.location}
                        </p>
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
            )}
          </div>
        </div>

        {/* Description & Reviews */}
        <div
          className={cn(
            'grid grid-cols-1 gap-4',
            isModal ? 'mt-4' : 'mt-6 sm:mt-12 lg:grid-cols-3 sm:gap-8'
          )}
        >
          {/* Description */}
          <div className={isModal ? '' : 'lg:col-span-2'}>
            <Card className={cn('p-4', !isModal && 'sm:p-6')}>
              <h2
                className={cn(
                  'font-bold text-foreground',
                  isModal ? 'text-base mb-2' : 'text-lg sm:text-xl mb-3 sm:mb-4'
                )}
              >
                {t('product.description')}
              </h2>
              <div
                className={cn(
                  'prose prose-slate dark:prose-invert max-w-none text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80',
                  isModal ? 'prose-sm text-sm' : 'prose-sm sm:prose text-sm sm:text-base'
                )}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(decodeHtmlEntities(product.item.description)),
                }}
              />

              {/* Terms & Refund Policy - 可折叠 */}
              {(product.termsAndConditions || product.refundPolicy) && (
                <div
                  className={cn(
                    'border-t border-border space-y-1',
                    isModal ? 'mt-3 pt-3' : 'mt-4 pt-4 sm:mt-6 sm:pt-6 space-y-2'
                  )}
                >
                  {product.termsAndConditions && (
                    <details className="group">
                      <summary
                        className={cn(
                          'flex items-center justify-between cursor-pointer py-1.5 font-medium text-foreground hover:text-primary transition-colors touch-feedback list-none',
                          isModal ? 'text-xs' : 'text-sm'
                        )}
                      >
                        <span>{t('product.termsAndConditions')}</span>
                        <svg
                          className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <p
                        className={cn(
                          'text-muted-foreground pb-2 pl-0',
                          isModal ? 'text-xs' : 'text-xs sm:text-sm'
                        )}
                      >
                        {product.termsAndConditions}
                      </p>
                    </details>
                  )}
                  {product.refundPolicy && (
                    <details className="group">
                      <summary
                        className={cn(
                          'flex items-center justify-between cursor-pointer py-1.5 font-medium text-foreground hover:text-primary transition-colors touch-feedback list-none',
                          isModal ? 'text-xs' : 'text-sm'
                        )}
                      >
                        <span>{t('product.refundPolicy')}</span>
                        <svg
                          className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <p
                        className={cn(
                          'text-muted-foreground pb-2 pl-0',
                          isModal ? 'text-xs' : 'text-xs sm:text-sm'
                        )}
                      >
                        {product.refundPolicy}
                      </p>
                    </details>
                  )}
                </div>
              )}
            </Card>

            {/* Shipping Options - 仅对实物商品显示 */}
            {product.metadata?.contractType === 'PHYSICAL_GOOD' && (
              <ShippingOptionsSection
                shippingOptions={product.shippingOptions}
                pricingCurrency={product.metadata?.pricingCurrency?.code}
              />
            )}
          </div>

          {/* Reviews Summary - 非弹框模式或单独展示 */}
          {!isModal && (
            <div>
              <Card className="p-3 sm:p-4">
                <h2 className="text-sm sm:text-base font-bold text-foreground mb-2 sm:mb-3">
                  {t('product.reviewsTitle')}
                </h2>

                {/* 评论加载状态 */}
                {ratingsLoading ? (
                  <div className="space-y-4">
                    {/* Rating Summary 骨架 */}
                    <div className="text-center mb-4 sm:mb-6">
                      <Skeleton className="h-10 w-16 mx-auto mb-2" />
                      <Skeleton className="h-5 w-24 mx-auto mb-2" />
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </div>
                    {/* Reviews 骨架 */}
                    {[1, 2, 3].map(i => (
                      <div key={i} className="pb-3 sm:pb-4 border-b border-border last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
                          <Skeleton className="h-4 w-20" />
                          <div className="ml-auto">
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-full mb-1" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Rating Summary */}
                    <div className="text-center mb-3 sm:mb-4">
                      <div className="text-2xl sm:text-3xl font-bold text-foreground">
                        {averageRating.toFixed(1)}
                      </div>
                      <HStack gap="xs" justify="center" className="my-1 sm:my-1.5">
                        <StarRating rating={averageRating} size="sm" />
                      </HStack>
                      <p className="text-xs text-muted-foreground">
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
                      <Button
                        variant="ghost"
                        className="w-full mt-3 sm:mt-4 text-sm touch-feedback"
                      >
                        {t('product.viewAllReviews')}
                      </Button>
                    )}
                  </>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* More from Store */}
        {vendorPeerID && (
          <div className={cn('mt-4', !isModal && 'mt-6 sm:mt-8')}>
            <MoreFromStore
              vendorPeerID={vendorPeerID}
              vendorName={vendor?.name}
              currentSlug={product.slug}
              maxItems={isModal ? 4 : 6}
              compact={isModal}
            />
          </div>
        )}
      </div>

      {/* 移动端底部操作栏占位空间 */}
      <div className="h-20 lg:hidden" />

      {/* 图片预览模态框 */}
      {isImagePreviewOpen && imageUrls.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setIsImagePreviewOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setIsImagePreviewOpen(false);
            } else if (e.key === 'ArrowLeft') {
              setSelectedImage(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
            } else if (e.key === 'ArrowRight') {
              setSelectedImage(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
            }
          }}
          tabIndex={0}
          ref={el => el?.focus()}
        >
          {/* 关闭按钮 */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            onClick={() => setIsImagePreviewOpen(false)}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* 图片计数 */}
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            {selectedImage + 1} / {imageUrls.length}
          </div>

          {/* 主图片 */}
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <img
              src={imageUrls[selectedImage]}
              alt={product.item.title}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>

          {/* 左右切换按钮 */}
          {imageUrls.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImage(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
                }}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImage(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
                }}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* 底部缩略图 */}
          {imageUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-lg p-2">
              {imageUrls.map((image, index) => (
                <button
                  key={index}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImage(index);
                  }}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? 'border-white'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 导出内部使用的数据和函数，供 BottomBar 使用
export { getStockQuantity, hasFreeShipping, getEstimatedDelivery, StarRating };
