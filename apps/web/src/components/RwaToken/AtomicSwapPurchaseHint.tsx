'use client';

import React from 'react';
import { RefreshCw, Shield, Wallet, Clock, CheckCircle2, Zap } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface AtomicSwapPurchaseHintProps {
  className?: string;
  compact?: boolean;
  /** 是否需要确认模式，false 表示即时交易模式 */
  isConfirmRequired?: boolean;
}

/**
 * 原子交换购买提示
 * 向买家解释 RWA 原子交换的购买流程
 * 根据 isConfirmRequired 显示不同的交易步骤
 */
export function AtomicSwapPurchaseHint({
  className = '',
  compact = false,
  isConfirmRequired = true,
}: AtomicSwapPurchaseHintProps) {
  const { t } = useI18n();

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-3 bg-info/8 rounded-lg border border-info/20',
          className
        )}
      >
        {isConfirmRequired ? (
          <RefreshCw className="w-4 h-4 text-info flex-shrink-0" />
        ) : (
          <Zap className="w-4 h-4 text-warning flex-shrink-0" />
        )}
        <div className="text-sm text-info">
          <span className="font-medium">
            {isConfirmRequired
              ? t('listing.rwa.atomicSwap') || '原子交换'
              : t('listing.rwa.instantSwap') || '即时交换'}
          </span>
          <span className="text-info ml-1">
            -{' '}
            {isConfirmRequired
              ? t('listing.rwa.atomicSwapShort') || '资产与支付同时完成，安全无忧'
              : t('listing.rwa.instantSwapShort') || '付款后立即获得资产'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('p-4 bg-info/8 border-info/20', className)}>
      <div className="flex items-center gap-2 mb-3">
        {isConfirmRequired ? (
          <RefreshCw className="w-5 h-5 text-info" />
        ) : (
          <Zap className="w-5 h-5 text-warning" />
        )}
        <h5 className="font-medium text-info">
          {isConfirmRequired
            ? t('listing.rwa.atomicSwapPurchase') || '原子交换购买'
            : t('listing.rwa.instantSwapPurchase') || '即时交换购买'}
        </h5>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {isConfirmRequired
          ? t('listing.rwa.atomicSwapDescription') ||
            '此商品使用区块链原子交换进行交易，确保买卖双方的资产安全:'
          : t('listing.rwa.instantSwapDescription') || '此商品支持即时购买，付款后立即获得资产:'}
      </p>

      <div className="space-y-3">
        {/* 步骤 1：连接钱包 - 两种模式都有 */}
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-info/15 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-3.5 h-3.5 text-info" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              {t('listing.rwa.step1Title') || '1. 连接钱包并授权'}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('listing.rwa.step1Desc') || '授权支付金额，资金暂不转出'}
            </div>
          </div>
        </div>

        {isConfirmRequired ? (
          <>
            {/* 确认模式：步骤 2 - 等待卖家确认 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-info/15 flex items-center justify-center flex-shrink-0">
                <Clock className="w-3.5 h-3.5 text-info" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {t('listing.rwa.step2Title') || '2. 等待卖家确认'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('listing.rwa.step2Desc') || '卖家收到订单后确认发货'}
                </div>
              </div>
            </div>

            {/* 确认模式：步骤 3 - 自动完成交换 */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-info/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-info" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {t('listing.rwa.step3Title') || '3. 自动完成交换'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('listing.rwa.step3Desc') || '资产与支付同时完成，原子级安全'}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* 即时模式：步骤 2 - 即时完成交换 */
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-warning/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-warning" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">
                {t('listing.rwa.instantStep2Title') || '2. 即时完成交换'}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('listing.rwa.instantStep2Desc') || '资产直接转入您的钱包，无需等待'}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-info/20 flex items-center gap-2">
        <Shield className="w-4 h-4 text-success" />
        <span className="text-xs text-success font-medium">
          {t('listing.rwa.safetyNote') || '安全保障: 资产与支付同时完成，无需信任中介'}
        </span>
      </div>
    </Card>
  );
}

export default AtomicSwapPurchaseHint;
