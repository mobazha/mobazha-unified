/**
 * 争议/仲裁 Hook
 */

import { useState, useCallback } from 'react';
import {
  disputesApi,
  type CaseListItem,
  type DisputeCase,
} from '../services/api/disputes';

interface DisputesState {
  cases: CaseListItem[];
  currentCase: DisputeCase | null;
  isLoading: boolean;
  error: string | null;
}

export function useDisputes() {
  const [state, setState] = useState<DisputesState>({
    cases: [],
    currentCase: null,
    isLoading: false,
    error: null,
  });

  /**
   * 获取仲裁案件列表
   */
  const fetchCases = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const cases = await disputesApi.getCases();
      setState(prev => ({ ...prev, cases, isLoading: false }));
      return cases;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch cases';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return [];
    }
  }, []);

  /**
   * 获取案件详情
   */
  const fetchCaseDetails = useCallback(async (orderId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const currentCase = await disputesApi.getCaseDetails(orderId);
      setState(prev => ({ ...prev, currentCase, isLoading: false }));
      return currentCase;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch case details';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return null;
    }
  }, []);

  /**
   * 开启争议
   */
  const openDispute = useCallback(async (orderId: string, claim: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await disputesApi.openDispute(orderId, claim);
      setState(prev => ({ ...prev, isLoading: false }));
      if (!result.success) {
        throw new Error(result.error || 'Failed to open dispute');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to open dispute';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 关闭争议（撤回）
   */
  const closeDispute = useCallback(async (orderId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await disputesApi.closeDispute(orderId);
      setState(prev => ({ ...prev, isLoading: false }));
      if (!result.success) {
        throw new Error(result.error || 'Failed to close dispute');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to close dispute';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 仲裁人裁决 - 释放资金
   */
  const resolveDispute = useCallback(
    async (
      orderId: string,
      buyerPercentage: number,
      vendorPercentage: number,
      resolution: string
    ) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await disputesApi.resolveDispute(
          orderId,
          buyerPercentage,
          vendorPercentage,
          resolution
        );
        setState(prev => ({ ...prev, isLoading: false }));
        if (!result.success) {
          throw new Error(result.error || 'Failed to resolve dispute');
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to resolve dispute';
        setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  /**
   * 接受裁决
   */
  const acceptResolution = useCallback(async (orderId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await disputesApi.acceptDisputeResolution(orderId);
      setState(prev => ({ ...prev, isLoading: false }));
      if (!result.success) {
        throw new Error(result.error || 'Failed to accept resolution');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept resolution';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      return { success: false, error: errorMessage };
    }
  }, []);

  /**
   * 获取待处理案件数量
   */
  const getPendingCasesCount = useCallback(() => {
    return state.cases.filter(c => c.state === 'OPEN' || c.state === 'PENDING').length;
  }, [state.cases]);

  /**
   * 获取特定状态的案件
   */
  const getCasesByState = useCallback(
    (stateFilter: CaseListItem['state']) => {
      return state.cases.filter(c => c.state === stateFilter);
    },
    [state.cases]
  );

  return {
    ...state,
    fetchCases,
    fetchCaseDetails,
    openDispute,
    closeDispute,
    resolveDispute,
    acceptResolution,
    getPendingCasesCount,
    getCasesByState,
  };
}

export default useDisputes;

