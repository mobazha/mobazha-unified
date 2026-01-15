/**
 * 向导式商品创建类型定义
 */

import type {
  ContractType,
  ProductCondition,
  AssetTypeCode,
  PredefinedAsset,
  TokenStandard,
  Image,
  ShippingOption,
  BlockchainNetwork,
} from '@mobazha/core';

/**
 * 向导步骤ID
 */
export type WizardStepId = 'type' | 'asset' | 'basic' | 'media' | 'shipping' | 'review';

/**
 * 向导表单数据
 */
export interface WizardFormData {
  // 商品类型
  contractType: ContractType;

  // RWA 相关
  rwaAssetType: AssetTypeCode | null;
  selectedAsset: PredefinedAsset | null;
  tokenStandard: TokenStandard | null;
  blockchain: BlockchainNetwork;
  tokenAddress: string;
  tokenId: string;
  slotId: string;
  cryptoListingCurrencyCode: string;
  acceptedCurrencies: string[];
  minQuantity: number;
  maxQuantity: number;
  rwaTradeMode: 'instant' | 'confirm_required';
  escrowTimeoutMinutes: number;

  // 基本信息
  title: string;
  description: string;
  price: string;
  pricingCurrency: string;
  condition: ProductCondition;
  grams: number;
  sku: string;
  nsfw: boolean;

  // 媒体
  images: Image[];
  introVideo: string;
  altIntroVideoLinks: string[];

  // 物流
  shippingOptions: ShippingOption[];
  selectedShippingOptions: string[];

  // 标签和分类
  tags: string[];
  categories: string[];

  // 政策
  termsAndConditions: string;
  refundPolicy: string;

  // 处理时间
  processingTime: string;
}

/**
 * 步骤组件属性
 */
export interface StepProps {
  formData: WizardFormData;
  updateField: <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => void;
  updateFields: (fields: Partial<WizardFormData>) => void;
  errors: Partial<Record<keyof WizardFormData, string>>;
  onNext?: () => void;
  onPrev?: () => void;
  isSubmitting?: boolean;
}

/**
 * 步骤定义
 */
export interface WizardStep {
  id: WizardStepId;
  title: string;
  titleKey: string;
  description?: string;
  descriptionKey?: string;
  condition?: (formData: WizardFormData) => boolean;
}

/**
 * 默认表单数据
 */
export const defaultFormData: WizardFormData = {
  contractType: 'PHYSICAL_GOOD',
  rwaAssetType: null,
  selectedAsset: null,
  tokenStandard: null,
  blockchain: 'ETH',
  tokenAddress: '',
  tokenId: '',
  slotId: '',
  cryptoListingCurrencyCode: '',
  acceptedCurrencies: ['ETHUSDT'],
  minQuantity: 1,
  maxQuantity: 100,
  rwaTradeMode: 'instant',
  escrowTimeoutMinutes: 1440,
  title: '',
  description: '',
  price: '',
  pricingCurrency: 'USD',
  condition: 'NEW',
  grams: 0,
  sku: '',
  nsfw: false,
  images: [],
  introVideo: '',
  altIntroVideoLinks: [],
  shippingOptions: [],
  selectedShippingOptions: [],
  tags: [],
  categories: [],
  termsAndConditions: '',
  refundPolicy: '',
  processingTime: '',
};
