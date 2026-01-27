'use client';

import { useState, useEffect, useCallback } from 'react';
import { moderatorsApi } from '@mobazha/core';
import type { Moderator } from '@/components/Payment';

interface UseModeratorsOptions {
  autoFetch?: boolean;
  limit?: number;
  verified?: boolean;
}

interface UseModeratorsResult {
  moderators: Moderator[];
  isLoading: boolean;
  error: Error | null;
  fetchModerators: () => Promise<void>;
  hasMore: boolean;
  total: number;
}

/**
 * Hook 用于获取仲裁员列表
 *
 * 调用后端 API: GET /v1/ob/moderators?include=profile
 */
export function useModerators(options: UseModeratorsOptions = {}): UseModeratorsResult {
  const { autoFetch = true, limit = 10, verified } = options;

  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchModerators = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await moderatorsApi.getModerators({
        limit,
        verified,
        sortBy: 'rating',
        sortOrder: 'desc',
      });

      // 转换 API 响应为组件所需格式
      const convertedModerators: Moderator[] = response.moderators.map(mod => ({
        id: mod.id,
        peerID: mod.peerID,
        name: mod.name,
        handle: mod.handle,
        avatar: mod.avatar,
        avatarHashes: mod.avatarHashes,
        location: mod.location,
        shortDescription: mod.shortDescription,
        description: mod.description,
        languages: mod.languages,
        verified: mod.verified,
        verifiedMod: mod.verified,
        fee: {
          percentage: mod.fee.percentage,
          fixedFee: mod.fee.fixedFee
            ? {
                amount: String(mod.fee.fixedFee.amount),
                currency: mod.fee.fixedFee.currency,
              }
            : undefined,
          feeType: mod.fee.feeType as
            | 'percentage'
            | 'fixed'
            | 'percentage_plus_fixed'
            | 'fixed_plus_percentage',
        },
        stats: mod.stats,
        termsAndConditions: mod.termsAndConditions,
        acceptedCurrencies: mod.acceptedCurrencies,
        contactInfo: mod.contactInfo,
      }));

      setModerators(convertedModerators);
      setHasMore(response.hasMore);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch moderators:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch moderators'));

      // 错误时显示空列表，不使用 mock 数据
      setModerators([]);
      setHasMore(false);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, verified]);

  useEffect(() => {
    if (autoFetch) {
      fetchModerators();
    }
  }, [autoFetch, fetchModerators]);

  return {
    moderators,
    isLoading,
    error,
    fetchModerators,
    hasMore,
    total,
  };
}

export default useModerators;
