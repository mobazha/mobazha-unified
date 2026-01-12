'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import { useI18n } from '@mobazha/core';
import { formatOrderDate, copyToClipboard } from './utils';

export interface FulfillmentInfo {
  type: 'physical' | 'digital' | 'cryptocurrency';
  timestamp: string;
  // Physical delivery
  shipper?: string;
  trackingNumber?: string;
  // Digital delivery
  fileUrl?: string;
  password?: string;
  // Cryptocurrency delivery
  transactionID?: string;
  // Note
  note?: string;
}

export interface OrderFulfillmentProps {
  fulfillments: FulfillmentInfo[];
  className?: string;
}

/**
 * 发货信息展示组件
 */
export const OrderFulfillment: React.FC<OrderFulfillmentProps> = ({
  fulfillments,
  className = '',
}) => {
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});

  const handleCopy = useCallback((text: string) => {
    copyToClipboard(text);
  }, []);

  if (!fulfillments.length) {
    return null;
  }

  return (
    <Card className={`p-4 sm:p-6 ${className}`}>
      <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        {t('order.fulfillment.title')}
      </h3>

      <VStack gap="md">
        {fulfillments.map((fulfillment, index) => (
          <div key={index} className={`${index > 0 ? 'pt-4 border-t border-border' : ''}`}>
            {/* Timestamp */}
            <p className="text-xs text-muted-foreground mb-3">
              {formatOrderDate(fulfillment.timestamp)}
            </p>

            {/* Physical Delivery */}
            {fulfillment.type === 'physical' && (
              <VStack gap="sm">
                {fulfillment.shipper && (
                  <HStack justify="between" align="start">
                    <span className="text-sm text-muted-foreground">
                      {t('order.fulfillment.carrier')}
                    </span>
                    <span className="text-sm text-foreground">{fulfillment.shipper}</span>
                  </HStack>
                )}
                {fulfillment.trackingNumber && (
                  <HStack justify="between" align="center">
                    <span className="text-sm text-muted-foreground">
                      {t('order.fulfillment.trackingNumber')}
                    </span>
                    <HStack gap="xs">
                      <span className="text-sm font-mono text-foreground">
                        {fulfillment.trackingNumber}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopy(fulfillment.trackingNumber!)}
                      >
                        <svg
                          className="w-4 h-4"
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
                      </Button>
                    </HStack>
                  </HStack>
                )}
              </VStack>
            )}

            {/* Digital Delivery */}
            {fulfillment.type === 'digital' && (
              <VStack gap="sm">
                {fulfillment.fileUrl && (
                  <div>
                    <span className="text-sm text-muted-foreground block mb-1">
                      {t('order.fulfillment.downloadUrl')}
                    </span>
                    <div className="flex items-center gap-2">
                      <a
                        href={fulfillment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline truncate max-w-xs"
                      >
                        {fulfillment.fileUrl}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => handleCopy(fulfillment.fileUrl!)}
                      >
                        <svg
                          className="w-4 h-4"
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
                      </Button>
                    </div>
                  </div>
                )}
                {fulfillment.password && (
                  <HStack justify="between" align="center">
                    <span className="text-sm text-muted-foreground">
                      {t('order.fulfillment.password')}
                    </span>
                    <HStack gap="xs">
                      <span className="text-sm font-mono text-foreground">
                        {showPassword[index] ? fulfillment.password : '••••••••'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          setShowPassword(prev => ({ ...prev, [index]: !prev[index] }))
                        }
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {showPassword[index] ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          )}
                        </svg>
                      </Button>
                    </HStack>
                  </HStack>
                )}
              </VStack>
            )}

            {/* Cryptocurrency Delivery */}
            {fulfillment.type === 'cryptocurrency' && fulfillment.transactionID && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">
                  {t('order.fulfillment.transactionId')}
                </span>
                <HStack gap="xs" className="break-all">
                  <span className="text-xs font-mono text-foreground">
                    {fulfillment.transactionID}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 flex-shrink-0"
                    onClick={() => handleCopy(fulfillment.transactionID!)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </Button>
                </HStack>
              </div>
            )}

            {/* Note */}
            {fulfillment.note && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('order.fulfillment.note')}</p>
                <p className="text-sm text-foreground">{fulfillment.note}</p>
              </div>
            )}
          </div>
        ))}
      </VStack>
    </Card>
  );
};

export default OrderFulfillment;
