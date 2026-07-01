'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import {
  useI18n,
  getTimeRemaining,
  isOrderExpired,
  ESCROW_TIMEOUT_HOURS,
  formatMinimalUnitExactAmountString,
} from '@mobazha/core';
import { copyToClipboard, getBlockExplorerUrl } from './utils';

export interface PaymentTransaction {
  txid: string;
  value: string;
  confirmations: number;
  timestamp?: string;
}

export interface PaymentSectionProps {
  paymentMethod: 'DIRECT' | 'MODERATED' | 'ADDRESS_REQUEST';
  paymentCoin: string;
  escrowAddress?: string;
  paymentAddress?: string;
  amount: string;
  currency: string;
  transactions: PaymentTransaction[];
  orderTimestamp: string;
  chainId?: number;
  className?: string;
}

/**
 * 支付详情区块组件
 * 显示托管倒计时、交易链接等支付信息
 */
export const PaymentSection: React.FC<PaymentSectionProps> = ({
  paymentMethod,
  paymentCoin,
  escrowAddress,
  paymentAddress,
  amount,
  currency,
  transactions,
  orderTimestamp,
  chainId,
  className = '',
}) => {
  const { t } = useI18n();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = useCallback(async (text: string, field: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);

  const timeRemaining = getTimeRemaining(orderTimestamp, ESCROW_TIMEOUT_HOURS);
  const isExpired = isOrderExpired(orderTimestamp, ESCROW_TIMEOUT_HOURS);
  const formatTransactionAmount = useCallback(
    (value: string) => {
      const raw = value.trim();
      if (!raw || raw.includes('.') || !/^\d+$/.test(raw)) return raw;
      return formatMinimalUnitExactAmountString(raw, paymentCoin) ?? raw;
    },
    [paymentCoin]
  );

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
        {t('order.payment.title')}
      </h3>

      <VStack gap="md">
        {/* Payment Method */}
        <HStack justify="between" className="text-sm">
          <span className="text-muted-foreground">{t('order.payment.method')}</span>
          <span className="text-foreground">
            {paymentMethod === 'MODERATED'
              ? t('order.payment.moderated')
              : paymentMethod === 'DIRECT'
                ? t('order.payment.direct')
                : t('order.payment.addressRequest')}
          </span>
        </HStack>

        {/* Payment Coin */}
        <HStack justify="between" className="text-sm">
          <span className="text-muted-foreground">{t('order.payment.coin')}</span>
          <span className="text-foreground font-medium">{paymentCoin}</span>
        </HStack>

        {/* Amount */}
        <HStack justify="between" className="text-sm">
          <span className="text-muted-foreground">{t('order.payment.amount')}</span>
          <span className="text-foreground font-medium">
            {amount} {currency}
          </span>
        </HStack>

        {/* Escrow Countdown (for moderated orders) */}
        {paymentMethod === 'MODERATED' && (
          <div
            className={`rounded-lg p-3 ${isExpired ? 'bg-error/8 border-error/20' : 'bg-warning/8 border-warning/20'}`}
          >
            <HStack justify="between" align="center">
              <span className={`text-sm ${isExpired ? 'text-error' : 'text-warning'}`}>
                {t('order.payment.escrowPeriod')}
              </span>
              <span className={`text-sm font-medium ${isExpired ? 'text-error' : 'text-warning'}`}>
                {timeRemaining}
              </span>
            </HStack>
            <p className="text-xs text-muted-foreground mt-1">
              {isExpired ? t('order.payment.escrowExpired') : t('order.payment.escrowNote')}
            </p>
          </div>
        )}

        {/* Escrow/Payment Address */}
        {(escrowAddress || paymentAddress) && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {paymentMethod === 'MODERATED'
                ? t('order.payment.escrowAddress')
                : t('order.payment.paymentAddress')}
            </p>
            <HStack justify="between" align="center" className="bg-muted rounded-lg p-2">
              <span className="text-xs font-mono text-foreground truncate max-w-[200px] sm:max-w-none">
                {escrowAddress || paymentAddress}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 flex-shrink-0"
                onClick={() => handleCopy(escrowAddress || paymentAddress || '', 'address')}
              >
                {copiedField === 'address' ? (
                  <svg
                    className="w-4 h-4 text-primary"
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </Button>
            </HStack>
          </div>
        )}

        {/* Transactions */}
        {transactions.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">{t('order.payment.transactions')}</p>
            <VStack gap="sm">
              {transactions.map((tx, index) => {
                const explorerUrl = getBlockExplorerUrl(tx.txid, paymentCoin, chainId);
                return (
                  <div key={index} className="bg-muted rounded-lg p-3">
                    <HStack justify="between" align="start" className="mb-1">
                      <span className="text-xs text-muted-foreground">
                        {tx.confirmations >= 6
                          ? t('order.payment.confirmed')
                          : `${tx.confirmations}/6 ${t('order.payment.confirmations')}`}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatTransactionAmount(tx.value)} {currency}
                      </span>
                    </HStack>
                    <HStack justify="between" align="center">
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                        {tx.txid}
                      </span>
                      <HStack gap="xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopy(tx.txid, `tx-${index}`)}
                        >
                          {copiedField === `tx-${index}` ? (
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
                        {explorerUrl && (
                          <a
                            href={explorerUrl}
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
                        )}
                      </HStack>
                    </HStack>
                  </div>
                );
              })}
            </VStack>
          </div>
        )}
      </VStack>
    </Card>
  );
};

export default PaymentSection;
