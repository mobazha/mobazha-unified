/**
 * Search API 返回的 price 字段有两种结构：
 *   - 嵌套: { amount, currency: { code, divisibility } }  (符合 Price 类型)
 *   - 扁平: { amount, currencyCode, divisibility }        (搜索引擎实际返回)
 *
 * 此模块提供统一的解析函数，避免每个消费方重复处理这两种格式。
 */

import type { Price } from '../../types';

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

export interface ParsedPrice {
  /** Safe number for legacy UI; may clamp large minimal-unit values. */
  amount: number;
  /** Minimal-unit integer string; authoritative for display/sort. */
  amountString: string;
  /** undefined 表示货币信息缺失，UI 应显示"价格不可用" */
  currencyCode: string | undefined;
  divisibility: number | undefined;
}

function normalizeMinimalAmount(raw: unknown): { amount: number; amountString: string } {
  if (raw == null || raw === '') {
    return { amount: 0, amountString: '0' };
  }

  const str = String(raw).trim();
  if (/^\d+$/.test(str)) {
    try {
      const big = BigInt(str);
      const amount = big > MAX_SAFE ? Number(MAX_SAFE) : Number(big);
      return { amount, amountString: str };
    } catch {
      return { amount: 0, amountString: '0' };
    }
  }

  const n = Number(str);
  if (Number.isFinite(n) && n >= 0) {
    const intStr = String(Math.trunc(n));
    return { amount: n, amountString: intStr };
  }

  return { amount: 0, amountString: '0' };
}

/**
 * 从 Price 对象中安全提取 amount / currencyCode / divisibility，
 * 兼容嵌套和扁平两种 API 响应格式。
 *
 * 当 currencyCode 缺失时返回 undefined（不 fallback），
 * 由 UI 层决定如何展示（显示"—"或隐藏价格行）。
 */
/** Coerce minimal-unit amount to a safe number for legacy arithmetic/formatters. */
export function minimalAmountAsNumber(amount: number | string | undefined): number {
  return normalizeMinimalAmount(amount).amount;
}

export function parsePriceFields(price: Price | undefined): ParsedPrice {
  if (!price) {
    return { amount: 0, amountString: '0', currencyCode: undefined, divisibility: undefined };
  }

  const flat = price as unknown as Record<string, unknown>;
  const { amount, amountString } = normalizeMinimalAmount(price.amount);

  const rawCode = price.currency?.code || (flat.currencyCode as string | undefined);
  const currencyCode = rawCode?.trim() || undefined;

  return {
    amount,
    amountString,
    currencyCode,
    divisibility: price.currency?.divisibility ?? (flat.divisibility as number | undefined),
  };
}
