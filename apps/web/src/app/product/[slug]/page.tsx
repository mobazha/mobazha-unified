'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';

// Mock product data
const mockProduct = {
  id: '1',
  slug: 'premium-headphones',
  title: 'Premium Wireless Headphones with Active Noise Cancellation',
  description: `Experience crystal-clear audio with our Premium Wireless Headphones. Featuring advanced Active Noise Cancellation technology, these headphones deliver an immersive listening experience whether you're on a busy commute or working from home.

**Key Features:**
- 40mm custom drivers for rich, detailed sound
- Active Noise Cancellation with transparency mode
- 30-hour battery life with quick charge
- Comfortable memory foam ear cushions
- Bluetooth 5.2 with multipoint connection
- Built-in microphone for calls
- Foldable design with premium carrying case

**What's in the Box:**
- Headphones
- USB-C charging cable
- 3.5mm audio cable
- Carrying case
- Quick start guide`,
  images: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1524678606370-a47ad25cb82a?w=800&h=800&fit=crop',
  ],
  price: 299.99,
  originalPrice: 399.99,
  currency: '$',
  category: 'Electronics',
  tags: ['headphones', 'audio', 'wireless', 'noise-cancelling'],
  stock: 15,
  vendor: {
    peerID: 'QmVendor123',
    name: 'TechGear Store',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    rating: 4.8,
    reviewCount: 256,
    location: 'San Francisco, CA',
  },
  rating: 4.8,
  reviewCount: 128,
  reviews: [
    {
      id: '1',
      user: 'AudioFan',
      avatar: null,
      rating: 5,
      comment: 'Amazing sound quality and the noise cancellation is top-notch!',
      date: '2024-01-15',
    },
    {
      id: '2',
      user: 'TechReviewer',
      avatar: null,
      rating: 4,
      comment: 'Great headphones overall. Battery life is impressive.',
      date: '2024-01-10',
    },
  ],
  shipping: {
    freeShipping: true,
    estimatedDays: '3-5',
  },
  acceptedCurrencies: ['BTC', 'ETH', 'USDT'],
};

