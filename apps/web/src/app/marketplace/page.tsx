'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@mobazha/core';

// Types
interface Marketplace {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  logo?: string;
  banner?: string;
  memberCount: number;
  sellerCount: number;
  productCount: number;
  categories: string[];
  featured: boolean;
}

// Mock data
const mockMarketplaces: Marketplace[] = [
  {
    id: 'mp1',
    name: 'Tech Gadgets Hub',
    slug: 'tech-gadgets-hub',
    shortDescription:
      'Your one-stop shop for the latest tech gadgets and electronics from trusted sellers worldwide.',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=tech',
    banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=300&fit=crop',
    memberCount: 1234,
    sellerCount: 56,
    productCount: 892,
    categories: ['Electronics', 'Gadgets', 'Computers'],
    featured: true,
  },
  {
    id: 'mp2',
    name: 'Artisan Crafts Market',
    slug: 'artisan-crafts',
    shortDescription:
      'Handmade crafts and artisanal products from skilled craftspeople around the globe.',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=craft',
    banner: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&h=300&fit=crop',
    memberCount: 876,
    sellerCount: 123,
    productCount: 2341,
    categories: ['Handmade', 'Art', 'Crafts'],
    featured: true,
  },
  {
    id: 'mp3',
    name: 'Digital Assets Exchange',
    slug: 'digital-assets',
    shortDescription:
      'Trade digital goods, software licenses, and virtual assets securely with crypto.',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=digital',
    banner: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=300&fit=crop',
    memberCount: 2156,
    sellerCount: 89,
    productCount: 567,
    categories: ['Digital', 'Software', 'NFTs'],
    featured: true,
  },
  {
    id: 'mp4',
    name: 'Fashion Forward',
    slug: 'fashion-forward',
    shortDescription: 'Trendy fashion items and accessories from independent designers.',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=fashion',
    banner: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=300&fit=crop',
    memberCount: 654,
    sellerCount: 34,
    productCount: 456,
    categories: ['Fashion', 'Clothing', 'Accessories'],
    featured: false,
  },
  {
    id: 'mp5',
    name: 'Home & Living',
    slug: 'home-living',
    shortDescription: 'Everything you need to make your house a home.',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=home',
    banner: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&h=300&fit=crop',
    memberCount: 432,
    sellerCount: 28,
    productCount: 678,
    categories: ['Home', 'Furniture', 'Decor'],
    featured: false,
  },
];

const allCategories = [
  'Electronics',
  'Gadgets',
  'Computers',
  'Handmade',
  'Art',
  'Crafts',
  'Digital',
  'Software',
  'NFTs',
  'Fashion',
  'Clothing',
  'Accessories',
  'Home',
  'Furniture',
  'Decor',
];

