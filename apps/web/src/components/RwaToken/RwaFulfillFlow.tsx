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
      setError(err instanceof Error ? err.message : t('rwa.fulfill.error'));
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
            <div className="w-16 h-16 mx-auto rounded-full bg-warning/15 flex items-center justify-center">
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.waitingBuyer')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.fulfill.waitingDesc')}</p>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        );

      case 'ready':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-success" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.readyToShip')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.fulfill.readyDesc')}</p>
            <div className="flex gap-3 justify-center">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  {t('common.cancel')}
                </Button>
              )}
              <Button onClick={handleExecuteSwap} disabled={isProcessing}>
                <Send className="w-4 h-4 mr-2" />
                {t('rwa.fulfill.executeSwap')}
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
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.executing')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.fulfill.executingDesc')}</p>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.completed')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.fulfill.completedDesc')}</p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-error/15 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.fulfill.error')}</h3>
            <p className="text-sm text-error">{error}</p>
            <Button onClick={() => setStep('ready')}>{t('common.retry')}</Button>
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
