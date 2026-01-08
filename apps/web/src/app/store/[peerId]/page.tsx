'use client';

import React, { useState } from 'react';
// import Link from 'next/link'; // TODO: Use for store navigation
import { useParams } from 'next/navigation';
import { Header, Footer, ProductSection } from '@/components';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';

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
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Store Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-32 sm:h-48 md:h-64 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden">
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
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 -mt-12 sm:-mt-20">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <Avatar
                  src={store.avatar}
                  name={store.name}
                  size="xl"
                  verified={store.verified}
                  className="ring-4 ring-white dark:ring-slate-900 w-24 h-24 sm:w-32 sm:h-32"
                />
              </div>

              {/* Info */}
              <div className="flex-1 pt-1 sm:pt-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <HStack gap="sm" align="center">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                        {store.name}
                      </h1>
                      {store.verified && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                          <svg
                            className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
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
                    <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
                      {store.shortDescription}
                    </p>
                    <HStack gap="sm" className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                      <span>📍 {store.location}</span>
                      <span>📅 Since {store.memberSince}</span>
                    </HStack>
                  </div>

                  {/* Actions */}
                  <HStack gap="xs" className="flex-shrink-0">
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
                      onClick={() => setIsFollowing(!isFollowing)}
                      size="sm"
                      className="touch-feedback"
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button variant="outline" size="sm" className="touch-feedback">
                      Message
                    </Button>
                  </HStack>
                </div>

                {/* Stats */}
                <HStack gap="md" className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-foreground">
                      {store.listingCount}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-foreground">
                      {store.followerCount}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Followers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg sm:text-xl font-bold text-foreground">
                      ⭐ {store.rating}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {store.reviewCount} reviews
                    </div>
                  </div>
                </HStack>
              </div>
            </div>
          </Container>
        </div>

        {/* Tabs */}
        <div className="sticky top-16 z-40 bg-card border-b border-border mt-4 sm:mt-6">
          <Container size="xl">
            <HStack gap="none">
              {(['products', 'about', 'reviews'] as TabType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 sm:px-6 py-3 sm:py-4 text-sm font-medium capitalize transition-colors border-b-2 touch-feedback ${
                    activeTab === tab
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </HStack>
          </Container>
        </div>

        {/* Tab Content */}
        <div className="py-4 sm:py-8">
          {activeTab === 'products' && (
            <ProductSection
              title="All Products"
              subtitle={`${products.length} items available`}
              products={products.map(p => ({ ...p, vendorName: store.name }))}
              showViewAll={false}
              containerSize="lg"
              titleClassName="text-lg sm:text-xl"
            />
          )}

          {activeTab === 'about' && (
            <Container size="xl">
              <Grid cols={3} colsMobile={1} gap="md">
                <div className="lg:col-span-2">
                  <Card className="p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                      About This Store
                    </h2>
                    <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none">
                      {store.about.split('\n').map((paragraph, i) => (
                        <p key={i} className="text-sm sm:text-base text-muted-foreground mb-3">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </Card>
                </div>

                <div>
                  <Card className="p-4 sm:p-6">
                    <h3 className="font-semibold text-foreground mb-3 text-base">Store Details</h3>
                    <VStack gap="sm" align="stretch">
                      <div>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          Accepted Currencies
                        </span>
                        <p className="font-medium text-foreground text-sm">
                          {store.acceptedCurrencies.join(', ')}
                        </p>
                      </div>
                      {store.socialLinks.website && (
                        <div>
                          <span className="text-xs sm:text-sm text-muted-foreground">Website</span>
                          <a
                            href={store.socialLinks.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-medium text-emerald-600 hover:underline text-sm"
                          >
                            {store.socialLinks.website}
                          </a>
                        </div>
                      )}
                      {store.socialLinks.twitter && (
                        <div>
                          <span className="text-xs sm:text-sm text-muted-foreground">Twitter</span>
                          <p className="font-medium text-foreground text-sm">
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
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3">
                  Customer Reviews
                </h2>
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Reviews coming soon...
                </div>
              </Card>
            </Container>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
