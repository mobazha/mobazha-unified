'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { VStack, HStack } from '@/components/layouts';
import { TokenIcon } from './TokenIcon';
import { useI18n } from '@mobazha/core';
import { Copy, Check, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { getChainById } from './config';

export interface ExternalWalletPaymentInfo {
  paymentAddress: string;
  paymentURI?: string;
  amount: string;
  coin: string;
  decimals?: number;
  qrCodeData?: string;
  expiresAt?: string;
  orderID: string;
}

interface ExternalWalletPaymentProps {
  paymentInfo: ExternalWalletPaymentInfo;
  tokenId?: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

function formatCryptoAmount(rawAmount: string, decimals: number): string {
  const num = Number(rawAmount);
  if (!num || !Number.isFinite(num)) return '0';
  const divisor = Math.pow(10, decimals);
  const result = num / divisor;
  const formatted = result.toFixed(decimals);
  return formatted.replace(/\.?0+$/, '') || '0';
}

function getReadableCoinName(coin: string): string {
  const chain = getChainById(coin);
  if (chain?.name) return chain.name;
  const upper = coin.toUpperCase();
  if (upper.startsWith('CRYPTO:')) return '';
  return upper;
}

function useCountdown(expiresAt: string | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(() => {
    if (!expiresAt) return null;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemainingMs(Math.max(0, ms));
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (remainingMs === null) return { isExpired: false, label: '', isUrgent: false };

  const isExpired = remainingMs <= 0;
  const totalSec = Math.ceil(remainingMs / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  const mm = String(min).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  const label = hrs > 0 ? `${String(hrs).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
  const isUrgent = !isExpired && remainingMs < 5 * 60 * 1000;

  return { isExpired, label, isUrgent };
}

export const ExternalWalletPayment: React.FC<ExternalWalletPaymentProps> = ({
  paymentInfo,
  tokenId,
  onClose,
  onRefresh,
}) => {
  const { t } = useI18n();
  const [copied, setCopied] = useState<'address' | 'uri' | 'amount' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { isExpired, label: countdownLabel, isUrgent } = useCountdown(paymentInfo.expiresAt);

  useEffect(() => {
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, type: 'address' | 'uri' | 'amount') => {
      if (isExpired) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        // fallback
      }
    },
    [isExpired]
  );

  const qrValue = paymentInfo.qrCodeData || paymentInfo.paymentURI || paymentInfo.paymentAddress;
  const decimals = paymentInfo.decimals ?? 8;
  const displayAmount = formatCryptoAmount(paymentInfo.amount, decimals);

  const coinSymbol = tokenId?.toUpperCase() || getReadableCoinName(paymentInfo.coin) || '';

  if (isExpired) {
    return (
      <Card
        ref={cardRef}
        className="border-destructive/40 bg-gradient-to-b from-destructive/5 to-transparent"
      >
        <CardContent className="p-4 sm:p-6">
          <VStack gap="md" align="center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{t('payment.paymentExpired')}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {t('payment.paymentExpiredDesc')}
            </p>
            {onRefresh && (
              <Button variant="default" size="sm" onClick={onRefresh} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                {t('payment.refreshPaymentAddress')}
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                {t('payment.payLater')}
              </Button>
            )}
          </VStack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      ref={cardRef}
      className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent"
    >
      <CardContent className="p-4 sm:p-6">
        <VStack gap="md" align="center">
          {/* Header */}
          <HStack gap="sm" align="center">
            {tokenId && <TokenIcon token={tokenId} size={28} />}
            <h3 className="text-lg font-semibold text-foreground">
              {t('payment.sendPayment')} {coinSymbol}
            </h3>
          </HStack>

          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {t('payment.externalWalletDesc')}
          </p>

          {/* QR Code */}
          {qrValue && (
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <QRCodeSVG value={qrValue} size={200} level="M" includeMargin={false} />
            </div>
          )}

          {/* Amount */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">{t('payment.amountToSend')}</p>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
              onClick={() => copyToClipboard(displayAmount, 'amount')}
              title="Click to copy"
            >
              <span className="text-xl font-mono font-bold text-foreground">{displayAmount}</span>
              <span className="text-base font-semibold text-muted-foreground">{coinSymbol}</span>
              {copied === 'amount' ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground/50" />
              )}
            </button>
          </div>

          {/* Payment Address */}
          {paymentInfo.paymentAddress && (
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-1.5">
                {t('payment.paymentAddressLabel')}
              </p>
              <div
                className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => copyToClipboard(paymentInfo.paymentAddress, 'address')}
              >
                <code className="flex-1 text-xs sm:text-sm font-mono text-foreground break-all">
                  {paymentInfo.paymentAddress}
                </code>
                <div className="shrink-0">
                  {copied === 'address' ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment URI */}
          {paymentInfo.paymentURI && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => copyToClipboard(paymentInfo.paymentURI!, 'uri')}
            >
              {copied === 'uri' ? t('common.copied') : t('payment.copyPaymentURI')}
            </Button>
          )}

          {/* Countdown Timer */}
          {paymentInfo.expiresAt && countdownLabel && (
            <HStack
              gap="xs"
              align="center"
              className={`text-sm font-mono font-semibold ${
                isUrgent ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{countdownLabel}</span>
            </HStack>
          )}

          {/* Status hint */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg w-full">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
            <p className="text-xs text-muted-foreground">{t('payment.waitingForPayment')}</p>
          </div>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t('payment.payLater')}
            </Button>
          )}
        </VStack>
      </CardContent>
    </Card>
  );
};
