'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Send, CheckCircle, Loader2, AlertCircle, Clock, Wallet } from 'lucide-react';
import type { Order, PredefinedAsset } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RwaFulfillFlowProps {
  order: Order;
  asset?: PredefinedAsset | null;
  onExecuteSwap: () => Promise<void>;
  onCancel?: () => void;
  buyerApproved?: boolean;
  className?: string;
}

type FulfillStep = 'waiting' | 'ready' | 'executing' | 'completed' | 'error';

/**
 * RWA 发货流程组件
 * 处理卖家执行原子交换
 */
export function RwaFulfillFlow({
  order,
  asset,
  onExecuteSwap,
  onCancel,
  buyerApproved = false,
  className = '',
}: RwaFulfillFlowProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<FulfillStep>(buyerApproved ? 'ready' : 'waiting');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // 更新步骤状态
  useEffect(() => {
    if (buyerApproved && step === 'waiting') {
      setStep('ready');
    }
  }, [buyerApproved, step]);

  // 倒计时效果
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleExecuteSwap = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setStep('executing');

      await onExecuteSwap();

      setStep('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  }, [onExecuteSwap]);

  const getStepContent = () => {
    switch (step) {
      case 'waiting':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="font-semibold text-lg">
              {t('rwa.fulfill.waitingBuyer') || '等待买家授权'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.fulfill.waitingDesc') || '买家尚未完成支付授权，请等待'}
            </p>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                {t('common.cancel') || '取消订单'}
              </Button>
            )}
          </div>
        );

      case 'ready':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.readyToShip') || '可以发货'}</h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.fulfill.readyDesc') || '买家已授权支付，点击发货执行原子交换'}
            </p>
            <div className="flex gap-3 justify-center">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  {t('common.cancel') || '取消'}
                </Button>
              )}
              <Button onClick={handleExecuteSwap} disabled={isProcessing}>
                <Send className="w-4 h-4 mr-2" />
                {t('rwa.fulfill.executeSwap') || '执行原子交换'}
              </Button>
            </div>
          </div>
        );

      case 'executing':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.executing') || '执行中...'}</h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.fulfill.executingDesc') || '正在执行原子交换，请在钱包中确认交易'}
            </p>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.completed') || '发货完成'}</h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.fulfill.completedDesc') || '原子交换已完成，Token 已转移给买家，款项已到账'}
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.error') || '执行失败'}</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button onClick={() => setStep('ready')}>{t('common.retry') || '重试'}</Button>
          </div>
        );
    }
  };

  return (
    <Card className={cn('p-6', className)}>
      {/* 资产信息 */}
      {asset && (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="text-3xl">{asset.emoji}</div>
          <div>
            <h4 className="font-semibold">{asset.name}</h4>
            <p className="text-sm text-muted-foreground">{asset.typeName}</p>
          </div>
        </div>
      )}

      {/* 步骤内容 */}
      {getStepContent()}

      {/* 步骤指示器 */}
      <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-border">
        {['waiting', 'ready', 'executing', 'completed'].map((s, i) => (
          <div
            key={s}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              step === s || ['waiting', 'ready', 'executing', 'completed'].indexOf(step) > i
                ? 'bg-primary'
                : 'bg-muted'
            )}
          />
        ))}
      </div>
    </Card>
  );
}

export default RwaFulfillFlow;
