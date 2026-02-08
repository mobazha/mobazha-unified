/**
 * 商品创建/编辑表单 Hook
 * 统一管理表单状态、验证和 API 调用
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ContractType,
  ProductCondition,
  ShippingProfile,
  Coupon,
  BlockchainNetwork,
  Image,
} from '../types';
import { productsApi } from '../services/api';
import { mergeSkus } from '../utils/variantUtils';

/**
 * 表单数据结构
 */
export interface ListingFormData {
  // 基础信息
  slug?: string;
  title: string;
  description: string;
  price: string;
  pricingCurrency: string;
  contractType: ContractType;

  // 物理商品字段
  condition?: ProductCondition;
  grams?: number;

  // RWA Token 字段
  blockchain?: BlockchainNetwork;
  tokenAddress?: string;
  tokenStandard?: string;
  cryptoListingCurrencyCode?: string;
  minQuantity?: number;
  maxQuantity?: number;
  acceptedCurrencies?: string[];

  // 媒体
  images: Image[];
  introVideo?: string;
  altIntroVideoLinks?: string[];

  // 分类和标签
  tags: string[];
  categories: string[];

  // 配送档案
  shippingProfile?: ShippingProfile;

  // 变体和库存
  options: VariantOption[];
  skus: SkuItem[];
  inventoryTracking: boolean;

  // 可选功能
  optionalFeatures: OptionalFeature[];

  // 优惠券
  coupons: Coupon[];

  // 政策
  termsAndConditions: string;
  refundPolicy: string;

  // 其他
  nsfw: boolean;
  processingTime: string;
}

/**
 * 变体选项
 */
export interface VariantOption {
  name: string;
  description?: string;
  variants: { name: string; image?: Image }[];
}

/**
 * SKU 项（Shopify 风格绝对定价）
 */
export interface SkuItem {
  productID: string;
  selections: { option: string; variant: string }[];
  price: string; // 变体绝对价格
  compareAtPrice: string; // 划线价
  quantity: number; // 库存数量，-1 表示无限
  images: Image[];
  barcode: string; // 条码
  weight: number; // 变体重量（克）
}

/**
 * 可选功能
 */
export interface OptionalFeature {
  name: string;
  description: string;
  price: number;
}

/**
 * 表单验证错误
 */
export interface FormErrors {
  [key: string]: string | undefined;
}

/**
 * 初始表单数据
 */
export const initialFormData: ListingFormData = {
  title: '',
  description: '',
  price: '',
  pricingCurrency: 'USD',
  contractType: 'PHYSICAL_GOOD',
  condition: 'NEW',
  grams: 0,
  blockchain: 'ETH',
  tokenAddress: '',
  tokenStandard: '',
  cryptoListingCurrencyCode: '',
  minQuantity: 1,
  maxQuantity: 100,
  acceptedCurrencies: ['ETHUSDT'],
  images: [],
  introVideo: '',
  altIntroVideoLinks: [],
  tags: [],
  categories: [],
  shippingProfile: undefined,
  options: [],
  skus: [
    {
      productID: '',
      selections: [],
      price: '',
      compareAtPrice: '',
      quantity: -1,
      images: [],
      barcode: '',
      weight: 0,
    },
  ],
  inventoryTracking: false,
  optionalFeatures: [],
  coupons: [],
  termsAndConditions: '',
  refundPolicy: '',
  nsfw: false,
  processingTime: '',
};

/**
 * 根据商品类型获取需要显示的字段
 */
export function getFieldsForType(contractType: ContractType): string[] {
  const commonFields = [
    'title',
    'description',
    'price',
    'pricingCurrency',
    'images',
    'tags',
    'categories',
    'nsfw',
  ];

  switch (contractType) {
    case 'PHYSICAL_GOOD':
      return [
        ...commonFields,
        'condition',
        'grams',
        'shippingProfile',
        'options',
        'skus',
        'inventoryTracking',
        'optionalFeatures',
        'coupons',
        'termsAndConditions',
        'refundPolicy',
        'processingTime',
      ];
    case 'DIGITAL_GOOD':
      return [
        ...commonFields,
        'optionalFeatures',
        'coupons',
        'termsAndConditions',
        'refundPolicy',
        'processingTime',
      ];
    case 'SERVICE':
      return [
        ...commonFields,
        'optionalFeatures',
        'coupons',
        'termsAndConditions',
        'refundPolicy',
        'processingTime',
      ];
    case 'RWA_TOKEN':
      return [
        ...commonFields,
        'blockchain',
        'tokenAddress',
        'cryptoListingCurrencyCode',
        'minQuantity',
        'maxQuantity',
        'acceptedCurrencies',
      ];
    case 'CRYPTOCURRENCY':
      return [...commonFields, 'minQuantity', 'maxQuantity', 'acceptedCurrencies'];
    default:
      return commonFields;
  }
}

