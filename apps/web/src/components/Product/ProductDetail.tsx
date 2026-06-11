'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { ImageThumbnails } from '@/components/ui/image-thumbnails';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { StarRating } from '@/components/ui/star-rating';
import { cn } from '@/lib/utils';
import { usePrimaryCTA } from '@/lib/platform';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import {
  productDataService,
  profileApi,
  getImageUrl,
  useI18n,
  useCurrency,
  useUserStore,
  useCartStore,
  universalSwapService,
  decodeHtmlEntities,
  sanitizeHtml,
  useChatStore,
  productsApi,
  discountsApi,
  useListing,
  useFiatProviders,
  usePaymentMethods,
  getTokenIdFromPaymentCoin,
  filterVisibleAcceptedCurrencies,
  buildProductHref,
} from '@mobazha/core';
import type { ApplicableDiscount } from '@mobazha/core';
import type { Product, ProductRating, RatingIndex, UserProfile } from '@mobazha/core';
import { getAllZones as getAllShippingZones } from '@mobazha/core';
import { getProfileWithDedup, getRatingsWithDedup } from '@/utils/requestDedup';
import { Heart, AlertTriangle } from 'lucide-react';
import { VerifiedModeratorBadge } from './VerifiedModeratorBadge';
import { BuyerProtectionBanner } from './BuyerProtectionBanner';
import { BuyerProtectionBadge } from '@/components/Trust/BuyerProtectionBadge';
import { PaymentMethodBadges } from '@/components/Payment/PaymentMethodBadges';
import { ShippingOptionsSection } from './ShippingOptionsSection';
import { MoreFromStore } from './MoreFromStore';
import { RwaAssetDetail } from '@/components/RwaToken';
import { ShareButton } from '@/components/Share';
import { ReviewList } from '@/components/Review';

// 获取库存数量（从 SKU 计算）
function getStockQuantity(product: Product): number {
  if (!product.item.skus || product.item.skus.length === 0) {
    return 999; // 默认无限库存
  }
  return product.item.skus.reduce((sum, sku) => sum + (Number(sku.quantity) || 0), 0);
}

// 检查是否免运费
function hasFreeShipping(product: Product): boolean {
  if (!product.shippingProfile) return false;
  const zones = getAllShippingZones(product.shippingProfile);
  if (zones.length === 0) return false;
  return zones.some(
    zone => zone.rates?.some(rate => rate.price != null && Number(rate.price) === 0) ?? false
  );
}

// 获取预计送达时间
function getEstimatedDelivery(product: Product): string | null {
  if (!product.shippingProfile) return null;
  const zones = getAllShippingZones(product.shippingProfile);
  if (zones.length === 0) return null;
  const firstRate = zones[0]?.rates[0];
  return firstRate?.estimatedDelivery || null;
}

export interface ProductDetailProps {
  slug: string;
  peerID?: string;
  isModal?: boolean;
  onClose?: () => void;
  onMessage?: () => void;
  onCart?: () => void;
  onProductLoaded?: (product: Product | null) => void;
  isWishlist?: boolean;
  onToggleWishlist?: () => void;
}

