/**
 * 价格相关工具函数
 * 所有价格/金额计算必须使用 BigNumber，禁止原生浮点运算
 */

import BigNumber from 'bignumber.js';

/**
 * 计算折扣百分比
 *
 * @param compareAtPrice - 划线价/原价（字符串）
 * @param currentPrice - 当前售价（字符串）
 * @returns 折扣百分比（整数，如 20 表示 20%），如果无有效折扣返回 null
 */
export function calculateDiscountPercent(
  compareAtPrice: string | undefined,
  currentPrice: string | undefined
): number | null {
  if (!compareAtPrice || !currentPrice) return null;

  const compare = new BigNumber(compareAtPrice);
  const current = new BigNumber(currentPrice);

  if (compare.isNaN() || current.isNaN()) return null;

  if (compare.gt(current) && current.gt(0)) {
    return compare.minus(current).dividedBy(compare).times(100).integerValue().toNumber();
  }

  return null;
}