export default function MarketplacesPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'products'>('members');

  // Filter and sort marketplaces
  const filteredMarketplaces = mockMarketplaces
    .filter(mp => {
      if (searchQuery && !mp.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (selectedCategory !== 'all' && !mp.categories.includes(selectedCategory)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return b.memberCount - a.memberCount;
        case 'products':
          return b.productCount - a.productCount;
        default:
          return 0;
      }
    });

  const featuredMarketplaces = filteredMarketplaces.filter(mp => mp.featured);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          {/* Page Header */}
          <div className="text-center mb-6 sm:mb-12">
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2 sm:mb-4">
              {t('marketplace.title')}
            </h1>
            <p className="text-sm sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('marketplace.subtitle')}
            </p>
          </div>

          {/* Search and Filters */}
          <Card className="mb-4 sm:mb-8 p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              <div className="sm:col-span-2 md:col-span-2">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('marketplace.searchPlaceholder')}
                  className="h-9 sm:h-10 text-sm"
                  leftIcon={
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400"
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
                  }
                />
              </div>
              <div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue placeholder={t('marketplace.allCategories')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('marketplace.allCategories')}</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={sortBy} onValueChange={value => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="h-9 sm:h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="members">{t('marketplace.sortByMembers')}</SelectItem>
                    <SelectItem value="products">{t('marketplace.sortByProducts')}</SelectItem>
                    <SelectItem value="name">{t('marketplace.sortByName')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Featured Marketplaces */}
          {featuredMarketplaces.length > 0 && !searchQuery && selectedCategory === 'all' && (
            <section className="mb-6 sm:mb-12">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-3 sm:mb-6">
                {t('marketplace.featuredMarketplaces')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {featuredMarketplaces.map(marketplace => (
                  <Link key={marketplace.id} href={`/marketplace/${marketplace.slug}`}>
                    <Card className="overflow-hidden transition-all hover:shadow-xl active:scale-[0.99]">
                      {/* Banner */}
                      <div className="h-24 sm:h-32 overflow-hidden relative">
                        <img
                          src={marketplace.banner}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <span className="absolute top-2 right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-500 text-white text-[10px] sm:text-xs font-medium rounded">
                          {t('marketplace.featured')}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-3 sm:p-4 relative">
                        {/* Logo */}
                        <div className="absolute -top-6 sm:-top-8 left-3 sm:left-4">
                          <img
                            src={marketplace.logo}
                            alt={marketplace.name}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-card border-3 sm:border-4 border-white dark:border-slate-900 shadow-lg"
                          />
                        </div>

                        <div className="pt-4 sm:pt-6">
                          <h3 className="text-base sm:text-lg font-bold text-foreground mb-1 sm:mb-2">
                            {marketplace.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">
                            {marketplace.shortDescription}
                          </p>

                          {/* Stats */}
                          <HStack gap="md" className="sm:gap-6">
                            <VStack gap="none" align="center">
                              <span className="font-bold text-sm sm:text-base text-foreground">
                                {marketplace.memberCount.toLocaleString()}
                              </span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {t('marketplace.members')}
                              </span>
                            </VStack>
                            <VStack gap="none" align="center">
                              <span className="font-bold text-sm sm:text-base text-foreground">
                                {marketplace.sellerCount}
                              </span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {t('marketplace.sellers')}
                              </span>
                            </VStack>
                            <VStack gap="none" align="center">
                              <span className="font-bold text-sm sm:text-base text-foreground">
                                {marketplace.productCount}
                              </span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground">
                                {t('marketplace.products')}
                              </span>
                            </VStack>
                          </HStack>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* All Marketplaces */}
          <section>
            <HStack justify="between" align="center" className="mb-3 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">
                {searchQuery || selectedCategory !== 'all'
                  ? t('marketplace.searchResults')
                  : t('marketplace.allMarketplaces')}
              </h2>
              <Link href="/marketplace/create">
                <Button size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                  {t('marketplace.createMarketplace')}
                </Button>
              </Link>
            </HStack>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              {filteredMarketplaces.map(marketplace => (
                <Link key={marketplace.id} href={`/marketplace/${marketplace.slug}`}>
                  <Card className="transition-all hover:shadow-lg active:scale-[0.99] h-full p-3 sm:p-4">
                    <HStack gap="sm" align="start" className="sm:gap-4">
                      <img
                        src={marketplace.logo}
                        alt={marketplace.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl bg-muted flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <HStack gap="xs" align="center" className="mb-0.5 sm:mb-1 sm:gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-foreground">
                            {marketplace.name}
                          </h3>
                          {marketplace.featured && (
                            <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] sm:text-xs font-medium rounded">
                              {t('marketplace.featured')}
                            </span>
                          )}
                        </HStack>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3">
                          {marketplace.shortDescription}
                        </p>
                        <HStack
                          gap="sm"
                          className="text-xs sm:text-sm text-muted-foreground sm:gap-4"
                        >
                          <span>
                            {marketplace.memberCount.toLocaleString()} {t('marketplace.members')}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">
                            {marketplace.productCount} {t('marketplace.products')}
                          </span>
                        </HStack>
                        <HStack gap="xs" className="mt-1.5 sm:mt-2 sm:gap-2">
                          {marketplace.categories.slice(0, 3).map(cat => (
                            <span
                              key={cat}
                              className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-muted-foreground rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </HStack>
                      </div>
                    </HStack>
                  </Card>
                </Link>
              ))}
            </div>

            {filteredMarketplaces.length === 0 && (
              <Card className="text-center py-12">
                <VStack gap="md" align="center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t('marketplace.noMarketplacesFound')}
                  </h3>
                  <p className="text-muted-foreground">{t('empty.tryAdjustingFilters')}</p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                  >
                    {t('marketplace.clearFilters')}
                  </Button>
                </VStack>
              </Card>
            )}
          </section>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
