'use client';

import React, { useState } from 'react';
// import Link from 'next/link'; // TODO: Use for store navigation
import { useParams } from 'next/navigation';
import { Header, Footer, ProductSection } from '@/components';
import { Container, HStack, VStack, Grid } from '@mobazha/ui';
import { Button, Avatar, Card, Skeleton } from '@mobazha/ui';

// Mock store data
const mockStore = {
  peerID: 'QmVendor123',
  name: 'TechGear Store',
  shortDescription: 'Premium tech gadgets and accessories',
  about: `Welcome to TechGear Store! We specialize in premium technology products and accessories. Our mission is to bring you the latest and greatest gadgets at competitive prices.

We've been in business since 2020 and have served thousands of happy customers worldwide. All our products come with a satisfaction guarantee.

**Why choose us?**
- Authentic products only
- Fast worldwide shipping
- 30-day return policy
- Dedicated customer support`,
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
  headerImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop',
  location: 'San Francisco, CA',
  rating: 4.8,
  reviewCount: 256,
  followerCount: 1520,
  followingCount: 45,
  listingCount: 32,
  memberSince: '2020',
  acceptedCurrencies: ['BTC', 'ETH', 'USDT', 'LTC'],
  socialLinks: {
    website: 'https://techgear.store',
    twitter: '@techgearstore',
  },
  verified: true,
};

const mockProducts = [
  {
    id: '1',
    slug: 'premium-headphones',
    title: 'Premium Wireless Headphones',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    price: 299.99,
    rating: 4.8,
    reviewCount: 128,
    freeShipping: true,
  },
  {
    id: '2',
    slug: 'smart-watch',
    title: 'Smart Watch Pro',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    price: 199.99,
    originalPrice: 249.99,
    rating: 4.7,
    reviewCount: 89,
    freeShipping: true,
  },
  {
    id: '3',
    slug: 'wireless-earbuds',
    title: 'Wireless Earbuds Pro',
    imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    price: 149.99,
    rating: 4.6,
    reviewCount: 256,
  },
  {
    id: '4',
    slug: 'portable-charger',
    title: 'Portable Power Bank 20000mAh',
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop',
    price: 49.99,
    rating: 4.9,
    reviewCount: 312,
    freeShipping: true,
  },
  {
    id: '5',
    slug: 'laptop-stand',
    title: 'Aluminum Laptop Stand',
    imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop',
    price: 79.99,
    rating: 4.5,
    reviewCount: 78,
  },
  {
    id: '6',
    slug: 'webcam-hd',
    title: 'HD Webcam 1080p',
    imageUrl: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=400&fit=crop',
    price: 89.99,
    rating: 4.4,
    reviewCount: 156,
    freeShipping: true,
  },
];

type TabType = 'products' | 'about' | 'reviews';

export default function StorePage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _params = useParams(); // Will be used for API calls
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading] = useState(false);

  const store = mockStore;
  const products = mockProducts;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <Skeleton variant="rectangular" height={200} />
        <Container size="xl" className="py-8">
          <HStack gap="lg" align="start">
            <Skeleton variant="circular" width={120} height={120} />
            <VStack gap="sm" className="flex-1">
              <Skeleton variant="text" height={32} width="40%" />
              <Skeleton variant="text" height={20} width="60%" />
            </VStack>
          </HStack>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main>
        {/* Store Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-48 sm:h-64 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden">
            {store.headerImage && (
              <img
                src={store.headerImage}
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>

          {/* Store Info */}
          <Container size="xl" className="relative">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 -mt-16 sm:-mt-20">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <Avatar
                  src={store.avatar}
                  name={store.name}
                  size="xl"
                  verified={store.verified}
                  className="ring-4 ring-white dark:ring-slate-900 w-32 h-32"
                />
              </div>

              {/* Info */}
              <div className="flex-1 pt-2 sm:pt-8">
                <HStack justify="between" align="start" wrap className="gap-4">
                  <div>
                    <HStack gap="sm" align="center">
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                        {store.name}
                      </h1>
                      {store.verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Verified
                        </span>
                      )}
                    </HStack>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      {store.shortDescription}
                    </p>
                    <HStack gap="md" className="mt-2 text-sm text-slate-500">
                      <span>📍 {store.location}</span>
                      <span>📅 Since {store.memberSince}</span>
                    </HStack>
                  </div>

                  {/* Actions */}
                  <HStack gap="sm">
                    <Button
                      variant={isFollowing ? 'outline' : 'primary'}
                      onClick={() => setIsFollowing(!isFollowing)}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button variant="outline">Message</Button>
                  </HStack>
                </HStack>

                {/* Stats */}
                <HStack
                  gap="lg"
                  className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {store.listingCount}
                    </div>
                    <div className="text-sm text-slate-500">Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {store.followerCount}
                    </div>
                    <div className="text-sm text-slate-500">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      ⭐ {store.rating}
                    </div>
                    <div className="text-sm text-slate-500">{store.reviewCount} reviews</div>
                  </div>
                </HStack>
              </div>
            </div>
          </Container>
        </div>

        {/* Tabs */}
        <div className="sticky top-16 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 mt-6">
          <Container size="xl">
            <HStack gap="none">
              {(['products', 'about', 'reviews'] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium capitalize transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </HStack>
          </Container>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {activeTab === 'products' && (
            <ProductSection
              title="All Products"
              subtitle={`${products.length} items available`}
              products={products.map(p => ({ ...p, vendorName: store.name }))}
              showViewAll={false}
            />
          )}

          {activeTab === 'about' && (
            <Container size="xl">
              <Grid cols={3} colsMobile={1} gap="lg">
                <div className="lg:col-span-2">
                  <Card padding="lg">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                      About This Store
                    </h2>
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      {store.about.split('\n').map((paragraph, i) => (
                        <p key={i} className="text-slate-600 dark:text-slate-400 mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </Card>
                </div>

                <div>
                  <Card padding="lg">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                      Store Details
                    </h3>
                    <VStack gap="md" align="stretch">
                      <div>
                        <span className="text-sm text-slate-500">Accepted Currencies</span>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {store.acceptedCurrencies.join(', ')}
                        </p>
                      </div>
                      {store.socialLinks.website && (
                        <div>
                          <span className="text-sm text-slate-500">Website</span>
                          <a
                            href={store.socialLinks.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-medium text-emerald-600 hover:underline"
                          >
                            {store.socialLinks.website}
                          </a>
                        </div>
                      )}
                      {store.socialLinks.twitter && (
                        <div>
                          <span className="text-sm text-slate-500">Twitter</span>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {store.socialLinks.twitter}
                          </p>
                        </div>
                      )}
                    </VStack>
                  </Card>
                </div>
              </Grid>
            </Container>
          )}

          {activeTab === 'reviews' && (
            <Container size="xl">
              <Card padding="lg">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                  Customer Reviews
                </h2>
                <div className="text-center py-8 text-slate-500">Reviews coming soon...</div>
              </Card>
            </Container>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
