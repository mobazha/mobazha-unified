'use client';

import React, { useEffect } from 'react';
import { useI18n } from '@mobazha/core';

interface ConfirmationProgressProps {
  currentBlock: number;
  requiredBlocks: number;
  blockTimeSeconds?: number;
  onConfirmed?: () => void;
}

export function ConfirmationProgress({
  currentBlock,
  requiredBlocks,
  blockTimeSeconds = 3,
  onConfirmed,
}: ConfirmationProgressProps) {
  const { t } = useI18n();
  const progress = Math.min(currentBlock / requiredBlocks, 1);
  const remaining = Math.max(requiredBlocks - currentBlock, 0);
  const remainingSeconds = remaining * blockTimeSeconds;
  const confirmed = progress >= 1;

  useEffect(() => {
    if (confirmed) {
      onConfirmed?.();
    }
  }, [confirmed, onConfirmed]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {confirmed ? t('payment.confirmed') : t('payment.confirming')}
        </span>
        <span className="font-mono text-xs">
          {currentBlock}/{requiredBlocks}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {!confirmed && remainingSeconds > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          ~{remainingSeconds}s {t('payment.remaining')}
        </p>
      )}
    </div>
  );
}
