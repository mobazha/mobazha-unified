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
  const tabParam = (searchParams.get('tab') as TabType) || 'listings';
  const { t } = useI18n();
  const { hasVerifiedMod } = useVerifiedModerators();
  const { isInWishlist, toggleItem } = useWishlist();

  // Search state
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<TabType>(tabParam);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);

  // Derived from URL — single source of truth for fetch params
  const sortBy = parseSortParam(sortParam);
  const listingType = typeParam || 'all';
  const browseMode = parseBrowseParam(browseParam);

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

  const searchProducts = useCallback(
    async (
      query: string,
      page: number = 0,
      append: boolean = false,
      overrides?: { sortBy?: string; type?: string; browse?: BrowseMode }
    ) => {
      if (!query.trim()) {
        setProducts([]);
        setProductsTotal(0);
        setProductsCatalogTotal(0);
        setProductsVendorCount(0);
        setProductsHasMore(false);
        return;
      }

      const fetchSort = overrides?.sortBy ?? sortBy;
      const fetchType = overrides?.type ?? (listingType !== 'all' ? listingType : undefined);
      const fetchBrowse = overrides?.browse ?? (isBrowseAllQuery(query) ? browseMode : undefined);
      const generation = ++productsFetchGen.current;

      setIsLoadingProducts(true);
      try {
        const result = await searchDataService.searchProducts(query, page, 20, {
          sortBy: fetchSort,
          type: fetchType,
          browse: fetchBrowse,
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
    [sortBy, listingType, browseMode]
  );

  const searchUsersApi = useCallback(
    async (query: string, page: number = 0, append: boolean = false) => {
      if (!query.trim()) {
        setUsers([]);
        setUsersTotal(0);
        setUsersHasMore(false);
        return;
      }
      setIsLoadingUsers(true);
      try {
        const result = await searchDataService.searchUsers(query, page, 20);
        if (append) {
          setUsers(prev => [...prev, ...result.users]);
        } else {
          setUsers(result.users);
        }
        setUsersTotal(result.total);
        setUsersPage(page);
        setUsersHasMore(result.hasMore);
      } catch {
        if (!append) {
          setUsers([]);
          setUsersTotal(0);
        }
        setUsersHasMore(false);
      } finally {
        setIsLoadingUsers(false);
      }
    },
    []
  );

  useEffect(() => {
    setSearchQuery(queryParam);
    if (!queryParam) {
      setProducts([]);
      setUsers([]);
      setProductsTotal(0);
      setProductsCatalogTotal(0);
      setProductsVendorCount(0);
      setUsersTotal(0);
      return;
    }
    setProductsPage(0);
    setUsersPage(0);
    searchProducts(queryParam, 0, false, {
      sortBy: parseSortParam(sortParam),
      type: typeParam !== 'all' ? typeParam : undefined,
      browse: isBrowseAllQuery(queryParam) ? parseBrowseParam(browseParam) : undefined,
    });
    searchUsersApi(queryParam, 0, false);
  }, [queryParam, typeParam, sortParam, browseParam, searchProducts, searchUsersApi]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed === queryParam) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed });
      if (listingType && listingType !== 'all') {
        params.set('type', listingType);
      }
      if (sortBy && sortBy !== 'relevance') {
        params.set('sortBy', sortBy);
      }
      if (isBrowseAllQuery(trimmed) && browseMode === 'all') {
        params.set('browse', 'all');
      }
      router.push(`/search?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, queryParam, listingType, sortBy, browseMode, router]);

  const pushSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      setProductsPage(0);
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

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
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router]
  );

  const loadMoreProducts = useCallback(() => {
    if (queryParam && productsHasMore && !isLoadingProducts) {
      searchProducts(queryParam, productsPage + 1, true);
    }
  }, [queryParam, productsHasMore, isLoadingProducts, productsPage, searchProducts]);

  const loadMoreUsers = useCallback(() => {
    if (queryParam && usersHasMore && !isLoadingUsers) {
      searchUsersApi(queryParam, usersPage + 1, true);
    }
  }, [queryParam, usersHasMore, isLoadingUsers, usersPage, searchUsersApi]);

  const handleRecentSearch = useCallback(
    (keyword: string) => {
      setSearchQuery(keyword);
      router.push(`/search?q=${encodeURIComponent(keyword)}`);
    },
    [router]
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
    isLoading,

    // Recent searches
    recentSearches,

    // Helpers
    hasVerifiedMod,
    isInWishlist,
    t,
  };
}
