'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Wallet,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
  Shield,
  ExternalLink,
} from 'lucide-react';
import type { Order, PredefinedAsset } from '@mobazha/core';
import {
  useI18n,
  useWallet,
  resolveRwaAsset,
  UniversalSwapService,
  TradeMode,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface RwaPurchaseFlowProps {
  order: Order;
  asset?: PredefinedAsset | null;
  /** RWA 交易模式 (0=instant, 1=confirm_required) */
  rwaTradeMode?: number;
  /** 托管超时时间（秒） */
  escrowTimeoutSeconds?: number;
  /** 代币标识符 */
  cryptoListingCurrencyCode?: string;
  /** 购买成功回调 */
  onSuccess?: () => void;
  /** 取消回调 */
  onCancel?: () => void;
  className?: string;
}

type PurchaseStep =
  | 'connect'
  | 'approve'
  | 'executing'
  | 'locking'
  | 'waiting'
  | 'completed'
  | 'error';

/**
 * 格式化超时时间
 */
function formatTimeout(seconds: number, t: (key: string) => string): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days} ${t('common.days')}`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ${t('common.hours')}`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes} ${t('common.minutes')}`;
}

/**
 * 获取区块链浏览器链接
 */
function getExplorerUrl(txHash: string, chainId?: number): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io/tx/',
    11155111: 'https://sepolia.etherscan.io/tx/',
    56: 'https://bscscan.com/tx/',
    97: 'https://testnet.bscscan.com/tx/',
    8453: 'https://basescan.org/tx/',
    84532: 'https://sepolia.basescan.org/tx/',
  };
  const baseUrl = explorers[chainId || 11155111] || 'https://etherscan.io/tx/';
  return `${baseUrl}${txHash}`;
}

/**
 * RWA 购买流程组件
 * 支持即时交易和确认交易两种模式
 */
export function RwaPurchaseFlow({
  order,
  asset: propAsset,
  rwaTradeMode = 0,
  escrowTimeoutSeconds = 86400,
  cryptoListingCurrencyCode,
  onSuccess,
  onCancel,
  className = '',
}: RwaPurchaseFlowProps) {
  const { t } = useI18n();
  const {
    isConnected,
    isConnecting,
    walletInfo,
    connect,
    openModal,
    getProvider,
    getSigner,
    getCurrentChainId,
  } = useWallet();

  // 状态
  const [step, setStep] = useState<PurchaseStep>('connect');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [swapService, setSwapService] = useState<UniversalSwapService | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // 判断是否为确认交易模式
  const isConfirmRequired = rwaTradeMode === 1 || rwaTradeMode === TradeMode.ConfirmRequired;

  // 解析 RWA 资产信息
  const resolvedAsset = useMemo(() => {
    if (propAsset) return propAsset;
    // 从订单中解析
    const listing = order.contract?.vendorListings?.[0];
    if (listing) {
      return resolveRwaAsset({
        item: listing.item,
        metadata: listing.metadata,
      } as any);
    }
    return null;
  }, [propAsset, order]);

  // 获取订单金额
  const orderAmount = useMemo(() => {
    const listing = order.contract?.vendorListings?.[0];
    const item = order.contract?.buyerOrder?.items?.[0];
    const price = Number(listing?.item?.price) || 0;
    const quantity = Number(item?.quantity) || 1;
    return price * quantity;
  }, [order]);

  // 初始化 Swap 服务
  useEffect(() => {
    const initService = async () => {
      if (!isConnected || !walletInfo) return;

      try {
        const provider = getProvider();
        if (!provider) return;

        // 获取链名称
        const chainId = getCurrentChainId();
        const chainIdNum = chainId ? Number(chainId) : 0;
        const chainName = chainIdNum === 1 ? 'ETH' : chainIdNum === 11155111 ? 'ETH' : 'ETH';
        const isTestnet = chainIdNum === 11155111 || chainIdNum === 97 || chainIdNum === 84532;

        const service = new UniversalSwapService();
        // UniversalSwapService.initialize 需要原始的 EIP-1193 provider
        // BrowserProvider 内部有 _network 属性指向原始 provider
        const rawProvider = (provider as any)._network?.provider || window.ethereum;
        if (rawProvider) {
          await service.initialize(rawProvider, chainName, walletInfo.address, isTestnet);
          setSwapService(service);
        }
      } catch (err) {
        console.error('Failed to initialize swap service:', err);
      }
    };

    initService();
  }, [isConnected, walletInfo, getProvider, getCurrentChainId]);

  // 更新步骤基于钱包连接状态
  useEffect(() => {
    if (isConnected && step === 'connect') {
      // 钱包已连接，可以进入下一步
    }
  }, [isConnected, step]);

  // 连接钱包
  const handleConnect = useCallback(async () => {
    try {
      setIsProcessing(true);
      setError(null);
      await openModal({ view: 'Connect' });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rwa.purchase.connectFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [openModal, t]);

  // 授权并执行交易
  const handleApproveAndExecute = useCallback(async () => {
    if (!swapService) {
      setError(t('rwa.purchase.serviceNotReady'));
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStep('approve');

      // 获取订单的外部 ID
      const externalOrderId =
        (order.contract as any)?.OrderID || (order.contract as any)?.orderID || '';

      // 1. 授权支付代币
      // 这里需要从订单中获取支付代币地址和金额
      // 暂时使用模拟逻辑，实际需要从后端获取
      const listing = order.contract?.vendorListings?.[0];
      const paymentCoin = order.contract?.buyerOrder?.payment?.coin || 'ETHUSDT';

      // 获取支付代币配置（从 cryptoListingCurrencyCode 解析链信息）
      // TODO: 实际实现需要从配置中获取支付代币地址

      if (isConfirmRequired) {
        // 确认交易模式：锁定资金
        setStep('locking');

        // 调用 buyByExternalId 锁定资金
        const result = await swapService.buyByExternalId(externalOrderId);

        if (result.success && result.transactionHash) {
          setTxHash(result.transactionHash);
          setStep('waiting');
        } else {
          throw new Error(result.message || t('rwa.purchase.lockFailed'));
        }
      } else {
        // 即时交易模式：直接执行交换
        setStep('executing');

        // 调用 executeSwapByExternalId 执行交换
        const result = await swapService.executeSwapByExternalId(externalOrderId);

        if (result.success && result.transactionHash) {
          setTxHash(result.transactionHash);
          setStep('completed');
          onSuccess?.();
        } else {
          throw new Error(result.message || t('rwa.purchase.executeFailed'));
        }
      }
    } catch (err) {
      console.error('Purchase failed:', err);
      setError(err instanceof Error ? err.message : t('rwa.purchase.failed'));
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  }, [swapService, order, isConfirmRequired, onSuccess, t]);

  // 取消锁定
  const handleCancelLock = useCallback(async () => {
    if (!swapService) return;

    try {
      setIsProcessing(true);
      const externalOrderId =
        (order.contract as any)?.OrderID || (order.contract as any)?.orderID || '';
      const result = await swapService.cancelByBuyerByExternalId(externalOrderId);

      if (result.success) {
        onCancel?.();
      } else {
        setError(result.message || t('rwa.purchase.cancelFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rwa.purchase.cancelFailed'));
    } finally {
      setIsProcessing(false);
    }
  }, [swapService, order, onCancel, t]);

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (step) {
      case 'connect':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.connectWallet')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.purchase.connectDesc')}</p>

            {/* 交易模式提示 */}
            <div
              className={cn(
                'p-3 rounded-lg text-left',
                isConfirmRequired
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              )}
            >
              <div className="flex items-start gap-2">
                {isConfirmRequired ? (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                ) : (
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isConfirmRequired
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-green-700 dark:text-green-300'
                    )}
                  >
                    {isConfirmRequired
                      ? t('listing.rwa.confirmRequired')
                      : t('listing.rwa.instantTrade')}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-0.5',
                      isConfirmRequired
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    )}
                  >
                    {isConfirmRequired
                      ? `${t('rwa.purchase.lockTimeout')}: ${formatTimeout(escrowTimeoutSeconds, t)}`
                      : t('rwa.purchase.instantDesc')}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={isConnected ? () => setShowConfirmDialog(true) : handleConnect}
              disabled={isProcessing || isConnecting}
              className="w-full"
            >
              {isProcessing || isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : isConnected ? (
                <>
                  {isConfirmRequired ? t('rwa.purchase.lockPayment') : t('rwa.purchase.payNow')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  {t('payment.connectWallet')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {isConnected && walletInfo && (
              <p className="text-xs text-muted-foreground">
                {t('rwa.purchase.connectedAs')}: {walletInfo.address?.slice(0, 6)}...
                {walletInfo.address?.slice(-4)}
              </p>
            )}
          </div>
        );

      case 'approve':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-yellow-600 dark:text-yellow-400 animate-spin" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.approving')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.purchase.approvingDesc')}</p>
          </div>
        );

      case 'executing':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.executing')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.purchase.executingDesc')}</p>
          </div>
        );

      case 'locking':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-spin" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.locking')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.purchase.lockingDesc')}</p>
          </div>
        );

      case 'waiting':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.waitingSeller')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.purchase.waitingDesc')}</p>

            {/* 锁定信息 */}
            <div className="p-3 bg-muted rounded-lg text-left">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('rwa.purchase.lockTimeout')}</span>
                <span className="font-medium">{formatTimeout(escrowTimeoutSeconds, t)}</span>
              </div>
            </div>

            {/* 交易链接 */}
            {txHash && (
              <a
                href={getExplorerUrl(txHash, getCurrentChainId() || undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t('rwa.purchase.viewTransaction')}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancelLock}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('rwa.purchase.cancelLock')
                )}
              </Button>
              {onCancel && (
                <Button variant="ghost" onClick={onCancel} className="flex-1">
                  {t('common.back')}
                </Button>
              )}
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.completed')}</h3>
            <p className="text-sm text-muted-foreground">{t('rwa.purchase.completedDesc')}</p>

            {/* 交易链接 */}
            {txHash && (
              <a
                href={getExplorerUrl(txHash, getCurrentChainId() || undefined)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {t('rwa.purchase.viewTransaction')}
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="font-semibold text-lg">{t('rwa.purchase.error')}</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <div className="flex gap-2">
              <Button onClick={() => setStep('connect')} className="flex-1">
                {t('common.retry')}
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel} className="flex-1">
                  {t('common.cancel')}
                </Button>
              )}
            </div>
          </div>
        );
    }
  };

  // 步骤列表
  const steps = isConfirmRequired
    ? ['connect', 'approve', 'locking', 'waiting', 'completed']
    : ['connect', 'approve', 'executing', 'completed'];

  const currentStepIndex = steps.indexOf(step === 'error' ? 'connect' : step);

  return (
    <Card className={cn('p-6', className)}>
      {/* 资产信息 */}
      {resolvedAsset && (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <div className="text-3xl">{resolvedAsset.emoji}</div>
          <div className="flex-1">
            <h4 className="font-semibold">{resolvedAsset.name}</h4>
            <p className="text-sm text-muted-foreground">{resolvedAsset.typeName}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-primary">${orderAmount.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* 步骤内容 */}
      {renderStepContent()}

      {/* 步骤指示器 */}
      <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-border">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* 交易确认对话框 */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isConfirmRequired
                ? t('rwa.purchase.confirmLock')
                : t('rwa.purchase.confirmPurchase')}
            </DialogTitle>
            <DialogDescription>
              {isConfirmRequired
                ? t('rwa.purchase.confirmLockDesc')
                : t('rwa.purchase.confirmPurchaseDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {/* 资产信息 */}
            {resolvedAsset && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{resolvedAsset.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{resolvedAsset.name}</p>
                    <p className="text-xs text-muted-foreground">{resolvedAsset.typeName}</p>
                  </div>
                </div>
                <p className="font-semibold text-primary">${orderAmount.toFixed(2)}</p>
              </div>
            )}

            {/* 交易模式信息 */}
            <div
              className={cn(
                'p-3 rounded-lg',
                isConfirmRequired
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              )}
            >
              <div className="flex items-start gap-2">
                {isConfirmRequired ? (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                ) : (
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5" />
                )}
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isConfirmRequired
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-green-700 dark:text-green-300'
                    )}
                  >
                    {isConfirmRequired
                      ? t('listing.rwa.confirmRequired')
                      : t('listing.rwa.instantTrade')}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-0.5',
                      isConfirmRequired
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-green-600 dark:text-green-400'
                    )}
                  >
                    {isConfirmRequired
                      ? `${t('rwa.purchase.lockTimeout')}: ${formatTimeout(escrowTimeoutSeconds, t)}`
                      : t('rwa.purchase.instantDesc')}
                  </p>
                </div>
              </div>
            </div>

            {/* 钱包地址 */}
            {walletInfo && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('rwa.purchase.payingFrom')}</span>
                <span className="font-mono">
                  {walletInfo.address?.slice(0, 6)}...{walletInfo.address?.slice(-4)}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                setShowConfirmDialog(false);
                handleApproveAndExecute();
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                t('rwa.purchase.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default RwaPurchaseFlow;
