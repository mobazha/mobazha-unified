'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useI18n,
  searchDataService,
  getImageUrl,
  useVerifiedModerators,
  useWishlist,
  parsePriceFields,
  listingDisplayPriceFromListItem,
  useMarketplaceContext,
  useNativeMarketplaceAttribution,
  useCurrency,
} from '@mobazha/core';
import { toast } from '@/components/ui/use-toast';
import type { ProductListItem, AddWishlistParams } from '@mobazha/core';
import type { ProductContractType } from '@/components/ProductCard';

export interface DisplayProduct {
  id: string;
  slug: string;
  title: string;
  price: number | string;
  currency?: string;
  divisibility?: number;
  priceFrom?: boolean;
  image: string;
  vendor: {
    peerID: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  reviewCount: number;
  contractType: ProductContractType;
  tokenStandard?: string;
  rwaTradeMode?: number;
  moderators?: string[];
}

export interface SearchUser {
  peerID: string;
  name: string;
  avatar?: string;
  shortDescription?: string;
  location?: string;
  listingCount: number;
  rating: number;
  reviewCount: number;
}

export type TabType = 'listings' | 'users';
export type BrowseMode = 'discover' | 'all';

const SEARCH_SORT_VALUES = ['relevance', 'price_low', 'price_high', 'rating', 'newest'] as const;

function isBrowseAllQuery(query: string): boolean {
  const trimmed = query.trim();
  return trimmed === '' || trimmed === '*';
}

function parseBrowseParam(value: string | null): BrowseMode {
  return value === 'all' ? 'all' : 'discover';
}

function parseSortParam(value: string | null): string {
  if (value && SEARCH_SORT_VALUES.includes(value as (typeof SEARCH_SORT_VALUES)[number])) {
    return value;
  }
  return 'relevance';
}

function parseRatingParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = parseInt(value, 10);
  if (n >= 1 && n <= 5) return n;
  return undefined;
}

function parsePriceDisplayParam(value: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  const n = parseFloat(value);
  if (Number.isNaN(n) || n < 0) return undefined;
  return value.trim();
}

function priceFilterFromDisplay(
  currency: string,
  toMinimal: (amount: number | string, currency: string) => number,
  displayMin?: string,
  displayMax?: string
): { minPrice?: number; maxPrice?: number; currency?: string } {
  const hasMin = displayMin != null && displayMin !== '';
  const hasMax = displayMax != null && displayMax !== '';
  if (!hasMin && !hasMax) return {};

  const code = currency.toUpperCase();
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  if (hasMin) {
    const n = parseFloat(displayMin);
    if (!Number.isNaN(n) && n >= 0) minPrice = toMinimal(n, code);
  }
  if (hasMax) {
    const n = parseFloat(displayMax);
    if (!Number.isNaN(n) && n >= 0) maxPrice = toMinimal(n, code);
  }
  if (minPrice == null && maxPrice == null) return {};

  return { minPrice, maxPrice, currency: code };
}

const RECENT_SEARCHES_KEY = 'mobazha_recent_searches';
const MAX_RECENT = 8;

const defaultRecentSearches = [
  'headphones',
  'laptop',
  'vintage watch',
  'handmade jewelry',
  'NFT art',
];

function loadRecentSearches(): string[] {
  if (typeof window === 'undefined') return defaultRecentSearches;
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : defaultRecentSearches;
  } catch {
    return defaultRecentSearches;
  }
}

function saveRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch {
    /* noop */
  }
}

function productListKey(item: ProductListItem): string {
  const peer = item.vendorPeerID || '';
  const slug = item.slug || '';
  const hash = item.cid || '';
  return hash || `${peer}/${slug}`;
}

function convertToDisplayProduct(item: ProductListItem): DisplayProduct {
  const thumbnailUrl =
    getImageUrl(item.thumbnail?.medium) ||
    getImageUrl(item.thumbnail?.small) ||
    getImageUrl(item.thumbnail?.large) ||
    '';

  const vendorName =
    item.vendorName ||
    (item.vendorPeerID
      ? `${item.vendorPeerID.substring(0, 6)}…${item.vendorPeerID.slice(-4)}`
      : '');
  const vendorAvatar = getImageUrl(item.vendorAvatarHashes?.small);

  const { currencyCode, divisibility } = parsePriceFields(item.price);
  const displayPrice = listingDisplayPriceFromListItem(item);

  return {
    id: productListKey(item),
    slug: item.slug,
    title: item.title,
    price: displayPrice.minAmountString,
    currency: currencyCode,
    divisibility,
    priceFrom: displayPrice.hasPriceRange,
    image: thumbnailUrl,
    vendor: {
      peerID: item.vendorPeerID || '',
      name: vendorName,
      avatar: vendorAvatar,
    },
    rating: item.averageRating || 0,
    reviewCount: item.ratingCount || 0,
    contractType: (item.contractType as ProductContractType) || 'PHYSICAL_GOOD',
    tokenStandard: item.tokenStandard,
    rwaTradeMode: item.rwaTradeMode,
    moderators: item.moderators,
  };
}