/**
 * 商品创建/编辑表单 Hook
 */
export function useListingForm(initialData?: Partial<ListingFormData>) {
  const [formData, setFormData] = useState<ListingFormData>({
    ...initialFormData,
    ...initialData,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  /**
   * 是否为编辑模式
   */
  const isEditMode = useMemo(() => Boolean(formData.slug), [formData.slug]);

  /**
   * 当前类型需要的字段
   */
  const visibleFields = useMemo(
    () => getFieldsForType(formData.contractType),
    [formData.contractType]
  );

  /**
   * 更新单个字段
   */
  const updateField = useCallback(
    <K extends keyof ListingFormData>(field: K, value: ListingFormData[K]) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setIsDirty(true);

      // 清除该字段的错误
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  /**
   * 批量更新字段
   */
  const updateFields = useCallback((updates: Partial<ListingFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  /**
   * 切换商品类型
   */
  const changeContractType = useCallback((newType: ContractType) => {
    setFormData(prev => ({
      ...prev,
      contractType: newType,
      // 根据类型重置特定字段
      ...(newType === 'RWA_TOKEN'
        ? {
            condition: undefined,
            grams: undefined,
            shippingOptions: [],
            options: [],
          }
        : {}),
      ...(newType !== 'PHYSICAL_GOOD'
        ? {
            condition: undefined,
            grams: undefined,
            shippingOptions: [],
          }
        : {
            condition: prev.condition || 'NEW',
          }),
    }));
    setIsDirty(true);
  }, []);

  /**
   * 验证表单
   */
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // 必填字段验证
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'At least one image is required';
    }

    // 物理商品特定验证
    if (formData.contractType === 'PHYSICAL_GOOD') {
      if (!formData.condition) {
        newErrors.condition = 'Condition is required';
      }
    }

    // RWA Token 特定验证
    if (formData.contractType === 'RWA_TOKEN') {
      if (!formData.blockchain) {
        newErrors.blockchain = 'Blockchain is required';
      }
      if (!formData.cryptoListingCurrencyCode) {
        newErrors.cryptoListingCurrencyCode = 'Token selection is required';
      }
      if (!formData.acceptedCurrencies || formData.acceptedCurrencies.length === 0) {
        newErrors.acceptedCurrencies = 'At least one payment currency is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * 构建 API 请求数据
   */
  const buildRequestData = useCallback(() => {
    const data: Record<string, unknown> = {
      item: {
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        nsfw: formData.nsfw,
        tags: formData.tags,
        images: formData.images,
        categories: formData.categories,
        processingTime: formData.processingTime,
      },
      metadata: {
        contractType: formData.contractType,
        format: 'FIXED_PRICE',
        pricingCurrency: {
          code: formData.pricingCurrency,
          divisibility: 2,
        },
        acceptedCurrencies: formData.acceptedCurrencies || ['BTC', 'ETH'],
      },
      termsAndConditions: formData.termsAndConditions,
      refundPolicy: formData.refundPolicy,
    };

    // 物理商品特定字段
    if (formData.contractType === 'PHYSICAL_GOOD') {
      (data.item as Record<string, unknown>).condition = formData.condition;
      (data.item as Record<string, unknown>).grams = formData.grams;
      data.shippingProfile = formData.shippingProfile;
      (data.item as Record<string, unknown>).options = formData.options.map(opt => ({
        name: opt.name,
        description: opt.description,
        variants: opt.variants,
      }));
      (data.item as Record<string, unknown>).skus = formData.skus.map(sku => ({
        productID: sku.productID,
        selections: sku.selections,
        price: sku.price || undefined,
        compareAtPrice: sku.compareAtPrice || undefined,
        quantity: sku.quantity === -1 ? '-1' : String(sku.quantity),
        images: sku.images,
        barcode: sku.barcode || undefined,
        weight: sku.weight || undefined,
      }));
    }

    // RWA Token 特定字段
    if (formData.contractType === 'RWA_TOKEN') {
      (data.item as Record<string, unknown>).blockchain = formData.blockchain;
      (data.item as Record<string, unknown>).tokenAddress = formData.tokenAddress;
      (data.item as Record<string, unknown>).tokenStandard = formData.tokenStandard || 'RWA';
      (data.item as Record<string, unknown>).cryptoListingCurrencyCode =
        formData.cryptoListingCurrencyCode;
      (data.item as Record<string, unknown>).minQuantity = formData.minQuantity;
      (data.item as Record<string, unknown>).maxQuantity = formData.maxQuantity;
    }

    // 视频字段
    if (formData.introVideo) {
      (data.item as Record<string, unknown>).introVideo = formData.introVideo;
    }
    if (formData.altIntroVideoLinks && formData.altIntroVideoLinks.length > 0) {
      (data.item as Record<string, unknown>).altIntroVideoLinks = formData.altIntroVideoLinks;
    }

    // 优惠券（Shopify 风格扁平结构，Coupon 接口已对齐 proto）
    if (formData.coupons.length > 0) {
      data.coupons = formData.coupons.map(c => ({
        title: c.title,
        discountCode: c.discountCode || undefined,
        hash: c.hash || undefined,
        discountType: c.discountType || 'PERCENT',
        percentDiscount: c.discountType === 'PERCENT' ? c.percentDiscount : undefined,
        priceDiscount: c.discountType === 'FIXED' ? c.priceDiscount : undefined,
        usageLimit: c.usageLimit ?? 0,
        startsAt: c.startsAt || undefined,
        expiresAt: c.expiresAt || undefined,
        minimumOrderAmount: c.minimumOrderAmount || undefined,
      }));
    }

    // 编辑模式添加 slug
    if (formData.slug) {
      data.slug = formData.slug;
    }

    return data;
  }, [formData]);

  /**
   * 提交表单
   */
  const submit = useCallback(async (): Promise<{ slug: string } | { error: string }> => {
    if (!validate()) {
      return { error: 'Validation failed' };
    }

    setIsSubmitting(true);

    try {
      const requestData = buildRequestData();

      if (isEditMode) {
        const result = await productsApi.updateListing(requestData);
        if ('error' in result) {
          return result;
        }
        setIsDirty(false);
        return { slug: formData.slug! };
      } else {
        const result = await productsApi.createListing(requestData);
        if ('error' in result) {
          return result;
        }
        setIsDirty(false);
        return result;
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to save listing' };
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, buildRequestData, isEditMode, formData.slug]);

  /**
   * 重置表单
   */
  const reset = useCallback((data?: Partial<ListingFormData>) => {
    setFormData({
      ...initialFormData,
      ...data,
    });
    setErrors({});
    setIsDirty(false);
  }, []);

  /**
   * 添加图片
   */
  const addImage = useCallback((image: Image) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, image],
    }));
    setIsDirty(true);
  }, []);

  /**
   * 移除图片
   */
  const removeImage = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  /**
   * 重排图片
   */
  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newImages = [...prev.images];
      const [removed] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, removed);
      return { ...prev, images: newImages };
    });
    setIsDirty(true);
  }, []);

  /**
   * 添加标签
   */
  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag) {
      setFormData(prev => {
        if (prev.tags.includes(trimmedTag)) return prev;
        return { ...prev, tags: [...prev.tags, trimmedTag] };
      });
      setIsDirty(true);
    }
  }, []);

  /**
   * 移除标签
   */
  const removeTag = useCallback((tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
    setIsDirty(true);
  }, []);

  /**
   * 批量更新变体选项（同时自动合并 SKU）
   */
  const updateVariantOptions = useCallback((newOptions: VariantOption[]) => {
    setFormData(prev => {
      const mergedSkus = mergeSkus(prev.skus, newOptions, prev.price);
      return { ...prev, options: newOptions, skus: mergedSkus };
    });
    setIsDirty(true);
  }, []);

  /**
   * 批量更新 SKU 列表
   */
  const updateSkus = useCallback((newSkus: SkuItem[]) => {
    setFormData(prev => ({ ...prev, skus: newSkus }));
    setIsDirty(true);
  }, []);

  /**
   * 添加优惠券
   */
  const addCoupon = useCallback((coupon: Coupon) => {
    setFormData(prev => ({
      ...prev,
      coupons: [...prev.coupons, coupon],
    }));
    setIsDirty(true);
  }, []);

  /**
   * 更新优惠券（按索引）
   */
  const updateCoupon = useCallback((index: number, coupon: Coupon) => {
    setFormData(prev => ({
      ...prev,
      coupons: prev.coupons.map((c, i) => (i === index ? coupon : c)),
    }));
    setIsDirty(true);
  }, []);

  /**
   * 移除优惠券
   */
  const removeCoupon = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      coupons: prev.coupons.filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  }, []);

  return {
    // 状态
    formData,
    errors,
    isSubmitting,
    isDirty,
    isEditMode,
    visibleFields,

    // 字段操作
    updateField,
    updateFields,
    changeContractType,

    // 图片操作
    addImage,
    removeImage,
    reorderImages,

    // 标签操作
    addTag,
    removeTag,

    // 变体操作
    updateVariantOptions,
    updateSkus,

    // 优惠券操作
    addCoupon,
    updateCoupon,
    removeCoupon,

    // 表单操作
    validate,
    submit,
    reset,
  };
}

export default useListingForm;