export default function ProductPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Will be used when fetching real data
  const _params = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading] = useState(false);

  const product = mockProduct;
  const discountPercent = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <Container size="xl" className="py-8">
          <Grid cols={2} colsMobile={1} gap="lg">
            <Skeleton variant="rounded" className="aspect-square" />
            <VStack gap="md" align="stretch">
              <Skeleton variant="text" height={40} width="80%" />
              <Skeleton variant="text" height={24} width="40%" />
              <Skeleton variant="text" height={100} />
            </VStack>
          </Grid>
        </Container>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          {/* Breadcrumb - Hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-2 text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-emerald-600">
              Home
            </Link>
            <span>/</span>
            <Link href="/market" className="hover:text-emerald-600">
              Market
            </Link>
            <span>/</span>
            <Link
              href={`/market?category=${product.category.toLowerCase()}`}
              className="hover:text-emerald-600"
            >
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white truncate max-w-[200px]">
              {product.title}
            </span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 lg:gap-12">
            {/* Image Gallery */}
            <div className="space-y-3 sm:space-y-4">
              {/* Main Image */}
              <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden bg-white dark:bg-slate-800">
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                {discountPercent > 0 && (
                  <span className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-red-500 text-white text-xs sm:text-sm font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-md sm:rounded-lg overflow-hidden border-2 transition-all touch-feedback ${
                      selectedImage === index
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-4 sm:space-y-6">
              {/* Title & Rating */}
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  {product.title}
                </h1>
                <HStack gap="sm" align="center">
                  <HStack gap="xs" align="center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${i < Math.floor(product.rating) ? 'text-amber-500' : 'text-slate-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="text-sm text-slate-600 dark:text-slate-400 ml-1">
                      {product.rating} ({product.reviewCount} reviews)
                    </span>
                  </HStack>
                </HStack>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
                  {product.currency}
                  {product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-lg sm:text-xl text-slate-400 line-through">
                    {product.currency}
                    {product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Shipping */}
              <div className="flex items-center gap-2 text-xs sm:text-sm flex-wrap">
                {product.shipping.freeShipping ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Free Shipping
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    Shipping calculated at checkout
                  </span>
                )}
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 dark:text-slate-400">
                  Est. delivery: {product.shipping.estimatedDays} days
                </span>
              </div>

              {/* Quantity & Add to Cart */}
              <Card className="space-y-3 sm:space-y-4 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Quantity
                  </span>
                  <HStack gap="sm" align="center">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 touch-feedback"
                    >
                      -
                    </button>
                    <span className="w-10 sm:w-12 text-center font-medium text-sm">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 touch-feedback"
                    >
                      +
                    </button>
                  </HStack>
                </div>
                <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  {product.stock} in stock
                </span>

                <VStack gap="xs">
                  <Button size="default" className="w-full touch-feedback">
                    Add to Cart
                  </Button>
                  <Button variant="outline" size="default" className="w-full touch-feedback">
                    Buy Now
                  </Button>
                </VStack>

                {/* Accepted Currencies */}
                <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Accepted:{' '}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                    {product.acceptedCurrencies.join(', ')}
                  </span>
                </div>
              </Card>

              {/* Vendor Info */}
              <Card className="p-4 sm:p-6">
                <Link href={`/store/${product.vendor.peerID}`} className="touch-feedback block">
                  <HStack gap="sm" align="center">
                    <Avatar
                      src={product.vendor.avatar}
                      name={product.vendor.name}
                      size="md"
                      verified
                      className="w-10 h-10 sm:w-12 sm:h-12"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                        {product.vendor.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        {product.vendor.location}
                      </p>
                      <HStack gap="xs" align="center" className="mt-0.5">
                        <span className="text-amber-500 text-sm">★</span>
                        <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          {product.vendor.rating} ({product.vendor.reviewCount} reviews)
                        </span>
                      </HStack>
                    </div>
                    <Button variant="outline" size="sm" className="flex-shrink-0 text-xs">
                      View Store
                    </Button>
                  </HStack>
                </Link>
              </Card>
            </div>
          </div>

          {/* Description & Reviews */}
          <div className="mt-6 sm:mt-12 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
            {/* Description */}
            <div className="lg:col-span-2">
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                  Description
                </h2>
                <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none">
                  {product.description.split('\n').map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-3"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Tags */}
                <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Tags:{' '}
                  </span>
                  <div className="inline-flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                    {product.tags.map(tag => (
                      <Link
                        key={tag}
                        href={`/market?tag=${tag}`}
                        className="px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors touch-feedback"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Reviews Summary */}
            <div>
              <Card className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
                  Reviews
                </h2>

                {/* Rating Summary */}
                <div className="text-center mb-4 sm:mb-6">
                  <div className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
                    {product.rating}
                  </div>
                  <HStack gap="xs" justify="center" className="my-1.5 sm:my-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${i < Math.floor(product.rating) ? 'text-amber-500' : 'text-slate-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </HStack>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {product.reviewCount} reviews
                  </p>
                </div>

                {/* Recent Reviews */}
                <VStack gap="sm">
                  {product.reviews.slice(0, 3).map(review => (
                    <div
                      key={review.id}
                      className="pb-3 sm:pb-4 border-b border-slate-200 dark:border-slate-700 last:border-0"
                    >
                      <HStack gap="xs" align="center" className="mb-1.5">
                        <Avatar name={review.user} size="sm" className="w-6 h-6 sm:w-8 sm:h-8" />
                        <span className="font-medium text-slate-900 dark:text-white text-sm">
                          {review.user}
                        </span>
                        <HStack gap="xs" className="ml-auto">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-3 h-3 sm:w-4 sm:h-4 ${i < review.rating ? 'text-amber-500' : 'text-slate-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </HStack>
                      </HStack>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                        {review.comment}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {review.date}
                      </p>
                    </div>
                  ))}
                </VStack>

                <Button variant="ghost" className="w-full mt-3 sm:mt-4 text-sm touch-feedback">
                  View All Reviews
                </Button>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
