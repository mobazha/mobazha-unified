'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n } from '@mobazha/core';

// Types
interface CartItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  image: string;
  vendor: {
    peerID: string;
    name: string;
    avatar?: string;
  };
  options?: {
    name: string;
    value: string;
  }[];
  stock: number;
}

interface CartGroup {
  vendorId: string;
  vendorName: string;
  vendorAvatar?: string;
  items: CartItem[];
}

// Mock cart data
const mockCartItems: CartItem[] = [
  {
    id: 'cart-1',
    productId: '1',
    slug: 'premium-headphones',
    title: 'Premium Wireless Headphones with Active Noise Cancellation',
    price: 299.99,
    currency: 'USD',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    vendor: {
      peerID: 'QmVendor123',
      name: 'TechGear Store',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    },
    options: [{ name: 'Color', value: 'Black' }],
    stock: 15,
  },
  {
    id: 'cart-2',
    productId: '2',
    slug: 'smart-watch-pro',
    title: 'Smart Watch Pro - Health & Fitness Tracker',
    price: 449.99,
    currency: 'USD',
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    vendor: {
      peerID: 'QmVendor123',
      name: 'TechGear Store',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    },
    options: [
      { name: 'Size', value: '42mm' },
      { name: 'Band', value: 'Silicone' },
    ],
    stock: 25,
  },
  {
    id: 'cart-3',
    productId: '3',
    slug: 'vintage-camera',
    title: 'Vintage Film Camera - Collector Edition',
    price: 189.99,
    currency: 'USD',
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&h=400&fit=crop',
    vendor: {
      peerID: 'QmVendor789',
      name: 'Retro Finds',
    },
    stock: 3,
  },
];

