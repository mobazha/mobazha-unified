'use client';

import React, { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n, useCurrency, useCartStore, getImageUrl } from '@mobazha/core';
import type { CartItem } from '@mobazha/core';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { ProductImageNative } from '@/components/ui/product-image';

interface VendorGroup {
  vendorPeerID: string;
  vendorHandle?: string;
  items: CartItem[];
}

export default function CartPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();

  const items = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const clearCart = useCartStore(state => state.clearCart);

  const groups = useMemo<VendorGroup[]>(() => {
    const map: Record<string, VendorGroup> = {};
    items.forEach(item => {
      const key = item.listing.vendorPeerID;
      if (!map[key]) {
        map[key] = {
          vendorPeerID: key,
          vendorHandle: item.listing.vendorHandle,
          items: [],
        };
      }
      map[key].items.push(item);
    });
    return Object.values(map);
  }, [items]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.listing.price.amount * item.quantity, 0),
    [items]
  );

  const handleCheckout = useCallback(
    (group: VendorGroup) => {
      if (group.items.length === 1) {
        const item = group.items[0];
        const params = new URLSearchParams({
          slug: item.listing.slug,
          peerID: item.listing.vendorPeerID,
          quantity: item.quantity.toString(),
        });
        router.push(`/checkout?${params.toString()}`);
      } else {
        const vendorPeerID = group.vendorPeerID;
        const slugs = group.items.map(i => i.listing.slug).join(',');
        router.push(
          `/checkout?vendorPeerID=${encodeURIComponent(vendorPeerID)}&slugs=${encodeURIComponent(slugs)}`
        );
      }
    },
    [router]
  );

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('cart.title')} />
        <main className="py-4 sm:py-16">
          <Container size="md">
            <Card className="text-center">
              <CardContent className="py-8 sm:py-12 px-4">
                <ShoppingBag className="w-16 h-16 sm:w-24 sm:h-24 mx-auto text-muted-foreground/50 mb-4 sm:mb-6" />
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                  {t('cart.empty')}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
                  {t('cart.emptyMessage')}
                </p>
                <Link href="/">
                  <Button size="default" className="touch-feedback">
                    {t('cart.continueShopping')}
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
      <MobilePageHeader
        title={t('cart.title')}
        rightAction={
          <button
            onClick={clearCart}
            className="text-muted-foreground hover:text-error font-medium text-xs touch-feedback"
          >
            {t('common.clearAll')}
          </button>
        }
      />

      <main className="py-3 sm:py-8">
        <Container size="lg">
          <HStack justify="between" align="center" className="hidden lg:flex mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('cart.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {t('cart.itemsInCart', { count: items.length })}
              </p>
            </div>
            <button
              onClick={clearCart}
              className="text-muted-foreground hover:text-error font-medium text-sm touch-feedback"
            >
              {t('common.clearAll')}
            </button>
          </HStack>

          <p className="lg:hidden text-xs text-muted-foreground mb-3">
            {t('cart.itemsInCart', { count: items.length })}
          </p>

          <div className="space-y-3 sm:space-y-4">
            {groups.map(group => {
              const groupTotal = group.items.reduce(
                (sum, item) => sum + item.listing.price.amount * item.quantity,
                0
              );

              return (
                <Card key={group.vendorPeerID} className="overflow-hidden">
                  {/* Vendor header */}
                  <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/50 border-b border-border">
                    <Link
                      href={`/store/${group.vendorPeerID}`}
                      className="touch-feedback inline-flex items-center"
                    >
                      <span className="font-medium text-foreground text-sm sm:text-base">
                        {group.vendorHandle ? `@${group.vendorHandle}` : t('cart.vendorStore')}
                      </span>
                      <svg
                        className="w-3.5 h-3.5 text-muted-foreground ml-1"
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
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-border">
                    {group.items.map(item => {
                      const thumbUrl = getImageUrl(
                        item.listing.thumbnail?.medium || item.listing.thumbnail?.small
                      );
                      return (
                        <div
                          key={`${item.listing.vendorPeerID}-${item.listing.slug}`}
                          className="p-3 sm:p-4"
                        >
                          <div className="flex gap-2.5 sm:gap-3">
                            {/* Thumbnail */}
                            <Link
                              href={`/product/${item.listing.slug}`}
                              className="flex-shrink-0 touch-feedback"
                            >
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden">
                                <ProductImageNative
                                  src={thumbUrl}
                                  alt={item.listing.title}
                                  iconSize="sm"
                                />
                              </div>
                            </Link>

                            {/* Details */}
                            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                              <Link href={`/product/${item.listing.slug}`} className="min-w-0">
                                <h3 className="font-medium text-foreground text-sm line-clamp-2 hover:text-primary">
                                  {item.listing.title}
                                </h3>
                              </Link>

                              {item.options && item.options.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.options.map((opt, i) => (
                                    <span
                                      key={i}
                                      className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                                    >
                                      {opt.name}: {opt.value}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Price & Quantity */}
                              <div className="flex items-center justify-between mt-auto pt-1">
                                <span className="text-sm font-bold text-primary">
                                  {renderPairedPrice(
                                    item.listing.price.amount,
                                    item.listing.price.currency.code
                                  )}
                                </span>

                                <HStack gap="xs" align="center">
                                  <div className="flex items-center border border-border rounded bg-muted/30">
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.listing.slug,
                                          item.listing.vendorPeerID,
                                          item.quantity - 1
                                        )
                                      }
                                      disabled={item.quantity <= 1}
                                      className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-muted disabled:opacity-40 touch-feedback rounded-l"
                                      aria-label={t('cart.decreaseQuantity')}
                                    >
                                      <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-center font-medium text-xs sm:text-sm text-foreground">
                                      {item.quantity}
                                    </span>
                                    <button
                                      onClick={() =>
                                        updateQuantity(
                                          item.listing.slug,
                                          item.listing.vendorPeerID,
                                          item.quantity + 1
                                        )
                                      }
                                      className="w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-muted touch-feedback rounded-r"
                                      aria-label={t('cart.increaseQuantity')}
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <button
                                    onClick={() =>
                                      removeItem(item.listing.slug, item.listing.vendorPeerID)
                                    }
                                    className="text-muted-foreground hover:text-destructive touch-feedback p-2.5"
                                    aria-label={t('cart.remove')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </HStack>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vendor checkout footer */}
                  <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/30 border-t border-border">
                    <HStack justify="between" align="center">
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t('cart.subtotal')}:</span>
                        <span className="font-bold text-foreground ml-1.5">
                          {renderPairedPrice(
                            groupTotal,
                            group.items[0]?.listing.price.currency.code ?? 'USD'
                          )}
                        </span>
                      </div>
                      <Button
                        size="default"
                        className="touch-feedback h-10 px-5 text-sm"
                        onClick={() => handleCheckout(group)}
                      >
                        {t('cart.checkout')}
                      </Button>
                    </HStack>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Summary for multi-vendor */}
          {groups.length > 1 && (
            <Card className="mt-4 sm:mt-6 p-4">
              <HStack justify="between" align="center">
                <VStack gap="none">
                  <span className="text-sm text-muted-foreground">{t('cart.total')}</span>
                  <span className="text-xl font-bold">
                    {renderPairedPrice(totalAmount, items[0]?.listing.price.currency.code ?? 'USD')}
                  </span>
                </VStack>
              </HStack>
            </Card>
          )}

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
