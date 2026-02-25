'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { VStack } from '@/components/layouts';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

export type PaymentStep = 'idle' | 'confirming' | 'submitted' | 'completing' | 'success' | 'failed';

const EXPLORER_MAP: Record<string, string> = {
  BNB: 'https://bscscan.com/tx/',
  TBNB: 'https://testnet.bscscan.com/tx/',
  ETH: 'https://etherscan.io/tx/',
  MATIC: 'https://polygonscan.com/tx/',
};
const DEFAULT_EXPLORER = 'https://testnet.bscscan.com/tx/';

interface TransactionOverlayProps {
  step: PaymentStep;
  txHash?: string;
  /** Token ID used for payment, determines block explorer */
  tokenId?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onClose?: () => void;
}

function getExplorerUrl(txHash: string, tokenId?: string): string {
  if (tokenId) {
    const key = tokenId.toUpperCase();
    for (const [prefix, url] of Object.entries(EXPLORER_MAP)) {
      if (key.startsWith(prefix) || key.includes(prefix)) return `${url}${txHash}`;
    }
  }
  return `${DEFAULT_EXPLORER}${txHash}`;
}

export function TransactionOverlay({
  step,
  txHash,
  tokenId,
  errorMessage,
  onRetry,
  onClose,
}: TransactionOverlayProps) {
  const { t } = useI18n();

  if (step === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl p-6 sm:p-8">
        {step === 'confirming' && (
          <VStack gap="md" align="center" className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t('payment.confirmInWallet')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('payment.pleaseConfirmTransaction')}
              </p>
            </div>
          </VStack>
        )}

        {step === 'submitted' && (
          <VStack gap="md" align="center" className="text-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    d="M12 6v6l4 2"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t('payment.transactionSent')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t('payment.waitingForConfirmation')}
              </p>
            </div>
            {txHash && (
              <a
                href={getExplorerUrl(txHash, tokenId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
              >
                {txHash.slice(0, 8)}...{txHash.slice(-6)}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </VStack>
        )}

        {step === 'completing' && (
          <VStack gap="md" align="center" className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('payment.completing')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('payment.finalizingOrder')}</p>
            </div>
          </VStack>
        )}

        {step === 'success' && (
          <VStack gap="md" align="center" className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('payment.success')}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t('payment.redirecting')}</p>
            </div>
          </VStack>
        )}

        {step === 'failed' && (
          <VStack gap="md" align="center" className="text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('payment.failed')}</h2>
              <p className="text-sm text-muted-foreground mt-1 break-words max-w-[280px]">
                {errorMessage || t('payment.transactionFailed')}
              </p>
            </div>
            <div className="flex gap-3 w-full">
              {onRetry && (
                <Button size="lg" className="flex-1" onClick={onRetry}>
                  {t('common.retry')}
                </Button>
              )}
              {onClose && (
                <Button size="lg" variant="outline" className="flex-1" onClick={onClose}>
                  {t('common.close')}
                </Button>
              )}
            </div>
          </VStack>
        )}
      </div>
    </div>
  );
}
