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

      // 使用 mock 数据作为 fallback
      setModerators(MOCK_MODERATORS);
      setHasMore(false);
      setTotal(MOCK_MODERATORS.length);
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

// Mock 仲裁员数据（API 不可用时的 fallback）
const MOCK_MODERATORS: Moderator[] = [
  {
    id: 'mod1',
    peerID: 'QmMod1',
    name: 'TrustGuard',
    handle: 'trustguard',
    description:
      'Professional dispute resolution with 5+ years experience. Fast response within 24 hours.',
    languages: ['en', 'es'],
    verified: true,
    verifiedMod: true,
    fee: {
      percentage: 1,
      feeType: 'percentage',
    },
    stats: {
      rating: 4.9,
      ratingCount: 128,
      disputesHandled: 156,
      averageResolutionTime: 48,
      successRate: 98,
    },
  },
  {
    id: 'mod2',
    peerID: 'QmMod2',
    name: 'SafeTrade',
    handle: 'safetrade',
    description: 'Multilingual moderator. Specializing in crypto and digital goods disputes.',
    languages: ['en', 'de', 'fr'],
    verified: true,
    verifiedMod: true,
    fee: {
      percentage: 0.5,
      fixedFee: { amount: '5', currency: 'USD' },
      feeType: 'fixed_plus_percentage',
    },
    stats: {
      rating: 4.7,
      ratingCount: 89,
      disputesHandled: 112,
      averageResolutionTime: 36,
      successRate: 95,
    },
  },
  {
    id: 'mod3',
    peerID: 'QmMod3',
    name: 'FairDeal',
    handle: 'fairdeal',
    description: 'Asia-Pacific based moderator with 24/7 availability.',
    languages: ['en', 'zh', 'ja'],
    verified: false,
    verifiedMod: false,
    fee: {
      fixedFee: { amount: '10', currency: 'USD' },
      feeType: 'fixed',
    },
    stats: {
      rating: 4.5,
      ratingCount: 45,
      disputesHandled: 67,
      averageResolutionTime: 24,
      successRate: 92,
    },
  },
];

export default useModerators;