export default function CartPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [cartItems, setCartItems] = useState<CartItem[]>(mockCartItems);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    new Set(mockCartItems.map(item => item.id))
  );

  // Group items by vendor
  const cartGroups = useMemo(() => {
    const groups: Record<string, CartGroup> = {};

    cartItems.forEach(item => {
      if (!groups[item.vendor.peerID]) {
        groups[item.vendor.peerID] = {
          vendorId: item.vendor.peerID,
          vendorName: item.vendor.name,
          vendorAvatar: item.vendor.avatar,
          items: [],
        };
      }
      groups[item.vendor.peerID].items.push(item);
    });

    return Object.values(groups);
  }, [cartItems]);

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let itemCount = 0;

    cartItems.forEach(item => {
      if (selectedItems.has(item.id)) {
        subtotal += item.price * item.quantity;
        itemCount += item.quantity;
      }
    });

    return {
      subtotal,
      itemCount,
      shipping: 0, // Free shipping
      total: subtotal,
    };
  }, [cartItems, selectedItems]);

  // Handlers
  const handleQuantityChange = useCallback((itemId: string, newQuantity: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity: Math.max(1, Math.min(newQuantity, item.stock)) }
          : item
      )
    );
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const handleToggleSelect = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map(item => item.id)));
    }
  }, [cartItems, selectedItems]);

  const handleCheckout = useCallback(() => {
    if (selectedItems.size === 0) {
      return;
    }
    router.push('/checkout');
  }, [selectedItems, router]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-8 sm:py-16">
          <Container size="md">
            <Card className="text-center">
              <CardContent className="py-8 sm:py-12 px-4">
                <svg
                  className="w-16 h-16 sm:w-24 sm:h-24 mx-auto text-slate-300 mb-4 sm:mb-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                  {t('cart.empty')}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  {t('cart.emptyMessage')}
                </p>
                <Link href="/">
                  <Button size="default" className="touch-feedback">
                    {t('cart.startShopping')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="xl">
          {/* Page Header */}
          <HStack justify="between" align="center" className="mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('cart.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('cart.itemsInCart', { count: cartItems.length })}
              </p>
            </div>
            <button
              onClick={handleSelectAll}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm touch-feedback"
            >
              {selectedItems.size === cartItems.length
                ? t('cart.deselectAll')
                : t('cart.selectAll')}
            </button>
          </HStack>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {cartGroups.map(group => (
                <Card key={group.vendorId} className="overflow-hidden">
                  {/* Vendor Header */}
                  <div className="px-3 py-2.5 sm:px-6 sm:py-4 bg-muted/50 border-b border-border">
                    <Link href={`/store/${group.vendorId}`} className="touch-feedback inline-flex">
                      <HStack gap="sm" align="center">
                        <Avatar
                          name={group.vendorName}
                          src={group.vendorAvatar}
                          size="sm"
                          className="w-8 h-8 sm:w-10 sm:h-10"
                        />
                        <span className="font-medium text-foreground text-sm sm:text-base">
                          {group.vendorName}
                        </span>
                        <svg
                          className="w-3.5 h-3.5 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </HStack>
                    </Link>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-border">
                    {group.items.map(item => (
                      <div key={item.id} className="p-3 sm:p-6">
                        <div className="flex gap-2 sm:gap-4">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleSelect(item.id)}
                            className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors touch-feedback ${
                              selectedItems.has(item.id)
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-border'
                            }`}
                          >
                            {selectedItems.has(item.id) && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>

                          {/* Image */}
                          <Link href={`/product/${item.slug}`} className="flex-shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </Link>

                          {/* Details & Price */}
                          <div className="flex-1 min-w-0">
                            {/* Mobile: Title + Price in row, Desktop: separate */}
                            <div className="flex items-start justify-between gap-2">
                              <Link href={`/product/${item.slug}`} className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground text-sm sm:text-base line-clamp-2 hover:text-emerald-600">
                                  {item.title}
                                </h3>
                              </Link>
                              {/* Desktop only: Item Total */}
                              <p className="hidden sm:block text-base font-bold text-foreground flex-shrink-0">
                                ${(item.price * item.quantity).toFixed(2)}
                              </p>
                            </div>

                            {item.options && item.options.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1 sm:gap-2">
                                {item.options.map((opt, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-1.5 py-0.5 sm:px-2 sm:py-1 rounded"
                                  >
                                    {opt.name}: {opt.value}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Price - Mobile: show unit price */}
                            <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1.5 sm:mt-2">
                              ${item.price.toFixed(2)}
                            </p>

                            {/* Quantity & Actions */}
                            <div className="flex items-center gap-3 sm:gap-4 mt-2 sm:mt-3">
                              <div className="flex items-center border border-border rounded-md sm:rounded-lg">
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-surface-hover disabled:opacity-50 text-sm touch-feedback"
                                >
                                  -
                                </button>
                                <span className="w-8 sm:w-10 text-center font-medium text-sm text-foreground">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  disabled={item.quantity >= item.stock}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-surface-hover disabled:opacity-50 text-sm touch-feedback"
                                >
                                  +
                                </button>
                              </div>

                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-500 hover:text-red-600 text-xs sm:text-sm touch-feedback"
                              >
                                {t('cart.remove')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="space-y-4 sm:space-y-6">
              <Card className="sticky top-4">
                <CardContent className="p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                    {t('cart.orderSummary')}
                  </h2>

                  <VStack gap="sm">
                    <HStack justify="between">
                      <span className="text-sm text-muted-foreground">
                        {t('cart.subtotal')} ({t('cart.itemCount', { count: totals.itemCount })})
                      </span>
                      <span className="font-medium text-foreground text-sm">
                        ${totals.subtotal.toFixed(2)}
                      </span>
                    </HStack>

                    <HStack justify="between">
                      <span className="text-sm text-muted-foreground">{t('cart.shipping')}</span>
                      <span className="font-medium text-emerald-600 text-sm">
                        {totals.shipping === 0 ? t('cart.free') : `$${totals.shipping.toFixed(2)}`}
                      </span>
                    </HStack>

                    <div className="border-t border-border pt-3 sm:pt-4">
                      <HStack justify="between">
                        <span className="text-base sm:text-lg font-semibold text-foreground">
                          {t('cart.total')}
                        </span>
                        <span className="text-lg sm:text-xl font-bold text-emerald-600">
                          ${totals.total.toFixed(2)}
                        </span>
                      </HStack>
                    </div>

                    <Button
                      className="w-full touch-feedback"
                      size="default"
                      onClick={handleCheckout}
                      disabled={selectedItems.size === 0}
                    >
                      {t('cart.proceedToCheckout')} ({selectedItems.size})
                    </Button>

                    <Link href="/" className="block">
                      <Button variant="ghost" className="w-full text-sm" size="sm">
                        {t('cart.continueShopping')}
                      </Button>
                    </Link>
                  </VStack>

                  {/* Payment Methods */}
                  <div className="mt-4 pt-4 sm:mt-6 sm:pt-6 border-t border-border">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                      {t('cart.acceptedPayments')}
                    </p>
                    <HStack gap="xs">
                      {['BTC', 'ETH', 'USDT'].map(coin => (
                        <span
                          key={coin}
                          className="px-2 py-0.5 sm:px-3 sm:py-1 bg-muted text-foreground rounded text-xs sm:text-sm font-medium"
                        >
                          {coin}
                        </span>
                      ))}
                    </HStack>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
