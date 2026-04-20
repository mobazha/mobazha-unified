'use client';

import Link from 'next/link';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, HStack, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductImageNative } from '@/components/ui/product-image';
import { useCart } from '@/hooks/useCart';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { ClearCartAlert } from './ClearCartAlert';

export function CartDesktop() {
  const {
    items,
    groups,
    totalAmount,
    defaultCurrency,
    updateQuantity,
    removeItem,
    clearCart,
    handleCheckout,
    getThumbUrl,
    checkoutLabel,
    t,
    renderPairedPrice,
  } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('cart.title')} rootTab />
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
        rootTab
        rightAction={
          <ClearCartAlert onConfirm={clearCart}>
            {openDialog => (
              <button
                onClick={openDialog}
                className="text-muted-foreground hover:text-error font-medium text-xs touch-feedback"
              >
                {t('common.clearAll')}
              </button>
            )}
          </ClearCartAlert>
        }
      />

      <main className="py-3 sm:py-8">
        <Container size="lg">
          <HStack justify="between" align="center" className="hidden lg:flex mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('cart.title')}</h1>
              <p className="text-sm text-muted-foreground">
                {items.length === 1
                  ? t('cart.itemsInCartOne')
                  : t('cart.itemsInCart', { count: items.length })}
              </p>
            </div>
            <ClearCartAlert onConfirm={clearCart}>
              {openDialog => (
                <button
                  onClick={openDialog}
                  className="text-muted-foreground hover:text-error font-medium text-sm touch-feedback"
                >
                  {t('common.clearAll')}
                </button>
              )}
            </ClearCartAlert>
          </HStack>

          <p className="lg:hidden text-xs text-muted-foreground mb-3">
            {items.length === 1
              ? t('cart.itemsInCartOne')
              : t('cart.itemsInCart', { count: items.length })}
          </p>

          <div className="space-y-3 sm:space-y-4">
            {groups.map(group => (
              <Card key={group.vendorPeerID} className="overflow-hidden">
                {/* Vendor header */}
                <div className="px-3 py-2.5 sm:px-4 sm:py-3 bg-muted/50 border-b border-border">
                  <Link
                    href={`/store/${group.vendorPeerID}`}
                    className="touch-feedback inline-flex items-center"
                  >
                    <span className="font-medium text-foreground text-sm sm:text-base">
                      {group.vendorName || t('cart.vendorStore')}
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
                    const thumbUrl = getThumbUrl(item);
                    const itemKey = item.options?.length
                      ? `${item.listing.vendorPeerID}-${item.listing.slug}-${item.options
                          .map(o => `${o.name}:${o.value}`)
                          .sort()
                          .join('|')}`
                      : `${item.listing.vendorPeerID}-${item.listing.slug}`;
                    return (
                      <div key={itemKey} className="p-3 sm:p-4">
                        <div className="flex gap-2.5 sm:gap-3">
                          <Link
                            href={`/product/${item.listing.slug}?peerID=${item.listing.vendorPeerID}`}
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

                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <Link
                              href={`/product/${item.listing.slug}?peerID=${item.listing.vendorPeerID}`}
                              className="min-w-0"
                            >
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
                                        item.quantity - 1,
                                        item.options
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
                                        item.quantity + 1,
                                        item.options
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
                                    removeItem(
                                      item.listing.slug,
                                      item.listing.vendorPeerID,
                                      item.options
                                    )
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
                        {renderPairedPrice(group.subtotal, group.currency)}
                      </span>
                    </div>
                    <Button
                      size="default"
                      className="touch-feedback h-10 px-5 text-sm"
                      onClick={() => handleCheckout(group)}
                    >
                      {checkoutLabel}
                    </Button>
                  </HStack>
                </div>
              </Card>
            ))}
          </div>

          {groups.length > 1 && (
            <Card className="mt-4 sm:mt-6 p-4">
              <HStack justify="between" align="center">
                <VStack gap="none">
                  <span className="text-sm text-muted-foreground">{t('cart.total')}</span>
                  <span className="text-xl font-bold">
                    {renderPairedPrice(totalAmount, defaultCurrency)}
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
