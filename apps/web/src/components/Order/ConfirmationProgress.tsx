'use client';

import React from 'react';
import { Timer, CheckCircle2, Radio } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface ConfirmationProgressProps {
  confirmations: number;
  requiredConfs: number;
  chainBlockTimeSec?: number;
  poolDetected?: boolean;
  poolTxHash?: string;
  txHash?: string;
  className?: string;
}

/**
 * Displays blockchain confirmation progress for Guest Checkout orders.
 *
 * Five visual stages:
 *   1. Pool detected (mempool, not yet mined)
 *   2. Just on-chain (confirmations === 0)
 *   3. Confirming (0 < confirmations < requiredConfs)
 *   4. Funded (confirmations >= requiredConfs)
 *   5. Hidden when requiredConfs === 0 (EVM/Solana/TRON instant)
 */
export const ConfirmationProgress: React.FC<ConfirmationProgressProps> = ({
  confirmations,
  requiredConfs,
  chainBlockTimeSec = 0,
  poolDetected = false,
  poolTxHash,
  txHash,
  className,
}) => {
  const { t } = useI18n();

  if (requiredConfs === 0) return null;

  const effectiveTxHash = txHash || poolTxHash;
  const etaMinutes = computeEtaMinutes(
    confirmations,
    requiredConfs,
    chainBlockTimeSec,
    poolDetected
  );
  const progressPercent =
    poolDetected && confirmations === 0 ? 0 : Math.min((confirmations / requiredConfs) * 100, 100);

  const isJustOnChain = !poolDetected && confirmations === 0;
  const isConfirming = !poolDetected && confirmations > 0 && confirmations < requiredConfs;

  return (
    <div className={cn('rounded-lg border p-4', className)} data-testid="confirmation-progress">
      {poolDetected && <PoolDetectedStage txHash={effectiveTxHash} etaMinutes={etaMinutes} />}

      {isJustOnChain && (
        <JustOnChainStage
          requiredConfs={requiredConfs}
          etaMinutes={etaMinutes}
          txHash={effectiveTxHash}
        />
      )}

      {isConfirming && (
        <ConfirmingStage
          confirmations={confirmations}
          requiredConfs={requiredConfs}
          progressPercent={progressPercent}
          etaMinutes={etaMinutes}
          txHash={effectiveTxHash}
        />
      )}

      {confirmations >= requiredConfs && !poolDetected && <FundedStage />}
    </div>
  );
};

function PoolDetectedStage({ txHash, etaMinutes }: { txHash?: string; etaMinutes: number | null }) {
  const { t } = useI18n();
  return (
    <div className="text-center space-y-2" data-testid="stage-pool-detected">
      <div className="flex items-center justify-center gap-2 text-info">
        <Radio className="w-5 h-5 animate-pulse" aria-hidden="true" />
        <p className="font-semibold">{t('guestOrder.confirmation.poolDetected')}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('guestOrder.confirmation.poolDetectedDesc')}
      </p>
      {etaMinutes != null && (
        <p className="text-xs text-muted-foreground">
          {t('guestOrder.confirmation.eta', { minutes: String(etaMinutes) })}
        </p>
      )}
      {txHash && <TxHashDisplay txHash={txHash} />}
    </div>
  );
}

function JustOnChainStage({
  requiredConfs,
  etaMinutes,
  txHash,
}: {
  requiredConfs: number;
  etaMinutes: number | null;
  txHash?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="text-center space-y-3" data-testid="stage-just-on-chain">
      <div className="flex items-center justify-center gap-2 text-primary">
        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
        <p className="font-semibold">{t('guestOrder.confirmation.onChain')}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('guestOrder.confirmation.onChainDesc', {
          required: String(requiredConfs),
        })}
      </p>
      <ProgressBar percent={0} />
      {etaMinutes != null && (
        <p className="text-xs text-muted-foreground">
          {t('guestOrder.confirmation.eta', { minutes: String(etaMinutes) })}
        </p>
      )}
      {txHash && <TxHashDisplay txHash={txHash} />}
    </div>
  );
}

function ConfirmingStage({
  confirmations,
  requiredConfs,
  progressPercent,
  etaMinutes,
  txHash,
}: {
  confirmations: number;
  requiredConfs: number;
  progressPercent: number;
  etaMinutes: number | null;
  txHash?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="text-center space-y-3" data-testid="stage-confirming">
      <div className="flex items-center justify-center gap-2 text-primary">
        <Timer className="w-5 h-5" aria-hidden="true" />
        <p className="font-semibold">
          {t('guestOrder.confirmation.confirming', {
            current: String(confirmations),
            required: String(requiredConfs),
          })}
        </p>
      </div>
      <ProgressBar percent={progressPercent} />
      {etaMinutes != null && (
        <p className="text-xs text-muted-foreground">
          {t('guestOrder.confirmation.eta', { minutes: String(etaMinutes) })}
        </p>
      )}
      {txHash && <TxHashDisplay txHash={txHash} />}
    </div>
  );
}

function FundedStage() {
  const { t } = useI18n();
  return (
    <div className="text-center space-y-2" data-testid="stage-funded">
      <div className="flex items-center justify-center gap-2 text-success">
        <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
        <p className="font-semibold">{t('guestOrder.confirmation.funded')}</p>
      </div>
      <ProgressBar percent={100} />
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="w-full h-2 rounded-full bg-primary/20 overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary',
          'motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out'
        )}
        style={{ width: `${Math.max(percent, 2)}%` }}
      />
    </div>
  );
}

function TxHashDisplay({ txHash }: { txHash: string }) {
  const { t } = useI18n();
  return (
    <p className="text-xs text-muted-foreground font-mono truncate">
      {t('guestOrder.txLabel')} {txHash}
    </p>
  );
}

function computeEtaMinutes(
  confirmations: number,
  requiredConfs: number,
  blockTimeSec: number,
  poolDetected: boolean
): number | null {
  if (blockTimeSec <= 0) return null;

  const remaining = poolDetected ? requiredConfs : requiredConfs - confirmations;

  if (remaining <= 0) return null;

  return Math.ceil((remaining * blockTimeSec) / 60);
}

export default ConfirmationProgress;
