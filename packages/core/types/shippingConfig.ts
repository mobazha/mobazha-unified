/**
 * 配送选项配置类型定义
 * 与后端 pkg/models/preferences.go 中的 ShippingOption 结构对齐
 */

/**
 * 配送服务计费类型
 * - FIRST_RENEWAL_FEE: 首重续重模式（按重量阶梯计费）
 * - SAME_WEIGHT_SAME_FEE: 同重同价模式（固定价格）
 */
export type ShippingServiceType = 'FIRST_RENEWAL_FEE' | 'SAME_WEIGHT_SAME_FEE';

/**
 * 配送选项类型
 * - FIXED_PRICE: 固定价格配送
 * - LOCAL_PICKUP: 本地自提
 */
export type ShippingType = 'FIXED_PRICE' | 'LOCAL_PICKUP';

/**
 * 配送服务
 * 与后端 ShippingOption_Service 结构完全对齐
 */
export interface ShippingService {
  /** 服务名称 */
  name: string;
  /** 预计送达时间 */
  estimatedDelivery: string;
  /** 起始重量（克） */
  startWeight: number;
  /** 结束重量（克） */
  endWeight: number;
  /** 首重（克） */
  firstWeight: number;
  /** 首重运费 - string 类型支持加密货币精确金额 */
  firstFreight: string;
  /** 续重单位重量（克） */
  renewalUnitWeight: number;
  /** 续重单价 - string 类型支持加密货币精确金额 */
  renewalUnitPrice: string;
  /** 挂号费 - string 类型支持加密货币精确金额 */
  registrationFee: string;
}

/**
 * 满额免邮配置
 */
export interface FreeShippingThreshold {
  /** 是否启用满额免邮 */
  enabled: boolean;
  /** 最低金额（最小单位） */
  minAmount: string;
}

/**
 * 配送选项配置
 * 与后端 ShippingOption 结构完全对齐
 */
export interface ShippingOptionConfig {
  /** 选项 ID（后端自动分配，新建时不传或传 0） */
  id?: number;
  /** 配送选项名称 */
  name: string;
  /** 配送类型 */
  type: ShippingType;
  /** 货币代码 */
  currency: string;
  /** 服务计费类型 */
  serviceType: ShippingServiceType;
  /** 配送区域（ISO 3166-1 alpha-2 代码，如 "CN", "US"，或特殊区域 "ALL"） */
  regions: string[];
  /** 配送服务列表 */
  services: ShippingService[];
  /** 满额免邮配置（可选） */
  freeShippingThreshold?: FreeShippingThreshold;
}

/**
 * 创建空的配送服务（用于表单初始化）
 */
export function createEmptyShippingService(): ShippingService {
  return {
    name: '',
    estimatedDelivery: '',
    startWeight: 0,
    endWeight: 0,
    firstWeight: 0,
    firstFreight: '0',
    renewalUnitWeight: 0,
    renewalUnitPrice: '0',
    registrationFee: '0',
  };
}

/**
 * 创建空的配送选项（用于表单初始化）
 */
export function createEmptyShippingOption(): ShippingOptionConfig {
  return {
    name: '',
    type: 'FIXED_PRICE',
    currency: 'USD',
    serviceType: 'SAME_WEIGHT_SAME_FEE',
    regions: [],
    services: [createEmptyShippingService()],
  };
}

/**
 * 配送类型显示名称映射
 */
export const SHIPPING_TYPE_LABELS: Record<ShippingType, string> = {
  FIXED_PRICE: 'shippingConfig.fixedPrice',
  LOCAL_PICKUP: 'shippingConfig.localPickup',
};

/**
 * 服务计费类型显示名称映射
 */
export const SERVICE_TYPE_LABELS: Record<ShippingServiceType, string> = {
  FIRST_RENEWAL_FEE: 'shippingConfig.firstRenewalFee',
  SAME_WEIGHT_SAME_FEE: 'shippingConfig.sameWeightSameFee',
};

/**
 * 配送档案（Shopify 模式）
 * 允许卖家创建多个配送方案，不同商品可关联不同档案
 */
export interface ShippingProfile {
  /** 档案唯一 ID (UUID) */
  profileId: string;
  /** 档案名称 */
  name: string;
  /** 是否为默认档案 */
  isDefault: boolean;
  /** 该档案下的运费选项 */
  options: ShippingOptionConfig[];
  /** 关联商品数量（只读，由后端计算） */
  listingCount?: number;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

/**
 * 创建空的配送档案（用于表单初始化）
 */
export function createEmptyShippingProfile(isDefault = false): ShippingProfile {
  return {
    profileId: '', // 由后端生成或前端使用 uuid
    name: '',
    isDefault,
    options: [],
  };
}

/**
 * 配送系统数据（包含传统模式和档案模式）
 */
export interface ShippingData {
  /** 传统模式：配送选项列表（向后兼容） */
  shippingOptions?: ShippingOptionConfig[];
  /** 新模式：配送档案列表 */
  shippingProfiles?: ShippingProfile[];
}

/**
 * 检查是否使用配送档案模式
 */
export function isUsingProfileMode(data: ShippingData): boolean {
  return (data.shippingProfiles?.length ?? 0) > 0;
}
