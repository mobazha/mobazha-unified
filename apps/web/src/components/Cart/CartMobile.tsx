'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MobilePageHeader } from '@/components';
import { Button } from '@/components/ui/button';
import { ProductImageNative } from '@/components/ui/product-image';
import { useCart } from '@/hooks/useCart';
import { useTGMainButton } from '@/hooks/useTGMainButton';
import { useTGBackButton } from '@/hooks/useTGBackButton';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';
import type { VendorGroup } from '@/hooks/useCart';
import type { CartItem } from '@mobazha/core';
import { useI18n, type TranslateFunction } from '@mobazha/core';
import { PageTransition } from '@/components/ui/page-transition';
import { Minus, Plus, Trash2, ShoppingBag, ChevronRight } from 'lucide-react';
import { ClearCartAlert } from './ClearCartAlert';

function SwipeableCartItem({
  item,
  thumbUrl,
  onRemove,
  onUpdateQuantity,
  renderPrice,
}: {
  item: CartItem;
  thumbUrl: string | undefined;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
  renderPrice: (amount: number, currency: string) => string;
}) {
  const { t } = useI18n();
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    startX.current = e.touches[0].clientX;
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) {
      setOffsetX(Math.max(dx, -80));
    } else {
      setOffsetX(0);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    if (offsetX < -50) {
      setOffsetX(-80);
    } else {
      setOffsetX(0);
    }
  }, [offsetX]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete action behind */}
      <div className="absolute inset-y-0 right-0 w-20 bg-destructive flex items-center justify-center">
        <button onClick={onRemove} className="w-full h-full flex items-center justify-center">
          <Trash2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Foreground item */}
      <div
        className="relative bg-background p-3 transition-transform"
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex gap-3">
          <Link href={`/product/${item.listing.slug}`} className="flex-shrink-0">
            <div className="w-20 h-20 rounded-lg overflow-hidden">
              <ProductImageNative src={thumbUrl} alt={item.listing.title} iconSize="sm" />
            </div>
          </Link>

          <div className="flex-1 min-w-0 flex flex-col">
            <Link href={`/product/${item.listing.slug}`}>
              <h3 className="font-medium text-foreground text-sm line-clamp-2">
                {item.listing.title}
              </h3>
            </Link>

            {item.options && item.options.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
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

            <div className="flex items-center justify-between mt-auto pt-1.5">
              <span className="text-sm font-bold text-primary">
                {renderPrice(item.listing.price.amount, item.listing.price.currency.code)}
              </span>

              <div className="flex items-center border border-border rounded-lg bg-muted/30">
                <button
                  onClick={() => onUpdateQuantity(item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-11 h-11 flex items-center justify-center disabled:opacity-40 touch-feedback"
                  aria-label={t('cart.decreaseQuantity')}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-medium text-sm tabular-nums">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.quantity + 1)}
                  className="w-11 h-11 flex items-center justify-center touch-feedback"
                  aria-label={t('cart.increaseQuantity')}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VendorSection({
  group,
  onCheckout,
  onRemove,
  onUpdateQuantity,
  getThumbUrl,
  renderPrice,
  t,
  renderPairedPrice,
}: {
  group: VendorGroup;
  onCheckout: (g: VendorGroup) => void;
  onRemove: (slug: string, vendorPeerID: string) => void;
  onUpdateQuantity: (slug: string, vendorPeerID: string, qty: number) => void;
  getThumbUrl: (item: CartItem) => string | undefined;
  renderPrice: (amount: number, currency: string) => string;
  t: TranslateFunction;
  renderPairedPrice: (amount: number, currency: string) => string;
}) {
  return (
    <div className="bg-card rounded-xl overflow-hidden border border-border">
      {/* Vendor header */}
      <Link
        href={`/store/${group.vendorPeerID}`}
        className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border touch-feedback"
      >
        <span className="font-medium text-foreground text-sm">
          {group.vendorHandle ? `@${group.vendorHandle}` : t('cart.vendorStore')}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </Link>

      {/* Items */}
      <div className="divide-y divide-border">
        {group.items.map(item => (
          <SwipeableCartItem
            key={`${item.listing.vendorPeerID}-${item.listing.slug}`}
            item={item}
            thumbUrl={getThumbUrl(item)}
            onRemove={() => onRemove(item.listing.slug, item.listing.vendorPeerID)}
            onUpdateQuantity={qty =>
              onUpdateQuantity(item.listing.slug, item.listing.vendorPeerID, qty)
            }
            renderPrice={renderPrice}
          />
        ))}
      </div>

      {/* Vendor checkout */}
      <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">{t('cart.subtotal')}:</span>
          <span className="font-bold text-foreground ml-1.5">
            {renderPairedPrice(group.subtotal, group.currency)}
          </span>
        </div>
        <Button
          size="sm"
          className="touch-feedback h-9 px-4 text-sm"
          onClick={() => onCheckout(group)}
        >
          {t('cart.checkout')}
        </Button>
      </div>
    </div>
  );
}

export function CartMobile() {
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
    t,
    renderPairedPrice,
  } = useCart();

  const { isAvailable: isTG } = useTGMiniApp();

  const handleTGCheckout = useCallback(() => {
    if (groups.length === 1) handleCheckout(groups[0]);
  }, [groups, handleCheckout]);

  useTGMainButton({
    text: `${t('cart.checkout')} (${renderPairedPrice(totalAmount, defaultCurrency)})`,
    onClick: handleTGCheckout,
    visible: isTG && items.length > 0 && groups.length === 1,
  });

  useTGBackButton({ visible: isTG });

  if (items.length === 0) {
    return (
      <PageTransition className="min-h-screen bg-background">
        <MobilePageHeader title={t('cart.title')} />
        <div className="flex flex-col items-center justify-center px-6 pt-24">
          <ShoppingBag className="w-16 h-16 text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-bold text-foreground mb-2">{t('cart.empty')}</h2>
          <p className="text-sm text-muted-foreground mb-6 text-center">{t('cart.emptyMessage')}</p>
          <Link href="/">
            <Button className="touch-feedback">{t('cart.continueShopping')}</Button>
          </Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="min-h-screen bg-background pb-24">
      <MobilePageHeader
        title={t('cart.title')}
        rightAction={
          <ClearCartAlert onConfirm={clearCart}>
            {openDialog => (
              <button
                onClick={openDialog}
                className="text-muted-foreground hover:text-destructive font-medium text-xs touch-feedback"
              >
                {t('common.clearAll')}
              </button>
            )}
          </ClearCartAlert>
        }
      />

      <div className="px-4 pt-2 pb-4">
        <p className="text-xs text-muted-foreground mb-3">
          {items.length === 1
            ? t('cart.itemsInCartOne')
            : t('cart.itemsInCart', { count: items.length })}
        </p>

        <div className="space-y-3">
          {groups.map(group => (
            <VendorSection
              key={group.vendorPeerID}
              group={group}
              onCheckout={handleCheckout}
              onRemove={removeItem}
              onUpdateQuantity={updateQuantity}
              getThumbUrl={getThumbUrl}
              renderPrice={renderPairedPrice}
              t={t}
              renderPairedPrice={renderPairedPrice}
            />
          ))}
        </div>

        <div className="mt-4 text-center">
          <Link href="/">
            <Button variant="ghost" className="text-sm touch-feedback">
              {t('cart.continueShopping')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Fixed bottom bar — hidden in TG (MainButton replaces it) */}
      {!isTG && (
        <div className="fixed bottom-0 inset-x-0 bg-background border-t border-border px-4 py-3 pb-safe z-40">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">{t('cart.total')}</span>
              <div className="text-lg font-bold text-foreground">
                {renderPairedPrice(totalAmount, defaultCurrency)}
              </div>
            </div>
            {groups.length === 1 && (
              <Button
                size="lg"
                className="touch-feedback h-12 px-8 text-base"
                onClick={() => handleCheckout(groups[0])}
              >
                {t('cart.checkout')}
              </Button>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
}
