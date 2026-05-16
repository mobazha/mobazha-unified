/**
 * 商品创建/编辑表单 Hook
 * 统一管理表单状态、验证和 API 调用
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  ContractType,
  ProductCondition,
  ShippingProfile,
  BlockchainNetwork,
  Image,
  ListingStatus,
  WeightUnit,
  InventoryPolicy,
  DimensionUnit,
} from '../types';
import { productsApi } from '../services/api';
import { mergeSkus } from '../utils/variantUtils';
import { toMinimalUnit } from '../services/currencyService';
import { mustAssetIdFromTokenId, mustCanonicalCoin } from '../data/tokens';
import { getCurrencyDecimals } from '../data/currencies';

const DEFAULT_RWA_ACCEPTED_CURRENCIES = [mustAssetIdFromTokenId('ETHUSDT')];
const DEFAULT_LISTING_ACCEPTED_CURRENCIES = [
  mustAssetIdFromTokenId('BTC'),
  mustAssetIdFromTokenId('ETH'),
];

function canonicalizeAcceptedCurrencies(
  values: string[] | undefined,
  fallback: string[]
): string[] {
  const raw = Array.isArray(values) ? values : [];
  const normalized = raw
    .map(v => mustCanonicalCoin((v || '').trim()))
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
  if (normalized.length > 0) {
    return normalized;
  }
  return [...fallback];
}

/**
 * 表单数据结构
 */
export interface ListingFormData {
  // 基础信息
  slug?: string;
  title: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAtPrice: string;
  pricingCurrency: string;
  contractType: ContractType;
  status: ListingStatus;

  // 物理商品字段
  condition?: ProductCondition;
  grams?: number;
  weightUnit: WeightUnit;
  inventoryPolicy: InventoryPolicy;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
  dimensionUnit: DimensionUnit;
  brand?: string;

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

  // 标签和商品类型
  tags: string[];
  productType: string;

  // 配送档案
  shippingProfile?: ShippingProfile;

  // 变体和库存
  options: VariantOption[];
  skus: SkuItem[];
  inventoryTracking: boolean;

  // 数字商品文件
  digitalFiles: DigitalFile[];

