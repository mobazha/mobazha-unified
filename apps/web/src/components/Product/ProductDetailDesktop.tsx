'use client';

import React from 'react';
import Link from 'next/link';
import { HStack, VStack, Grid } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { cn } from '@/lib/utils';
import { getImageUrl, decodeHtmlEntities, sanitizeHtml } from '@mobazha/core';
import type { Product } from '@mobazha/core';
import { Heart, AlertTriangle } from 'lucide-react';
import { VerifiedModeratorBadge } from './VerifiedModeratorBadge';
import { BuyerProtectionBanner } from './BuyerProtectionBanner';
import { BuyerProtectionBadge, SellerInfoCard } from '@/components/Trust';
import { ShippingOptionsSection } from './ShippingOptionsSection';
import { MoreFromStore } from './MoreFromStore';
import { RwaAssetDetail } from '@/components/RwaToken';
import { ShareButton } from '@/components/Share';
import { ReviewList } from '@/components/Review';
import { StarRating } from '@/components/ui/star-rating';
import { useProductDetail } from '@/hooks/useProductDetail';
import { VariantSelector } from './VariantSelector';

export interface ProductDetailProps {
  slug: string;
  peerID?: string;
  isModal?: boolean;
  onClose?: () => void;
  onMessage?: () => void;
  onCart?: () => void;
  onProductLoaded?: (product: Product | null) => void;
  isWishlist?: boolean;
  onToggleWishlist?: () => void;
}

