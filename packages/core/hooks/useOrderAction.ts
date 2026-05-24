'use client';

import { useCallback, useState } from 'react';
import { useI18n } from './useI18n';
import type { SettlementActionResponse } from '../services/api/orders';

const BACKEND_SETTLEMENT_COMPLETED_TX_ID = 'backend-settlement-completed';

export function resolveBackendSettlementTransactionID(
  settlement: SettlementActionResponse
): string | undefined {
  const settlementMode = (settlement.mode || '').trim().toLowerCase();
  return (
    settlement.txHash ||
    settlement.actionId ||
    (settlementMode === 'completed' ? BACKEND_SETTLEMENT_COMPLETED_TX_ID : undefined)
  );
}

export interface OrderActionOptions {
  executeAction: (txID?: string) => Promise<{ success: boolean; error?: string }>;
  executeBackendSettlementAction?: () => Promise<SettlementActionResponse>;
  /**
   * Run the backend settlement action surface before the order state action.
   * The backend decides whether that surface performs an on-chain settlement
   * or returns a completed no-op for methods that settle elsewhere.
   */
  attemptBackendSettlementAction?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export interface UseOrderActionReturn {
  execute: (options: OrderActionOptions) => Promise<void>;
  isLoading: boolean;
  /** Always false: order actions are backend-settled now. */
  isWaitingForWallet: boolean;
  error: Error | null;
  clearError: () => void;
}

export function useOrderAction(): UseOrderActionReturn {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const execute = useCallback(
    async (options: OrderActionOptions) => {
      const {
        executeAction,
        executeBackendSettlementAction,
        attemptBackendSettlementAction,
        onSuccess,
        onError,
      } = options;

      setIsLoading(true);
      setError(null);

      try {
        let txID: string | undefined;
        if (attemptBackendSettlementAction) {
          if (!executeBackendSettlementAction) {
            throw new Error(t('order.actions.operationFailed'));
          }
          const settlement = await executeBackendSettlementAction();
          txID = resolveBackendSettlementTransactionID(settlement);
        }

        const result = await executeAction(txID);
        if (!result.success) {
          throw new Error(result.error || t('order.actions.operationFailed'));
        }

        onSuccess?.();
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        console.error('[useOrderAction] Operation failed:', errorInstance);
        setError(errorInstance);
        onError?.(errorInstance);
        throw errorInstance;
      } finally {
        setIsLoading(false);
      }
    },
    [t]
  );

  return {
    execute,
    isLoading,
    isWaitingForWallet: false,
    error,
    clearError,
  };
}

export default useOrderAction;
