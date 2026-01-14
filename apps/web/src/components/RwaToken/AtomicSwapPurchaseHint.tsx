'use client';

import React from 'react';
import { RefreshCw, Shield, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface AtomicSwapPurchaseHintProps {
  className?: string;
  compact?: boolean;
}

/**
 * 原子交换购买提示
 * 向买家解释 RWA 原子交换的购买流程
 */
export function AtomicSwapPurchaseHint({
  className = '',
  compact = false,
}: AtomicSwapPurchaseHintProps) {
  const { t } = useI18n();

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800',
          className
        )}
      >
        <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <span className="font-medium">{t('listing.rwa.atomicSwap') || '原子交换'}</span>
          <span className="text-blue-600 dark:text-blue-400 ml-1">
            - {t('listing.rwa.atomicSwapShort') || '资产与支付同时完成，安全无忧'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'p-4 bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h5 className="font-medium text-blue-700 dark:text-blue-400">
          {t('listing.rwa.atomicSwapPurchase') || '原子交换购买'}
        </h5>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {t('listing.rwa.atomicSwapDescription') || 
          '此商品使用区块链原子交换进行交易，确保买卖双方的资产安全:'}
      </p>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
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
      </div>

      <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800 flex items-center gap-2">
        <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-xs text-green-700 dark:text-green-400 font-medium">
          {t('listing.rwa.safetyNote') || '安全保障: 资产与支付同时完成，无需信任中介'}
        </span>
      </div>
    </Card>
  );
}

export default AtomicSwapPurchaseHint;
