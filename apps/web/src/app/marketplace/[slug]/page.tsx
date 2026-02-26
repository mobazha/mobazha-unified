'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input-compat';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/ProductCard';
import { useChatStore, useI18n } from '@mobazha/core';
import { ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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

// OTC 订单状态枚举
enum OtcOrderStatus {
  Active = 0,
  Completed = 1,
  Cancelled = 2,
}

interface OtcListing {
  orderId: string;
  orderType: 'nft' | 'erc3525';
  title: string;
  image?: string;
  price: number;
  status: OtcOrderStatus;
  seller: { name: string; avatar: string; id: string };
  contractAddress: string;
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

// Mock OTC 数据
const mockOtcListings: OtcListing[] = [
  {
    orderId: '0x123abc',
    orderType: 'nft',
    title: 'KOL 限量签名照 #1',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&h=400&fit=crop',
    price: 100,
    status: OtcOrderStatus.Active,
    seller: {
      name: 'CryptoKOL',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kol',
      id: 'kol1',
    },
    contractAddress: '0x17ebC8FeE90E7556E1E12Aa42604477D6A243324',
  },
  {
    orderId: '0x456def',
    orderType: 'erc3525',
    title: 'Starlight Dreams 份额',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop',
    price: 500,
    status: OtcOrderStatus.Active,
    seller: {
      name: 'InvestorPro',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=investor',
      id: 'inv1',
    },
    contractAddress: '0x4c1A1b21c4471CA57145EE08404Cbaf9C8B83991',
  },
  {
    orderId: '0x789ghi',
    orderType: 'nft',
    title: '演唱会纪念 NFT #2',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    price: 200,
    status: OtcOrderStatus.Completed,
    seller: {
      name: 'FanClub',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fan',
      id: 'fan1',
    },
    contractAddress: '0x17ebC8FeE90E7556E1E12Aa42604477D6A243324',
  },
];

export default function MarketplaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  // slug is used for routing, params.slug is available
  void params.slug;

  const [activeTab, setActiveTab] = useState<'products' | 'otc' | 'sellers' | 'about' | 'chat'>(
    'products'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isMember, setIsMember] = useState(false);
  const openChatDrawer = useChatStore(state => state.openDrawer);

  const marketplace = mockMarketplace;

  // OTC 辅助函数
  const handleOtcClick = (otc: OtcListing) => {
    router.push(`/otc/${otc.orderType}/${otc.orderId}`);
  };

  const otcStatusText = (status: OtcOrderStatus) => {
    const texts: Record<OtcOrderStatus, string> = {
      [OtcOrderStatus.Active]: t('otc.status.active'),
      [OtcOrderStatus.Completed]: t('otc.status.completed'),
      [OtcOrderStatus.Cancelled]: t('otc.status.cancelled'),
    };
    return texts[status];
  };

  const activeOtcListings = mockOtcListings.filter(o => o.status === OtcOrderStatus.Active);

  const handleJoinMarketplace = () => {
    setIsMember(true);
    toast({ title: t('common.success'), description: t('marketplace.joined'), variant: 'success' });
  };

  const handleLeaveMarketplace = () => {
    setIsMember(false);
    toast({ title: t('common.success'), description: t('marketplace.left') });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={marketplace.name} />

      <main>
        {/* Banner */}
        <div className="relative h-40 sm:h-56 md:h-72">
          <img
            src={marketplace.banner}
            alt={`${marketplace.name} banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <Container size="xl">
          {/* Marketplace Header */}
          <div className="relative -mt-16 sm:-mt-20 mb-4 sm:mb-8">
            <Card className="p-4 sm:p-6">
              <HStack gap="md" align="start" className="flex-wrap sm:gap-lg">
                {/* Logo */}
                <img
                  src={marketplace.logo}
                  alt={marketplace.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-xl bg-card border-4 border-white border-border shadow-lg -mt-12 sm:-mt-16"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <HStack justify="between" align="start" className="flex-wrap gap-3 sm:gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                        {marketplace.name}
                      </h1>
                      <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 max-w-2xl">
                        {marketplace.shortDescription}
                      </p>

                      {/* Stats */}
                      <HStack gap="md" className="flex-wrap sm:gap-lg">
                        <VStack gap="none">
                          <span className="text-xl sm:text-2xl font-bold text-foreground">
                            {marketplace.memberCount.toLocaleString()}
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">Members</span>
                        </VStack>
                        <VStack gap="none">
                          <span className="text-xl sm:text-2xl font-bold text-foreground">
                            {marketplace.sellerCount}
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">Sellers</span>
                        </VStack>
                        <VStack gap="none">
                          <span className="text-xl sm:text-2xl font-bold text-foreground">
                            {marketplace.productCount}
                          </span>
                          <span className="text-xs sm:text-sm text-muted-foreground">Products</span>
                        </VStack>
                      </HStack>
                    </div>

                    {/* Actions */}
                    <VStack gap="sm" className="w-full sm:w-auto mt-3 sm:mt-0">
                      {isMember ? (
                        <>
                          <Link
                            href={`/marketplace/${marketplace.slug}/sell`}
                            className="w-full sm:w-auto"
                          >
                            <Button className="w-full sm:w-auto" size="sm">
                              Start Selling
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLeaveMarketplace}
                            className="w-full sm:w-auto"
                          >
                            Leave
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={handleJoinMarketplace}
                          size="sm"
                          className="w-full sm:w-auto touch-feedback"
                        >
                          Join Marketplace
                        </Button>
                      )}
                    </VStack>
                  </HStack>
                </div>
              </HStack>
            </Card>
          </div>

          {/* Tabs */}
          <div className="border-b border-border mb-4 sm:mb-6 overflow-x-auto">
            <HStack gap="none" className="min-w-max">
              {(['products', 'otc', 'sellers', 'about', 'chat'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 sm:px-6 sm:py-4 text-sm font-medium transition-colors capitalize touch-feedback ${
                    activeTab === tab
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'otc' ? (
                    <span className="flex items-center gap-1.5">
                      OTC
                      {activeOtcListings.length > 0 && (
                        <Badge variant="secondary" className="text-xs h-5 px-1.5">
                          {activeOtcListings.length}
                        </Badge>
                      )}
                    </span>
                  ) : (
                    tab
                  )}
                </button>
              ))}
            </HStack>
          </div>

          {/* Tab Content */}
          {activeTab === 'products' && (
            <div>
              {/* Search */}
              <div className="mb-4 sm:mb-6">
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products in this marketplace..."
                  className="h-10 sm:h-12 text-sm sm:text-base"
                  leftIcon={
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  }
                />
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {mockProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    title={product.title}
                    price={product.price}
                    currency={product.currency}
                    imageUrl={product.image}
                    rating={product.rating}
                  />
                ))}
              </div>

              {/* Load More */}
              <div className="text-center mt-6 sm:mt-8">
                <Button variant="outline" size="sm" className="touch-feedback">
                  Load More Products
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'otc' && (
            <div className="space-y-6">
              {/* OTC 介绍 */}
              <Card className="p-4 sm:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
                <HStack justify="between" align="center" className="flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {t('otc.marketplaceOtcTitle')}
                    </h3>
                    <p className="text-sm text-muted-foreground">{t('otc.marketplaceOtcDesc')}</p>
                  </div>
                  {isMember && (
                    <Link href="/otc/create">
                      <Button size="sm" className="touch-feedback">
                        {t('otc.createOrder')}
                      </Button>
                    </Link>
                  )}
                </HStack>
              </Card>

              {/* OTC 列表 */}
              {activeOtcListings.length > 0 ? (
                <Grid cols={4} colsMobile={2} gap="md">
                  {activeOtcListings.map(otc => (
                    <Card
                      key={otc.orderId}
                      className="group cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden"
                      onClick={() => handleOtcClick(otc)}
                    >
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {otc.image ? (
                          <img
                            src={otc.image}
                            alt={otc.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <span className="text-4xl">
                              {otc.orderType === 'nft' ? '🎨' : '📊'}
                            </span>
                          </div>
                        )}
                        <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
                          {otc.orderType === 'nft' ? 'NFT' : 'ERC3525'}
                        </Badge>
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm truncate mb-1">{otc.title}</h3>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-primary font-semibold text-sm">
                            {otc.price} USDT
                          </span>
                          <Badge
                            variant={otc.status === OtcOrderStatus.Active ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {otcStatusText(otc.status)}
                          </Badge>
                        </div>
                        {/* 卖家信息 */}
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <img
                            src={otc.seller.avatar}
                            alt={otc.seller.name}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-xs text-muted-foreground truncate">
                            {otc.seller.name}
                          </span>
                        </div>
                        {/* 合约信息 */}
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="truncate">
                            {otc.contractAddress.slice(0, 6)}...{otc.contractAddress.slice(-4)}
                          </span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </Grid>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-3xl">🔐</span>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {t('otc.noOtcInMarketplace')}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{t('otc.beFirstToCreate')}</p>
                  {isMember && (
                    <Link href="/otc/create">
                      <Button size="sm" className="touch-feedback">
                        {t('otc.createOrder')}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'sellers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {mockSellers.map(seller => (
                <Link key={seller.id} href={`/store/${seller.id}`}>
                  <Card className="h-full p-3 sm:p-4 touch-feedback">
                    <HStack gap="sm" align="center" className="sm:gap-md">
                      <img
                        src={seller.avatar}
                        alt={seller.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">
                          {seller.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {seller.productCount} products • ⭐ {seller.rating}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <Card className="p-4 sm:p-6">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                    About This Marketplace
                  </h2>
                  <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap text-sm sm:text-base">
                    {marketplace.description}
                  </div>
                </Card>

                {marketplace.rules && (
                  <Card className="mt-4 sm:mt-6 p-4 sm:p-6">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
                      Marketplace Rules
                    </h2>
                    <div className="whitespace-pre-wrap text-muted-foreground text-sm sm:text-base">
                      {marketplace.rules}
                    </div>
                  </Card>
                )}
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Owner */}
                <Card className="p-4 sm:p-6">
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
                    Marketplace Owner
                  </h3>
                  <HStack gap="sm" align="center" className="sm:gap-md">
                    <img
                      src={marketplace.owner.avatar}
                      alt={marketplace.owner.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-muted"
                    />
                    <div>
                      <p className="font-semibold text-foreground text-sm sm:text-base">
                        {marketplace.owner.name}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground">Owner</p>
                    </div>
                  </HStack>
                </Card>

                {/* Categories */}
                <Card className="p-4 sm:p-6">
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 sm:mb-4">
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {marketplace.categories.map(cat => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 sm:px-3 sm:py-1 bg-muted text-muted-foreground rounded-full text-xs sm:text-sm"
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
            <Card className="p-4 sm:p-6">
              <VStack gap="sm" align="center" className="py-8 sm:py-12 sm:gap-md">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
                  <svg
                    className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground"
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
                <h3 className="text-base sm:text-lg font-semibold text-foreground">
                  Community Chat
                </h3>
                <p className="text-muted-foreground text-center max-w-md text-sm sm:text-base px-4">
                  {isMember
                    ? 'Connect with other members and sellers in the marketplace chat room.'
                    : 'Join this marketplace to access the community chat.'}
                </p>
                {isMember ? (
                  <Button size="sm" className="touch-feedback" onClick={openChatDrawer}>
                    Open Chat
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleJoinMarketplace} className="touch-feedback">
                    Join to Chat
                  </Button>
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