  // 可选功能
  optionalFeatures: OptionalFeature[];

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
 * 数字商品下载文件
 */
export interface DigitalFile {
  /** 文件 ID (IPFS hash or upload ID) */
  file: string;
  /** 文件名 */
  name: string;
  /** 文件大小（字节） */
  size?: number;
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
  shortDescription: '',
  description: '',
  price: '',
  compareAtPrice: '',
  pricingCurrency: 'USD',
  contractType: 'PHYSICAL_GOOD',
  status: 'published',
  condition: 'NEW',
  grams: 0,
  weightUnit: 'g',
  inventoryPolicy: 'deny',
  packageLength: undefined,
  packageWidth: undefined,
  packageHeight: undefined,
  dimensionUnit: 'cm',
  brand: '',
  blockchain: 'ETH',
  tokenAddress: '',
  tokenStandard: '',
  cryptoListingCurrencyCode: '',
  minQuantity: 1,
  maxQuantity: 100,
  acceptedCurrencies: DEFAULT_LISTING_ACCEPTED_CURRENCIES,
  images: [],
  introVideo: '',
  altIntroVideoLinks: [],
  tags: [],
  productType: '',
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
  digitalFiles: [],
  optionalFeatures: [],
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
    'productType',
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
        'processingTime',
      ];
    case 'DIGITAL_GOOD':
      return [...commonFields, 'optionalFeatures', 'processingTime'];
    case 'SERVICE':
      return [...commonFields, 'optionalFeatures', 'processingTime'];
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
            options: [],
            acceptedCurrencies:
              prev.acceptedCurrencies && prev.acceptedCurrencies.length > 0
                ? prev.acceptedCurrencies
                : DEFAULT_RWA_ACCEPTED_CURRENCIES,
          }
        : {
            acceptedCurrencies:
              prev.acceptedCurrencies && prev.acceptedCurrencies.length > 0
                ? prev.acceptedCurrencies
                : DEFAULT_LISTING_ACCEPTED_CURRENCIES,
          }),
      ...(newType !== 'PHYSICAL_GOOD'
        ? {
            condition: undefined,
            grams: undefined,
          }
        : {
            condition: prev.condition || 'NEW',
          }),
    }));
    setIsDirty(true);
  }, []);

  /**
   * 验证表单
   * @param isDraft - 草稿模式使用宽松验证（仅需标题）
   */
  const validate = useCallback(
    (isDraft = false): boolean => {
      const newErrors: FormErrors = {};

      // 草稿模式：仅需标题
      if (isDraft) {
        if (!formData.title.trim()) {
          newErrors.title = 'Title is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
      }

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

      // 划线价验证: 必须 > 售价
      if (formData.compareAtPrice) {
        const compareAt = parseFloat(formData.compareAtPrice);
        const price = parseFloat(formData.price);
        if (compareAt > 0 && price > 0 && compareAt <= price) {
          newErrors.compareAtPrice = 'Compare at price must be greater than price';
        }
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
    },
    [formData]
  );

  /**
   * 构建 API 请求数据
   */
  const buildRequestData = useCallback(() => {
    const priceMinimal = toMinimalUnit(parseFloat(formData.price) || 0, formData.pricingCurrency);
    const itemData: Record<string, unknown> = {
      title: formData.title,
      description: formData.description,
      price: String(priceMinimal),
      nsfw: formData.nsfw,
      tags: formData.tags,
      images: formData.images,
      productType: formData.productType,
      processingTime: formData.processingTime,
    };

    // Short description
    if (formData.shortDescription) {
      itemData.shortDescription = formData.shortDescription;
    }

    // Compare at price (maps to regularPrice in proto)
    if (formData.compareAtPrice) {
      const compareAtMinimal = toMinimalUnit(
        parseFloat(formData.compareAtPrice) || 0,
        formData.pricingCurrency
      );
      itemData.regularPrice = String(compareAtMinimal);
    }

    const data: Record<string, unknown> = {
      item: itemData,
      metadata: {
        contractType: formData.contractType,
        format: 'FIXED_PRICE',
        expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        pricingCurrency: {
          code: formData.pricingCurrency,
          divisibility: getCurrencyDecimals(formData.pricingCurrency),
        },
        acceptedCurrencies: canonicalizeAcceptedCurrencies(
          formData.acceptedCurrencies,
          formData.contractType === 'RWA_TOKEN'
            ? DEFAULT_RWA_ACCEPTED_CURRENCIES
            : DEFAULT_LISTING_ACCEPTED_CURRENCIES
        ),
      },
      status: formData.status || 'published',
    };

    // Build SKU array for all product types (non-variant products use default SKU)
    const buildSkuArray = () =>
      formData.skus.map(sku => ({
        productID: sku.productID,
        selections: sku.selections,
        price: sku.price
          ? String(toMinimalUnit(parseFloat(sku.price) || 0, formData.pricingCurrency))
          : undefined,
        compareAtPrice: sku.compareAtPrice
          ? String(toMinimalUnit(parseFloat(sku.compareAtPrice) || 0, formData.pricingCurrency))
          : undefined,
        quantity: sku.quantity === -1 ? '-1' : String(sku.quantity),
        images: sku.images,
        barcode: sku.barcode || undefined,
        weight: sku.weight || undefined,
      }));

    // 物理商品特定字段
    if (formData.contractType === 'PHYSICAL_GOOD') {
      (data.item as Record<string, unknown>).condition = formData.condition;
      (data.item as Record<string, unknown>).grams = formData.grams;
      if (formData.weightUnit && formData.weightUnit !== 'g') {
        (data.item as Record<string, unknown>).weightUnit = formData.weightUnit;
      }
      if (formData.inventoryPolicy && formData.inventoryPolicy !== 'deny') {
        (data.item as Record<string, unknown>).inventoryPolicy = formData.inventoryPolicy;
      }
      // Package dimensions (only send non-zero values)
      if (formData.packageLength && formData.packageLength > 0) {
        (data.item as Record<string, unknown>).packageLength = formData.packageLength;
      }
      if (formData.packageWidth && formData.packageWidth > 0) {
        (data.item as Record<string, unknown>).packageWidth = formData.packageWidth;
      }
      if (formData.packageHeight && formData.packageHeight > 0) {
        (data.item as Record<string, unknown>).packageHeight = formData.packageHeight;
      }
      if (formData.dimensionUnit && formData.dimensionUnit !== 'cm') {
        (data.item as Record<string, unknown>).dimensionUnit = formData.dimensionUnit;
      }
      // Brand
      if (formData.brand) {
        (data.item as Record<string, unknown>).brand = formData.brand;
      }
      data.shippingProfile = formData.shippingProfile;
      if (formData.shippingProfile?.profileId) {
        data.shippingProfileId = formData.shippingProfile.profileId;
      }
      (data.item as Record<string, unknown>).options = formData.options.map(opt => ({
        name: opt.name,
        description: opt.description,
        variants: opt.variants,
      }));
      (data.item as Record<string, unknown>).skus = buildSkuArray();
    } else if (formData.contractType === 'DIGITAL_GOOD') {
      // Digital goods: send SKU with downloadable flag and downloads
      const skuData: Record<string, unknown> = {
        productID: formData.skus[0]?.productID || '',
        selections: [],
        quantity:
          formData.skus[0]?.quantity === -1 ? '-1' : String(formData.skus[0]?.quantity || -1),
        barcode: formData.skus[0]?.barcode || undefined,
        downloadable: formData.digitalFiles.length > 0,
        downloads: formData.digitalFiles.map(f => ({
          name: f.name,
          file: f.file,
        })),
      };
      (data.item as Record<string, unknown>).skus = [skuData];
    } else {
      // Non-physical products: still send default SKU for barcode tracking
      const defaultSku = formData.skus[0];
      if (defaultSku && (defaultSku.barcode || defaultSku.quantity !== -1)) {
        (data.item as Record<string, unknown>).skus = buildSkuArray();
      }
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

    // 编辑模式添加 slug
    if (formData.slug) {
      data.slug = formData.slug;
    }

    return data;
  }, [formData]);

  /**
   * 提交表单（发布）
   */
  const submit = useCallback(async (): Promise<{ slug: string } | { error: string }> => {
    // Ensure status is 'published' when submitting normally
    setFormData(prev => ({ ...prev, status: 'published' }));

    if (!validate()) {
      return { error: 'Validation failed' };
    }

    setIsSubmitting(true);

    try {
      const requestData = buildRequestData();
      // Override status to published
      requestData.status = 'published';

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
   * 保存为草稿（宽松验证）
   */
  const submitDraft = useCallback(async (): Promise<{ slug: string } | { error: string }> => {
    setFormData(prev => ({ ...prev, status: 'draft' }));

    if (!validate(true)) {
      return { error: 'Title is required for draft' };
    }

    setIsSubmitting(true);

    try {
      const requestData = buildRequestData();
      // Override status to draft
      requestData.status = 'draft';

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
      return { error: err instanceof Error ? err.message : 'Failed to save draft' };
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

    // 表单操作
    validate,
    submit,
    submitDraft,
    reset,
  };
}

export default useListingForm;
