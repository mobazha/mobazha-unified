/**
 * 变体工具函数测试（Shopify 风格）
 */

import { describe, it, expect } from 'vitest';
import {
  generateCartesianProduct,
  getSkuKey,
  mergeSkus,
  createDefaultSku,
  validateVariantOptions,
  getVariantLabel,
  MAX_VARIANT_OPTIONS,
  MAX_VARIANT_COMBINATIONS,
} from '../../utils/variantUtils';

// ─── generateCartesianProduct ──────────────────────

describe('generateCartesianProduct', () => {
  it('空选项返回空数组', () => {
    expect(generateCartesianProduct([])).toEqual([]);
  });

  it('单个选项生成一维组合', () => {
    const options = [{ name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] }];
    const result = generateCartesianProduct(options);
    expect(result).toEqual([
      [{ option: 'Color', variant: 'Red' }],
      [{ option: 'Color', variant: 'Blue' }],
    ]);
  });

  it('两个选项生成笛卡尔积', () => {
    const options = [
      { name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] },
      { name: 'Size', variants: [{ name: 'S' }, { name: 'M' }] },
    ];
    const result = generateCartesianProduct(options);
    expect(result).toHaveLength(4);
    expect(result).toEqual([
      [
        { option: 'Color', variant: 'Red' },
        { option: 'Size', variant: 'S' },
      ],
      [
        { option: 'Color', variant: 'Red' },
        { option: 'Size', variant: 'M' },
      ],
      [
        { option: 'Color', variant: 'Blue' },
        { option: 'Size', variant: 'S' },
      ],
      [
        { option: 'Color', variant: 'Blue' },
        { option: 'Size', variant: 'M' },
      ],
    ]);
  });

  it('三个选项（Shopify 最大）生成正确组合数', () => {
    const options = [
      { name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] },
      { name: 'Size', variants: [{ name: 'S' }, { name: 'M' }, { name: 'L' }] },
      { name: 'Material', variants: [{ name: 'Cotton' }, { name: 'Polyester' }] },
    ];
    const result = generateCartesianProduct(options);
    expect(result).toHaveLength(2 * 3 * 2); // 12
    // 验证第一个和最后一个
    expect(result[0]).toEqual([
      { option: 'Color', variant: 'Red' },
      { option: 'Size', variant: 'S' },
      { option: 'Material', variant: 'Cotton' },
    ]);
    expect(result[11]).toEqual([
      { option: 'Color', variant: 'Blue' },
      { option: 'Size', variant: 'L' },
      { option: 'Material', variant: 'Polyester' },
    ]);
  });

  it('过滤空名称的选项和变体', () => {
    const options = [
      { name: '', variants: [{ name: 'Red' }] }, // 空选项名，跳过
      { name: 'Size', variants: [{ name: 'S' }, { name: '' }] }, // 空变体名，跳过
    ];
    const result = generateCartesianProduct(options);
    expect(result).toEqual([[{ option: 'Size', variant: 'S' }]]);
  });

  it('选项无变体时跳过', () => {
    const options = [
      { name: 'Color', variants: [] },
      { name: 'Size', variants: [{ name: 'S' }] },
    ];
    const result = generateCartesianProduct(options);
    expect(result).toEqual([[{ option: 'Size', variant: 'S' }]]);
  });
});

// ─── getSkuKey ──────────────────────────────────────

describe('getSkuKey', () => {
  it('生成稳定的唯一键', () => {
    const selections = [
      { option: 'Color', variant: 'Red' },
      { option: 'Size', variant: 'S' },
    ];
    expect(getSkuKey(selections)).toBe('Color:Red|Size:S');
  });

  it('排序确保键一致性', () => {
    const a = [
      { option: 'Size', variant: 'S' },
      { option: 'Color', variant: 'Red' },
    ];
    const b = [
      { option: 'Color', variant: 'Red' },
      { option: 'Size', variant: 'S' },
    ];
    expect(getSkuKey(a)).toBe(getSkuKey(b));
  });

  it('空 selections 返回空字符串', () => {
    expect(getSkuKey([])).toBe('');
  });
});

// ─── mergeSkus ──────────────────────────────────────

