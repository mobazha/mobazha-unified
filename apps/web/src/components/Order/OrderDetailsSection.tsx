'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { ProductImageNative } from '@/components/ui/product-image';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

export interface OrderItem {
  id: string;
  title: string;
  image: string;
  quantity: number;
  price: string;
  currency: string;
  sku?: string;
  options?: Array<{ name: string; value: string }>;
  couponCodes?: string[];
}

export interface ShippingAddress {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  addressNotes?: string;
}

export interface ModeratorInfo {
  id: string;
  name: string;
  avatar?: string;
  fee?: number;
}

export interface OrderDetailsSectionProps {
  /** 订单商品列表 */
  items: OrderItem[];
  /** 收货地址 */
  shippingAddress?: ShippingAddress;
  /** 仲裁人信息 */
  moderator?: ModeratorInfo;
  /** 总金额 */
  total: string;
  /** 币种 */
  currency: string;
  /** 配送区域 */
  shippingZoneName?: string;
  /** 配送方式 */
  shippingMethodName?: string;
  /** 备注 */
  memo?: string;
  /** 备用联系方式 */
  alternateContact?: string;
  /** 订单时间 */
  timestamp?: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化地址为字符串
 */
function formatAddress(address: ShippingAddress): string {
  const parts = [
    address.name,
    address.address,
    [address.city, address.state, address.postalCode].filter(Boolean).join(' '),
    address.country,
  ].filter(Boolean);
  return parts.join('\n');
}

/**
 * 获取 Google Maps 链接
 */
function getMapUrl(address: ShippingAddress): string {
  const parts = [address.address, address.city, address.postalCode, address.country].filter(
    Boolean
  );
  return `https://www.google.com/maps/place/${encodeURIComponent(parts.join(','))}`;
}

/**
 * 格式化日期
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * 订单详情区块组件
 *
 * 桌面端两栏布局，移动端单栏布局
 */
export const OrderDetailsSection = memo(function OrderDetailsSection({
  items,
  shippingAddress,
  moderator,
  total,
  currency,
  shippingZoneName,
  shippingMethodName,
  memo,
  alternateContact,
  timestamp,
  className,
}: OrderDetailsSectionProps) {
  return (
    <div className={cn('', className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Order Details</h3>
        {timestamp && (
          <span className="text-xs text-muted-foreground">{formatDate(timestamp)}</span>
        )}
      </div>

      <Card className="p-3">
        {/* 商品列表 */}
        {items.map((item, index) => (
          <div key={item.id} className={cn(index > 0 && 'mt-3 pt-3 border-t border-border')}>
            <div className="flex gap-3">
              {/* 商品图片 */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0">
                <ProductImageNative src={item.image} alt={item.title} iconSize="sm" />
              </div>

              {/* 商品信息 */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2">{item.title}</h4>
                {item.sku && (
                  <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku}</p>
                )}
                {item.options && item.options.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.options.map(o => `${o.name}: ${o.value}`).join(', ')}
                  </p>
                )}

                {/* 两栏：优惠券 | 数量 */}
                <div className="flex gap-4 mt-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Coupons: </span>
                    <span className="text-foreground">
                      {item.couponCodes && item.couponCodes.length > 0
                        ? item.couponCodes.join(', ')
                        : 'n/a'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity: </span>
                    <span className="text-foreground">{item.quantity}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* 分隔线 */}
        <div className="border-t border-border my-3" />

        {/* 两栏布局：收货地址 | 仲裁人+总金额 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* 左栏：收货地址 */}
          <div>
            <div className="font-medium text-foreground mb-1">Ship to</div>
            {shippingAddress && shippingAddress.country !== 'NA' ? (
              <div className="text-muted-foreground space-y-0.5">
                {shippingAddress.name && <div>{shippingAddress.name}</div>}
                {shippingAddress.address && <div>{shippingAddress.address}</div>}
                <div>
                  {[shippingAddress.city, shippingAddress.state, shippingAddress.postalCode]
                    .filter(Boolean)
                    .join(' ')}
                </div>
                {shippingAddress.country && <div>{shippingAddress.country}</div>}

                {/* 操作按钮 */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => navigator.clipboard.writeText(formatAddress(shippingAddress))}
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    Copy
                  </button>
                  <a
                    href={getMapUrl(shippingAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    View on map
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                {/* 地址备注 */}
                {shippingAddress.addressNotes && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="font-medium text-foreground">Address Notes</div>
                    <div className="text-muted-foreground">{shippingAddress.addressNotes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground">n/a</div>
            )}
          </div>

          {/* 右栏：仲裁人 + 总金额 */}
          <div className="space-y-3">
            {/* 仲裁人 */}
            <div>
              <div className="font-medium text-foreground mb-1">Moderator</div>
              {moderator ? (
                <div className="flex items-center gap-2">
                  {moderator.avatar ? (
                    <img
                      src={moderator.avatar}
                      alt={moderator.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {moderator.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <Link href={`/store/${moderator.id}`} className="text-primary hover:underline">
                    {moderator.name}
                  </Link>
                  {moderator.fee !== undefined && (
                    <span className="text-muted-foreground">({moderator.fee}%)</span>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">n/a</div>
              )}
            </div>

            {/* 总金额 */}
            <div>
              <div className="font-medium text-foreground mb-1">Total</div>
              <div className="text-base font-semibold text-foreground">
                {total} {currency}
              </div>
            </div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border my-3" />

        {/* 两栏布局：配送方式 | 配送服务 */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-medium text-foreground mb-1">Shipping Zone</div>
            <div className="text-muted-foreground">{shippingZoneName || '—'}</div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">Shipping Method</div>
            <div className="text-muted-foreground">{shippingMethodName || '—'}</div>
          </div>
        </div>

        {/* 分隔线 */}
        <div className="border-t border-border my-3" />

        {/* 两栏布局：备注 | 备用联系方式 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-medium text-foreground mb-1">Memo</div>
            <div className="text-muted-foreground">{memo || 'n/a'}</div>
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">Alternate Contact</div>
            <div className="text-muted-foreground">{alternateContact || 'n/a'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default OrderDetailsSection;
