'use client';

import React from 'react';
import Link from 'next/link';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n, useWishlist, useCurrency, usePriceUpdates, getImageUrl } from '@mobazha/core';
import type { WishlistItem, PriceUpdate } from '@mobazha/core';
import { Heart, Trash2, ShoppingBag, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WishlistPage() {
  const { t } = useI18n();
  const { items, isLoading, removeItem } = useWishlist();
  const { getUpdate, isChecking } = usePriceUpdates(items);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('me.wishlist')} />

      <main className="py-4 sm:py-8">
        <Container size="lg">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h1 className="text-2xl font-bold hidden lg:block">{t('me.wishlist')}</h1>
            {!isLoading && items.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">
                  {items.length} {t('me.wishlistItemCount')}
                </span>
                {isChecking && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    · {t('product.priceCheckingPrices')}
                  </span>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : items.length === 0 ? (
            <VStack gap="md" align="center" className="py-20">
              <Heart className="w-16 h-16 text-muted-foreground/30" />
              <p className="text-lg font-medium text-muted-foreground">{t('me.wishlistEmpty')}</p>
              <p className="text-sm text-muted-foreground/70">{t('me.wishlistEmptyDesc')}</p>
              <Link href="/search">
                <Button variant="outline" className="mt-4">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {t('nav.explore')}
                </Button>
              </Link>
            </VStack>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {items.map(item => (
                <WishlistRow
                  key={`${item.peerID}-${item.slug}`}
                  item={item}
                  priceUpdate={getUpdate(item.peerID, item.slug)}
                  onRemove={() => removeItem(item.peerID, item.slug)}
                />
              ))}
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

function PriceBadge({
  update,
  t,
}: {
  update: PriceUpdate;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (update.direction === 'same' || update.direction === 'unavailable') return null;

  const isDown = update.direction === 'down';
  const pct = Math.abs(update.percentChange);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium',
        isDown ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
      )}
    >
      {isDown ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
      {isDown
        ? t('product.priceDropped', { percent: pct })
        : t('product.priceRose', { percent: pct })}
    </span>
  );
}

function WishlistRow({
  item,
  priceUpdate,
  onRemove,
}: {
  item: WishlistItem;
  priceUpdate?: PriceUpdate;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();

  const imageUrl = item.thumbnail ? getImageUrl(item.thumbnail) : null;
  const displayTitle = item.title || item.slug;
  const savedPrice =
    item.price && item.currency ? formatPrice(Number(item.price), item.currency) : null;

  const currentPrice =
    priceUpdate && priceUpdate.direction !== 'unavailable' && priceUpdate.currentPrice > 0
      ? formatPrice(priceUpdate.currentPrice, priceUpdate.currentCurrency || item.currency)
      : null;

  const showCurrentPrice =
    priceUpdate && (priceUpdate.direction === 'up' || priceUpdate.direction === 'down');
  const timeAgo = formatRelativeTime(item.createdAt, t);

  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-lg border border-border hover:border-primary/20 transition-colors">
      <Link
        href={`/product/${item.slug}?peerID=${item.peerID}`}
        className="flex items-center gap-4 flex-1 min-w-0"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-muted-foreground/40" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{displayTitle}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {showCurrentPrice && currentPrice ? (
              <>
                <span className="text-sm font-semibold text-primary">{currentPrice}</span>
                {savedPrice && (
                  <span className="text-xs text-muted-foreground line-through">{savedPrice}</span>
                )}
              </>
            ) : (
              savedPrice && <span className="text-sm font-semibold text-primary">{savedPrice}</span>
            )}
            {priceUpdate && <PriceBadge update={priceUpdate} t={t} />}
          </div>
          {timeAgo && <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>}
        </div>
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.preventDefault();
          onRemove();
        }}
        className="text-muted-foreground hover:text-destructive flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">{t('me.wishlistRemove')}</span>
      </Button>
    </div>
  );
}

function formatRelativeTime(
  dateStr: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return t('product.timeJustNow');
  if (diffMin < 60) return t('product.timeMinutesAgo', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('product.timeHoursAgo', { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return t('product.timeDaysAgo', { count: diffDay });
  return date.toLocaleDateString();
}
