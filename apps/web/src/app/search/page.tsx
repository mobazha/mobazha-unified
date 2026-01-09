'use client';

import React, { useState, useCallback, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import type { ProductContractType } from '@/components/ProductCard';
import { useI18n, searchDataService, getImageUrl, useVerifiedModerators } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import { useProductModal } from '@/hooks';

// 显示用的商品类型
interface DisplayProduct {
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
  /** 仲裁员 peerID 列表 */
  moderators?: string[];
}

// 搜索返回的用户类型
interface SearchUser {
  peerID: string;
  name: string;
  avatar?: string;
  shortDescription?: string;
  location?: string;
  listingCount: number;
  rating: number;
  reviewCount: number;
}

// 转换 API 返回的商品为显示格式
function convertToDisplayProduct(item: ProductListItem): DisplayProduct {
  const thumbnailUrl =
    getImageUrl(item.thumbnail?.medium) ||
    getImageUrl(item.thumbnail?.small) ||
    getImageUrl(item.thumbnail?.large) ||
    '';

  // 使用 API 返回的卖家名称和头像
  const vendorName = item.vendorName || item.vendorPeerID?.substring(0, 8) || 'Unknown';
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
    // 传递 moderators 列表
    moderators: item.moderators,
  };
}

// 默认最近搜索
const defaultRecentSearches = [
  'headphones',
  'laptop',
  'vintage watch',
  'handmade jewelry',
  'NFT art',
];

type TabType = 'listings' | 'users';

// Loading fallback for Suspense
function SearchLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="py-8">
        <Container size="xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

