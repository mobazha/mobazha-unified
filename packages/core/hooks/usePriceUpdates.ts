/**
 * usePriceUpdates — 异步获取收藏商品当前价格，与快照价格比较。
 *
 * 使用 dataService.getProduct 逐项获取（并发 3），
 * 返回 Map<key, PriceUpdate>  key = `${peerID}/${slug}`.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { WishlistItem } from '../services/api/wishlist';
import { productDataService } from '../services/dataService';

export type PriceDirection = 'up' | 'down' | 'same' | 'unavailable';

export interface PriceUpdate {
  currentPrice: number;
  currentCurrency: string;
  direction: PriceDirection;
  percentChange: number;
}

function wishlistKey(peerID: string, slug: string): string {
  return `${peerID}/${slug}`;
}

async function batchWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn => fn()));
    results.push(...batchResults);
  }
  return results;
}

export function usePriceUpdates(items: WishlistItem[]) {
  const [updates, setUpdates] = useState<Map<string, PriceUpdate>>(new Map());
  const [isChecking, setIsChecking] = useState(false);
  const fingerprintRef = useRef('');

  const fingerprint = items.map(i => `${i.peerID}:${i.slug}`).join(',');

  useEffect(() => {
    if (fingerprint === fingerprintRef.current) return;
    if (items.length === 0) return;
    fingerprintRef.current = fingerprint;

    let cancelled = false;

    async function fetchPrices() {
      const newUpdates = new Map<string, PriceUpdate>();

      const tasks = items.map(item => async () => {
        const product = await productDataService.getProduct(item.slug, item.peerID);
        return { item, product };
      });

      const results = await batchWithConcurrency(tasks, 3);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { item, product } = result.value;
          const key = wishlistKey(item.peerID, item.slug);

          if (!product) {
            newUpdates.set(key, {
              currentPrice: 0,
              currentCurrency: '',
              direction: 'unavailable',
              percentChange: 0,
            });
            continue;
          }

          const currentPrice = product.item?.price ?? 0;
          const currentCurrency = product.metadata?.pricingCurrency?.code || '';
          const savedPrice = Number(item.price);

          if (isNaN(savedPrice) || savedPrice <= 0 || currentPrice <= 0) {
            newUpdates.set(key, {
              currentPrice,
              currentCurrency,
              direction: 'unavailable',
              percentChange: 0,
            });
            continue;
          }

          const pct = ((currentPrice - savedPrice) / savedPrice) * 100;
          let direction: PriceDirection;
          if (Math.abs(pct) < 0.5) {
            direction = 'same';
          } else {
            direction = pct > 0 ? 'up' : 'down';
          }

          newUpdates.set(key, {
            currentPrice,
            currentCurrency,
            direction,
            percentChange: Math.round(pct * 10) / 10,
          });
        }
      }

      if (!cancelled) {
        setUpdates(newUpdates);
        setIsChecking(false);
      }
    }

    setIsChecking(true);
    fetchPrices();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fingerprint]);

  const getUpdate = useCallback(
    (peerID: string, slug: string): PriceUpdate | undefined => {
      return updates.get(wishlistKey(peerID, slug));
    },
    [updates]
  );

  return { updates, isChecking, getUpdate };
}
