'use client';

import React, { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HStack, VStack } from '@/components/layouts';
import { useCartStore, useUserStore, useI18n, useCurrency, getImageUrl } from '@mobazha/core';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { ProductImageNative } from '@/components/ui/product-image';
import { ClearCartAlert } from '@/components/Cart/ClearCartAlert';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  const router = useRouter();

  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const items = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const clearCart = useCartStore(state => state.clearCart);

  const subtotal = items.reduce((sum, item) => sum + item.listing.price.amount * item.quantity, 0);
  const currency = items[0]?.listing.price.currency.code ?? 'USD';

  const handleCheckout = useCallback(() => {
    onOpenChange(false);
    if (items.length === 0) return;

    const vendors = new Set(items.map(i => i.listing.vendorPeerID));
    if (vendors.size > 1) {
      router.push('/cart');
      return;
    }

    let checkoutUrl: string;
    if (items.length === 1) {
      const item = items[0];
      const params = new URLSearchParams({
        slug: item.listing.slug,
        peerID: item.listing.vendorPeerID,
        quantity: item.quantity.toString(),
      });
      checkoutUrl = `/checkout?${params.toString()}`;
    } else {
      const vendorPeerID = items[0].listing.vendorPeerID;
      const slugs = items.map(i => i.listing.slug).join(',');
      checkoutUrl = `/checkout?vendorPeerID=${encodeURIComponent(vendorPeerID)}&slugs=${encodeURIComponent(slugs)}`;
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
      return;
    }

    router.push(checkoutUrl);
  }, [items, isAuthenticated, router, onOpenChange]);

  const handleContinueShopping = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="flex items-center justify-between pr-6">
            <span>{t('nav.cart')}</span>
            {items.length > 0 && (
              <ClearCartAlert onConfirm={clearCart}>
                {openDialog => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={openDialog}
                  >
                    {t('common.clearAll')}
                  </Button>
                )}
              </ClearCartAlert>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <VStack gap="md" align="center" className="py-16 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 opacity-40" />
              <p className="text-sm">{t('cart.empty')}</p>
              <Button variant="outline" size="sm" onClick={handleContinueShopping}>
                {t('cart.continueShopping')}
              </Button>
            </VStack>
          ) : (
            <VStack gap="sm">
              {items.map(item => {
                const thumbUrl = getImageUrl(
                  item.listing.thumbnail?.medium || item.listing.thumbnail?.small
                );
                const lineTotal = item.listing.price.amount * item.quantity;

                return (
                  <div
                    key={`${item.listing.vendorPeerID}-${item.listing.slug}`}
                    className="flex gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    {/* Thumbnail */}
                    <Link
                      href={`/product/${item.listing.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="flex-shrink-0"
                    >
                      <div className="w-16 h-16 rounded-md overflow-hidden">
                        <ProductImageNative src={thumbUrl} alt={item.listing.title} iconSize="sm" />
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.listing.slug}`}
                          onClick={() => onOpenChange(false)}
                          className="min-w-0 flex-1"
                        >
                          <p className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">
                            {item.listing.title}
                          </p>
                        </Link>
                        <button
                          className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => removeItem(item.listing.slug, item.listing.vendorPeerID)}
                          data-testid="cart-item-remove"
                          aria-label={t('cart.remove')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {item.listing.vendorHandle && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          @{item.listing.vendorHandle}
                        </p>
                      )}

                      {/* Price + Quantity row */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-border rounded-md overflow-hidden">
                          <button
                            data-testid="cart-item-qty-decrease"
                            className="w-9 h-9 flex items-center justify-center hover:bg-muted active:bg-muted/80 transition-colors disabled:opacity-40"
                            disabled={item.quantity <= 1}
                            onClick={() =>
                              updateQuantity(
                                item.listing.slug,
                                item.listing.vendorPeerID,
                                item.quantity - 1
                              )
                            }
                            aria-label={t('cart.decreaseQuantity')}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span
                            className="w-8 text-center text-sm font-medium tabular-nums border-x border-border"
                            data-testid="cart-item-qty"
                          >
                            {item.quantity}
                          </span>
                          <button
                            className="w-9 h-9 flex items-center justify-center hover:bg-muted active:bg-muted/80 transition-colors"
                            onClick={() =>
                              updateQuantity(
                                item.listing.slug,
                                item.listing.vendorPeerID,
                                item.quantity + 1
                              )
                            }
                            aria-label={t('cart.increaseQuantity')}
                            data-testid="cart-item-qty-increase"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm font-semibold">
                          {renderPairedPrice(lineTotal, currency, { isMinimalUnit: false })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Continue shopping link */}
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={handleContinueShopping}
                >
                  {t('cart.continueShopping')}
                </Button>
              </div>
            </VStack>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <SheetFooter className="px-4 py-3 border-t border-border bg-muted/30">
            <VStack gap="sm" className="w-full">
              <HStack className="justify-between">
                <span className="text-sm text-muted-foreground">{t('cart.subtotal')}</span>
                <span className="text-lg font-bold">
                  {renderPairedPrice(subtotal, currency, { isMinimalUnit: false })}
                </span>
              </HStack>
              <Button className="w-full" size="lg" onClick={handleCheckout}>
                {t('cart.checkout')}
              </Button>
            </VStack>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
