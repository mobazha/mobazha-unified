'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HStack, VStack } from '@/components/layouts';
import {
  useCartStore,
  useUserStore,
  useI18n,
  useCurrency,
  getImageUrl,
  buildProductHref,
} from '@mobazha/core';
import { usePlatform } from '@mobazha/ui/hooks';
import { ShoppingBag } from 'lucide-react';
import { CartItemRow } from '@/components/Cart/CartItemRow';
import { ClearCartAlert } from '@/components/Cart/ClearCartAlert';
import { useMiniAppRegister } from '@/hooks/useMiniAppRegister';
import { buildCheckoutUrl } from '@/hooks/useCart';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { t } = useI18n();
  const { renderPairedPrice } = useCurrency();
  const router = useRouter();

  const isAuthenticated = useUserStore(state => state.isAuthenticated);
  const { isTGMiniApp, isEmbeddedApp } = usePlatform();
  const { promptRegister } = useMiniAppRegister();
  const items = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const clearCart = useCartStore(state => state.clearCart);

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.listing.price.amount) * item.quantity,
    0
  );
  const currency = items[0]?.listing.price.currency.code ?? 'USD';

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return;

    const vendors = new Set(items.map(i => i.listing.vendorPeerID));
    if (vendors.size > 1) {
      onOpenChange(false);
      router.push('/cart');
      return;
    }

    const checkoutUrl = buildCheckoutUrl(items, items[0].listing.vendorPeerID);

    if (!isAuthenticated) {
      if (isTGMiniApp || isEmbeddedApp) {
        const action = await promptRegister();
        if (action !== 'register') return;
        onOpenChange(false);
        router.push(checkoutUrl);
        return;
      }
      onOpenChange(false);
      router.push(`/login?redirect=${encodeURIComponent(checkoutUrl)}`);
      return;
    }

    onOpenChange(false);
    router.push(checkoutUrl);
  }, [items, isAuthenticated, isTGMiniApp, isEmbeddedApp, promptRegister, router, onOpenChange]);

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
                const itemKey = item.options?.length
                  ? `${item.listing.vendorPeerID}-${item.listing.slug}-${item.options
                      .map(o => `${o.name}:${o.value}`)
                      .sort()
                      .join('|')}`
                  : `${item.listing.vendorPeerID}-${item.listing.slug}`;

                return (
                  <CartItemRow
                    key={itemKey}
                    thumbnailUrl={thumbUrl}
                    title={item.listing.title}
                    href={buildProductHref(item.listing.slug, item.listing.vendorPeerID)}
                    options={item.options}
                    vendorName={item.listing.vendorName}
                    unitPrice={Number(item.listing.price.amount)}
                    currency={currency}
                    quantity={item.quantity}
                    onUpdateQuantity={qty =>
                      updateQuantity(
                        item.listing.slug,
                        item.listing.vendorPeerID,
                        qty,
                        item.options
                      )
                    }
                    onRemove={() =>
                      removeItem(item.listing.slug, item.listing.vendorPeerID, item.options)
                    }
                    onNavigate={() => onOpenChange(false)}
                  />
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
                <span className="text-lg font-bold">{renderPairedPrice(subtotal, currency)}</span>
              </HStack>
              <Button className="w-full" size="lg" onClick={handleCheckout}>
                {isAuthenticated
                  ? t('cart.checkout')
                  : isTGMiniApp || isEmbeddedApp
                    ? t('cart.registerToCheckout')
                    : t('cart.loginToCheckout')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/cart');
                }}
              >
                {t('cart.viewCart')}
              </Button>
            </VStack>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
