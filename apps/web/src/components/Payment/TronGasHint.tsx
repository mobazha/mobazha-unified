'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@mobazha/core';
import { AlertCircle } from 'lucide-react';

interface TronGasHintProps {
  trxBalance: bigint | null;
}

const ESTIMATED_ENERGY_COST = 55_000;
const SUN_PER_TRX = 1_000_000;
const ENERGY_PRICE_SUN = 420;
const ESTIMATED_FEE_SUN = ESTIMATED_ENERGY_COST * ENERGY_PRICE_SUN;
const ESTIMATED_FEE_TRX = ESTIMATED_FEE_SUN / SUN_PER_TRX;

export function TronGasHint({ trxBalance }: TronGasHintProps) {
  const { t } = useI18n();

  const isInsufficient = useMemo(() => {
    if (trxBalance === null) return false;
    return trxBalance < BigInt(ESTIMATED_FEE_SUN);
  }, [trxBalance]);

  if (!isInsufficient) return null;

  const balanceTrx = trxBalance !== null ? Number(trxBalance) / SUN_PER_TRX : 0;

  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 p-3">
      <AlertCircle className="h-4 w-4 text-amber-800 dark:text-amber-200 mt-0.5 shrink-0" />
      <div className="text-sm text-amber-800 dark:text-amber-200">
        <p className="font-medium">
          {t('payment.tron.insufficientGas', {
            required: `~${ESTIMATED_FEE_TRX} TRX`,
            balance: `${balanceTrx.toFixed(2)} TRX`,
          })}
        </p>
        <p className="text-xs mt-1 opacity-80">{t('payment.tron.gasExplanation')}</p>
      </div>
    </div>
  );
}