export function ProductDetail({
  slug,
  peerID,
  isModal = false,
  onClose,
  onMessage,
  onCart,
  onProductLoaded,
  isWishlist = false,
  onToggleWishlist,
}: ProductDetailProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { formatPrice, renderPairedPrice, fromMinimalUnit } = useCurrency();
  const openDrawerWithPeer = useChatStore(state => state.openDrawerWithPeer);

  // 状态管理
  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [ratingIndex, setRatingIndex] = useState<RatingIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [rwaChainData, setRwaChainData] = useState<{
    totalAmount?: string;
    availableAmount?: string;
    status?: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { isAuthenticated, profile: currentUserProfile } = useUserStore();
  const isOwnProduct =
    isAuthenticated &&
    !!product?.vendorID?.peerID &&
    currentUserProfile?.peerID === product.vendorID.peerID;

  const { activeProviders: fiatActiveProviders } = useFiatProviders(
    peerID || product?.vendorID?.peerID
  );

  const {
    crypto: vendorCrypto,
    activeFiat: vendorActiveFiat,
    isLoading: paymentMethodsLoading,
  } = usePaymentMethods(peerID || product?.vendorID?.peerID);

  // Outpost: guest checkout via XMR is always available; skip fiat/crypto method check.
  const paymentAvailable =
    __OUTPOST__ || paymentMethodsLoading || vendorCrypto.length > 0 || vendorActiveFiat.length > 0;

  const displayAcceptedCurrencies = useMemo(
    () =>
      filterVisibleAcceptedCurrencies(product?.metadata?.acceptedCurrencies ?? []).map(
        coin => getTokenIdFromPaymentCoin(coin) || coin
      ),
    [product?.metadata?.acceptedCurrencies]
  );

  const isStorePaused = !isOwnProduct && vendor?.storePaused === true;

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

  // 通过 React Query 获取商品数据（自动消费 prefetch 缓存）
  const {
    listing: rqListing,
    isOffline: storeOffline,
    isLoading: rqLoading,
    error: rqError,
  } = useListing(slug, peerID);

  useEffect(() => {
    if (rqListing) {
      setProduct(rqListing);
      setIsLoading(false);
      setError(null);
      loadedDataRef.current = `${slug}-${peerID || ''}`;
      onProductLoadedRef.current?.(rqListing);
    } else if (rqError) {
      setError(rqError);
      setIsLoading(false);
      onProductLoadedRef.current?.(null);
    } else if (!rqLoading && storeOffline) {
      setIsLoading(false);
      onProductLoadedRef.current?.(null);
    } else if (rqLoading) {
      setIsLoading(true);
    }
    if (storeOffline) setIsOffline(true);
  }, [rqListing, rqError, rqLoading, storeOffline, slug, peerID]);

  // 获取卖家信息（不阻塞商品显示）
  useEffect(() => {
    const vendorPeerID = product?.vendorID?.peerID;
    if (!vendorPeerID) return;

    let isCancelled = false;
    getProfileWithDedup(vendorPeerID, () => profileApi.getProfile(vendorPeerID))
      .then(vendorData => {
        if (!isCancelled && vendorData) setVendor(vendorData);
      })
      .catch(err => console.error('Failed to fetch vendor:', err));

    return () => {
      isCancelled = true;
    };
  }, [product?.vendorID?.peerID]);

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

        if (!isCancelled) {
          loadedRatingsRef.current = ratingsKey;
          if (Array.isArray(ratingsData)) {
            setRatings(ratingsData as ProductRating[]);
          } else if (ratingsData && typeof ratingsData === 'object' && 'count' in ratingsData) {
            const idx = ratingsData as RatingIndex;
            setRatingIndex(idx);
            if (idx.ratings && idx.ratings.length > 0) {
              const details = await productsApi.fetchRatings(idx.ratings);
              if (!isCancelled) {
                setRatings(details as ProductRating[]);
              }
            }
          }
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

  // 自动折扣标签
  const [applicableDiscounts, setApplicableDiscounts] = useState<ApplicableDiscount[]>([]);
  useEffect(() => {
    const vendorPID = product?.vendorID?.peerID;
    if (!product || !vendorPID) return;
    discountsApi
      .getApplicableDiscounts(vendorPID)
      .then(setApplicableDiscounts)
      .catch(() => {});
  }, [product]);

  // 计算图片 URL 数组
  const imageUrls = useMemo(() => {
    if (!product?.item?.images) return [];
    return product.item.images
      .map(img => getImageUrl(img.medium) || getImageUrl(img.large) || getImageUrl(img.original))
      .filter((url): url is string => !!url);
  }, [product]);

  const imageSwipeHandlers = useSwipeGesture({
    onSwipeLeft: useCallback(
      () => setSelectedImage(prev => (prev >= imageUrls.length - 1 ? 0 : prev + 1)),
      [imageUrls.length]
    ),
    onSwipeRight: useCallback(
      () => setSelectedImage(prev => (prev <= 0 ? imageUrls.length - 1 : prev - 1)),
      [imageUrls.length]
    ),
    enabled: imageUrls.length > 1,
  });

  // 计算价格信息
  const priceInfo = useMemo(() => {
    if (!product)
      return { price: 0, currency: 'USD', formattedPrice: '$0.00', pairedPrice: '$0.00' };
    const price = Number(product.item.price) || 0;
    const currency = product.metadata?.pricingCurrency?.code || 'USD';
    const formattedPrice = formatPrice(fromMinimalUnit(price, currency), currency);
    const pairedPrice = renderPairedPrice(price, currency);
    return { price, currency, formattedPrice, pairedPrice };
  }, [product, formatPrice, renderPairedPrice, fromMinimalUnit]);

  const safeRatings = useMemo(() => {
    return Array.isArray(ratings) ? ratings : [];
  }, [ratings]);

  const ratingCount = ratingIndex?.count ?? safeRatings.length;
  const averageRating = useMemo(() => {
    if (ratingIndex) return ratingIndex.average;
    if (safeRatings.length === 0) return 0;
    const sum = safeRatings.reduce((acc, r) => acc + (r.overall || 0), 0);
    return sum / safeRatings.length;
  }, [ratingIndex, safeRatings]);

  const addCartItem = useCartStore(state => state.addItem);

  const handleAddToCart = useCallback(() => {
    if (!product) return;
    if (product.metadata?.contractType === 'RWA_TOKEN') return;

    const vendorPeerID = product.vendorID?.peerID || peerID || currentUserProfile?.peerID;
    if (!vendorPeerID) return;

    const thumbnail = product.item?.images?.[0] ?? {
      tiny: '',
      small: '',
      medium: '',
      large: '',
      original: '',
    };
    const price = Number(product.item?.price) || 0;
    const currency = product.metadata?.pricingCurrency?.code || 'USD';
    const divisibility = product.metadata?.pricingCurrency?.divisibility ?? 2;

    addCartItem({
      listing: {
        slug: product.slug,
        title: product.item?.title || product.slug,
        thumbnail,
        price: { amount: price, currency: { code: currency, divisibility } },
        vendorPeerID,
        vendorName: product.vendorID?.name || product.vendorID?.handle,
      },
      quantity,
    });

    setCartSuccess(true);
    setTimeout(() => setCartSuccess(false), 3000);
  }, [product, quantity, addCartItem, peerID, currentUserProfile?.peerID]);

  // 立即购买
  const handleBuyNow = useCallback(() => {
    if (!product || !product.vendorID?.peerID) return;
    if (product.metadata?.contractType === 'RWA_TOKEN') return;

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

  // MVP-1: platform-abstract primary CTA (replaces useTGMainButton). On
  // Web/Discord the CTA is a no-op; the page's inline Add-to-Cart button
  // continues to render below. Haptic lives in useProductDetail's
  // handleAddToCart.
  const cta = usePrimaryCTA();
  const tgStock = useMemo(() => (product ? getStockQuantity(product) : 0), [product]);
  const tgPriceDisplay = useMemo(() => {
    if (!product) return '';
    const price = Number(product.item?.price) || 0;
    const curr = product.metadata?.pricingCurrency?.code || 'USD';
    return renderPairedPrice(price, curr);
  }, [product, renderPairedPrice]);

  const handleNativeAddToCart = useCallback(() => {
    handleAddToCart();
  }, [handleAddToCart]);

  useEffect(() => {
    if (!cta.isNative) return;
    const shouldShow = !!product && !isModal;
    const text = !shouldShow
      ? undefined
      : isStorePaused
        ? t('store.statusPaused')
        : tgStock === 0
          ? t('product.outOfStock')
          : `${t('product.addToCart')} - ${tgPriceDisplay}`;
    cta.setText(text);
    cta.setOnClick(shouldShow ? handleNativeAddToCart : undefined);
    cta.setDisabled(
      !shouldShow ||
        tgStock === 0 ||
        isStorePaused ||
        product?.metadata?.contractType === 'RWA_TOKEN'
    );
    return () => {
      cta.setText(undefined);
    };
  }, [cta, product, isModal, isStorePaused, tgStock, tgPriceDisplay, handleNativeAddToCart, t]);

  const handleCopyLink = useCallback(async () => {
    if (!product) return;
    const url = buildProductHref(product.slug, peerID || product.vendorID?.peerID, {
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
  }, [product, peerID]);

  const _handleMessage = useCallback(() => {
    if (onMessage) {
      onMessage();
    } else {
      const vendorPeerID = product?.vendorID?.peerID;
      if (vendorPeerID) {
        openDrawerWithPeer(vendorPeerID, vendor?.name);
      }
    }
  }, [onMessage, product?.vendorID?.peerID, vendor?.name, openDrawerWithPeer]);

  // 跳转到购物车 (reserved for future use)
  const _handleGoToCart = useCallback(() => {
    if (onCart) {
      onCart();
    } else {
      router.push('/cart');
    }
  }, [onCart, router]);

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
    const offlineMessage = storeOffline
      ? t('product.storeOffline', {
          defaultValue: 'This store is currently offline. Please try again later.',
        })
      : null;
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
              d={
                storeOffline
                  ? 'M18.364 5.636a9 9 0 11-12.728 12.728 9 9 0 0112.728-12.728M12 9v4m0 4h.01'
                  : 'M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              }
            />
          </svg>
          <p className="text-muted-foreground mb-4">
            {offlineMessage || error || t('product.notFound')}
          </p>
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
  const category = product.item.productType || '';

  const isRwaToken = product?.metadata?.contractType === 'RWA_TOKEN';
  const purchaseDisabled =
    isOffline || stock === 0 || !paymentAvailable || isStorePaused || isRwaToken;

  return (
    <div className={isModal ? 'overflow-y-auto max-h-[85vh]' : ''} data-testid="product-detail">
      {isOffline && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center gap-3">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {t('product.offlineBanner', {
              defaultValue:
                'This seller is currently offline. You can browse the listing but purchasing is unavailable until they come back online.',
            })}
          </p>
        </div>
      )}
      {isStorePaused && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border-b border-warning/20 text-sm"
        >
          <span className="text-warning font-medium">{t('store.pausedBanner')}</span>
        </div>
      )}
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
                name={vendor?.name || vendorPeerID || ''}
                size="sm"
                className="w-9 h-9 flex-shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">
                  {vendor?.name ||
                    (vendorPeerID ? `${vendorPeerID.slice(0, 6)}…${vendorPeerID.slice(-4)}` : '')}
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
                className="h-11 px-3 text-xs sm:h-9"
                onClick={() => {
                  const vendorPeerID = product?.vendorID?.peerID;
                  if (vendorPeerID) openDrawerWithPeer(vendorPeerID, vendor?.name);
                }}
              >
                {t('profile.message')}
              </Button>
              <Button variant="outline" size="sm" className="h-11 px-3 text-xs sm:h-9">
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
              {...imageSwipeHandlers}
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

                  {/* Swipe dot indicators (mobile) */}
                  {imageUrls.length > 1 && (
                    <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 sm:hidden">
                      {imageUrls.map((_, idx) => (
                        <span
                          key={idx}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full transition-all',
                            idx === selectedImage ? 'bg-white w-3' : 'bg-white/50'
                          )}
                        />
                      ))}
                    </div>
                  )}
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
                <ImageThumbnails
                  imageUrls={imageUrls}
                  activeIndex={selectedImage}
                  onSelect={setSelectedImage}
                  altPrefix={`${product.item.title} image`}
                  className="flex-1 gap-2 sm:gap-3"
                  itemClassName={cn(
                    'touch-feedback rounded-md sm:rounded-lg',
                    isModal ? 'h-14 w-14' : 'h-16 w-16 sm:h-20 sm:w-20'
                  )}
                  dataTestIdPrefix="product-detail-thumbnail"
                  maxVisible={isModal ? 4 : undefined}
                />
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
              <HStack justify="between" align="start">
                <h1
                  className={cn(
                    'font-bold text-foreground leading-tight flex-1',
                    isModal ? 'text-base lg:text-lg mb-1' : 'text-lg sm:text-xl lg:text-2xl mb-1.5'
                  )}
                >
                  {decodeHtmlEntities(product.item.title)}
                </h1>
                {!isModal && (
                  <ShareButton
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                    title={product.item.title}
                    description={product.item.description?.substring(0, 100)}
                    embedType="product"
                    embedIdentifier={slug}
                    embedPeerID={peerID}
                  />
                )}
              </HStack>
              <HStack gap="sm" align="center">
                <StarRating value={averageRating} size={isModal ? 'sm' : 'md'} />
                <span className={cn('text-muted-foreground ml-1', isModal ? 'text-xs' : 'text-sm')}>
                  {averageRating.toFixed(1)} ({ratingCount} {t('product.reviews')})
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

            {fiatActiveProviders.length > 0 && (
              <PaymentMethodBadges
                fiatProviders={fiatActiveProviders.map(p => p.providerID)}
                size={isModal ? 'sm' : 'md'}
              />
            )}

            {!__OUTPOST__ && <BuyerProtectionBadge variant="inline" className="mt-1" />}

            {/* Applicable discounts */}
            {applicableDiscounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {applicableDiscounts.map((d, idx) => (
                  <div
                    key={`${d.title}-${idx}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 text-primary',
                      isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm'
                    )}
                  >
                    <svg
                      className="w-3 h-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <span>
                      {d.valueType === 'percentage' &&
                        t('product.discount.off', { value: `${d.value}%` })}
                      {d.valueType === 'fixed_amount' &&
                        t('product.discount.off', { value: `${d.currency} ${d.value}` })}
                      {d.valueType === 'free_shipping' && t('product.discount.freeShipping')}
                      {d.minPurchaseType === 'min_amount' && Number(d.minAmount) > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          {t('product.discount.minPurchase', {
                            amount: `${d.currency} ${d.minAmount}`,
                          })}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

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
                    {product.metadata.contractType === 'RWA_TOKEN' && t('product.rwaToken')}
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

            {/* Verified Moderator Badge — hidden in Outpost (no moderator/arbitration system) */}
            {!__OUTPOST__ && <VerifiedModeratorBadge moderatorPeerIDs={product.moderators} />}

            {/* Buyer Protection — hidden in Outpost (XMR direct pay, no escrow/arbitration) */}
            {!isOwnProduct && !__OUTPOST__ && <BuyerProtectionBanner />}

            {/* Desktop action card: seller actions vs buyer purchase */}
            {isOwnProduct ? (
              <Card
                className="space-y-3 p-4 hidden lg:block"
                data-testid="product-detail-seller-actions"
              >
                <VStack gap="xs">
                  <Button
                    size="default"
                    className="w-full touch-feedback"
                    onClick={() => {
                      if (isModal && onClose) onClose();
                      router.push(`/listing/edit/${product.slug}`);
                    }}
                    data-testid="product-detail-edit"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    {t('product.editProduct')}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full touch-feedback"
                    onClick={handleCopyLink}
                    data-testid="product-detail-share"
                  >
                    {linkCopied ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
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
                        {t('product.linkCopied')}
                      </span>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                        {t('product.shareLink')}
                      </>
                    )}
                  </Button>
                </VStack>
                <p className="text-xs text-center text-muted-foreground pt-1">
                  {t('product.sellerViewHint')}
                </p>
              </Card>
            ) : (
              <Card
                className={cn(
                  'space-y-3 p-4 hidden lg:block',
                  stock === 0 && 'border-destructive/30 bg-destructive/5',
                  !paymentAvailable && stock > 0 && 'border-warning/30 bg-warning/5'
                )}
              >
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

                {!paymentAvailable && stock > 0 && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {t('payment.paymentUnavailable')}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('payment.paymentUnavailableDesc')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('product.quantity')}
                  </span>
                  <HStack gap="sm" align="center">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={stock === 0 || !paymentAvailable}
                      aria-label="Decrease quantity"
                      data-testid="product-detail-qty-decrease"
                      className={cn(
                        'w-10 h-10 rounded-lg border border-border flex items-center justify-center touch-feedback transition-colors',
                        stock === 0 || !paymentAvailable
                          ? 'opacity-50 cursor-not-allowed bg-muted'
                          : 'hover:bg-muted'
                      )}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={stock}
                      value={quantity}
                      disabled={stock === 0 || !paymentAvailable}
                      aria-label="Quantity"
                      data-testid="product-detail-qty-input"
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          setQuantity(Math.min(stock, val));
                        }
                      }}
                      onKeyDown={e => {
                        if (stock === 0) return;
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setQuantity(prev => Math.min(stock, prev + 1));
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setQuantity(prev => Math.max(1, prev - 1));
                        }
                      }}
                      className={cn(
                        'w-14 h-8 text-center font-medium text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                        (stock === 0 || !paymentAvailable) &&
                          'opacity-50 cursor-not-allowed bg-muted'
                      )}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                      disabled={stock === 0 || !paymentAvailable}
                      aria-label="Increase quantity"
                      data-testid="product-detail-qty-increase"
                      className={cn(
                        'w-10 h-10 rounded-lg border border-border flex items-center justify-center touch-feedback transition-colors',
                        stock === 0 || !paymentAvailable
                          ? 'opacity-50 cursor-not-allowed bg-muted'
                          : 'hover:bg-muted'
                      )}
                    >
                      +
                    </button>
                  </HStack>
                </div>

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
                      purchaseDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={handleAddToCart}
                    disabled={purchaseDisabled}
                    data-testid="product-detail-add-to-cart"
                  >
                    {cartSuccess ? (
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
                    ) : isOffline ? (
                      t('product.sellerOffline', { defaultValue: 'Seller Offline' })
                    ) : isStorePaused ? (
                      t('store.statusPaused')
                    ) : stock === 0 ? (
                      t('product.outOfStock')
                    ) : !paymentAvailable ? (
                      t('payment.paymentUnavailable')
                    ) : (
                      t('product.addToCart')
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className={cn(
                      'w-full touch-feedback',
                      purchaseDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={handleBuyNow}
                    disabled={purchaseDisabled}
                    data-testid="product-detail-buy-now"
                  >
                    {t('product.buyNow')}
                  </Button>
                  {onToggleWishlist && (
                    <Button
                      variant="ghost"
                      size="default"
                      className="w-full"
                      onClick={onToggleWishlist}
                      data-testid="product-detail-wishlist"
                    >
                      <Heart
                        className={cn(
                          'w-4 h-4 mr-2',
                          isWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                        )}
                      />
                      {isWishlist ? t('product.wishlisted') : t('product.addToWishlist')}
                    </Button>
                  )}
                </VStack>

                {(displayAcceptedCurrencies.length > 0 || fiatActiveProviders.length > 0) && (
                  <div className="pt-3 border-t border-border space-y-2">
                    {fiatActiveProviders.length > 0 && (
                      <PaymentMethodBadges
                        fiatProviders={fiatActiveProviders.map(p => p.providerID)}
                        showCrypto={displayAcceptedCurrencies.length > 0}
                        size="sm"
                      />
                    )}
                    {displayAcceptedCurrencies.length > 0 && fiatActiveProviders.length === 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          {t('product.acceptedCurrencies')}:{' '}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {displayAcceptedCurrencies.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )}

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
                          <span className="text-warning text-sm">★</span>
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
                  'prose dark:prose-invert max-w-none text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80',
                  isModal ? 'prose-sm text-sm' : 'prose-sm sm:prose text-sm sm:text-base'
                )}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(decodeHtmlEntities(product.item.description)),
                }}
              />
            </Card>

            {/* Shipping Options - 仅对实物商品显示 */}
            {product.metadata?.contractType === 'PHYSICAL_GOOD' && (
              <ShippingOptionsSection shippingProfile={product.shippingProfile} />
            )}
          </div>

          {/* Reviews - 非弹框模式 */}
          {!isModal && (
            <div>
              <Card className="p-3 sm:p-4">
                <h2 className="text-sm sm:text-base font-bold text-foreground mb-2 sm:mb-3">
                  {t('product.reviewsTitle')}
                </h2>
                {ratingsLoading ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4 sm:mb-6">
                      <Skeleton className="h-10 w-16 mx-auto mb-2" />
                      <Skeleton className="h-5 w-24 mx-auto mb-2" />
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </div>
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
                  <ReviewList ratings={safeRatings} ratingIndex={ratingIndex ?? undefined} />
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

      <ImageLightbox
        imageUrls={imageUrls}
        open={isImagePreviewOpen}
        selectedIndex={selectedImage}
        onSelectIndex={setSelectedImage}
        onOpenChange={setIsImagePreviewOpen}
        variant="product"
        altPrefix={product.item.title}
        ariaLabel="Product image preview"
        testIdPrefix="product-detail-preview"
      />
    </div>
  );
}

// 导出内部使用的数据和函数，供 BottomBar 使用
export { getStockQuantity, hasFreeShipping, getEstimatedDelivery };
