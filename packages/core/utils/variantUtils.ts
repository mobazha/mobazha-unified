/**
 * 变体工具函数
 * 笛卡尔积生成、Shopify 限制常量、SKU 合并逻辑
 */

// 使用 import type 避免与 useListingForm 的循环依赖（编译时擦除）
import type { VariantOption, SkuItem } from '../hooks/useListingForm';

// ─── Shopify 限制常量 ─────────────────────────────

/** 最大变体选项数量（如颜色、尺寸、材质） */
export const MAX_VARIANT_OPTIONS = 3;

/** 最大变体组合数量 */
export const MAX_VARIANT_COMBINATIONS = 100;

/** 单个选项的最大值数量 */
export const MAX_OPTION_VALUES = 100;

// ─── 笛卡尔积生成 ────────────────────────────────

/**
 * 生成变体选项的笛卡尔积组合
 * @param options 变体选项数组
 * @returns 所有组合的 selections 数组
 *
 * @example
 * ```ts
 * const options = [
 *   { name: '颜色', variants: [{ name: '红' }, { name: '蓝' }] },
 *   { name: '尺寸', variants: [{ name: 'S' }, { name: 'M' }] },
 * ];
 * generateCartesianProduct(options);
 * // => [
 * //   [{ option: '颜色', variant: '红' }, { option: '尺寸', variant: 'S' }],
 * //   [{ option: '颜色', variant: '红' }, { option: '尺寸', variant: 'M' }],
 * //   [{ option: '颜色', variant: '蓝' }, { option: '尺寸', variant: 'S' }],
 * //   [{ option: '颜色', variant: '蓝' }, { option: '尺寸', variant: 'M' }],
 * // ]
 * ```
 */
export function generateCartesianProduct(
  options: VariantOption[]
): { option: string; variant: string }[][] {
  // 过滤掉空选项
  const validOptions = options.filter(opt => opt.name && opt.variants.length > 0);
  if (validOptions.length === 0) return [];

  return validOptions.reduce<{ option: string; variant: string }[][]>((acc, option) => {
    if (acc.length === 0) {
      return option.variants
        .filter(v => v.name)
        .map(v => [{ option: option.name, variant: v.name }]);
    }

    const result: { option: string; variant: string }[][] = [];
    for (const combo of acc) {
      for (const v of option.variants) {
        if (v.name) {
          result.push([...combo, { option: option.name, variant: v.name }]);
        }
      }
    }
    return result;
  }, []);
}

// ─── SKU 合并逻辑 ────────────────────────────────

/**
 * 生成 SKU 的唯一键（基于 selections）
 */
export function getSkuKey(selections: { option: string; variant: string }[]): string {
  return selections
    .map(s => `${s.option}:${s.variant}`)
    .sort()
    .join('|');
}

/**
 * 根据新的变体选项合并 SKU 列表
 * - 保留已有 SKU 的用户输入（价格、库存等）
 * - 为新组合创建默认 SKU
 * - 删除不再存在的组合
 *
 * @param currentSkus 当前 SKU 列表
 * @param newOptions 新的变体选项
 * @param defaultPrice 默认价格（通常为基础价格）
 * @returns 合并后的 SKU 列表
 */
export function mergeSkus(
  currentSkus: SkuItem[],
  newOptions: VariantOption[],
  defaultPrice: string = ''
): SkuItem[] {
  const combinations = generateCartesianProduct(newOptions);

  // 如果没有组合，返回空数组
  if (combinations.length === 0) return [];

  // 构建现有 SKU 的索引
  const existingSkuMap = new Map<string, SkuItem>();
  for (const sku of currentSkus) {
    const key = getSkuKey(sku.selections);
    existingSkuMap.set(key, sku);
  }

  // 为每个组合查找或创建 SKU
  return combinations.map(selections => {
    const key = getSkuKey(selections);
    const existing = existingSkuMap.get(key);

    if (existing) {
      // 保留已有 SKU 的数据，但更新 selections（顺序可能变化）
      return { ...existing, selections };
    }

    // 创建新的默认 SKU
    return createDefaultSku(selections, defaultPrice);
  });
}

/**
 * 创建默认 SKU
 */
export function createDefaultSku(
  selections: { option: string; variant: string }[],
  defaultPrice: string = ''
): SkuItem {
  return {
    productID: '',
    selections,
    price: defaultPrice,
    compareAtPrice: '',
    quantity: -1,
    images: [],
    barcode: '',
    weight: 0,
  };
}

// ─── 验证函数 ────────────────────────────────────

/**
 * 验证变体选项是否满足 Shopify 限制
 * @returns 错误消息数组，空数组表示验证通过
 */
export function validateVariantOptions(options: VariantOption[]): string[] {
  const errors: string[] = [];
  const validOptions = options.filter(opt => opt.name && opt.variants.length > 0);

  // 检查选项数量
  if (validOptions.length > MAX_VARIANT_OPTIONS) {
    errors.push(`listing.variant.error.maxOptions`);
  }

  // 检查每个选项的值数量
  for (const opt of validOptions) {
    if (opt.variants.length > MAX_OPTION_VALUES) {
      errors.push(`listing.variant.error.maxValues`);
      break;
    }
  }

  // 检查选项名称是否重复
  const names = validOptions.map(o => o.name.trim().toLowerCase());
  const uniqueNames = new Set(names);
  if (uniqueNames.size < names.length) {
    errors.push(`listing.variant.error.duplicateOptionName`);
  }

  // 检查总组合数量
  const combinations = generateCartesianProduct(validOptions);
  if (combinations.length > MAX_VARIANT_COMBINATIONS) {
    errors.push(`listing.variant.error.maxCombinations`);
  }

  return errors;
}

/**
 * 获取变体组合的描述文本（如 "红 / S"）
 */
export function getVariantLabel(selections: { option: string; variant: string }[]): string {
  return selections.map(s => s.variant).join(' / ');
}