describe('mergeSkus', () => {
  it('新选项生成新 SKU', () => {
    const options = [{ name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] }];
    const result = mergeSkus([], options, '10.00');
    expect(result).toHaveLength(2);
    expect(result[0].price).toBe('10.00');
    expect(result[0].selections).toEqual([{ option: 'Color', variant: 'Red' }]);
    expect(result[1].selections).toEqual([{ option: 'Color', variant: 'Blue' }]);
  });

  it('保留已有 SKU 的用户输入', () => {
    const existingSkus = [
      {
        productID: 'abc',
        selections: [{ option: 'Color', variant: 'Red' }],
        price: '15.00',
        compareAtPrice: '20.00',
        quantity: 50,
        images: [],
        barcode: 'UPC123',
        weight: 200,
      },
    ];
    const options = [{ name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] }];
    const result = mergeSkus(existingSkus, options, '10.00');

    // Red 应保留原有数据
    expect(result[0].price).toBe('15.00');
    expect(result[0].compareAtPrice).toBe('20.00');
    expect(result[0].quantity).toBe(50);
    expect(result[0].barcode).toBe('UPC123');
    expect(result[0].weight).toBe(200);

    // Blue 是新的，使用默认价格
    expect(result[1].price).toBe('10.00');
    expect(result[1].quantity).toBe(-1);
  });

  it('删除不再存在的组合', () => {
    const existingSkus = [
      createDefaultSku([{ option: 'Color', variant: 'Red' }]),
      createDefaultSku([{ option: 'Color', variant: 'Blue' }]),
      createDefaultSku([{ option: 'Color', variant: 'Green' }]),
    ];
    const options = [{ name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] }];
    const result = mergeSkus(existingSkus, options);
    expect(result).toHaveLength(2);
    expect(result.map(s => s.selections[0].variant)).toEqual(['Red', 'Blue']);
  });

  it('无有效选项返回空数组', () => {
    expect(mergeSkus([], [], '10.00')).toEqual([]);
    expect(mergeSkus([], [{ name: '', variants: [] }])).toEqual([]);
  });

  it('处理多选项组合变更', () => {
    // 原来有 Color x Size = 4 个 SKU
    const existingSkus = [
      createDefaultSku([
        { option: 'Color', variant: 'Red' },
        { option: 'Size', variant: 'S' },
      ]),
      createDefaultSku([
        { option: 'Color', variant: 'Red' },
        { option: 'Size', variant: 'M' },
      ]),
      createDefaultSku([
        { option: 'Color', variant: 'Blue' },
        { option: 'Size', variant: 'S' },
      ]),
      createDefaultSku([
        { option: 'Color', variant: 'Blue' },
        { option: 'Size', variant: 'M' },
      ]),
    ];
    existingSkus[0].price = '25.00'; // Red+S 已编辑

    // 添加一个新 Size 'L'
    const options = [
      { name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] },
      { name: 'Size', variants: [{ name: 'S' }, { name: 'M' }, { name: 'L' }] },
    ];
    const result = mergeSkus(existingSkus, options);
    expect(result).toHaveLength(6); // 2 x 3

    // Red+S 应保留价格
    const redS = result.find(
      s =>
        s.selections.some(sel => sel.variant === 'Red') &&
        s.selections.some(sel => sel.variant === 'S')
    );
    expect(redS?.price).toBe('25.00');

    // L 组合应为新的默认 SKU
    const redL = result.find(
      s =>
        s.selections.some(sel => sel.variant === 'Red') &&
        s.selections.some(sel => sel.variant === 'L')
    );
    expect(redL?.price).toBe('');
  });
});

// ─── createDefaultSku ──────────────────────────────

describe('createDefaultSku', () => {
  it('创建带默认值的 SKU', () => {
    const sku = createDefaultSku([{ option: 'Color', variant: 'Red' }], '9.99');
    expect(sku).toEqual({
      productID: '',
      selections: [{ option: 'Color', variant: 'Red' }],
      price: '9.99',
      compareAtPrice: '',
      quantity: -1,
      images: [],
      barcode: '',
      weight: 0,
    });
  });

  it('无默认价格时使用空字符串', () => {
    const sku = createDefaultSku([]);
    expect(sku.price).toBe('');
  });
});

// ─── validateVariantOptions ────────────────────────

describe('validateVariantOptions', () => {
  it('有效选项无错误', () => {
    const options = [
      { name: 'Color', variants: [{ name: 'Red' }, { name: 'Blue' }] },
      { name: 'Size', variants: [{ name: 'S' }, { name: 'M' }] },
    ];
    expect(validateVariantOptions(options)).toEqual([]);
  });

  it('超过最大选项数报错', () => {
    const options = Array.from({ length: MAX_VARIANT_OPTIONS + 1 }, (_, i) => ({
      name: `Opt${i}`,
      variants: [{ name: `V${i}` }],
    }));
    const errors = validateVariantOptions(options);
    expect(errors).toContain('listing.variant.error.maxOptions');
  });

  it('重复选项名报错', () => {
    const options = [
      { name: 'Color', variants: [{ name: 'Red' }] },
      { name: 'color', variants: [{ name: 'Blue' }] }, // 大小写不敏感重复
    ];
    const errors = validateVariantOptions(options);
    expect(errors).toContain('listing.variant.error.duplicateOptionName');
  });

  it('组合过多报错', () => {
    // 创建超过 MAX_VARIANT_COMBINATIONS 的组合
    const manyValues = Array.from({ length: 11 }, (_, i) => ({ name: `V${i}` }));
    const options = [
      { name: 'A', variants: manyValues },
      { name: 'B', variants: manyValues }, // 11 x 11 = 121 > 100
    ];
    const errors = validateVariantOptions(options);
    expect(errors).toContain('listing.variant.error.maxCombinations');
  });

  it('空选项被忽略', () => {
    const options = [
      { name: '', variants: [] },
      { name: 'Color', variants: [{ name: 'Red' }] },
    ];
    expect(validateVariantOptions(options)).toEqual([]);
  });
});

// ─── getVariantLabel ───────────────────────────────

describe('getVariantLabel', () => {
  it('生成变体标签', () => {
    expect(
      getVariantLabel([
        { option: 'Color', variant: 'Red' },
        { option: 'Size', variant: 'S' },
      ])
    ).toBe('Red / S');
  });

  it('单个值不带分隔符', () => {
    expect(getVariantLabel([{ option: 'Color', variant: 'Blue' }])).toBe('Blue');
  });

  it('空数组返回空字符串', () => {
    expect(getVariantLabel([])).toBe('');
  });
});
