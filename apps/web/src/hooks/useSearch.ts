'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  useI18n,
  searchDataService,
  getImageUrl,
  useVerifiedModerators,
  useWishlist,
} from '@mobazha/core';
import { toast } from '@/components/ui/use-toast';
import type { ProductListItem, AddWishlistParams } from '@mobazha/core';
import type { ProductContractType } from '@/components/ProductCard';

export interface DisplayProduct {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  divisibility?: number;
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

  return {
    id: item.slug,
    slug: item.slug,
    title: item.title,
    price: Number(item.price?.amount) || 0,
    currency: item.price?.currency?.code || 'USD',
    divisibility: item.price?.currency?.divisibility,
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
  const categoryParam = searchParams.get('category') || 'all';
  const { t } = useI18n();
  const { hasVerifiedMod } = useVerifiedModerators();
  const { isInWishlist, toggleItem } = useWishlist();

  // Search state
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [sortBy, setSortBy] = useState('relevance');
  const [category, setCategory] = useState(categoryParam);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);

  // Products state
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
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

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: t('marketplace.allCategories') },
      { value: 'electronics', label: t('homeExtended.electronics') },
      { value: 'fashion', label: 'Fashion' },
      { value: 'home', label: 'Home & Garden' },
      { value: 'art', label: 'Art & Collectibles' },
      { value: 'services', label: t('homeExtended.services') },
      { value: 'rwa', label: t('filter.rwaTokens') },
    ],
    [t]
  );

  const searchProducts = useCallback(
    async (query: string, page: number = 0, append: boolean = false) => {
      if (!query.trim()) {
        setProducts([]);
        setProductsTotal(0);
        setProductsHasMore(false);
        return;
      }
      setIsLoadingProducts(true);
      try {
        const result = await searchDataService.searchProducts(query, page, 20, {
          sortBy,
          category: category !== 'all' ? category : undefined,
        });
        const displayProducts = result.products.map(convertToDisplayProduct);
        if (append) {
          setProducts(prev => [...prev, ...displayProducts]);
        } else {
          setProducts(displayProducts);
        }
        setProductsTotal(result.total);
        setProductsPage(page);
        setProductsHasMore(result.hasMore);
      } catch {
        if (!append) {
          setProducts([]);
          setProductsTotal(0);
        }
        setProductsHasMore(false);
      } finally {
        setIsLoadingProducts(false);
      }
    },
    [sortBy, category]
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
    setCategory(categoryParam);
    if (queryParam) {
      setProductsPage(0);
      setUsersPage(0);
      searchProducts(queryParam, 0, false);
      searchUsersApi(queryParam, 0, false);
    } else {
      setProducts([]);
      setUsers([]);
      setProductsTotal(0);
      setUsersTotal(0);
    }
  }, [queryParam, categoryParam, searchProducts, searchUsersApi]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed === queryParam) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed });
      if (category && category !== 'all') {
        params.set('category', category);
      }
      router.push(`/search?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, queryParam, category, router]);

  useEffect(() => {
    if (queryParam) {
      searchProducts(queryParam, 0, false);
    }
  }, [sortBy, category, queryParam, searchProducts]);

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
        currency: product.currency,
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
    category,
    setCategory,
    showFilters,
    setShowFilters,
    sortOptions,
    categoryOptions,

    // Products
    products,
    productsTotal,
    productsHasMore,
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
