/**
 * Product 数据转换函数
 * 将 API 返回的 Product 数据转换为前端 ListingFormData 格式
 */

import type {
  Product,
  ContractType,
  ProductCondition,
  BlockchainNetwork,
  WeightUnit,
  InventoryPolicy,
  DimensionUnit,
} from '../../types';
import type { ListingFormData } from '../../hooks/useListingForm';
import { DEFAULT_LOCAL_CURRENCY } from '../../types/currency';

/**
 * 将 API 返回的 Product 转换为 ListingFormData
 *
 * @param product - API 返回的 Product 数据
 * @param options - 转换选项
 * @param options.isClone - 是否是克隆操作（true 时不保留 slug，确保创建新商品）
 * @returns Partial<ListingFormData>
 */
export function convertProductToFormData(
  product: Product,
  options?: { isClone?: boolean }
): Partial<ListingFormData> {
  const item = product.item;
  if (!item) return {};
  const metadata = product.metadata;

  // 获取 acceptedCurrencies，兼容 string[] 和 { code: string }[] 两种格式
  const acceptedCurrencies =
    metadata?.acceptedCurrencies?.map((c: string | { code: string }) =>
      typeof c === 'string' ? c : c.code
    ) || [];

  const result: Partial<ListingFormData> = {
    title: item.title || '',
    shortDescription: item.shortDescription || '',
    description: item.description || '',
    price: item.price?.toString() || '',
    compareAtPrice: item.regularPrice || '',
    pricingCurrency: metadata?.pricingCurrency?.code || DEFAULT_LOCAL_CURRENCY,
    status: product.status || 'published',
    contractType: metadata?.contractType as ContractType,
    condition: (item.condition as ProductCondition) || 'NEW',
    grams: item.grams || 0,
    weightUnit: (item.weightUnit as WeightUnit) || 'g',
    inventoryPolicy: (item.inventoryPolicy as InventoryPolicy) || 'deny',
    packageLength: item.packageLength || undefined,
    packageWidth: item.packageWidth || undefined,
    packageHeight: item.packageHeight || undefined,
    dimensionUnit: (item.dimensionUnit as DimensionUnit) || 'cm',
    brand: item.brand || '',
    blockchain: (item.blockchain as BlockchainNetwork) || 'ETH',
    tokenAddress: item.tokenAddress || '',
    tokenStandard: item.tokenStandard || '',
    cryptoListingCurrencyCode: item.cryptoListingCurrencyCode || '',
    minQuantity: item.minQuantity || 1,
    maxQuantity: item.maxQuantity || 100,
    acceptedCurrencies,
    images: item.images || [],
    introVideo: item.introVideo || '',
    altIntroVideoLinks: item.altIntroVideoLinks || [],
    tags: item.tags || [],
    productType: item.productType || '',
    shippingProfile: product.shippingProfile,
    // 变体选项
    options: (item.options || []).map(opt => ({
      name: opt.name,
      description: opt.description,
      variants: (opt.variants || []).map(v => ({ name: v.name, image: v.image })),
    })),
    // SKU（Shopify 风格绝对定价）
    skus: (item.skus || []).map(sku => ({
      productID: sku.productID || '',
      selections: (sku.selections || []).map(s => ({ option: s.option, variant: s.variant })),
      price: sku.price || '',
      compareAtPrice: sku.compareAtPrice || '',
      quantity: sku.quantity ? parseInt(sku.quantity, 10) : -1,
      images: sku.images || [],
      barcode: sku.barcode || '',
      weight: sku.weight || 0,
    })),
    // 优惠券（Shopify 风格扁平结构）
    coupons: (product.coupons || []).map(c => ({
      title: c.title,
      discountCode: c.discountCode,
      hash: c.hash,
      discountType: c.discountType || 'PERCENT',
      percentDiscount: c.percentDiscount,
      priceDiscount: c.priceDiscount,
      usageLimit: c.usageLimit,
      startsAt: c.startsAt,
      expiresAt: c.expiresAt,
      minimumOrderAmount: c.minimumOrderAmount,
    })),
    nsfw: item.nsfw || false,
    processingTime: item.processingTime || '',
  };

  // 编辑模式保留 slug
  if (!options?.isClone && product.slug) {
    result.slug = product.slug;
  }

  return result;
}
