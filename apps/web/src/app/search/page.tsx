'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack, Grid } from '@mobazha/ui';
import { Button, Avatar, Card, Skeleton } from '@mobazha/ui';

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
  contractType: 'PHYSICAL_GOOD' | 'DIGITAL_GOOD' | 'SERVICE' | 'RWA_TOKEN';
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
  const categories = ['Electronics', 'Fashion', 'Home', 'Art', 'Services'];
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

// Filter options
const sortOptions = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
];

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'home', label: 'Home & Garden' },
  { value: 'art', label: 'Art & Collectibles' },
  { value: 'services', label: 'Services' },
  { value: 'rwa', label: 'RWA Tokens' },
];

type TabType = 'listings' | 'users';

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<TabType>('listings');
  const [sortBy, setSortBy] = useState('relevance');
  const [category, setCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(mockRecentSearches);

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

  // Product Card Component
  const ProductCard = ({ product }: { product: Product }) => (
    <Link href={`/product/${product.slug}`}>
      <Card hoverable className="overflow-hidden h-full">
        <div className="aspect-square relative bg-slate-100 dark:bg-slate-800">
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).src =
                'https://via.placeholder.com/400x400?text=No+Image';
            }}
          />
          {product.contractType === 'RWA_TOKEN' && (
            <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
              RWA
            </span>
          )}
          {product.contractType === 'DIGITAL_GOOD' && (
            <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              Digital
            </span>
          )}
          {product.contractType === 'SERVICE' && (
            <span className="absolute top-2 right-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full">
              Service
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-slate-900 dark:text-white line-clamp-2 mb-2">
            {product.title}
          </h3>
          <p className="text-lg font-bold text-emerald-600">
            {product.currency}
            {product.price.toFixed(2)}
          </p>
          <HStack gap="xs" align="center" className="mt-2 text-sm text-slate-500">
            <span className="text-amber-500">★</span>
            <span>
              {product.rating} ({product.reviewCount})
            </span>
          </HStack>
          <p className="text-sm text-slate-500 mt-1 truncate">{product.vendor.name}</p>
        </div>
      </Card>
    </Link>
  );

  // User Card Component
  const UserCard = ({ user }: { user: User }) => (
    <Link href={`/store/${user.peerID}`}>
      <Card hoverable padding="md" className="h-full">
        <HStack gap="md" align="start">
          <Avatar name={user.name} src={user.avatar} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white">{user.name}</h3>
            {user.location && <p className="text-sm text-slate-500">{user.location}</p>}
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-2">
              {user.shortDescription}
            </p>
            <HStack gap="md" className="mt-3 text-sm">
              <span className="text-slate-500">{user.listingCount} listings</span>
              <HStack gap="xs" align="center">
                <span className="text-amber-500">★</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {user.rating} ({user.reviewCount})
                </span>
              </HStack>
            </HStack>
          </div>
        </HStack>
      </Card>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
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
                placeholder="Search products, stores, or paste a listing URL..."
                className="w-full h-14 pl-14 pr-32 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
              />
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400"
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
                Search
              </Button>
            </div>
          </form>

          {/* No query - show recent searches */}
          {!queryParam && (
            <div className="max-w-2xl mx-auto">
              <Card padding="lg">
                <HStack justify="between" align="center" className="mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Recent Searches
                  </h2>
                  {recentSearches.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
                      Clear All
                    </Button>
                  )}
                </HStack>

                {recentSearches.length > 0 ? (
                  <VStack gap="sm">
                    {recentSearches.map((keyword, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearch(keyword)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                      >
                        <svg
                          className="w-5 h-5 text-slate-400"
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
                        <span className="text-slate-700 dark:text-slate-300">{keyword}</span>
                      </button>
                    ))}
                  </VStack>
                ) : (
                  <p className="text-center text-slate-500 py-8">No recent searches</p>
                )}

                {/* Popular Categories */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Popular Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.slice(1).map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => {
                          setCategory(cat.value);
                          router.push(`/search?q=${cat.label}&category=${cat.value}`);
                        }}
                        className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors text-sm"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Search Results */}
          {queryParam && (
            <>
              {/* Tabs & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                  <button
                    onClick={() => setActiveTab('listings')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'listings'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Products ({products.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      activeTab === 'users'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Stores ({users.length})
                  </button>
                </div>

                {activeTab === 'listings' && (
                  <HStack gap="sm">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                        showFilters
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
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
                      Filters
                    </button>
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {sortOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </HStack>
                )}
              </div>

              {/* Filter Panel */}
              {showFilters && activeTab === 'listings' && (
                <Card padding="md" className="mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {categoryOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Price Range
                      </label>
                      <HStack gap="sm">
                        <input
                          type="number"
                          placeholder="Min"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                          type="number"
                          placeholder="Max"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </HStack>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Rating
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">Any Rating</option>
                        <option value="4">4+ Stars</option>
                        <option value="3">3+ Stars</option>
                        <option value="2">2+ Stars</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Type
                      </label>
                      <select className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="">All Types</option>
                        <option value="physical">Physical Goods</option>
                        <option value="digital">Digital Goods</option>
                        <option value="service">Services</option>
                        <option value="rwa">RWA Tokens</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )}

              {/* Results */}
              {isLoading ? (
                <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton variant="rounded" className="aspect-square" />
                      <div className="p-4">
                        <Skeleton variant="text" height={20} className="mb-2" />
                        <Skeleton variant="text" height={24} width="60%" />
                      </div>
                    </Card>
                  ))}
                </Grid>
              ) : activeTab === 'listings' ? (
                products.length > 0 ? (
                  <Grid cols={4} colsMobile={2} colsTablet={3} gap="md">
                    {products.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </Grid>
                ) : (
                  <Card padding="xl" className="text-center">
                    <div className="py-12">
                      <svg
                        className="w-16 h-16 mx-auto text-slate-300 mb-4"
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
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No products found
                      </h3>
                      <p className="text-slate-500">
                        Try adjusting your search or filters to find what you&apos;re looking for.
                      </p>
                    </div>
                  </Card>
                )
              ) : users.length > 0 ? (
                <Grid cols={2} colsMobile={1} gap="md">
                  {users.map(user => (
                    <UserCard key={user.peerID} user={user} />
                  ))}
                </Grid>
              ) : (
                <Card padding="xl" className="text-center">
                  <div className="py-12">
                    <svg
                      className="w-16 h-16 mx-auto text-slate-300 mb-4"
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
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      No stores found
                    </h3>
                    <p className="text-slate-500">
                      Try adjusting your search to find stores that match.
                    </p>
                  </div>
                </Card>
              )}

              {/* Load More */}
              {((activeTab === 'listings' && products.length > 0) ||
                (activeTab === 'users' && users.length > 0)) && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline" size="lg">
                    Load More Results
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
