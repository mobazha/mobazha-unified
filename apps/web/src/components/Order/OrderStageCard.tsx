'use client';

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import { getBlockExplorerUrl } from './utils';
import { Card } from '@/components/ui/card';
import { Check, Package, CheckCircle } from 'lucide-react';
import { useI18n, useCurrency, getChainFromCoin, getChainByEVMId } from '@mobazha/core';
import { TokenIcon } from '@/components/Payment/TokenIcon';

export interface OrderStageCardProps {
  /** 阶段标题 */
  title: string;
  /** 时间戳 */
  timestamp?: string;
  /** 左侧图标 */
  icon?: React.ReactNode;
  /** 详细内容 */
  children: React.ReactNode;
  /** 右侧操作按钮 */
  actions?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 是否显示分隔线 */
  showDivider?: boolean;
}

/**
 * 格式化日期时间（根据 locale 自动选择格式）
 */
function formatDateTime(dateString: string, locale: string = 'en'): string {
  try {
    const date = new Date(dateString);
    // 根据语言选择合适的 locale（支持所有 i18n 语言）
    const localeMap: Record<string, string> = {
      en: 'en-US',
      zh: 'zh-CN',
      de: 'de-DE',
      es: 'es-ES',
      fr: 'fr-FR',
      ja: 'ja-JP',
      ko: 'ko-KR',
      pt: 'pt-BR',
      ru: 'ru-RU',
    };
    const dateLocale = localeMap[locale] || localeMap.en;
    return date.toLocaleDateString(dateLocale, {
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
 * 订单阶段卡片组件 - 紧凑版
 *
 * 移动端规范：
 * - 标题: text-sm (14px)
 * - 正文: text-sm (14px)
 * - 辅助文字: text-xs (12px)
 * - 内边距: p-2.5 / p-3 (10-12px)
 */
export const OrderStageCard = memo(function OrderStageCard({
  title,
  timestamp,
  icon,
  children,
  actions,
  className,
  showDivider = true,
}: OrderStageCardProps) {
  const { locale } = useI18n();

  return (
    <div className={cn('relative', className)}>
      {/* 分隔线 */}
      {showDivider && <div className="border-t border-border mb-2.5" />}

      {/* 标题行 */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && <div className="flex-shrink-0 text-muted-foreground">{icon}</div>}
          <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
        </div>
        {timestamp && (
          <span className="text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
            {formatDateTime(timestamp, locale)}
          </span>
        )}
      </div>

      {/* 内容区域 */}
      <div className="text-sm">{children}</div>

      {/* 操作按钮 - 仅桌面端显示，移动端操作放在底部 footer */}
      {actions && <div className="mt-2 hidden lg:flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
});

/**
 * 支付信息卡片 - 紧凑版
 */
export interface PaymentCardProps {
  /** 支付金额（加密货币） */
  amount: string;
  /** 支付币种（加密货币，如 ETH） */
  currency: string;
  /** 原始定价金额（法币，如 "0.60"） */
  pricingAmount?: string;
  /** 原始定价币种（法币，如 "USD"） */
  pricingCurrency?: string;
  txHash?: string;
  confirmations?: number;
  chainId?: number;
  timestamp?: string;
  blockchainUrl?: string;
  description?: string;
  /** 卡片标题，默认 "Paid" */
  title?: string;
  className?: string;
}

export const PaymentCard = memo(function PaymentCard({
  amount,
  currency,
  pricingAmount,
  pricingCurrency,
  txHash,
  confirmations,
  chainId,
  blockchainUrl,
  timestamp,
  description,
  title,
  className,
  showDivider = true,
}: PaymentCardProps & { showDivider?: boolean }) {
  const { t } = useI18n();
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  // 判断是否有原始定价信息（与支付币种不同时显示）
  const showPricingInfo = pricingAmount && pricingCurrency && pricingCurrency !== currency;

  // 格式化交易 hash（显示前后各 6 位）
  const formatTxHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  const txUrl = txHash ? getBlockExplorerUrl(txHash, currency, chainId) || blockchainUrl || '' : '';

  return (
    <OrderStageCard
      title={title || t('order.paid')}
      timestamp={timestamp}
      className={className}
      showDivider={showDivider}
    >
      <div className="p-2.5">
        <div className="flex items-center gap-2.5">
          {/* 币种图标 - 使用项目统一的 TokenIcon，支持显示链徽章 */}
          {(() => {
            // 优先使用 EVM chainId 获取链，否则从币种名推断
            const chainFromEVM = chainId ? getChainByEVMId(chainId)?.id : null;
            const chainFromCurrency = getChainFromCoin(currency);
            const chainSymbol = chainFromEVM || chainFromCurrency || null;
            // 只有当代币不是原生代币时才显示链徽章（如 ETHUSDT 显示 ETH 徽章，但 ETH 本身不需要）
            const showBadge = !!chainSymbol && currency.toUpperCase() !== chainSymbol.toUpperCase();
            return (
              <TokenIcon
                token={currency}
                size={28}
                className="flex-shrink-0"
                showChainBadge={showBadge}
                chainId={chainSymbol || undefined}
              />
            );
          })()}

          {/* 支付信息 */}
          <div className="flex-1 min-w-0">
            {/* 原始定价（法币） */}
            {showPricingInfo && (
              <p className="text-sm sm:text-base font-semibold text-foreground">
                {formatCurrencyPrice(pricingAmount, pricingCurrency)}
              </p>
            )}
            {/* 实际支付（加密货币） */}
            <p
              className={cn(
                'text-foreground flex items-center gap-1',
                showPricingInfo
                  ? 'text-xs sm:text-sm text-muted-foreground'
                  : 'text-sm sm:text-base font-semibold'
              )}
            >
              {showPricingInfo ? `≈ ${amount} ${currency}` : `${amount} ${currency}`}
              {confirmations !== undefined && confirmations > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({confirmations} confirms)
                </span>
              )}
            </p>
            {/* 交易 hash */}
            {txHash && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {txUrl ? (
                  <a
                    href={txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-mono text-primary hover:underline"
                    title={txHash}
                  >
                    {formatTxHash(txHash)}
                  </a>
                ) : (
                  <span className="text-xs font-mono text-muted-foreground" title={txHash}>
                    {formatTxHash(txHash)}
                  </span>
                )}
              </div>
            )}
            {/* 描述 */}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
    </OrderStageCard>
  );
});

/**
 * 评价展示卡片 - 紧凑版
 */
export interface OrderRatingCardProps {
  vendor?: {
    name: string;
    avatar?: string;
  };
  overallRating: number;
  ratings?: {
    quality?: number;
    asAdvertised?: number;
    delivery?: number;
    service?: number;
  };
  review?: string;
  timestamp?: string;
  className?: string;
}

function StarRating({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }, (_, i) => (
        <svg
          key={i}
          className={cn(
            'w-2.5 h-2.5 sm:w-3 sm:h-3',
            i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'
          )}
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export const OrderRatingCard = memo(function OrderRatingCard({
  vendor,
  overallRating,
  review,
  timestamp,
  className,
}: OrderRatingCardProps) {
  return (
    <OrderStageCard title="Order Complete" timestamp={timestamp} className={className}>
      <Card className="p-2.5">
        <div className="flex items-center gap-2">
          {vendor?.avatar ? (
            <img
              src={vendor.avatar}
              alt={vendor.name}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {vendor?.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground truncate">
                {vendor?.name || 'Buyer'}
              </span>
              <StarRating rating={overallRating} />
            </div>
            {review && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{review}</p>
            )}
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

/**
 * 发货/交付信息卡片 - 紧凑版
 * 根据商品类型显示不同内容：
 * - PHYSICAL_GOOD: 显示物流信息
 * - SERVICE: 显示服务已交付
 * - DIGITAL_GOOD: 显示数字商品已交付
 */
export interface FulfillmentCardProps {
  timestamp?: string;
  shipper?: string;
  trackingNumber?: string;
  note?: string;
  /** 商品类型：PHYSICAL_GOOD | SERVICE | DIGITAL_GOOD */
  contractType?: string;
  className?: string;
}

export const FulfillmentCard = memo(function FulfillmentCard({
  timestamp,
  shipper,
  trackingNumber,
  note,
  contractType,
  className,
  showDivider = true,
}: FulfillmentCardProps & { showDivider?: boolean }) {
  const { t } = useI18n();
  // 根据商品类型确定显示内容
  const isPhysicalGood = !contractType || contractType === 'PHYSICAL_GOOD';
  const isService = contractType === 'SERVICE';

  // 标题和内容
  const title = isPhysicalGood ? t('order.stages.fulfilled') : t('order.stages.delivered');
  const statusText = isPhysicalGood
    ? t('order.fulfillment.packageShipped')
    : isService
      ? t('order.fulfillment.serviceDelivered')
      : t('order.fulfillment.digitalDelivered');

  return (
    <OrderStageCard
      title={title}
      timestamp={timestamp}
      icon={<Package className="w-4 h-4" />}
      className={className}
      showDivider={showDivider}
    >
      <Card className="p-2.5 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            {isPhysicalGood ? (
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{statusText}</p>
            {/* 物流信息仅对实物商品显示 */}
            {isPhysicalGood && shipper && (
              <p className="text-xs text-muted-foreground">
                {t('order.fulfillment.carrier')}: {shipper}
              </p>
            )}
            {isPhysicalGood && trackingNumber && (
              <p className="text-xs text-muted-foreground">
                {t('order.fulfillment.trackingNumber')}:{' '}
                <span className="font-mono text-primary">{trackingNumber}</span>
              </p>
            )}
            {note && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note}</p>}
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

/**
 * 订单确认卡片 - 紧凑版
 */
export interface AcceptedCardProps {
  timestamp?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const AcceptedCard = memo(function AcceptedCard({
  timestamp,
  description,
  actions,
  className,
  showDivider = true,
}: AcceptedCardProps & { showDivider?: boolean }) {
  const { t } = useI18n();

  return (
    <OrderStageCard
      title={t('order.stages.accepted')}
      timestamp={timestamp}
      icon={<CheckCircle className="w-4 h-4" />}
      actions={actions}
      className={className}
      showDivider={showDivider}
    >
      <Card className="p-2.5 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{t('order.orderAccepted')}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

/**
 * 订单完成卡片 - 紧凑版
 */
export interface OrderCompleteCardProps {
  timestamp?: string;
  amount?: string;
  currency?: string;
  txUrl?: string;
  description?: string;
  className?: string;
}

export const OrderCompleteCard = memo(function OrderCompleteCard({
  timestamp,
  amount,
  currency,
  description,
  className,
  showDivider = true,
}: OrderCompleteCardProps & { showDivider?: boolean }) {
  const { t } = useI18n();

  return (
    <OrderStageCard
      title={t('order.stages.complete')}
      timestamp={timestamp}
      className={className}
      showDivider={showDivider}
    >
      <Card className="p-2.5 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {amount && currency && (
              <p className="text-sm sm:text-base font-semibold text-foreground">
                {amount} {currency}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {description || t('order.fundsReleased')}
            </p>
          </div>
        </div>
      </Card>
    </OrderStageCard>
  );
});

export default OrderStageCard;
