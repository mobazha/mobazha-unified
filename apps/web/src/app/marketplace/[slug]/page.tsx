'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@mobazha/ui';
import { Button, Card, Input } from '@mobazha/ui';
import { ProductCard } from '@mobazha/ui';

// Types
interface Marketplace {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  logo?: string;
  banner?: string;
  owner: { id: string; name: string; avatar: string };
  memberCount: number;
  sellerCount: number;
  productCount: number;
  categories: string[];
  rules?: string;
  chatRoomId?: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  rating: number;
  seller: { name: string; avatar: string };
}

interface Seller {
  id: string;
  name: string;
  avatar: string;
  productCount: number;
  rating: number;
  joinedAt: string;
}

// Mock data
const mockMarketplace: Marketplace = {
  id: 'mp1',
  name: 'Tech Gadgets Hub',
  slug: 'tech-gadgets-hub',
  description: `Welcome to Tech Gadgets Hub - your premier destination for the latest technology products!

**What We Offer:**
- Latest smartphones and accessories
- Computer hardware and peripherals
- Smart home devices
- Gaming gear and consoles
- Wearable technology

**Why Shop Here:**
- Verified sellers with proven track records
- Buyer protection with escrow payments
- Active community support
- Regular deals and promotions

Join our community of tech enthusiasts today!`,
  shortDescription:
    'Your one-stop shop for the latest tech gadgets and electronics from trusted sellers worldwide.',
  logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=tech',
  banner: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=400&fit=crop',
  owner: {
    id: 'owner1',
    name: 'TechAdmin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  },
  memberCount: 1234,
  sellerCount: 56,
  productCount: 892,
  categories: ['Electronics', 'Gadgets', 'Computers'],
  rules: `1. All products must be authentic and as described
2. No counterfeit or replica items
3. Sellers must respond to inquiries within 24 hours
4. Respect all community members
5. No spam or promotional content outside designated areas`,
  chatRoomId: 'room-tech-hub',
};

const mockProducts: Product[] = [
  {
    id: 'p1',
    title: 'Wireless Noise-Canceling Headphones',
    price: 299.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    rating: 4.8,
    seller: { name: 'AudioPro', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=audio' },
  },
  {
    id: 'p2',
    title: 'Smart Watch Series 5',
    price: 449.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    rating: 4.7,
    seller: { name: 'WatchWorld', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=watch' },
  },
  {
    id: 'p3',
    title: 'Mechanical Gaming Keyboard RGB',
    price: 159.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop',
    rating: 4.9,
    seller: { name: 'GamerGear', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=gamer' },
  },
  {
    id: 'p4',
    title: '4K Ultra HD Webcam',
    price: 129.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=400&h=400&fit=crop',
    rating: 4.5,
    seller: { name: 'StreamPro', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=stream' },
  },
  {
    id: 'p5',
    title: 'Portable SSD 1TB',
    price: 99.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&h=400&fit=crop',
    rating: 4.6,
    seller: { name: 'DataStore', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=data' },
  },
  {
    id: 'p6',
    title: 'Wireless Charging Pad',
    price: 39.99,
    currency: 'USD',
    image: 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e3?w=400&h=400&fit=crop',
    rating: 4.4,
    seller: { name: 'PowerUp', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=power' },
  },
];

const mockSellers: Seller[] = [
  {
    id: 's1',
    name: 'AudioPro',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=audio',
    productCount: 45,
    rating: 4.9,
    joinedAt: '2023-06-15',
  },
  {
    id: 's2',
    name: 'WatchWorld',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=watch',
    productCount: 32,
    rating: 4.8,
    joinedAt: '2023-07-20',
  },
  {
    id: 's3',
    name: 'GamerGear',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=gamer',
    productCount: 67,
    rating: 4.7,
    joinedAt: '2023-05-10',
  },
];

export default function MarketplaceDetailPage() {
  const params = useParams();
  // slug is used for routing, params.slug is available
  void params.slug;

  const [activeTab, setActiveTab] = useState<'products' | 'sellers' | 'about' | 'chat'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMember, setIsMember] = useState(false);

  const marketplace = mockMarketplace;

  const handleJoinMarketplace = () => {
    setIsMember(true);
    alert('Successfully joined the marketplace!');
  };

  const handleLeaveMarketplace = () => {
    setIsMember(false);
    alert('You have left the marketplace');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main>
        {/* Banner */}
        <div className="relative h-64 md:h-80">
          <img src={marketplace.banner} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <Container size="xl">
          {/* Marketplace Header */}
          <div className="relative -mt-20 mb-8">
            <Card padding="lg">
              <HStack gap="lg" align="start" className="flex-wrap">
                {/* Logo */}
                <img
                  src={marketplace.logo}
                  alt={marketplace.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-xl bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-lg -mt-16"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <HStack justify="between" align="start" className="flex-wrap gap-4">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                        {marketplace.name}
                      </h1>
                      <p className="text-slate-600 dark:text-slate-400 mb-4 max-w-2xl">
                        {marketplace.shortDescription}
                      </p>

                      {/* Stats */}
                      <HStack gap="lg" className="flex-wrap">
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {marketplace.memberCount.toLocaleString()}
                          </span>
                          <span className="text-sm text-slate-500">Members</span>
                        </VStack>
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {marketplace.sellerCount}
                          </span>
                          <span className="text-sm text-slate-500">Sellers</span>
                        </VStack>
                        <VStack gap="none">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white">
                            {marketplace.productCount}
                          </span>
                          <span className="text-sm text-slate-500">Products</span>
                        </VStack>
                      </HStack>
                    </div>

                    {/* Actions */}
                    <VStack gap="sm">
                      {isMember ? (
                        <>
                          <Link href={`/marketplace/${marketplace.slug}/sell`}>
                            <Button>Start Selling</Button>
                          </Link>
                          <Button variant="ghost" onClick={handleLeaveMarketplace}>
                            Leave
                          </Button>
                        </>
                      ) : (
                        <Button onClick={handleJoinMarketplace}>Join Marketplace</Button>
                      )}
                    </VStack>
                  </HStack>
                </div>
              </HStack>
            </Card>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
            <HStack gap="none">
              {(['products', 'sellers', 'about', 'chat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium transition-colors capitalize ${
                    activeTab === tab
                      ? 'text-emerald-600 border-b-2 border-emerald-600'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </HStack>
          </div>

          {/* Tab Content */}
          {activeTab === 'products' && (
            <div>
              {/* Search */}
              <div className="mb-6">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products in this marketplace..."
                  leftIcon={
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  }
                />
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {mockProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    title={product.title}
                    price={product.price}
                    currency={product.currency}
                    image={product.image}
                    rating={product.rating}
                  />
                ))}
              </div>

              {/* Load More */}
              <div className="text-center mt-8">
                <Button variant="outline">Load More Products</Button>
              </div>
            </div>
          )}

          {activeTab === 'sellers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockSellers.map(seller => (
                <Link key={seller.id} href={`/store/${seller.id}`}>
                  <Card padding="lg" hoverable className="h-full">
                    <HStack gap="md" align="center">
                      <img
                        src={seller.avatar}
                        alt={seller.name}
                        className="w-16 h-16 rounded-full bg-slate-200"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {seller.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {seller.productCount} products • ⭐ {seller.rating}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Joined {new Date(seller.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </HStack>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {activeTab === 'about' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card padding="lg">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    About This Marketplace
                  </h2>
                  <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">
                    {marketplace.description}
                  </div>
                </Card>

                {marketplace.rules && (
                  <Card padding="lg" className="mt-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                      Marketplace Rules
                    </h2>
                    <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                      {marketplace.rules}
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {/* Owner */}
                <Card padding="lg">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Marketplace Owner</h3>
                  <HStack gap="md" align="center">
                    <img
                      src={marketplace.owner.avatar}
                      alt={marketplace.owner.name}
                      className="w-12 h-12 rounded-full bg-slate-200"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {marketplace.owner.name}
                      </p>
                      <p className="text-sm text-slate-500">Owner</p>
                    </div>
                  </HStack>
                </Card>

                {/* Categories */}
                <Card padding="lg">
                  <h3 className="text-sm font-medium text-slate-500 mb-4">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {marketplace.categories.map(cat => (
                      <span
                        key={cat}
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <Card padding="lg">
              <VStack gap="md" align="center" className="py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Community Chat
                </h3>
                <p className="text-slate-500 text-center max-w-md">
                  {isMember
                    ? 'Connect with other members and sellers in the marketplace chat room.'
                    : 'Join this marketplace to access the community chat.'}
                </p>
                {isMember ? (
                  <Link href={`/chat/${marketplace.chatRoomId}`}>
                    <Button>Open Chat</Button>
                  </Link>
                ) : (
                  <Button onClick={handleJoinMarketplace}>Join to Chat</Button>
                )}
              </VStack>
            </Card>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
