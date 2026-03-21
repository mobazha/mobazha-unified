/**
 * Search API 返回的 price 字段有两种结构：
 *   - 嵌套: { amount, currency: { code, divisibility } }  (符合 Price 类型)
 *   - 扁平: { amount, currencyCode, divisibility }        (搜索引擎实际返回)
 *
 * 此模块提供统一的解析函数，避免每个消费方重复处理这两种格式。
 */

import type { Price } from '../../types';

export interface ParsedPrice {
  amount: number;
  /** undefined 表示货币信息缺失，UI 应显示"价格不可用" */
  currencyCode: string | undefined;
  divisibility: number | undefined;
}

/**
 * 从 Price 对象中安全提取 amount / currencyCode / divisibility，
 * 兼容嵌套和扁平两种 API 响应格式。
 *
 * 当 currencyCode 缺失时返回 undefined（不 fallback），
 * 由 UI 层决定如何展示（显示"—"或隐藏价格行）。
 */
export function parsePriceFields(price: Price | undefined): ParsedPrice {
  if (!price) {
    return { amount: 0, currencyCode: undefined, divisibility: undefined };
  }

  const flat = price as unknown as Record<string, unknown>;

  return {
    amount: Number(price.amount) || 0,
    currencyCode: price.currency?.code || (flat.currencyCode as string | undefined),
    divisibility: price.currency?.divisibility ?? (flat.divisibility as number | undefined),
  };
}
