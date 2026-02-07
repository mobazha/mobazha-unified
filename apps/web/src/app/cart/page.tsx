'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { useI18n, useCurrency } from '@mobazha/core';

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
  const { formatPrice: formatCurrencyPrice } = useCurrency();
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

  // 计算商户的选中状态
  const getVendorCheckStatus = useCallback(
    (group: CartGroup): 'checked' | 'unchecked' | 'indeterminate' => {
      const allChecked = group.items.every(item => selectedItems.has(item.id));
      if (allChecked) return 'checked';

      const allUnchecked = group.items.every(item => !selectedItems.has(item.id));
      if (allUnchecked) return 'unchecked';

      return 'indeterminate';
    },
    [selectedItems]
  );

  // 计算商户的小计
  const getVendorTotal = useCallback(
    (group: CartGroup) => {
      let subtotal = 0;
      let itemCount = 0;

      group.items.forEach(item => {
        if (selectedItems.has(item.id)) {
          subtotal += item.price * item.quantity;
          itemCount += item.quantity;
        }
      });

      return { subtotal, itemCount };
    },
    [selectedItems]
  );

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

  // 商户级别的全选/取消选择
  const handleToggleVendorSelect = useCallback(
    (group: CartGroup) => {
      const currentStatus = getVendorCheckStatus(group);
      const shouldCheck = currentStatus !== 'checked';

      setSelectedItems(prev => {
        const newSet = new Set(prev);
        group.items.forEach(item => {
          if (shouldCheck) {
            newSet.add(item.id);
          } else {
            newSet.delete(item.id);
          }
        });
        return newSet;
      });
    },
    [getVendorCheckStatus]
  );

  // 清空购物车
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    setSelectedItems(new Set());
  }, []);

  // 结算单个商户
  const handleCheckoutVendor = useCallback(
    (group: CartGroup) => {
      const selectedVendorItems = group.items.filter(item => selectedItems.has(item.id));
      if (selectedVendorItems.length === 0) {
        return;
      }
      // TODO: 传递选中的商品到结算页面
      router.push(`/checkout?vendor=${group.vendorId}`);
    },
    [selectedItems, router]
  );

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        {/* 移动端顶部导航栏 */}
        <MobilePageHeader title={t('cart.title')} />
        <main className="py-4 sm:py-16">
          <Container size="md">
            <Card className="text-center">
              <CardContent className="py-8 sm:py-12 px-4">
                <svg
                  className="w-16 h-16 sm:w-24 sm:h-24 mx-auto text-muted-foreground/50 mb-4 sm:mb-6"
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
      {/* 移动端顶部导航栏 - 清空购物车 */}
      <MobilePageHeader
        title={t('cart.title')}
        rightAction={
          <button
            onClick={handleClearCart}
            className="text-muted-foreground hover:text-red-500 font-medium text-xs touch-feedback"
          >
            {t('cart.clear')}
          </button>
        }
      />

      <main className="py-3 sm:py-8">
        <Container size="lg">
          {/* Page Header - 仅桌面端显示 */}
          <HStack justify="between" align="center" className="hidden lg:flex mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('cart.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('cart.itemsInCart', { count: cartItems.length })}
              </p>
            </div>
            <button
              onClick={handleClearCart}
              className="text-muted-foreground hover:text-red-500 font-medium text-sm touch-feedback"
            >
              {t('cart.clear')}
            </button>
          </HStack>

          {/* 移动端副标题 */}
          <p className="lg:hidden text-xs text-muted-foreground mb-3">
            {t('cart.itemsInCart', { count: cartItems.length })}
          </p>

          {/* P2P 提示 */}
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-lg">
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 font-medium">
              {t('cart.p2pNotice')}
            </p>
          </div>

          {/* Cart Items - 每个商户独立 */}
          <div className="space-y-3 sm:space-y-4">
            {cartGroups.map(group => {
              const vendorStatus = getVendorCheckStatus(group);
              const vendorTotal = getVendorTotal(group);
              const hasSelectedItems = vendorTotal.itemCount > 0;

              return (
                <Card key={group.vendorId} className="overflow-hidden">
                  {/* Vendor Header - 带全选 */}
                  <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/50 border-b border-border">
                    <HStack gap="sm" align="center">
                      {/* 商户全选复选框 */}
                      <button
                        onClick={() => handleToggleVendorSelect(group)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors touch-feedback flex-shrink-0 ${
                          vendorStatus === 'checked'
                            ? 'bg-primary border-primary'
                            : vendorStatus === 'indeterminate'
                              ? 'bg-primary/50 border-primary'
                              : 'border-muted-foreground/40'
                        }`}
                      >
                        {vendorStatus === 'checked' && (
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
                        {vendorStatus === 'indeterminate' && (
                          <div className="w-2 h-0.5 bg-white rounded" />
                        )}
                      </button>

                      {/* 商户信息 */}
                      <Link
                        href={`/store/${group.vendorId}`}
                        className="touch-feedback inline-flex items-center flex-1 min-w-0"
                      >
                        <Avatar
                          name={group.vendorName}
                          src={group.vendorAvatar}
                          size="sm"
                          className="w-7 h-7 sm:w-8 sm:h-8"
                        />
                        <span className="font-medium text-foreground text-sm sm:text-base ml-2 truncate">
                          {group.vendorName}
                        </span>
                        <svg
                          className="w-3.5 h-3.5 text-muted-foreground ml-1 flex-shrink-0"
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
                      </Link>
                    </HStack>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-border">
                    {group.items.map(item => (
                      <div key={item.id} className="p-3 sm:p-4">
                        <div className="flex gap-2.5 sm:gap-3">
                          {/* Checkbox */}
                          <div className="flex-shrink-0 flex items-center justify-center w-6">
                            <button
                              onClick={() => handleToggleSelect(item.id)}
                              className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center transition-colors touch-feedback ${
                                selectedItems.has(item.id)
                                  ? 'bg-primary border-primary'
                                  : 'border-muted-foreground/40'
                              }`}
                            >
                              {selectedItems.has(item.id) && (
                                <svg
                                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white"
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
                          </div>

                          {/* Image */}
                          <Link
                            href={`/product/${item.slug}`}
                            className="flex-shrink-0 touch-feedback"
                          >
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </Link>

                          {/* Details */}
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <Link href={`/product/${item.slug}`} className="min-w-0">
                              <h3 className="font-medium text-foreground text-sm line-clamp-2 hover:text-primary">
                                {item.title}
                              </h3>
                            </Link>

                            {item.options && item.options.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.options.map((opt, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                                  >
                                    {opt.name}: {opt.value}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Price & Quantity */}
                            <div className="flex items-center justify-between mt-auto pt-1">
                              <span className="text-sm font-bold text-primary">
                                {formatCurrencyPrice(item.price, item.currency)}
                              </span>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center border border-border rounded bg-muted/30">
                                  <button
                                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                    disabled={item.quantity <= 1}
                                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-muted disabled:opacity-40 text-sm touch-feedback rounded-l"
                                  >
                                    −
                                  </button>
                                  <span className="w-7 sm:w-8 text-center font-medium text-xs sm:text-sm text-foreground">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                    disabled={item.quantity >= item.stock}
                                    className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center hover:bg-muted disabled:opacity-40 text-sm touch-feedback rounded-r"
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="text-muted-foreground hover:text-destructive touch-feedback p-1"
                                  aria-label={t('cart.remove')}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Vendor Checkout Footer - 只在有选中商品时显示 */}
                  {hasSelectedItems && (
                    <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/30 border-t border-border">
                      <HStack justify="between" align="center">
                        <div className="text-sm">
                          <span className="text-muted-foreground">{t('cart.subtotal')}:</span>
                          <span className="font-bold text-foreground ml-1.5">
                            {formatCurrencyPrice(
                              vendorTotal.subtotal,
                              group.items[0]?.currency || 'USD'
                            )}
                          </span>
                          <span className="text-muted-foreground text-xs ml-1">
                            ({vendorTotal.itemCount} {t('cart.items')})
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="touch-feedback h-8 px-4 text-xs sm:text-sm"
                          onClick={() => handleCheckoutVendor(group)}
                        >
                          {t('cart.checkout')}
                        </Button>
                      </HStack>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Continue Shopping */}
          <div className="mt-4 sm:mt-6 text-center">
            <Link href="/">
              <Button variant="ghost" className="text-sm touch-feedback">
                {t('cart.continueShopping')}
              </Button>
            </Link>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