// Main search content component
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || 'all';
  const { t } = useI18n();
  const { openProduct, isMobile } = useProductModal();
  const { hasVerifiedMod } = useVerifiedModerators();

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [sortBy, setSortBy] = useState('relevance');
  const [category, setCategory] = useState(categoryParam);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(defaultRecentSearches);

  // 商品搜索状态
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsPage, setProductsPage] = useState(0);
  const [productsHasMore, setProductsHasMore] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // 用户搜索状态
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Filter options with translations
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

  // 搜索商品
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
      } catch (error) {
        console.error('Failed to search products:', error);
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

  // 搜索用户
  const searchUsers = useCallback(
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
      } catch (error) {
        console.error('Failed to search users:', error);
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

  // 当 URL 参数变化时执行搜索
  useEffect(() => {
    setSearchQuery(queryParam);
    setCategory(categoryParam);

    if (queryParam) {
      // 重置分页
      setProductsPage(0);
      setUsersPage(0);

      // 执行搜索
      searchProducts(queryParam, 0, false);
      searchUsers(queryParam, 0, false);
    } else {
      setProducts([]);
      setUsers([]);
      setProductsTotal(0);
      setUsersTotal(0);
    }
  }, [queryParam, categoryParam, searchProducts, searchUsers]);

  // 当排序或分类变化时重新搜索
  useEffect(() => {
    if (queryParam) {
      searchProducts(queryParam, 0, false);
    }
  }, [sortBy, category, queryParam, searchProducts]);

  // 处理搜索提交
  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (searchQuery.trim()) {
        // Add to recent searches
        setRecentSearches(prev => {
          const filtered = prev.filter(s => s !== searchQuery);
          return [searchQuery, ...filtered].slice(0, 5);
        });
        // Navigate with search query
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    },
    [searchQuery, router]
  );

  // 加载更多商品
  const loadMoreProducts = useCallback(() => {
    if (queryParam && productsHasMore && !isLoadingProducts) {
      searchProducts(queryParam, productsPage + 1, true);
    }
  }, [queryParam, productsHasMore, isLoadingProducts, productsPage, searchProducts]);

  // 加载更多用户
  const loadMoreUsers = useCallback(() => {
    if (queryParam && usersHasMore && !isLoadingUsers) {
      searchUsers(queryParam, usersPage + 1, true);
    }
  }, [queryParam, usersHasMore, isLoadingUsers, usersPage, searchUsers]);

  const handleRecentSearch = (keyword: string) => {
    setSearchQuery(keyword);
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  // 处理举报
  const handleReport = useCallback((_product: DisplayProduct) => {
    // TODO: 打开举报对话框
  }, []);

  // 处理屏蔽
  const handleBlock = useCallback((_product: DisplayProduct) => {
    // TODO: 实现屏蔽卖家功能
  }, []);

  // Render product item using imported ProductCard
  const renderProductCard = (product: DisplayProduct) => (
    <Link
      key={product.id}
      href={`/product/${product.slug}${product.vendor.peerID ? `?peerID=${product.vendor.peerID}` : ''}`}
      onClick={e => {
        // 桌面端使用弹框
        if (!isMobile) {
          e.preventDefault();
          openProduct(product.slug, product.vendor.peerID);
        }
      }}
    >
      <ProductCard
        title={product.title}
        imageUrl={product.image}
        price={product.price}
        currency={product.currency}
        divisibility={product.divisibility}
        vendorName={product.vendor.name}
        vendorAvatar={product.vendor.avatar}
        vendorPeerID={product.vendor.peerID}
        rating={product.rating}
        reviewCount={product.reviewCount}
        contractType={product.contractType}
        hasVerifiedModerator={hasVerifiedMod(product.moderators)}
        onReport={() => handleReport(product)}
        onBlock={() => handleBlock(product)}
      />
    </Link>
  );

  // User Card Component
  const UserCard = ({ user }: { user: SearchUser }) => (
    <Link href={`/store/${user.peerID}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]">
        <CardContent className="p-3 sm:p-4">
          <HStack gap="sm" align="start" className="sm:gap-4">
            <Avatar src={user.avatar} name={user.name} size="md" className="sm:w-12 sm:h-12" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">{user.name}</h3>
              {user.location && (
                <p className="text-xs sm:text-sm text-muted-foreground">{user.location}</p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 sm:mt-2">
                {user.shortDescription}
              </p>
              <HStack gap="sm" className="mt-2 sm:mt-3 text-xs sm:text-sm sm:gap-4">
                <span className="text-muted-foreground">
                  {user.listingCount} {t('search.listings')}
                </span>
                <HStack gap="xs" align="center">
                  <span className="text-yellow-500">★</span>
                  <span className="text-muted-foreground">
                    {user.rating.toFixed(1)} ({user.reviewCount})
                  </span>
                </HStack>
              </HStack>
            </div>
          </HStack>
        </CardContent>
      </Card>
    </Link>
  );

  const isLoading = isLoadingProducts || isLoadingUsers;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          {/* Search Header */}
          <form onSubmit={handleSearch} className="mb-4 sm:mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('searchExtended.searchPlaceholder')}
                className="w-full h-11 sm:h-14 pl-10 sm:pl-14 pr-20 sm:pr-32 rounded-xl sm:rounded-2xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-lg"
              />
              <svg
                className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Button
                type="submit"
                size="sm"
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 sm:h-10 sm:px-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : (
                  t('common.search')
                )}
              </Button>
            </div>
          </form>

          {/* No query - show recent searches */}
          {!queryParam && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <HStack justify="between" align="center" className="mb-3 sm:mb-4">
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">
                      {t('searchExtended.recentSearches')}
                    </h2>
                    {recentSearches.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearRecentSearches}
                        className="text-xs sm:text-sm"
                      >
                        {t('searchExtended.clearAll')}
                      </Button>
                    )}
                  </HStack>

                  {recentSearches.length > 0 ? (
                    <VStack gap="xs" className="sm:gap-2">
                      {recentSearches.map((keyword, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearch(keyword)}
                          className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg hover:bg-muted active:bg-muted/80 transition-colors text-left"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-foreground text-sm sm:text-base">{keyword}</span>
                        </button>
                      ))}
                    </VStack>
                  ) : (
                    <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm">
                      {t('empty.noRecentSearches')}
                    </p>
                  )}

                  {/* Popular Categories */}
                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-border">
                    <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
                      {t('searchExtended.popularCategories')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {categoryOptions.slice(1).map(cat => (
                        <button
                          key={cat.value}
                          onClick={() => {
                            setCategory(cat.value);
                            router.push(`/search?q=${cat.label}&category=${cat.value}`);
                          }}
                          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-muted text-foreground hover:bg-primary/10 hover:text-primary active:scale-95 transition-all text-xs sm:text-sm"
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Search Results */}
          {queryParam && (
            <>
              {/* Tabs & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex gap-1 p-1 bg-muted rounded-lg sm:rounded-xl w-fit">
                  <button
                    onClick={() => setActiveTab('listings')}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all text-sm sm:text-base ${
                      activeTab === 'listings'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('searchExtended.products')} ({productsTotal})
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 sm:px-6 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-medium transition-all text-sm sm:text-base ${
                      activeTab === 'users'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('searchExtended.stores')} ({usersTotal})
                  </button>
                </div>

                {activeTab === 'listings' && (
                  <HStack gap="sm">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        showFilters
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 text-foreground'
                      }`}
                    >
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
                          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                      </svg>
                      {t('filter.filters')}
                    </button>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sortOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </HStack>
                )}
              </div>

              {/* Filter Panel */}
              {showFilters && activeTab === 'listings' && (
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('filter.category')}
                        </label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('marketplace.allCategories')} />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('filter.priceRange')}
                        </label>
                        <HStack gap="sm">
                          <input
                            type="number"
                            placeholder={t('filter.min')}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <span className="text-muted-foreground">-</span>
                          <input
                            type="number"
                            placeholder={t('filter.max')}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                        </HStack>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('filter.rating')}
                        </label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue placeholder={t('filter.anyRating')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('filter.anyRating')}</SelectItem>
                            <SelectItem value="4">{t('filter.stars', { count: 4 })}</SelectItem>
                            <SelectItem value="3">{t('filter.stars', { count: 3 })}</SelectItem>
                            <SelectItem value="2">{t('filter.stars', { count: 2 })}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          {t('filter.type')}
                        </label>
                        <Select defaultValue="all">
                          <SelectTrigger>
                            <SelectValue placeholder={t('filter.allTypes')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('filter.allTypes')}</SelectItem>
                            <SelectItem value="physical">{t('filter.physicalGoods')}</SelectItem>
                            <SelectItem value="digital">{t('filter.digitalGoods')}</SelectItem>
                            <SelectItem value="service">{t('filter.services')}</SelectItem>
                            <SelectItem value="rwa">{t('filter.rwaTokens')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Results */}
              {activeTab === 'listings' ? (
                <>
                  {isLoadingProducts && products.length === 0 ? (
                    <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <ProductCardSkeleton key={i} />
                      ))}
                    </Grid>
                  ) : products.length > 0 ? (
                    <>
                      <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                        {products.map(product => renderProductCard(product))}
                      </Grid>
                      {/* Load More Products */}
                      {productsHasMore && (
                        <div className="flex justify-center mt-8">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={loadMoreProducts}
                            disabled={isLoadingProducts}
                          >
                            {isLoadingProducts ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {t('common.loading')}
                              </span>
                            ) : (
                              t('empty.loadMoreResults')
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card className="text-center">
                      <CardContent className="py-12">
                        <svg
                          className="w-16 h-16 mx-auto text-muted-foreground mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {t('empty.noProductsFound')}
                        </h3>
                        <p className="text-muted-foreground">{t('empty.tryAdjustingFilters')}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  {isLoadingUsers && users.length === 0 ? (
                    <Grid cols={2} colsMobile={1} gap="md">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-4">
                            <HStack gap="sm" align="start">
                              <div className="w-12 h-12 rounded-full bg-muted" />
                              <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-1/3" />
                                <div className="h-3 bg-muted rounded w-1/4" />
                                <div className="h-3 bg-muted rounded w-2/3" />
                              </div>
                            </HStack>
                          </CardContent>
                        </Card>
                      ))}
                    </Grid>
                  ) : users.length > 0 ? (
                    <>
                      <Grid cols={2} colsMobile={1} gap="md">
                        {users.map(user => (
                          <UserCard key={user.peerID} user={user} />
                        ))}
                      </Grid>
                      {/* Load More Users */}
                      {usersHasMore && (
                        <div className="flex justify-center mt-8">
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={loadMoreUsers}
                            disabled={isLoadingUsers}
                          >
                            {isLoadingUsers ? (
                              <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                {t('common.loading')}
                              </span>
                            ) : (
                              t('empty.loadMoreResults')
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <Card className="text-center">
                      <CardContent className="py-12">
                        <svg
                          className="w-16 h-16 mx-auto text-muted-foreground mb-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {t('empty.noStoresFound')}
                        </h3>
                        <p className="text-muted-foreground">{t('empty.tryAdjustingSearch')}</p>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

// Default export with Suspense wrapper for useSearchParams
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}
