'use client';

import React, { useState, useCallback } from 'react';
import { Wallet, CheckCircle, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import type { Order, PredefinedAsset } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface RwaPurchaseFlowProps {
  order: Order;
  asset?: PredefinedAsset | null;
  onApprove: () => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

type PurchaseStep = 'connect' | 'approve' | 'waiting' | 'completed' | 'error';

/**
 * RWA 购买流程组件
 * 处理买家的预授权和等待原子交换
 */
export function RwaPurchaseFlow({
  order,
  asset,
  onApprove,
  onCancel,
  className = '',
}: RwaPurchaseFlowProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<PurchaseStep>('connect');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setStep('approve');

      await onApprove();

      setStep('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败');
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  }, [onApprove]);

  const getStepContent = () => {
    switch (step) {
      case 'connect':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">
              {t('rwa.purchase.connectWallet') || '连接钱包'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.purchase.connectDesc') || '请连接钱包以授权支付代币'}
            </p>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.processing') || '处理中...'}
                </>
              ) : (
                <>
                  {t('rwa.purchase.authorize') || '授权支付'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      case 'approve':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-yellow-600 dark:text-yellow-400 animate-spin" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.approving') || '授权中...'}</h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.purchase.approvingDesc') || '请在钱包中确认授权交易'}
            </p>
          </div>
        );

      case 'waiting':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">
              {t('rwa.purchase.waitingSeller') || '等待卖家发货'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.purchase.waitingDesc') || '支付已授权，等待卖家完成原子交换'}
            </p>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                {t('common.cancel') || '取消订单'}
              </Button>
            )}
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.completed') || '交易完成'}</h3>
            <p className="text-sm text-muted-foreground">
              {t('rwa.purchase.completedDesc') || '原子交换已完成，Token 已转入您的钱包'}
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.error') || '操作失败'}</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button onClick={() => setStep('connect')}>{t('common.retry') || '重试'}</Button>
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
        {['connect', 'approve', 'waiting', 'completed'].map((s, i) => (
          <div
            key={s}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              step === s || ['connect', 'approve', 'waiting', 'completed'].indexOf(step) > i
                ? 'bg-primary'
                : 'bg-muted'
            )}
          />
        ))}
      </div>
    </Card>
  );
}

export default RwaPurchaseFlow;
