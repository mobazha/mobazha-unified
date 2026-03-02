'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  productDataService,
  profileApi,
  getImageUrl,
  useI18n,
  useCurrency,
  useUserStore,
  useCartStore,
  universalSwapService,
  productsApi,
  discountsApi,
  useChatStore,
} from '@mobazha/core';
import type {
  Product,
  ProductRating,
  RatingIndex,
  UserProfile,
  ApplicableDiscount,
} from '@mobazha/core';
import { getAllZones as getAllShippingZones } from '@mobazha/core';
import {
  getProductWithDedup,
  getProfileWithDedup,
  getRatingsWithDedup,
} from '@/utils/requestDedup';

// --- Pure helpers ---

export function getStockQuantity(product: Product): number {
  if (!product.item.skus || product.item.skus.length === 0) return 999;
  return product.item.skus.reduce((sum, sku) => sum + (Number(sku.quantity) || 0), 0);
}

export function hasFreeShipping(product: Product): boolean {
  if (product.shippingProfile) {
    const zones = getAllShippingZones(product.shippingProfile);
    if (zones.length > 0) {
      return zones.some(
        zone => zone.rates?.some(rate => rate.price != null && Number(rate.price) === 0) ?? false
      );
    }
  }
  if (!product.shippingOptions) return false;
  return product.shippingOptions.some(opt => opt.services.some(svc => svc.price === 0));
}

export function getEstimatedDelivery(product: Product): string | null {
  if (product.shippingProfile) {
    const zones = getAllShippingZones(product.shippingProfile);
    if (zones.length > 0) {
      return zones[0]?.rates[0]?.estimatedDelivery || null;
    }
  }
  if (!product.shippingOptions || product.shippingOptions.length === 0) return null;
  return product.shippingOptions[0]?.services[0]?.estimatedDelivery || null;
}

// --- Hook ---

export interface UseProductDetailOptions {
  slug: string;
  peerID?: string;
  isModal?: boolean;
  onClose?: () => void;
  onProductLoaded?: (product: Product | null) => void;
}

export interface UseProductDetailReturn {
  // Data
  product: Product | null;
  vendor: UserProfile | null;
  ratings: ProductRating[];
  ratingIndex: RatingIndex | null;
  applicableDiscounts: ApplicableDiscount[];
  rwaChainData: { totalAmount?: string; availableAmount?: string; status?: string } | null;

  // Loading & error
  isLoading: boolean;
  ratingsLoading: boolean;
  error: string | null;

  // Derived
  imageUrls: string[];
  priceInfo: { price: number; currency: string; formattedPrice: string; pairedPrice: string };
  stock: number;
  freeShipping: boolean;
  estimatedDelivery: string | null;
  averageRating: number;
  ratingCount: number;
  safeRatings: ProductRating[];
  isOwnProduct: boolean;
  vendorPeerID: string | undefined;
  acceptedCurrencies: string[];
  tags: string[];
  category: string;
  rwaTradeMode: string | undefined;
  rwaEscrowTimeoutSeconds: number;

  // UI state
  quantity: number;
  setQuantity: (value: number | ((prev: number) => number)) => void;
  selectedImage: number;
  setSelectedImage: (value: number | ((prev: number) => number)) => void;
  cartSuccess: boolean;
  isImagePreviewOpen: boolean;
  setIsImagePreviewOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  linkCopied: boolean;

  // Actions
  handleAddToCart: () => void;
  handleBuyNow: () => void;
  handleCopyLink: () => void;
  openChatDrawer: () => void;

  // i18n & formatting
  t: ReturnType<typeof useI18n>['t'];
  formatPrice: ReturnType<typeof useCurrency>['formatPrice'];
  renderPairedPrice: ReturnType<typeof useCurrency>['renderPairedPrice'];
  router: ReturnType<typeof useRouter>;
}

