'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import { useI18n, getExplorerResourceUrl } from '@mobazha/core';
import type { TokenInfo } from '@mobazha/core';

export interface RwaTokenFulfillProps {
  orderId: string;
  tokenInfo: TokenInfo;
  tokenAmount: string;
  buyerAddress: string;
  createdAt: string;
  timeoutMinutes?: number;
  isWalletConnected: boolean;
  currentWalletAddress?: string;
  onSelectReceivingAddress?: () => void;
  selectedReceivingAddress?: string;
  onTransfer: (params: {
    orderId: string;
    sellerReceiveAddress: string;
  }) => Promise<{ transactionHash: string }>;
  onComplete?: (transactionHash: string) => void;
  onExpired?: () => void;
  className?: string;
}

/**
 * RWA Token 发货组件
 * 处理 RWA Token 类型订单的特殊发货流程
 */
export const RwaTokenFulfill: React.FC<RwaTokenFulfillProps> = ({
  orderId,
  tokenInfo,
  tokenAmount,
  buyerAddress,
  createdAt,
  timeoutMinutes = 15,
  isWalletConnected,
  currentWalletAddress: _currentWalletAddress,
  onSelectReceivingAddress,
  selectedReceivingAddress,
  onTransfer,
  onComplete,
  onExpired,
  className = '',
}) => {
  const { t } = useI18n();
  const [isTransferring, setIsTransferring] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Calculate time remaining
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const created = new Date(createdAt).getTime();
      const expires = created + timeoutMinutes * 60 * 1000;
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining(t('order.rwa.expired'));
        setIsExpired(true);
        onExpired?.();
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt, timeoutMinutes, onExpired, t]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleTransfer = useCallback(async () => {
    if (!selectedReceivingAddress) {
      setError(t('order.rwa.selectReceiveAddress'));
      return;
    }

    if (!isWalletConnected) {
      setError(t('order.rwa.walletNotConnected'));
      return;
    }

    setIsTransferring(true);
    setError(null);

    try {
      const result = await onTransfer({
        orderId,
        sellerReceiveAddress: selectedReceivingAddress,
      });

      setTransactionHash(result.transactionHash);
      onComplete?.(result.transactionHash);
    } catch (err) {
      let errorMessage = (err as Error).message;
      if (errorMessage.includes('insufficient allowance')) {
        errorMessage = t('order.rwa.errors.insufficientAllowance');
      } else if (errorMessage.includes('insufficient balance')) {
        errorMessage = t('order.rwa.errors.insufficientBalance');
      } else if (errorMessage.includes('user rejected')) {
        errorMessage = t('order.rwa.errors.userRejected');
      }
      setError(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  }, [selectedReceivingAddress, isWalletConnected, orderId, onTransfer, onComplete, t]);

  const getTxExplorerUrl = useCallback(
    (hash: string) => {
      return getExplorerResourceUrl(hash, 'tx', { chainId: tokenInfo.chainId }) || '';
    },
    [tokenInfo.chainId]
  );

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-foreground mb-1">{t('order.rwa.transferToken')}</h2>
        <p className="text-sm text-muted-foreground">{t('order.rwa.transferDescription')}</p>
      </div>

      {/* Timer */}
      <div
        className={`text-center p-3 rounded-lg mb-6 ${isExpired ? 'bg-error/15' : 'bg-warning/15'}`}
      >
        <p className="text-xs text-muted-foreground mb-1">{t('order.rwa.timeRemaining')}</p>
        <p className={`text-2xl font-mono font-bold ${isExpired ? 'text-error' : 'text-warning'}`}>
          {timeRemaining}
        </p>
      </div>

      {/* Wallet Warning */}
      {!isWalletConnected && (
        <div className="bg-warning/15 border border-warning/20 rounded-lg p-3 mb-4">
          <HStack gap="sm" align="start">
            <svg
              className="w-5 h-5 text-warning flex-shrink-0"
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
            <p className="text-sm text-warning">{t('order.rwa.walletNotConnected')}</p>
          </HStack>
        </div>
      )}

      <VStack gap="md">
        {/* Token Info */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">{t('order.rwa.tokenAddress')}</p>
          <HStack justify="between" align="center" className="bg-muted rounded-lg p-2">
            <span className="text-xs font-mono text-foreground truncate max-w-[200px]">
              {tokenInfo.address}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleCopy(tokenInfo.address, 'token')}
            >
              {copied === 'token' ? '✓' : t('common.copy')}
            </Button>
          </HStack>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">{t('order.rwa.tokenAmount')}</p>
          <p className="text-lg font-medium text-foreground">
            {tokenAmount} <span className="text-sm text-muted-foreground">{tokenInfo.symbol}</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">{t('order.rwa.buyerAddress')}</p>
          <HStack justify="between" align="center" className="bg-muted rounded-lg p-2">
            <span className="text-xs font-mono text-foreground truncate max-w-[200px]">
              {buyerAddress}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleCopy(buyerAddress, 'buyer')}
            >
              {copied === 'buyer' ? '✓' : t('common.copy')}
            </Button>
          </HStack>
        </div>

        {/* Receiving Address Selection */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t('order.rwa.sellerReceiveAddress')}
          </p>
          {selectedReceivingAddress ? (
            <HStack
              justify="between"
              align="center"
              className="bg-primary/5 dark:bg-primary/10 rounded-lg p-2 border border-primary/30"
            >
              <span className="text-xs font-mono text-foreground truncate max-w-[200px]">
                {selectedReceivingAddress}
              </span>
              {onSelectReceivingAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={onSelectReceivingAddress}
                >
                  {t('common.edit')}
                </Button>
              )}
            </HStack>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start text-muted-foreground"
              onClick={onSelectReceivingAddress}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {t('order.rwa.selectReceiveAddress')}
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-error/15 border border-error/20 rounded-lg p-3">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Transfer Button */}
        {!transactionHash && (
          <Button
            className="w-full"
            onClick={handleTransfer}
            disabled={
              isTransferring || !isWalletConnected || !selectedReceivingAddress || isExpired
            }
          >
            {isTransferring ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('order.rwa.transferring')}
              </>
            ) : (
              t('order.rwa.transferToken')
            )}
          </Button>
        )}

        {/* Success Message */}
        {transactionHash && (
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/30 rounded-lg p-4">
            <HStack gap="sm" align="center" className="mb-2">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-success">
                {t('order.rwa.transferSuccess')}
              </span>
            </HStack>
            <div className="bg-card rounded p-2">
              <p className="text-xs text-muted-foreground mb-1">{t('order.rwa.transactionHash')}</p>
              <HStack justify="between" align="center">
                <span className="text-xs font-mono text-foreground truncate max-w-[180px]">
                  {transactionHash}
                </span>
                <HStack gap="xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopy(transactionHash, 'hash')}
                  >
                    {copied === 'hash' ? (
                      <svg
                        className="w-3.5 h-3.5 text-primary"
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
                    ) : (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    )}
                  </Button>
                  {getTxExplorerUrl(transactionHash) ? (
                    <a
                      href={getTxExplorerUrl(transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  ) : (
                    <span className="h-6 w-6 flex items-center justify-center text-muted-foreground">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </span>
                  )}
                </HStack>
              </HStack>
            </div>
          </div>
        )}
      </VStack>
    </Card>
  );
};

export default RwaTokenFulfill;
