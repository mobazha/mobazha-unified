'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';

export interface PaymentInstructionsProps {
  orderId: string;
  paymentAddress: string;
  amount: string;
  paymentCoin: string;
  displayCurrency?: string;
  displayAmount?: string;
  expiresAt?: string;
  isLoading?: boolean;
  confirmations?: number;
  requiredConfirmations?: number;
  onPaymentDetected?: () => void;
  onCancel?: () => void;
  className?: string;
}

/**
 * 支付指引组件
 * 显示支付地址、二维码、金额和支付状态
 */
export const PaymentInstructions: React.FC<PaymentInstructionsProps> = ({
  orderId,
  paymentAddress,
  amount,
  paymentCoin,
  displayCurrency,
  displayAmount,
  expiresAt,
  isLoading = false,
  confirmations = 0,
  requiredConfirmations = 1,
  onPaymentDetected: _onPaymentDetected,
  onCancel,
  className = '',
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState<'address' | 'amount' | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Calculate time remaining
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeRemaining(t('order.paymentInstructions.expired'));
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(
          `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      } else {
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, t]);

  const handleCopy = useCallback(async (text: string, type: 'address' | 'amount') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Generate QR code URI for the payment address (for future QR code generation)
  const _getPaymentUri = () => {
    const coinPrefix: Record<string, string> = {
      BTC: 'bitcoin',
      LTC: 'litecoin',
      ETH: 'ethereum',
      BSC: 'bnb',
    };
    const prefix = coinPrefix[paymentCoin.toUpperCase()] || paymentCoin.toLowerCase();
    return `${prefix}:${paymentAddress}?amount=${amount}`;
  };

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">
          {t('order.paymentInstructions.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('order.paymentInstructions.description', { orderId: orderId.slice(0, 8) })}
        </p>
      </div>

      {/* Timer */}
      {expiresAt && (
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground mb-1">
            {t('order.paymentInstructions.timeRemaining')}
          </p>
          <p
            className={`text-2xl font-mono font-bold ${timeRemaining === t('order.paymentInstructions.expired') ? 'text-red-600' : 'text-foreground'}`}
          >
            {timeRemaining}
          </p>
        </div>
      )}

      {/* Amount */}
      <div className="bg-muted rounded-xl p-4 mb-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {t('order.paymentInstructions.amountToPay')}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">
            {amount}{' '}
            <span className="text-base font-medium text-muted-foreground">{paymentCoin}</span>
          </p>
          {displayCurrency && displayAmount && (
            <p className="text-sm text-muted-foreground mt-1">
              ≈ {displayAmount} {displayCurrency}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(amount, 'amount')}
          className="w-full mt-3"
        >
          {copied === 'amount' ? (
            <>
              <svg
                className="w-4 h-4 mr-1.5 text-emerald-600"
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
              {t('common.copied')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {t('order.paymentInstructions.copyAmount')}
            </>
          )}
        </Button>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-6">
        <div className="p-3 bg-white rounded-xl">
          {/* Placeholder for QR code - in production, use a QR library */}
          <div className="w-40 h-40 sm:w-48 sm:h-48 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg
              className="w-16 h-16 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            {/* In production: <QRCode value={getPaymentUri()} size={192} /> */}
          </div>
        </div>
      </div>

      {/* Payment Address */}
      <VStack gap="sm" className="mb-6">
        <p className="text-xs text-muted-foreground text-center">
          {t('order.paymentInstructions.sendTo')}
        </p>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs sm:text-sm font-mono text-foreground text-center break-all">
            {paymentAddress}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(paymentAddress, 'address')}
          className="w-full"
        >
          {copied === 'address' ? (
            <>
              <svg
                className="w-4 h-4 mr-1.5 text-emerald-600"
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
              {t('common.copied')}
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {t('order.paymentInstructions.copyAddress')}
            </>
          )}
        </Button>
      </VStack>

      {/* Payment Status */}
      {confirmations > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6">
          <HStack justify="between" align="center">
            <HStack gap="sm" align="center">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {t('order.paymentInstructions.paymentDetected')}
              </span>
            </HStack>
            <span className="text-sm text-emerald-600">
              {confirmations}/{requiredConfirmations} {t('order.payment.confirmations')}
            </span>
          </HStack>
          {confirmations >= requiredConfirmations && (
            <p className="text-xs text-emerald-600 mt-2">
              {t('order.paymentInstructions.paymentConfirmed')}
            </p>
          )}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600" />
          <span className="text-sm text-muted-foreground">
            {t('order.paymentInstructions.waitingPayment')}
          </span>
        </div>
      )}

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
        <HStack gap="sm" align="start">
          <svg
            className="w-5 h-5 text-amber-600 flex-shrink-0"
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
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">{t('order.paymentInstructions.important')}</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{t('order.paymentInstructions.warning1')}</li>
              <li>{t('order.paymentInstructions.warning2')}</li>
              <li>{t('order.paymentInstructions.warning3')}</li>
            </ul>
          </div>
        </HStack>
      </div>

      {/* Actions */}
      {onCancel && (
        <Button variant="outline" onClick={onCancel} className="w-full">
          {t('order.paymentInstructions.cancelOrder')}
        </Button>
      )}
    </Card>
  );
};

export default PaymentInstructions;
