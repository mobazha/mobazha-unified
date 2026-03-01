'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { BottomSheet, BottomSheetItem } from '@/components/ui/bottom-sheet';
import { cn } from '@/lib/utils';
import { getImageUrl, decodeHtmlEntities, sanitizeHtml, useI18n } from '@mobazha/core';
import type { Product } from '@mobazha/core';
import { Heart, ChevronLeft, ChevronRight, Share2, Copy, Flag, MoreHorizontal } from 'lucide-react';
import { useProductDetail } from '@/hooks/useProductDetail';
import { VerifiedModeratorBadge } from './VerifiedModeratorBadge';
import { BuyerProtectionBanner } from './BuyerProtectionBanner';
import { BuyerProtectionBadge } from '@/components/Trust/BuyerProtectionBadge';
import { ShippingOptionsSection } from './ShippingOptionsSection';
import { MoreFromStore } from './MoreFromStore';
import { RwaAssetDetail } from '@/components/RwaToken';
import { ReviewList } from '@/components/Review';
import { StarRating } from '@/components/ui/star-rating';

export interface ProductDetailMobileProps {
  slug: string;
  peerID?: string;
  onProductLoaded?: (product: Product | null) => void;
  isWishlist?: boolean;
  onToggleWishlist?: () => void;
}

