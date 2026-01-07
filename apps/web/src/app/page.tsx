'use client';

import React from 'react';
import { Header, Hero, ProductSection, Footer } from '@/components';
import { MobileHeader } from '@/components/MobileHeader';
import { useI18n } from '@mobazha/core';

// Mock data for demo
const trendingProducts = [
  {
    id: '1',
    slug: 'premium-headphones',
    title: 'Premium Wireless Headphones with Noise Cancellation',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    price: 299.99,
    vendorName: 'TechGear Store',
    rating: 4.8,
    reviewCount: 256,
    freeShipping: true,
  },
  {
    id: '2',
    slug: 'digital-art-course',
    title: 'Complete Digital Art Masterclass - From Beginner to Pro',
    imageUrl: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop',
    price: 49.99,
    vendorName: 'ArtAcademy',
    rating: 4.9,
    reviewCount: 1024,
    isDigital: true,
  },
  {
    id: '3',
    slug: 'vintage-camera',
    title: 'Vintage Film Camera - Fully Restored',
    imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
    price: 189.0,
    vendorName: 'RetroFinds',
    rating: 4.6,
    reviewCount: 89,
  },
  {
    id: '4',
    slug: 'smart-watch',
    title: 'Smart Watch Pro - Health & Fitness Tracker',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    price: 199.99,
    currency: '$',
    originalPrice: 249.99,
    vendorName: 'FitTech',
    rating: 4.7,
    reviewCount: 512,
    freeShipping: true,
  },
  {
    id: '5',
    slug: 'leather-wallet',
    title: 'Handcrafted Leather Wallet - Genuine Italian Leather',
    imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop',
    price: 79.99,
    vendorName: 'LeatherCraft',
    rating: 4.9,
    reviewCount: 341,
  },
  {
    id: '6',
    slug: 'mechanical-keyboard',
    title: 'RGB Mechanical Gaming Keyboard - Cherry MX Blue',
    imageUrl: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=400&h=400&fit=crop',
    price: 129.99,
    vendorName: 'GamerZone',
    rating: 4.5,
    reviewCount: 678,
    freeShipping: true,
  },
  {
    id: '7',
    slug: 'plant-collection',
    title: 'Succulent Plant Collection - Set of 6',
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=400&fit=crop',
    price: 34.99,
    vendorName: 'GreenThumb',
    rating: 4.8,
    reviewCount: 203,
  },
  {
    id: '8',
    slug: 'crypto-hardware-wallet',
    title: 'Crypto Hardware Wallet - Secure Cold Storage',
    imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=400&fit=crop',
    price: 89.99,
    vendorName: 'CryptoSecure',
    rating: 4.9,
    reviewCount: 892,
    isDigital: false,
    freeShipping: true,
  },
];

const featuredProducts = [
  {
    id: '9',
    slug: 'btc-otc-trade',
    title: 'BTC OTC Trading - Competitive Rates',
    imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop',
    price: 0,
    currency: 'BTC',
    vendorName: 'CryptoDesk',
    rating: 5.0,
    reviewCount: 156,
  },
  {
    id: '10',
    slug: 'web-dev-service',
    title: 'Professional Web Development Service',
    imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=400&fit=crop',
    price: 500,
    vendorName: 'DevPro',
    rating: 4.8,
    reviewCount: 89,
    isDigital: true,
  },
  {
    id: '11',
    slug: 'nft-art-bundle',
    title: 'Exclusive Digital Art Collection',
    imageUrl: 'https://images.unsplash.com/photo-1634986666676-ec8fd927c23d?w=400&h=400&fit=crop',
    price: 0.5,
    currency: 'ETH',
    vendorName: 'DigitalArtist',
    rating: 4.7,
    reviewCount: 234,
    isDigital: true,
  },
  {
    id: '12',
    slug: 'vpn-subscription',
    title: 'Privacy VPN - 1 Year Subscription',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&h=400&fit=crop',
    price: 39.99,
    vendorName: 'SecureNet',
    rating: 4.6,
    reviewCount: 445,
    isDigital: true,
  },
];

export default function HomePage() {
  const { t } = useI18n();

  const categories = [
    { name: t('homeExtended.electronics'), icon: '💻', color: 'from-blue-500 to-cyan-500' },
    { name: t('homeExtended.digitalGoods'), icon: '📱', color: 'from-purple-500 to-pink-500' },
    { name: t('homeExtended.services'), icon: '🛠️', color: 'from-orange-500 to-red-500' },
    { name: t('homeExtended.cryptoOtc'), icon: '₿', color: 'from-amber-500 to-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* 移动端显示简化搜索栏，桌面端显示完整 Header */}
      <MobileHeader />
      <Header />

      <main>
        <Hero />

        <ProductSection
          title={t('homeExtended.trendingNow')}
          subtitle={t('homeExtended.trendingSubtitle')}
          products={trendingProducts}
          viewAllHref="/market?sort=trending"
        />

        <div className="bg-white dark:bg-slate-800">
          <ProductSection
            title={t('homeExtended.featuredServices')}
            subtitle={t('homeExtended.featuredSubtitle')}
            products={featuredProducts}
            viewAllHref="/market?category=featured"
          />
        </div>

        {/* Categories Section */}
        <section className="py-6 sm:py-10 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-4 sm:mb-8">
              {t('homeExtended.browseCategories')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {categories.map(category => (
                <a
                  key={category.name}
                  href={`/market?category=${category.name.toLowerCase()}`}
                  className={`relative overflow-hidden rounded-lg sm:rounded-xl p-4 sm:p-6 bg-gradient-to-br ${category.color} text-white touch-feedback hover:scale-105 transition-transform`}
                >
                  <span className="text-2xl sm:text-4xl mb-1 sm:mb-2 block">{category.icon}</span>
                  <span className="font-semibold text-sm sm:text-base">{category.name}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
