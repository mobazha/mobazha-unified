'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { getImageUrl, useI18n } from '@mobazha/core';
import type { RatingDetail } from '@mobazha/core';

interface ReviewCardProps {
  review: RatingDetail;
}

/**
 * 星星评分组件
 */
function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rating ? 'text-warning' : 'text-muted-foreground/40'}>
          ★
        </span>
      ))}
      <span className="text-xs text-muted-foreground ml-1">
        ({rating}/{max})
      </span>
    </div>
  );
}

/**
 * 评价卡片组件
 * 显示单条评价的详细信息，包括评分维度、评论文本、购买者信息
 */
export function ReviewCard({ review }: ReviewCardProps) {
  const { t } = useI18n();

  // 格式化时间
  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timestamp;
    }
  };

  // 获取商品缩略图
  const getThumbnail = () => {
    const vendorSig = review.vendorSig;
    if (!vendorSig) return null;

    const thumbnail = vendorSig.thumbnail || vendorSig.metadata?.thumbnail;
    if (!thumbnail) return null;

    return getImageUrl(thumbnail.small || thumbnail.medium || thumbnail.tiny);
  };

  // 获取商品标题
  const getProductTitle = () => {
    if (!review.vendorSig) return null;
    return review.vendorSig.title || review.vendorSig.slug?.replace(/-/g, ' ');
  };

  // 获取购买者名称
  const getBuyerName = () => {
    if (review.anonymous) return t('profile.anonymous');
    if (!review.buyerID) return t('profile.anonymous');
    return review.buyerID.handle || `${review.buyerID.peerID.slice(0, 8)}...`;
  };

  const thumbnailUrl = getThumbnail();
  const productTitle = getProductTitle();

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 左侧：商品缩略图和评价内容 */}
        <div className="flex-1 flex gap-3">
          {/* 商品缩略图 */}
          {thumbnailUrl && (
            <div className="flex-shrink-0">
              {review.vendorID?.peerID && review.vendorSig?.slug ? (
                <Link
                  href={`/store/${review.vendorID.peerID}?product=${review.vendorSig.slug}`}
                  className="block"
                >
                  <img
                    src={thumbnailUrl}
                    alt={productTitle || ''}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                  />
                </Link>
              ) : (
                <img
                  src={thumbnailUrl}
                  alt={productTitle || ''}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-border"
                />
              )}
            </div>
          )}

          {/* 评价内容 */}
          <div className="flex-1 min-w-0">
            {/* 时间和购买者 */}
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">
              {formatDate(review.timestamp)}
              {!review.anonymous && review.buyerID && (
                <>
                  {' '}
                  {t('common.by')}{' '}
                  <Link
                    href={`/store/${review.buyerID.peerID}`}
                    className="text-primary hover:underline"
                  >
                    {getBuyerName()}
                  </Link>
                </>
              )}
            </div>

            {/* 商品标题 */}
            {productTitle && (
              <h4 className="font-medium text-foreground text-sm sm:text-base mb-1 truncate">
                {review.vendorID?.peerID && review.vendorSig?.slug ? (
                  <Link
                    href={`/store/${review.vendorID.peerID}?product=${review.vendorSig.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {productTitle}
                  </Link>
                ) : (
                  productTitle
                )}
              </h4>
            )}

            {/* 评论文本 */}
            {review.review && (
              <p className="text-sm text-muted-foreground line-clamp-3">{review.review}</p>
            )}
          </div>
        </div>

        {/* 右侧：评分维度 */}
        <div className="flex-shrink-0 w-full sm:w-auto">
          <table className="text-xs sm:text-sm w-full sm:w-auto">
            <tbody>
              <tr>
                <td className="pr-2 py-0.5 font-medium text-foreground">{t('product.overall')}</td>
                <td>
                  <RatingStars rating={review.overall} />
                </td>
              </tr>
              {review.quality !== undefined && (
                <tr>
                  <td className="pr-2 py-0.5 text-muted-foreground">{t('product.quality')}</td>
                  <td>
                    <RatingStars rating={review.quality} />
                  </td>
                </tr>
              )}
              {review.description !== undefined && (
                <tr>
                  <td className="pr-2 py-0.5 text-muted-foreground">{t('product.asAdvertised')}</td>
                  <td>
                    <RatingStars rating={review.description} />
                  </td>
                </tr>
              )}
              {review.deliverySpeed !== undefined && (
                <tr>
                  <td className="pr-2 py-0.5 text-muted-foreground">{t('product.delivery')}</td>
                  <td>
                    <RatingStars rating={review.deliverySpeed} />
                  </td>
                </tr>
              )}
              {review.customerService !== undefined && (
                <tr>
                  <td className="pr-2 py-0.5 text-muted-foreground">{t('product.service')}</td>
                  <td>
                    <RatingStars rating={review.customerService} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}

export default ReviewCard;
