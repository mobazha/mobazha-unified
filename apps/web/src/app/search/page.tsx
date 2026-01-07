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
import { useI18n } from '@mobazha/core';

// Types
interface Product {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  vendor: {
    peerID: string;
    name: string;
    avatar?: string;
  };
  rating: number;
  reviewCount: number;
  contractType: ProductContractType;
}

interface User {
  peerID: string;
  name: string;
  avatar?: string;
  shortDescription?: string;
  location?: string;
  listingCount: number;
  rating: number;
  reviewCount: number;
}

// Mock search results
const generateMockProducts = (query: string, count: number = 12): Product[] => {
  const contractTypes: Product['contractType'][] = [
    'PHYSICAL_GOOD',
    'DIGITAL_GOOD',
    'SERVICE',
    'RWA_TOKEN',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `product-${i}`,
    slug: `product-${query.toLowerCase().replace(/\s/g, '-')}-${i}`,
    title: `${query} - Premium Product ${i + 1}`,
    price: Math.floor(Math.random() * 500) + 50,
    currency: '$',
    image: `https://images.unsplash.com/photo-${1505740420928 + i * 1000}-5e560c06d30e?w=400&h=400&fit=crop`,
    vendor: {
      peerID: `QmVendor${i}`,
      name: `Store ${i + 1}`,
      avatar: undefined,
    },
    rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    reviewCount: Math.floor(Math.random() * 200) + 10,
    contractType: contractTypes[i % contractTypes.length],
  }));
};

const generateMockUsers = (query: string, count: number = 8): User[] => {
  return Array.from({ length: count }, (_, i) => ({
    peerID: `QmUser${i}`,
    name: `${query} Store ${i + 1}`,
    avatar: undefined,
    shortDescription: `We specialize in ${query.toLowerCase()} products and services. Quality guaranteed!`,
    location: ['New York', 'London', 'Tokyo', 'Berlin', 'Sydney'][i % 5],
    listingCount: Math.floor(Math.random() * 50) + 5,
    rating: Math.round((4 + Math.random()) * 10) / 10,
    reviewCount: Math.floor(Math.random() * 500) + 20,
  }));
};

// Mock recent searches
const mockRecentSearches = ['headphones', 'laptop', 'vintage watch', 'handmade jewelry', 'NFT art'];

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
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [sortBy, setSortBy] = useState('relevance');
  const [category, setCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(mockRecentSearches);

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

  // Generate results based on query
  const products = useMemo(
    () => (queryParam ? generateMockProducts(queryParam) : []),
    [queryParam]
  );
  const users = useMemo(() => (queryParam ? generateMockUsers(queryParam) : []), [queryParam]);

  // Update search query when URL changes
  useEffect(() => {
    setSearchQuery(queryParam);
  }, [queryParam]);

  const handleSearch = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (searchQuery.trim()) {
        setIsLoading(true);
        // Add to recent searches
        setRecentSearches(prev => {
          const filtered = prev.filter(s => s !== searchQuery);
          return [searchQuery, ...filtered].slice(0, 5);
        });
        // Navigate with search query
        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
        setTimeout(() => setIsLoading(false), 500);
      }
    },
    [searchQuery, router]
  );

  const handleRecentSearch = (keyword: string) => {
    setSearchQuery(keyword);
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
  };

  // Render product item using imported ProductCard
  const renderProductCard = (product: Product) => (
    <Link key={product.id} href={`/product/${product.slug}`}>
      <ProductCard
        title={product.title}
        imageUrl={product.image}
        price={product.price}
        currency={product.currency}
        vendorName={product.vendor.name}
        vendorAvatar={product.vendor.avatar}
        rating={product.rating}
        reviewCount={product.reviewCount}
        contractType={product.contractType}
      />
    </Link>
  );

  // User Card Component
  const UserCard = ({ user }: { user: User }) => (
    <Link href={`/store/${user.peerID}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <HStack gap="md" align="start">
            <Avatar src={user.avatar} name={user.name} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">{user.name}</h3>
              {user.location && <p className="text-sm text-muted-foreground">{user.location}</p>}
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                {user.shortDescription}
              </p>
              <HStack gap="md" className="mt-3 text-sm">
                <span className="text-muted-foreground">
                  {user.listingCount} {t('search.listings')}
                </span>
                <HStack gap="xs" align="center">
                  <span className="text-yellow-500">★</span>
                  <span className="text-muted-foreground">
                    {user.rating} ({user.reviewCount})
                  </span>
                </HStack>
              </HStack>
            </div>
          </HStack>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Search Header */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('searchExtended.searchPlaceholder')}
                className="w-full h-14 pl-14 pr-32 rounded-2xl border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
              />
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground"
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
              <Button type="submit" size="lg" className="absolute right-2 top-1/2 -translate-y-1/2">
                {t('common.search')}
              </Button>
            </div>
          </form>

          {/* No query - show recent searches */}
          {!queryParam && (
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-6">
                  <HStack justify="between" align="center" className="mb-4">
                    <h2 className="text-lg font-semibold text-foreground">
                      {t('searchExtended.recentSearches')}
                    </h2>
                    {recentSearches.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                        {t('searchExtended.clearAll')}
                      </Button>
                    )}
                  </HStack>

                  {recentSearches.length > 0 ? (
                    <VStack gap="sm">
                      {recentSearches.map((keyword, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearch(keyword)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
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
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="text-foreground">{keyword}</span>
                        </button>
                      ))}
                    </VStack>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {t('empty.noRecentSearches')}
                    </p>
                  )}

                  {/* Popular Categories */}
                  <div className="mt-8 pt-6 border-t border-border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">
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
                          className="px-4 py-2 rounded-full bg-muted text-foreground hover:bg-primary/10 hover:text-primary transition-colors text-sm"
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
                  <button
                    onClick={() => setActiveTab('listings')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'listings'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('searchExtended.products')} ({products.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'users'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t('searchExtended.stores')} ({users.length})
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
              {isLoading ? (
                <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </Grid>
              ) : activeTab === 'listings' ? (
                products.length > 0 ? (
                  <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                    {products.map(product => renderProductCard(product))}
                  </Grid>
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
                )
              ) : users.length > 0 ? (
                <Grid cols={2} colsMobile={1} gap="md">
                  {users.map(user => (
                    <UserCard key={user.peerID} user={user} />
                  ))}
                </Grid>
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

              {/* Load More */}
              {((activeTab === 'listings' && products.length > 0) ||
                (activeTab === 'users' && users.length > 0)) && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline" size="lg">
                    {t('empty.loadMoreResults')}
                  </Button>
                </div>
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