export function useProductDetail({
  slug,
  peerID,
  isModal = false,
  onClose,
  onProductLoaded,
}: UseProductDetailOptions): UseProductDetailReturn {
  const { t } = useI18n();
  const router = useRouter();
  const { formatPrice, renderPairedPrice } = useCurrency();
  const openChatDrawer = useChatStore(state => state.openDrawer);

  const [product, setProduct] = useState<Product | null>(null);
  const [vendor, setVendor] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<ProductRating[]>([]);
  const [ratingIndex, setRatingIndex] = useState<RatingIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [applicableDiscounts, setApplicableDiscounts] = useState<ApplicableDiscount[]>([]);

  const { isAuthenticated, profile: currentUserProfile } = useUserStore();
  const isOwnProduct =
    isAuthenticated &&
    !!product?.vendorID?.peerID &&
    currentUserProfile?.peerID === product.vendorID.peerID;

  const onProductLoadedRef = useRef(onProductLoaded);
  onProductLoadedRef.current = onProductLoaded;

  const loadedDataRef = useRef<string | null>(null);
  const loadedRatingsRef = useRef<string | null>(null);
  const loadedRwaChainDataRef = useRef<string | null>(null);

  // RWA chain data
  useEffect(() => {
    if (!product) return;
    const contractType = product.metadata?.contractType;
    if (contractType !== 'RWA_TOKEN') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const metadata = product.metadata as any;
    const rwaListingId = metadata?.rwaListingId;
    if (!rwaListingId || rwaListingId === '0' || rwaListingId === 0) return;

    const chainDataKey = `${product.slug}-${rwaListingId}`;
    if (loadedRwaChainDataRef.current === chainDataKey) return;

    const blockchain = product.item?.blockchain || 'sepolia';
    let isCancelled = false;

    const loadChainData = async () => {
      try {
        await universalSwapService.initializeReadOnly(blockchain, true);
        const listing = await universalSwapService.getListing(rwaListingId.toString());
        if (isCancelled || !listing) return;
        loadedRwaChainDataRef.current = chainDataKey;
        setRwaChainData({
          totalAmount: listing.totalAmount,
          availableAmount: listing.availableAmount,
          status: listing.status,
        });
      } catch (err) {
        console.error('Failed to load RWA chain data:', err);
      }
    };

    loadChainData();
    return () => {
      isCancelled = true;
    };
  }, [product]);

  // Product fetch
  useEffect(() => {
    const requestKey = `${slug}-${peerID || ''}`;
    if (loadedDataRef.current === requestKey) return;

    let isCancelled = false;

    const fetchProductData = async () => {
      if (!slug) return;
      setIsLoading(true);
      setError(null);

      try {
        const productData = await getProductWithDedup(slug, peerID, () =>
          productDataService.getProduct(slug, peerID)
        );

        if (isCancelled) return;
        if (!productData) {
          setError(t('product.notFound'));
          setIsLoading(false);
          onProductLoadedRef.current?.(null);
          return;
        }

        loadedDataRef.current = requestKey;
        setProduct(productData);
        onProductLoadedRef.current?.(productData);

        const vendorPID = productData.vendorID?.peerID;
        if (vendorPID) {
          try {
            const vendorData = await getProfileWithDedup(vendorPID, () =>
              profileApi.getProfile(vendorPID)
            );
            if (!isCancelled && vendorData) setVendor(vendorData);
          } catch (err) {
            console.error('Failed to fetch vendor:', err);
          }
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        if (!isCancelled) setError(t('common.error'));
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchProductData();
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, peerID]);

  // Ratings fetch
  useEffect(() => {
    if (!product) return;
    const vendorPID = product.vendorID?.peerID;
    if (!vendorPID) return;

    const ratingsKey = `ratings-${slug}-${vendorPID}`;
    if (loadedRatingsRef.current === ratingsKey) return;

    let isCancelled = false;

    const fetchRatings = async () => {
      setRatingsLoading(true);
      try {
        const ratingsData = await getRatingsWithDedup(slug, vendorPID, () =>
          productDataService.getProductRatings(slug, vendorPID)
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
              if (!isCancelled) setRatings(details as ProductRating[]);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch ratings:', err);
      } finally {
        if (!isCancelled) setRatingsLoading(false);
      }
    };

    fetchRatings();
    return () => {
      isCancelled = true;
    };
  }, [product, slug]);

  // Discounts
  useEffect(() => {
    const vendorPID = product?.vendorID?.peerID;
    if (!product || !vendorPID) return;
    discountsApi
      .getApplicableDiscounts(vendorPID)
      .then(setApplicableDiscounts)
      .catch(() => {});
  }, [product]);

  // Derived values
  const imageUrls = useMemo(() => {
    if (!product?.item?.images) return [];
    return product.item.images
      .map(img => getImageUrl(img.medium) || getImageUrl(img.large) || getImageUrl(img.original))
      .filter((url): url is string => !!url);
  }, [product]);

  const priceInfo = useMemo(() => {
    if (!product)
      return { price: 0, currency: 'USD', formattedPrice: '$0.00', pairedPrice: '$0.00' };
    const price = Number(product.item.price) || 0;
    const currency = product.metadata?.pricingCurrency?.code || 'USD';
    const formattedPrice = formatPrice(price, currency);
    const pairedPrice = renderPairedPrice(price, currency);
    return { price, currency, formattedPrice, pairedPrice };
  }, [product, formatPrice, renderPairedPrice]);

  const safeRatings = useMemo(() => (Array.isArray(ratings) ? ratings : []), [ratings]);
  const ratingCount = ratingIndex?.count ?? safeRatings.length;
  const averageRating = useMemo(() => {
    if (ratingIndex) return ratingIndex.average;
    if (safeRatings.length === 0) return 0;
    return safeRatings.reduce((acc, r) => acc + (r.overall || 0), 0) / safeRatings.length;
  }, [ratingIndex, safeRatings]);

  const stock = product ? getStockQuantity(product) : 0;
  const freeShipping = product ? hasFreeShipping(product) : false;
  const estimatedDelivery = product ? getEstimatedDelivery(product) : null;
  const vendorPeerID = product?.vendorID?.peerID;
  const acceptedCurrencies = product?.metadata?.acceptedCurrencies || [];
  const tags = product?.item.tags || [];
  const category = product?.item.productType || '';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rwaTradeMode = (product?.metadata as any)?.rwaTradeMode;
  const rwaEscrowTimeoutSeconds =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (product?.metadata as any)?.rwaEscrowTimeoutSeconds ||
    product?.metadata?.escrowTimeoutSeconds ||
    86400;

  // Actions
  const addCartItem = useCartStore(state => state.addItem);

  const handleAddToCart = useCallback(() => {
    if (!product || !product.vendorID?.peerID) return;

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
        vendorPeerID: product.vendorID.peerID,
        vendorHandle: product.vendorID.handle,
      },
      quantity,
    });

    setCartSuccess(true);
    setTimeout(() => setCartSuccess(false), 3000);
  }, [product, quantity, addCartItem]);

  const handleBuyNow = useCallback(() => {
    if (!product || !product.vendorID?.peerID) return;

    const checkoutParams = new URLSearchParams({
      slug: product.slug,
      peerID: product.vendorID.peerID,
      quantity: quantity.toString(),
    });

    if (isModal && onClose) onClose();
    router.push(`/checkout?${checkoutParams.toString()}`);
  }, [product, quantity, isModal, onClose, router]);

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

  return {
    product,
    vendor,
    ratings,
    ratingIndex,
    applicableDiscounts,
    rwaChainData,
    isLoading,
    ratingsLoading,
    error,
    imageUrls,
    priceInfo,
    stock,
    freeShipping,
    estimatedDelivery,
    averageRating,
    ratingCount,
    safeRatings,
    isOwnProduct,
    vendorPeerID,
    acceptedCurrencies,
    tags,
    category,
    rwaTradeMode,
    rwaEscrowTimeoutSeconds,
    quantity,
    setQuantity,
    selectedImage,
    setSelectedImage,
    cartSuccess,
    isImagePreviewOpen,
    setIsImagePreviewOpen,
    linkCopied,
    handleAddToCart,
    handleBuyNow,
    handleCopyLink,
    openChatDrawer,
    t,
    formatPrice,
    renderPairedPrice,
    router,
  };
}