export function useSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';
  const sortParam = searchParams.get('sortBy') || 'relevance';
  const browseParam = searchParams.get('browse');
  const ratingParam = searchParams.get('pr');
  const priceMinParam = searchParams.get('priceMin');
  const priceMaxParam = searchParams.get('priceMax');
  const priceCurrencyParam = searchParams.get('priceCurrency');
  const tabParam = (searchParams.get('tab') as TabType) || 'listings';
  const { t } = useI18n();
  const { localCurrency, toMinimalUnit, getCurrencySymbol } = useCurrency();
  const { hasVerifiedMod } = useVerifiedModerators();
  const { isInWishlist, toggleItem } = useWishlist();
  const {
    isSubMarket,
    config: marketplaceConfig,
    loading: isMarketplaceContextLoading,
  } = useMarketplaceContext();
  const { trackListingClick } = useNativeMarketplaceAttribution(
    isSubMarket ? (marketplaceConfig?.id ?? null) : null
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);

  // Derived from URL — single source of truth for fetch params
  const sortBy = parseSortParam(sortParam);
  const listingType = typeParam || 'all';
  const browseMode = parseBrowseParam(browseParam);
  const minRating = parseRatingParam(ratingParam);
  const priceMin = parsePriceDisplayParam(priceMinParam);
  const priceMax = parsePriceDisplayParam(priceMaxParam);
  const priceCurrency = priceCurrencyParam?.trim() || localCurrency;
  const hasPriceFilter = Boolean(priceMin || priceMax);

  // Products state
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsCatalogTotal, setProductsCatalogTotal] = useState(0);
  const [productsVendorCount, setProductsVendorCount] = useState(0);
  const [productsPage, setProductsPage] = useState(0);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Users state
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const sortOptions = useMemo(
    () => [
      { value: 'relevance', label: t('search.relevance') },
      { value: 'price_low', label: t('search.priceLowHigh') },
      { value: 'price_high', label: t('search.priceHighLow') },
      { value: 'rating', label: t('search.bestRating') },
      { value: 'newest', label: t('search.newest') },
    ],
    [t]
  );

  const typeOptions = useMemo(
    () => [
      { value: 'all', label: t('marketplace.allTypes', { defaultValue: 'All Types' }) },
      {
        value: 'PHYSICAL_GOOD',
        label: t('listing.types.physicalGood', { defaultValue: 'Physical Goods' }),
      },
      {
        value: 'DIGITAL_GOOD',
        label: t('listing.types.digitalGood', { defaultValue: 'Digital Goods' }),
      },
      { value: 'SERVICE', label: t('listing.types.service', { defaultValue: 'Services' }) },
    ],
    [t]
  );

  const isBrowseAllCatalog = isBrowseAllQuery(queryParam);
  const productsFetchGen = useRef(0);
  const usersFetchGen = useRef(0);
  const marketplacePeerIDs = useMemo(
    () =>
      isSubMarket && marketplaceConfig?.catalogMode === 'curated'
        ? (marketplaceConfig.allowedPeers ?? []).filter(Boolean)
        : undefined,
    [isSubMarket, marketplaceConfig]
  );
  const isEmptyCuratedMarketplace = Boolean(
    isSubMarket &&
    marketplaceConfig?.catalogMode === 'curated' &&
    (marketplaceConfig.allowedPeers ?? []).length === 0
  );
  const isMarketplaceScopePending = isSubMarket && isMarketplaceContextLoading;

  const searchProducts = useCallback(
    async (
      query: string,
      page: number = 0,
      append: boolean = false,
      overrides?: {
        sortBy?: string;
        type?: string;
        browse?: BrowseMode;
        rating?: number;
        priceMin?: string;
        priceMax?: string;
        priceCurrency?: string;
      }
    ) => {
      const generation = ++productsFetchGen.current;
      if (!query.trim()) {
        setProducts([]);
        setProductsTotal(0);
        setProductsCatalogTotal(0);
        setProductsVendorCount(0);
        setProductsHasMore(false);
        setIsLoadingProducts(false);
        return;
      }
      if (isMarketplaceScopePending || isEmptyCuratedMarketplace) {
        setProducts([]);
        setProductsTotal(0);
        setProductsCatalogTotal(0);
        setProductsVendorCount(0);
        setProductsHasMore(false);
        setIsLoadingProducts(false);
        return;
      }

      const fetchSort = overrides?.sortBy ?? sortBy;
      const fetchType = overrides?.type ?? (listingType !== 'all' ? listingType : undefined);
      const fetchBrowse = overrides?.browse ?? (isBrowseAllQuery(query) ? browseMode : undefined);
      const fetchRating = overrides?.rating ?? minRating;
      const priceFilter = priceFilterFromDisplay(
        overrides?.priceCurrency ?? priceCurrency,
        toMinimalUnit,
        overrides?.priceMin ?? priceMin,
        overrides?.priceMax ?? priceMax
      );

      setIsLoadingProducts(true);
      try {
        const result = await searchDataService.searchProducts(query, page, 20, {
          sortBy: fetchSort,
          type: fetchType,
          browse: fetchBrowse,
          rating: fetchRating,
          minPrice: priceFilter.minPrice,
          maxPrice: priceFilter.maxPrice,
          currency: priceFilter.currency,
          peerIDs: marketplacePeerIDs,
        });
        if (generation !== productsFetchGen.current) return;

        const displayProducts = result.products.map(convertToDisplayProduct);
        if (append) {
          setProducts(prev => {
            const seen = new Set(prev.map(p => p.id));
            const merged = [...prev];
            for (const product of displayProducts) {
              if (!seen.has(product.id)) {
                seen.add(product.id);
                merged.push(product);
              }
            }
            return merged;
          });
        } else {
          setProducts(displayProducts);
        }
        setProductsTotal(result.total);
        setProductsCatalogTotal(result.catalogTotal ?? result.total);
        setProductsVendorCount(result.vendorCount ?? 0);
        setProductsPage(page);
        setProductsHasMore(result.hasMore);
      } catch {
        if (generation !== productsFetchGen.current) return;
        if (!append) {
          setProducts([]);
          setProductsTotal(0);
          setProductsCatalogTotal(0);
          setProductsVendorCount(0);
        }
        setProductsHasMore(false);
      } finally {
        if (generation === productsFetchGen.current) {
          setIsLoadingProducts(false);
        }
      }
    },
    [
      sortBy,
      listingType,
      browseMode,
      minRating,
      priceMin,
      priceMax,
      priceCurrency,
      toMinimalUnit,
      marketplacePeerIDs,
      isMarketplaceScopePending,
      isEmptyCuratedMarketplace,
    ]
  );

  const searchUsersApi = useCallback(
    async (query: string, page: number = 0, append: boolean = false) => {
      const generation = ++usersFetchGen.current;
      if (!query.trim()) {
        setUsers([]);
        setUsersTotal(0);
        setUsersHasMore(false);
        setIsLoadingUsers(false);
        return;
      }
      if (isMarketplaceScopePending || isEmptyCuratedMarketplace) {
        setUsers([]);
        setUsersTotal(0);
        setUsersHasMore(false);
        setIsLoadingUsers(false);
        return;
      }
      setIsLoadingUsers(true);
      try {
        const result = await searchDataService.searchUsers(query, page, 20, {
          peerIDs: marketplacePeerIDs,
        });
        if (generation !== usersFetchGen.current) return;
        if (append) {
          setUsers(prev => [...prev, ...result.users]);
        } else {
          setUsers(result.users);
        }
        setUsersTotal(result.total);
        setUsersPage(page);
        setUsersHasMore(result.hasMore);
      } catch {
        if (generation !== usersFetchGen.current) return;
        if (!append) {
          setUsers([]);
          setUsersTotal(0);
        }
        setUsersHasMore(false);
      } finally {
        if (generation === usersFetchGen.current) {
          setIsLoadingUsers(false);
        }
      }
    },
    [marketplacePeerIDs, isMarketplaceScopePending, isEmptyCuratedMarketplace]
  );

  const pushSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      setProductsPage(0);
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const currentFilterOverrides = useCallback(
    () => ({
      sortBy: parseSortParam(sortParam),
      type: typeParam !== 'all' ? typeParam : undefined,
      browse: undefined as BrowseMode | undefined,
      rating: parseRatingParam(ratingParam),
      priceMin: parsePriceDisplayParam(priceMinParam),
      priceMax: parsePriceDisplayParam(priceMaxParam),
      priceCurrency: priceCurrencyParam?.trim() || localCurrency,
    }),
    [
      sortParam,
      typeParam,
      ratingParam,
      priceMinParam,
      priceMaxParam,
      priceCurrencyParam,
      localCurrency,
    ]
  );

  const runCommittedSearch = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setProducts([]);
        setUsers([]);
        setProductsTotal(0);
        setProductsCatalogTotal(0);
        setProductsVendorCount(0);
        setUsersTotal(0);
        setProductsHasMore(false);
        setUsersHasMore(false);
        return;
      }
      const overrides = currentFilterOverrides();
      overrides.browse = isBrowseAllQuery(trimmed) ? parseBrowseParam(browseParam) : undefined;
      setProductsPage(0);
      setUsersPage(0);
      searchProducts(trimmed, 0, false, overrides);
      searchUsersApi(trimmed, 0, false);
    },
    [browseParam, currentFilterOverrides, searchProducts, searchUsersApi]
  );

  const prevQueryParamRef = useRef(queryParam);
  useEffect(() => {
    if (queryParam !== prevQueryParamRef.current) {
      prevQueryParamRef.current = queryParam;
      setSearchQuery(queryParam);
    }
  }, [queryParam]);

  // One search pipeline: committed URL query, or debounced draft while typing (no URL push).
  useEffect(() => {
    const draft = searchQuery.trim();
    const committed = queryParam.trim();
    const isDrafting = draft.length > 0 && draft !== committed;
    const query = isDrafting ? draft : committed;
    const delay = isDrafting ? 400 : 0;

    const timer = setTimeout(() => runCommittedSearch(query), delay);
    return () => clearTimeout(timer);
  }, [
    queryParam,
    searchQuery,
    typeParam,
    sortParam,
    browseParam,
    ratingParam,
    priceMinParam,
    priceMaxParam,
    priceCurrencyParam,
    localCurrency,
    runCommittedSearch,
  ]);

  const setSortBy = useCallback(
    (value: string) => {
      pushSearchParams(params => {
        if (value && value !== 'relevance') params.set('sortBy', value);
        else params.delete('sortBy');
      });
    },
    [pushSearchParams]
  );

  const setListingType = useCallback(
    (value: string) => {
      pushSearchParams(params => {
        if (value && value !== 'all') params.set('type', value);
        else params.delete('type');
      });
    },
    [pushSearchParams]
  );

  const setBrowseMode = useCallback(
    (mode: BrowseMode) => {
      if (!isBrowseAllCatalog) return;
      pushSearchParams(params => {
        if (mode === 'all') params.set('browse', 'all');
        else params.delete('browse');
      });
    },
    [isBrowseAllCatalog, pushSearchParams]
  );

  const setMinRating = useCallback(
    (value: string) => {
      pushSearchParams(params => {
        if (value && value !== 'all') params.set('pr', value);
        else params.delete('pr');
      });
    },
    [pushSearchParams]
  );

  const setPriceRange = useCallback(
    (min?: string, max?: string) => {
      pushSearchParams(params => {
        const trimmedMin = min?.trim();
        const trimmedMax = max?.trim();
        if (trimmedMin) params.set('priceMin', trimmedMin);
        else params.delete('priceMin');
        if (trimmedMax) params.set('priceMax', trimmedMax);
        else params.delete('priceMax');
        if (trimmedMin || trimmedMax) {
          params.set('priceCurrency', priceCurrency || localCurrency);
        } else {
          params.delete('priceCurrency');
        }
      });
    },
    [pushSearchParams, priceCurrency, localCurrency]
  );

  const hasActiveFilters = useMemo(
    () =>
      listingType !== 'all' ||
      minRating != null ||
      hasPriceFilter ||
      (isBrowseAllCatalog && browseMode === 'all'),
    [listingType, minRating, hasPriceFilter, isBrowseAllCatalog, browseMode]
  );

  const clearAllFilters = useCallback(() => {
    pushSearchParams(params => {
      params.delete('type');
      params.delete('pr');
      params.delete('priceMin');
      params.delete('priceMax');
      params.delete('priceCurrency');
      params.delete('browse');
    });
  }, [pushSearchParams]);

  const activeSearchQuery = useMemo(() => {
    const draft = searchQuery.trim();
    const committed = queryParam.trim();
    return draft && draft !== committed ? draft : committed;
  }, [searchQuery, queryParam]);

  const productsTabLabel = useMemo(() => {
    if (isBrowseAllCatalog && browseMode === 'discover' && productsVendorCount > 0) {
      return t('searchExtended.productsFromStores', {
        count: productsTotal,
        stores: productsVendorCount,
        defaultValue: `${productsTotal} from ${productsVendorCount} stores`,
      });
    }
    return `${t('searchExtended.products')} (${productsTotal})`;
  }, [browseMode, isBrowseAllCatalog, productsTotal, productsVendorCount, t]);

  const handleSearch = useCallback(
    (e?: { preventDefault: () => void }) => {
      e?.preventDefault();
      if (searchQuery.trim()) {
        setRecentSearches(prev => {
          const filtered = prev.filter(s => s !== searchQuery);
          const updated = [searchQuery, ...filtered].slice(0, MAX_RECENT);
          saveRecentSearches(updated);
          return updated;
        });
        pushSearchParams(params => {
          params.set('q', searchQuery.trim());
        });
      }
    },
    [searchQuery, pushSearchParams]
  );

  const loadMoreProducts = useCallback(() => {
    if (activeSearchQuery && productsHasMore && !isLoadingProducts) {
      searchProducts(activeSearchQuery, productsPage + 1, true);
    }
  }, [activeSearchQuery, productsHasMore, isLoadingProducts, productsPage, searchProducts]);

  const loadMoreUsers = useCallback(() => {
    if (activeSearchQuery && usersHasMore && !isLoadingUsers) {
      searchUsersApi(activeSearchQuery, usersPage + 1, true);
    }
  }, [activeSearchQuery, usersHasMore, isLoadingUsers, usersPage, searchUsersApi]);

  const handleRecentSearch = useCallback(
    (keyword: string) => {
      setSearchQuery(keyword);
      pushSearchParams(params => {
        params.set('q', keyword);
      });
    },
    [pushSearchParams]
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveRecentSearches([]);
  }, []);

  const removeRecentSearch = useCallback((keyword: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(s => s !== keyword);
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  const handleToggleWishlist = useCallback(
    async (
      product: DisplayProduct,
      e: { preventDefault: () => void; stopPropagation: () => void }
    ) => {
      e.preventDefault();
      e.stopPropagation();
      if (!product.vendor.peerID || !product.slug) return;
      const params: AddWishlistParams = {
        peerID: product.vendor.peerID,
        slug: product.slug,
        title: product.title,
        thumbnail: product.image,
        price: String(product.price),
        currency: product.currency || '',
      };
      const added = await toggleItem(params);
      toast({
        description: added ? t('product.wishlisted') : t('me.wishlistRemove'),
        duration: 1500,
      });
    },
    [toggleItem, t]
  );

  const trackMarketplaceListingClick = useCallback(
    (product: Pick<DisplayProduct, 'slug' | 'vendor'>) => {
      if (!isSubMarket || !marketplaceConfig?.id) return;
      trackListingClick({
        listingSlug: product.slug,
        peerID: product.vendor.peerID,
      });
    },
    [isSubMarket, marketplaceConfig?.id, trackListingClick]
  );

  const isLoading = isLoadingProducts || isLoadingUsers;

  return {
    // URL state
    queryParam,
    searchQuery,
    setSearchQuery,

    // Tab state
    activeTab,
    setActiveTab,

    // Filter/sort
    sortBy,
    setSortBy,
    listingType,
    setListingType,
    minRating,
    setMinRating,
    priceMin,
    priceMax,
    priceCurrency,
    hasPriceFilter,
    priceCurrencySymbol: getCurrencySymbol(priceCurrency || localCurrency),
    setPriceRange,
    hasActiveFilters,
    clearAllFilters,
    showFilters,
    setShowFilters,
    sortOptions,
    typeOptions,

    // Products
    products,
    productsTotal,
    productsCatalogTotal,
    productsVendorCount,
    productsHasMore,
    isBrowseAllCatalog,
    browseMode,
    setBrowseMode,
    productsTabLabel,
    isLoadingProducts,
    loadMoreProducts,

    // Users
    users,
    usersTotal,
    usersHasMore,
    isLoadingUsers,
    loadMoreUsers,

    // Actions
    handleSearch,
    handleRecentSearch,
    clearRecentSearches,
    removeRecentSearch,
    handleToggleWishlist,
    trackMarketplaceListingClick,
    isLoading,

    // Recent searches
    recentSearches,

    // Helpers
    hasVerifiedMod,
    isInWishlist,
    t,
  };
}