export function ProductDetailDesktop({
  slug,
  peerID,
  isModal = false,
  onClose,
  onProductLoaded,
  isWishlist = false,
  onToggleWishlist,
}: ProductDetailProps) {
  const {
    product,
    vendor,
    ratingIndex,
    applicableDiscounts,
    rwaChainData,
    isLoading,
    ratingsLoading,
    error,
    imageUrls,
    priceInfo,
    compareAtPrice,
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
    category,
    rwaTradeMode,
    rwaEscrowTimeoutSeconds,
    paymentAvailable,
    hasVariants,
    selectedOptions,
    unavailableVariants,
    handleSelectOption,
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
    t,
    renderPairedPrice,
    router,
  } = useProductDetail({ slug, peerID, isModal, onClose, onProductLoaded });

  // 加载状态
  if (isLoading) {
    return (
      <div className={isModal ? 'p-4 sm:p-6' : ''}>
        <Grid cols={2} colsMobile={1} gap="lg">
          <Skeleton variant="rounded" className="aspect-square" />
          <VStack gap="md" align="stretch">
            <Skeleton variant="text" height={40} width="80%" />
            <Skeleton variant="text" height={24} width="40%" />
            <Skeleton variant="text" height={100} />
            <Skeleton variant="rounded" height={200} />
          </VStack>
        </Grid>
      </div>
    );
  }

  // 错误状态
  if (error || !product) {
    return (
      <div
        className={`flex items-center justify-center ${isModal ? 'min-h-[300px]' : 'min-h-[60vh]'}`}
      >
        <div className="text-center">
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
          {isModal ? (
            <Button onClick={onClose}>{t('common.close')}</Button>
          ) : (
            <Link href="/marketplace">
              <Button>{t('common.backToMarket')}</Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isModal ? 'overflow-y-auto max-h-[85vh]' : ''} data-testid="product-detail">
      {/* Cart success toast */}
      {cartSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg text-sm font-medium">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {t('product.addedToCart')}
          </div>
        </div>
      )}
      {/* 弹框模式顶部商家栏 - 不使用 sticky，避免遮挡图片 */}
      {isModal && vendor && (
        <div className="bg-background border-b border-border px-4 py-3 pr-14">
          <div className="flex items-center justify-between">
            <Link
              href={`/store/${vendorPeerID}`}
              className="flex items-center gap-3 min-w-0 flex-1"
            >
              <Avatar
                src={getImageUrl(vendor?.avatarHashes?.small, vendorPeerID)}
                name={vendor?.name || vendorPeerID || ''}
                size="sm"
                className="w-9 h-9 flex-shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate">
                  {vendor?.name ||
                    (vendorPeerID ? `${vendorPeerID.slice(0, 6)}…${vendorPeerID.slice(-4)}` : '')}
                </h3>
                <span className="text-xs text-primary hover:underline">
                  {t('product.goToStore')}
                </span>
              </div>
            </Link>
            <HStack gap="xs" className="flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-11 px-3 text-xs sm:h-9"
                onClick={() => openChatDrawer()}
              >
                {t('profile.message')}
              </Button>
              <Button variant="outline" size="sm" className="h-11 px-3 text-xs sm:h-9">
                {t('profile.follow')}
              </Button>
            </HStack>
          </div>
        </div>
      )}

      <div className={isModal ? 'p-4 sm:p-6' : ''}>
        {/* Breadcrumb - 非弹框模式显示 */}
        {!isModal && (
          <nav className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href="/" className="hover:text-primary">
              {t('nav.home')}
            </Link>
            <span>/</span>
            <Link href="/marketplace" className="hover:text-primary">
              {t('nav.market')}
            </Link>
            {category && (
              <>
                <span>/</span>
                <Link
                  href={`/marketplace?category=${category.toLowerCase()}`}
                  className="hover:text-primary"
                >
                  {category}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">
              {decodeHtmlEntities(product.item.title)}
            </span>
          </nav>
        )}

        <div
          className={`grid grid-cols-1 ${isModal ? 'lg:grid-cols-2' : 'lg:grid-cols-2'} gap-4 sm:gap-8 lg:gap-12`}
        >
          {/* Image Gallery */}
          <div className={isModal ? 'space-y-2' : 'space-y-3 sm:space-y-4'}>
            {/* Main Image - 弹窗模式使用 object-contain 保持图片完整显示 */}
            <div
              className={`relative ${isModal ? 'aspect-[4/3]' : 'aspect-square'} rounded-xl sm:rounded-2xl overflow-hidden bg-muted cursor-pointer group`}
              onClick={() => imageUrls.length > 0 && setIsImagePreviewOpen(true)}
            >
              {imageUrls.length > 0 ? (
                <>
                  <img
                    src={imageUrls[selectedImage] || imageUrls[0]}
                    alt={product.item.title}
                    className={`w-full h-full transition-transform group-hover:scale-105 ${isModal ? 'object-contain' : 'object-cover'}`}
                  />
                  {/* 放大提示 */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-2">
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
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                        />
                      </svg>
                    </div>
                  </div>
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

            {/* Thumbnails & View Photos */}
            <div className="flex items-center gap-2 sm:gap-3">
              {imageUrls.length > 1 && (
                <div className="flex gap-2 sm:gap-3 overflow-x-auto flex-1">
                  {imageUrls.slice(0, isModal ? 4 : imageUrls.length).map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View image ${index + 1}`}
                      data-testid={`product-detail-thumbnail-${index}`}
                      className={`flex-shrink-0 ${isModal ? 'w-14 h-14' : 'w-16 h-16 sm:w-20 sm:h-20'} rounded-md sm:rounded-lg overflow-hidden border-2 transition-all touch-feedback ${
                        selectedImage === index
                          ? 'border-primary ring-2 ring-primary/20'
                          : 'border-transparent hover:border-border'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.item.title} - Image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              {/* 查看图片链接 */}
              {imageUrls.length > 0 && (
                <button
                  onClick={() => setIsImagePreviewOpen(true)}
                  className="text-sm text-primary hover:underline whitespace-nowrap flex-shrink-0"
                >
                  {t('product.viewPhotos', { count: imageUrls.length })}
                </button>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className={cn('space-y-3', isModal ? 'space-y-2.5' : 'sm:space-y-4')}>
            {/* Title & Rating */}
            <div>
              <HStack justify="between" align="start">
                <h1
                  className={cn(
                    'font-bold text-foreground leading-tight flex-1',
                    isModal ? 'text-base lg:text-lg mb-1' : 'text-lg sm:text-xl lg:text-2xl mb-1.5'
                  )}
                >
                  {decodeHtmlEntities(product.item.title)}
                </h1>
                {!isModal && (
                  <ShareButton
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                    title={product.item.title}
                    description={product.item.description?.substring(0, 100)}
                    embedType="product"
                    embedIdentifier={slug}
                    embedPeerID={peerID}
                  />
                )}
              </HStack>
              <HStack gap="sm" align="center">
                <StarRating value={averageRating} size={isModal ? 'sm' : 'md'} />
                <span className={cn('text-muted-foreground ml-1', isModal ? 'text-xs' : 'text-sm')}>
                  {averageRating.toFixed(1)} ({ratingCount} {t('product.reviews')})
                </span>
              </HStack>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className={cn(
                  'font-bold text-primary',
                  isModal ? 'text-lg lg:text-xl' : 'text-xl sm:text-2xl lg:text-3xl'
                )}
              >
                {priceInfo.pairedPrice}
              </span>
              {compareAtPrice !== null && (
                <span
                  className={cn(
                    'line-through text-muted-foreground',
                    isModal ? 'text-sm' : 'text-base sm:text-lg'
                  )}
                >
                  {renderPairedPrice(compareAtPrice, priceInfo.currency)}
                </span>
              )}
            </div>

            <BuyerProtectionBadge variant="inline" className="mt-1" />

            {/* Applicable discounts */}
            {applicableDiscounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {applicableDiscounts.map((d, idx) => (
                  <div
                    key={`${d.title}-${idx}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 text-primary',
                      isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm'
                    )}
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
                      {d.minPurchaseType === 'min_amount' && Number(d.minAmount) > 0 && (
                        <>
                          {' '}
                          ·{' '}
                          {t('product.discount.minPurchase', {
                            amount: `${d.currency} ${d.minAmount}`,
                          })}
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Shipping - 仅对实物商品显示 */}
            {product.metadata?.contractType === 'PHYSICAL_GOOD' && (
              <div
                className={cn(
                  'flex items-center gap-2 flex-wrap',
                  isModal ? 'text-xs' : 'text-xs sm:text-sm'
                )}
              >
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
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground">
                      {t('product.estDelivery')}: {estimatedDelivery}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Variant Selection */}
            {hasVariants && product.item.options && (
              <VariantSelector
                options={product.item.options}
                selectedOptions={selectedOptions}
                onSelectOption={handleSelectOption}
                unavailableVariants={unavailableVariants}
                compact={isModal}
              />
            )}

            {/* Product Attributes Panel */}
            <div className={cn('flex flex-wrap', isModal ? 'gap-1.5' : 'gap-2 sm:gap-2.5')}>
              {/* Type Badge - 使用 primary 主题色增强对比度 */}
              {product.metadata?.contractType && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-primary/10 dark:bg-primary/20 text-primary border border-primary/20',
                    isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs sm:text-sm'
                  )}
                >
                  <span className="font-medium">{t('product.type')}:</span>
                  <span>
                    {product.metadata.contractType === 'PHYSICAL_GOOD' && t('product.physicalGood')}
                    {product.metadata.contractType === 'DIGITAL_GOOD' && t('product.digitalGood')}
                    {product.metadata.contractType === 'SERVICE' && t('product.serviceType')}
                    {product.metadata.contractType === 'CRYPTOCURRENCY' &&
                      t('product.cryptocurrency')}
                    {product.metadata.contractType === 'RWA_TOKEN' && t('product.rwaToken')}
                    {![
                      'PHYSICAL_GOOD',
                      'DIGITAL_GOOD',
                      'SERVICE',
                      'CRYPTOCURRENCY',
                      'RWA_TOKEN',
                    ].includes(product.metadata.contractType) &&
                      product.metadata.contractType.replace('_', ' ')}
                  </span>
                </div>
              )}
              {/* Condition Badge */}
              {product.item.condition && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-muted text-foreground border border-border',
                    isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs sm:text-sm'
                  )}
                >
                  <span className="font-medium">{t('product.condition')}:</span>
                  <span>{product.item.condition.replace('_', ' ')}</span>
                </div>
              )}
              {/* Weight Badge */}
              {product.item.grams !== undefined && product.item.grams > 0 && (
                <div
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-muted text-foreground border border-border',
                    isModal ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs sm:text-sm'
                  )}
                >
                  <span className="font-medium">{t('product.weight')}:</span>
                  <span>{t('product.weightGrams', { weight: product.item.grams })}</span>
                </div>
              )}
            </div>

            {/* RWA 资产详情 - 仅对 RWA_TOKEN 类型商品显示 */}
            {product.metadata?.contractType === 'RWA_TOKEN' && (
              <RwaAssetDetail
                product={product}
                compact={isModal}
                showPurchaseHint={true}
                rwaTradeMode={rwaTradeMode}
                escrowTimeoutSeconds={rwaEscrowTimeoutSeconds}
                acceptedCurrencies={acceptedCurrencies}
                chainData={rwaChainData}
              />
            )}

            {/* Tags - 放在商品属性后面 */}
            {tags.length > 0 && (
              <div className={cn('space-y-1.5', isModal && 'space-y-1')}>
                <span
                  className={cn(
                    'font-medium text-muted-foreground',
                    isModal ? 'text-xs' : 'text-xs sm:text-sm'
                  )}
                >
                  {t('product.tags')}
                </span>
                <div className={cn('flex flex-wrap', isModal ? 'gap-1' : 'gap-1.5 sm:gap-2')}>
                  {tags.map(tag => (
                    <Link
                      key={tag}
                      href={`/marketplace?tag=${tag}`}
                      className={cn(
                        'border border-border bg-background text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors touch-feedback',
                        isModal
                          ? 'px-2 py-0.5 text-xs'
                          : 'px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm'
                      )}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Verified Moderator Badge */}
            <VerifiedModeratorBadge moderatorPeerIDs={product.moderators} />

            {/* Buyer Protection */}
            {!isOwnProduct && <BuyerProtectionBanner />}

            {/* Desktop action card: seller actions vs buyer purchase */}
            {isOwnProduct ? (
              <Card
                className="space-y-3 p-4 hidden lg:block"
                data-testid="product-detail-seller-actions"
              >
                <VStack gap="xs">
                  <Button
                    size="default"
                    className="w-full touch-feedback"
                    onClick={() => {
                      if (isModal && onClose) onClose();
                      router.push(`/listing/edit/${product.slug}`);
                    }}
                    data-testid="product-detail-edit"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    {t('product.editProduct')}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full touch-feedback"
                    onClick={handleCopyLink}
                    data-testid="product-detail-share"
                  >
                    {linkCopied ? (
                      <span className="flex items-center gap-2">
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {t('product.linkCopied')}
                      </span>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                        {t('product.shareLink')}
                      </>
                    )}
                  </Button>
                </VStack>
                <p className="text-xs text-center text-muted-foreground pt-1">
                  {t('product.sellerViewHint')}
                </p>
              </Card>
            ) : (
              <Card
                className={cn(
                  'space-y-3 p-4 hidden lg:block',
                  (stock === 0 || !paymentAvailable) && 'border-destructive/30 bg-destructive/5'
                )}
              >
                {!paymentAvailable && stock > 0 && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/20">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-foreground">
                        {t('payment.paymentUnavailable')}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('payment.paymentUnavailableDesc')}
                      </p>
                    </div>
                  </div>
                )}
                {stock === 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                    <svg
                      className="w-4 h-4 text-destructive flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-destructive">
                      {t('product.outOfStock')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {t('product.quantity')}
                  </span>
                  <HStack gap="sm" align="center">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={stock === 0 || !paymentAvailable}
                      aria-label="Decrease quantity"
                      data-testid="product-detail-qty-decrease"
                      className={cn(
                        'w-10 h-10 rounded-lg border border-border flex items-center justify-center touch-feedback transition-colors',
                        stock === 0 || !paymentAvailable
                          ? 'opacity-50 cursor-not-allowed bg-muted'
                          : 'hover:bg-muted'
                      )}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={stock}
                      value={quantity}
                      disabled={stock === 0 || !paymentAvailable}
                      aria-label="Quantity"
                      data-testid="product-detail-qty-input"
                      onChange={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1) {
                          setQuantity(Math.min(stock, val));
                        }
                      }}
                      onKeyDown={e => {
                        if (stock === 0) return;
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setQuantity(prev => Math.min(stock, prev + 1));
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setQuantity(prev => Math.max(1, prev - 1));
                        }
                      }}
                      className={cn(
                        'w-14 h-8 text-center font-medium text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                        stock === 0 && 'opacity-50 cursor-not-allowed bg-muted'
                      )}
                    />
                    <button
                      onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                      disabled={stock === 0 || !paymentAvailable}
                      aria-label="Increase quantity"
                      data-testid="product-detail-qty-increase"
                      className={cn(
                        'w-10 h-10 rounded-lg border border-border flex items-center justify-center touch-feedback transition-colors',
                        stock === 0 || !paymentAvailable
                          ? 'opacity-50 cursor-not-allowed bg-muted'
                          : 'hover:bg-muted'
                      )}
                    >
                      +
                    </button>
                  </HStack>
                </div>

                {stock > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {stock} {t('product.inStock')}
                  </span>
                )}

                <VStack gap="xs">
                  <Button
                    size="default"
                    className={cn(
                      'w-full touch-feedback',
                      (stock === 0 || !paymentAvailable) && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={handleAddToCart}
                    disabled={stock === 0 || !paymentAvailable}
                    data-testid="product-detail-add-to-cart"
                  >
                    {cartSuccess ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
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
                        {t('product.addedToCart')}
                      </span>
                    ) : !paymentAvailable ? (
                      t('payment.paymentUnavailable')
                    ) : stock === 0 ? (
                      t('product.outOfStock')
                    ) : (
                      t('product.addToCart')
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    className={cn(
                      'w-full touch-feedback',
                      (stock === 0 || !paymentAvailable) && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={handleBuyNow}
                    disabled={stock === 0 || !paymentAvailable}
                    data-testid="product-detail-buy-now"
                  >
                    {t('product.buyNow')}
                  </Button>
                  {onToggleWishlist && (
                    <Button
                      variant="ghost"
                      size="default"
                      className="w-full"
                      onClick={onToggleWishlist}
                      data-testid="product-detail-wishlist"
                    >
                      <Heart
                        className={cn(
                          'w-4 h-4 mr-2',
                          isWishlist ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                        )}
                      />
                      {isWishlist ? t('product.wishlisted') : t('product.addToWishlist')}
                    </Button>
                  )}
                </VStack>

                {acceptedCurrencies.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                      {t('product.acceptedCurrencies')}:{' '}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {acceptedCurrencies.join(', ')}
                    </span>
                  </div>
                )}
              </Card>
            )}

            {/* Seller info card - 头像 + 名称 + 评分/完成率/新店铺 + 进入店铺 */}
            {!isModal && vendorPeerID && (
              <SellerInfoCard
                peerID={vendorPeerID}
                name={vendor?.name ?? ''}
                avatarHashes={vendor?.avatarHashes}
                rating={vendor?.stats?.averageRating ?? 0}
                reviewCount={vendor?.stats?.ratingCount ?? 0}
                salesCount={vendor?.stats?.listingCount}
                memberSince={vendor?.lastModified}
                isNewStore={(vendor?.stats?.ratingCount ?? 0) === 0}
                location={vendor?.location}
                viewStoreLabel={t('product.viewStore')}
              />
            )}
          </div>
        </div>

        {/* Description & Reviews */}
        <div
          className={cn(
            'grid grid-cols-1 gap-4',
            isModal ? 'mt-4' : 'mt-6 sm:mt-12 lg:grid-cols-3 sm:gap-8'
          )}
        >
          {/* Description */}
          <div className={isModal ? '' : 'lg:col-span-2'}>
            <Card className={cn('p-4', !isModal && 'sm:p-6')}>
              <h2
                className={cn(
                  'font-bold text-foreground',
                  isModal ? 'text-base mb-2' : 'text-lg sm:text-xl mb-3 sm:mb-4'
                )}
              >
                {t('product.description')}
              </h2>
              <div
                className={cn(
                  'prose dark:prose-invert max-w-none text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a:hover]:text-primary/80',
                  isModal ? 'prose-sm text-sm' : 'prose-sm sm:prose text-sm sm:text-base'
                )}
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(decodeHtmlEntities(product.item.description)),
                }}
              />
            </Card>

            {/* Shipping Options - 仅对实物商品显示 */}
            {product.metadata?.contractType === 'PHYSICAL_GOOD' && (
              <ShippingOptionsSection
                shippingProfile={product.shippingProfile}
                shippingOptions={product.shippingOptions}
                pricingCurrency={product.metadata?.pricingCurrency?.code}
              />
            )}
          </div>

          {/* Reviews - 非弹框模式 */}
          {!isModal && (
            <div>
              <Card className="p-3 sm:p-4">
                <h2 className="text-sm sm:text-base font-bold text-foreground mb-2 sm:mb-3">
                  {t('product.reviewsTitle')}
                </h2>
                {ratingsLoading ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4 sm:mb-6">
                      <Skeleton className="h-10 w-16 mx-auto mb-2" />
                      <Skeleton className="h-5 w-24 mx-auto mb-2" />
                      <Skeleton className="h-4 w-20 mx-auto" />
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="pb-3 sm:pb-4 border-b border-border last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Skeleton className="w-6 h-6 sm:w-8 sm:h-8 rounded-full" />
                          <Skeleton className="h-4 w-20" />
                          <div className="ml-auto">
                            <Skeleton className="h-4 w-16" />
                          </div>
                        </div>
                        <Skeleton className="h-3 w-full mb-1" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <ReviewList ratings={safeRatings} ratingIndex={ratingIndex ?? undefined} />
                )}
              </Card>
            </div>
          )}
        </div>

        {/* More from Store */}
        {vendorPeerID && (
          <div className={cn('mt-4', !isModal && 'mt-6 sm:mt-8')}>
            <MoreFromStore
              vendorPeerID={vendorPeerID}
              vendorName={vendor?.name}
              currentSlug={product.slug}
              maxItems={isModal ? 4 : 6}
              compact={isModal}
            />
          </div>
        )}
      </div>

      {/* 移动端底部操作栏占位空间 */}
      <div className="h-20 lg:hidden" />

      {/* 图片预览模态框 */}
      {isImagePreviewOpen && imageUrls.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setIsImagePreviewOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setIsImagePreviewOpen(false);
            } else if (e.key === 'ArrowLeft') {
              setSelectedImage(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
            } else if (e.key === 'ArrowRight') {
              setSelectedImage(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
            }
          }}
          tabIndex={0}
          ref={el => el?.focus()}
        >
          {/* 关闭按钮 */}
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            onClick={() => setIsImagePreviewOpen(false)}
            aria-label="Close image preview"
            data-testid="product-detail-preview-close"
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

          {/* 图片计数 */}
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            {selectedImage + 1} / {imageUrls.length}
          </div>

          {/* 主图片 */}
          <div className="relative max-w-[90vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <img
              src={imageUrls[selectedImage]}
              alt={product.item.title}
              className="max-w-full max-h-[85vh] object-contain"
            />
          </div>

          {/* 左右切换按钮 */}
          {imageUrls.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImage(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
                }}
                aria-label="Previous image"
                data-testid="product-detail-preview-prev"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedImage(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
                }}
                aria-label="Next image"
                data-testid="product-detail-preview-next"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          {/* 底部缩略图 */}
          {imageUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-lg p-2">
              {imageUrls.map((image, index) => (
                <button
                  key={index}
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedImage(index);
                  }}
                  aria-label={`View image ${index + 1}`}
                  className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? 'border-white'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.item.title} - Thumbnail ${index + 1}`}
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