export function ProductDetailMobile({
  slug,
  peerID,
  onProductLoaded,
  isWishlist = false,
  onToggleWishlist,
}: ProductDetailMobileProps) {
  const {
    product,
    vendor,
    applicableDiscounts,
    rwaChainData,
    isLoading,
    ratingsLoading,
    error,
    imageUrls,
    priceInfo,
    stock,
    freeShipping,
    estimatedDelivery,
    averageRating,
    ratingCount,
    safeRatings,
    isOwnProduct,
    vendorPeerID,
    acceptedCurrencies,
    tags,
    rwaTradeMode,
    rwaEscrowTimeoutSeconds,
    quantity,
    setQuantity,
    selectedImage,
    setSelectedImage,
    cartSuccess,
    isImagePreviewOpen,
    setIsImagePreviewOpen,
    linkCopied,
    handleAddToCart,
    handleBuyNow,
    handleCopyLink,
    openChatDrawer,
    ratingIndex,
    t,
    router,
  } = useProductDetail({ slug, peerID, onProductLoaded });

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="pb-28">
        <Skeleton variant="rounded" className="w-full aspect-square" />
        <div className="px-4 mt-3 space-y-3">
          <Skeleton variant="text" height={28} width="60%" />
          <Skeleton variant="text" height={20} width="40%" />
          <Skeleton variant="text" height={16} width="80%" />
          <Skeleton variant="rounded" height={100} />
        </div>
      </div>
    );
  }

  // --- Error ---
  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center px-4">
          <svg
            className="w-16 h-16 text-muted-foreground mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-muted-foreground mb-4">{error || t('product.notFound')}</p>
          <Link href="/marketplace">
            <Button>{t('common.backToMarket')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="product-detail-mobile">
      {/* --- Image Swiper --- */}
      <div className="relative w-full aspect-square bg-muted">
        {imageUrls.length > 0 ? (
          <>
            <img
              src={imageUrls[selectedImage] || imageUrls[0]}
              alt={product.item.title}
              className="w-full h-full object-cover"
              onClick={() => setIsImagePreviewOpen(true)}
            />
            {/* Counter badge */}
            <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {selectedImage + 1} / {imageUrls.length}
            </div>
            {/* Prev / Next arrows */}
            {imageUrls.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center touch-feedback"
                  onClick={() =>
                    setSelectedImage(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1))
                  }
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center touch-feedback"
                  onClick={() =>
                    setSelectedImage(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1))
                  }
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}
            {/* Dot indicators */}
            {imageUrls.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {imageUrls.map((_, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      'w-2 h-2 rounded-full transition-all',
                      idx === selectedImage ? 'bg-white w-4' : 'bg-white/50'
                    )}
                    onClick={() => setSelectedImage(idx)}
                    aria-label={`Image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* --- Content --- */}
      <div className="px-4 pt-3 pb-28 space-y-4">
        {/* Price + Trust */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">{priceInfo.pairedPrice}</span>
          <BuyerProtectionBadge variant="inline" />
        </div>

        {/* Title + Rating + More */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-lg font-semibold text-foreground leading-tight flex-1">
              {decodeHtmlEntities(product.item.title)}
            </h1>
            <ProductMoreButton product={product} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <StarRating value={averageRating} size="sm" />
            <span className="text-xs text-muted-foreground">
              {averageRating.toFixed(1)} ({ratingCount} {t('product.reviews')})
            </span>
          </div>
        </div>

        {/* Discount badges */}
        {applicableDiscounts.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {applicableDiscounts.map((d, idx) => (
              <div
                key={`${d.title}-${idx}`}
                className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 text-primary px-2 py-1 text-xs whitespace-nowrap flex-shrink-0"
              >
                <svg
                  className="w-3 h-3 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span>
                  {d.valueType === 'percentage' &&
                    t('product.discount.off', { value: `${d.value}%` })}
                  {d.valueType === 'fixed_amount' &&
                    t('product.discount.off', { value: `${d.currency} ${d.value}` })}
                  {d.valueType === 'free_shipping' && t('product.discount.freeShipping')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Shipping quick info */}
        {product.metadata?.contractType === 'PHYSICAL_GOOD' && (
          <div className="flex items-center gap-2 text-xs">
            {freeShipping ? (
              <span className="inline-flex items-center gap-1 text-primary font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {t('product.freeShipping')}
              </span>
            ) : (
              <span className="text-muted-foreground">{t('product.shippingAtCheckout')}</span>
            )}
            {estimatedDelivery && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-muted-foreground">
                  {t('product.estDelivery')}: {estimatedDelivery}
                </span>
              </>
            )}
          </div>
        )}

        {/* Product Attributes */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {product.metadata?.contractType && (
            <div className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-xs whitespace-nowrap flex-shrink-0">
              <span className="font-medium">{t('product.type')}:</span>
              <span>
                {product.metadata.contractType === 'PHYSICAL_GOOD' && t('product.physicalGood')}
                {product.metadata.contractType === 'DIGITAL_GOOD' && t('product.digitalGood')}
                {product.metadata.contractType === 'SERVICE' && t('product.serviceType')}
                {product.metadata.contractType === 'CRYPTOCURRENCY' && t('product.cryptocurrency')}
                {product.metadata.contractType === 'RWA_TOKEN' && t('product.rwaToken')}
              </span>
            </div>
          )}
          {product.item.condition && (
            <div className="inline-flex items-center gap-1 rounded-md bg-muted text-foreground border border-border px-2 py-1 text-xs whitespace-nowrap flex-shrink-0">
              <span className="font-medium">{t('product.condition')}:</span>
              <span>{product.item.condition.replace('_', ' ')}</span>
            </div>
          )}
          {product.item.grams !== undefined && product.item.grams > 0 && (
            <div className="inline-flex items-center gap-1 rounded-md bg-muted text-foreground border border-border px-2 py-1 text-xs whitespace-nowrap flex-shrink-0">
              <span className="font-medium">{t('product.weight')}:</span>
              <span>{t('product.weightGrams', { weight: product.item.grams })}</span>
            </div>
          )}
        </div>

        {/* RWA Detail */}
        {product.metadata?.contractType === 'RWA_TOKEN' && (
          <RwaAssetDetail
            product={product}
            compact
            showPurchaseHint
            rwaTradeMode={rwaTradeMode}
            escrowTimeoutSeconds={rwaEscrowTimeoutSeconds}
            acceptedCurrencies={acceptedCurrencies}
            chainData={rwaChainData}
          />
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{t('product.tags')}</span>
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <Link
                  key={tag}
                  href={`/marketplace?tag=${tag}`}
                  className="border border-border bg-background text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary px-2 py-0.5 text-xs touch-feedback"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        <VerifiedModeratorBadge moderatorPeerIDs={product.moderators} />
        {!isOwnProduct && <BuyerProtectionBanner />}

        {/* Stock + Quantity (only for buyer) */}
        {!isOwnProduct && (
          <div className="flex items-center justify-between py-2">
            <div>
              {stock === 0 ? (
                <span className="text-sm font-medium text-destructive">
                  {t('product.outOfStock')}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {stock} {t('product.inStock')}
                </span>
              )}
            </div>
            {stock > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center touch-feedback"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(prev => Math.min(stock, prev + 1))}
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center touch-feedback"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            )}
          </div>
        )}

        {/* Accepted currencies */}
        {acceptedCurrencies.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {t('product.acceptedCurrencies')}:{' '}
            <span className="font-medium">{acceptedCurrencies.join(', ')}</span>
          </div>
        )}

        {/* --- Accordion Sections --- */}
        <div className="divide-y divide-border border-t border-b border-border">
          {/* Description */}
          <details open className="group">
            <summary className="flex items-center justify-between py-3 cursor-pointer touch-feedback list-none">
              <span className="font-semibold text-sm text-foreground">
                {t('product.description')}
              </span>
              <svg
                className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground text-sm pb-3 [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(decodeHtmlEntities(product.item.description)),
              }}
            />
          </details>

          {/* Shipping Options */}
          {product.metadata?.contractType === 'PHYSICAL_GOOD' && (
            <details className="group">
              <summary className="flex items-center justify-between py-3 cursor-pointer touch-feedback list-none">
                <span className="font-semibold text-sm text-foreground">
                  {t('product.shipping')}
                </span>
                <svg
                  className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="pb-3">
                <ShippingOptionsSection
                  shippingProfile={product.shippingProfile}
                  shippingOptions={product.shippingOptions}
                  pricingCurrency={product.metadata?.pricingCurrency?.code}
                />
              </div>
            </details>
          )}

          {/* Reviews */}
          <details className="group">
            <summary className="flex items-center justify-between py-3 cursor-pointer touch-feedback list-none">
              <span className="font-semibold text-sm text-foreground">
                {t('product.reviewsTitle')} ({ratingCount})
              </span>
              <svg
                className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </summary>
            <div className="pb-3">
              {ratingsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="h-3 flex-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <ReviewList ratings={safeRatings} ratingIndex={ratingIndex ?? undefined} />
              )}
            </div>
          </details>

          {/* Terms */}
          {product.termsAndConditions && (
            <details className="group">
              <summary className="flex items-center justify-between py-3 cursor-pointer touch-feedback list-none">
                <span className="font-semibold text-sm text-foreground">
                  {t('product.termsAndConditions')}
                </span>
                <svg
                  className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="text-xs text-muted-foreground pb-3">{product.termsAndConditions}</p>
            </details>
          )}

          {/* Refund */}
          {product.refundPolicy && (
            <details className="group">
              <summary className="flex items-center justify-between py-3 cursor-pointer touch-feedback list-none">
                <span className="font-semibold text-sm text-foreground">
                  {t('product.refundPolicy')}
                </span>
                <svg
                  className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <p className="text-xs text-muted-foreground pb-3">{product.refundPolicy}</p>
            </details>
          )}
        </div>

        {/* Vendor card */}
        <Link href={`/store/${vendorPeerID}`} className="block touch-feedback">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
            <Avatar
              src={getImageUrl(vendor?.avatarHashes?.medium)}
              name={vendor?.name || vendorPeerID?.slice(0, 8) || 'Vendor'}
              size="md"
              className="w-10 h-10"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">
                {vendor?.name || vendorPeerID?.slice(0, 8)}
              </h3>
              {vendor?.stats && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-warning text-xs">★</span>
                  <span className="text-xs text-muted-foreground">
                    {vendor.stats.averageRating?.toFixed(1) || '0'} ({vendor.stats.ratingCount || 0}
                    )
                  </span>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="flex-shrink-0 text-xs h-8">
              {t('product.viewStore')}
            </Button>
          </div>
        </Link>

        {/* More from store */}
        {vendorPeerID && (
          <MoreFromStore
            vendorPeerID={vendorPeerID}
            vendorName={vendor?.name}
            currentSlug={product.slug}
            maxItems={4}
            compact
          />
        )}
      </div>

      {/* --- Fixed Bottom Action Bar --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-3 py-2.5 z-50 pb-[env(safe-area-inset-bottom,12px)]">
        {isOwnProduct ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-11 text-sm font-medium touch-feedback"
              onClick={() => router.push(`/listing/edit/${product.slug}`)}
            >
              {t('product.editProduct')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-11 text-sm font-medium touch-feedback"
              onClick={handleCopyLink}
            >
              {linkCopied ? t('product.linkCopied') : t('product.shareLink')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {/* Left icon group */}
            <div className="flex flex-shrink-0">
              <button
                onClick={openChatDrawer}
                className="flex flex-col items-center justify-center w-11 h-11 touch-feedback active:bg-muted/50 rounded-lg"
              >
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
              <button
                onClick={() => router.push('/cart')}
                className="flex flex-col items-center justify-center w-11 h-11 touch-feedback active:bg-muted/50 rounded-lg"
              >
                <svg
                  className="w-5 h-5 text-muted-foreground"
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
              </button>
              {onToggleWishlist && (
                <button
                  onClick={onToggleWishlist}
                  className="flex flex-col items-center justify-center w-11 h-11 touch-feedback active:bg-muted/50 rounded-lg"
                >
                  <Heart
                    className={cn(
                      'w-5 h-5',
                      isWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                    )}
                  />
                </button>
              )}
            </div>
            {/* Action buttons */}
            <div className="flex flex-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-11 text-sm font-medium touch-feedback border-primary text-primary hover:bg-primary/10"
                onClick={handleAddToCart}
                disabled={stock === 0}
              >
                {cartSuccess ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : stock === 0 ? (
                  t('product.outOfStock')
                ) : (
                  t('product.addToCart')
                )}
              </Button>
              <Button
                size="sm"
                className="flex-1 h-11 text-sm font-medium touch-feedback"
                onClick={handleBuyNow}
                disabled={stock === 0}
              >
                {t('product.buyNow')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* --- Fullscreen Image Preview --- */}
      {isImagePreviewOpen && imageUrls.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setIsImagePreviewOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') setIsImagePreviewOpen(false);
            else if (e.key === 'ArrowLeft')
              setSelectedImage(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
            else if (e.key === 'ArrowRight')
              setSelectedImage(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
          }}
          tabIndex={0}
          ref={el => el?.focus()}
        >
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center z-10"
            onClick={() => setIsImagePreviewOpen(false)}
            aria-label="Close"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            {selectedImage + 1} / {imageUrls.length}
          </div>
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <img
              src={imageUrls[selectedImage]}
              alt={product.item.title}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>
          {imageUrls.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImage(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
                }}
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImage(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
                }}
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}
          {imageUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-lg p-2">
              {imageUrls.map((image, index) => (
                <button
                  key={index}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImage(index);
                  }}
                  aria-label={`Image ${index + 1}`}
                  className={cn(
                    'w-12 h-12 rounded overflow-hidden border-2 transition-all',
                    selectedImage === index
                      ? 'border-white'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <img
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProductMoreButton({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = product.item.title;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
    setOpen(false);
  }, [product.item.title]);

  const handleCopyLink = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    await navigator.clipboard.writeText(url);
    setOpen(false);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 -mr-2 rounded-lg active:bg-muted/50 transition-colors"
        aria-label={t('common.more')}
      >
        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <div className="py-1 pb-safe">
          <BottomSheetItem
            title={t('common.share')}
            icon={<Share2 className="w-5 h-5" />}
            onClick={handleShare}
          />
          <BottomSheetItem
            title={t('share.copyLink')}
            icon={<Copy className="w-5 h-5" />}
            onClick={handleCopyLink}
          />
          <BottomSheetItem
            title={t('product.report')}
            icon={<Flag className="w-5 h-5" />}
            onClick={() => setOpen(false)}
          />
        </div>
      </BottomSheet>
    </>
  );
}
