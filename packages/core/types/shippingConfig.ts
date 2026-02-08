/**
 * 配送系统类型定义 - Shopify 风格
 * 与后端 pkg/models/preferences.go 中的结构对齐
 */

// ============== 核心类型 ==============

/**
 * 发货地点
 */
export interface ShippingLocation {
  /** 地点 ID */
  id: string;
  /** 地点名称（如 "北京仓"、"美国仓"） */
  name: string;
  /** 地址（可选） */
  address?: string;
  /** 是否为默认地点 */
  isDefault: boolean;
}

/**
 * 费率条件类型
 */
export type RateConditionType = 'weight' | 'price';

/**
 * 费率条件（可选）
 * 用于设置基于重量或价格的条件费率
 */
export interface RateCondition {
  /** 条件类型 */
  type: RateConditionType;
  /** 最小值（重量为克，价格为最小单位） */
  minValue: number;
  /** 最大值（0 表示无上限） */
  maxValue: number;
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
 * 配送费率（对应 Shopify 的 Rate）
 */
export interface ShippingRate {
  /** 费率 ID */
  id: string;
  /** 费率名称（如 "标准配送"、"快递"） */
  name: string;
  /** 价格 - string 类型支持加密货币精确金额 */
  price: string;
  /** 货币代码 */
  currency: string;
  /** 预计送达时间（如 "5-7 天"） */
  estimatedDelivery: string;
  /** 可选条件（基于重量或价格） */
  condition?: RateCondition;
  /** 满额免邮配置 */
  freeShippingThreshold?: FreeShippingThreshold;
}

/**
 * 配送区域（对应 Shopify 的 Delivery Zone）
 */
export interface ShippingZone {
  /** 区域 ID */
  id: string;
  /** 区域名称（如 "全球"、"亚洲"、"北美"） */
  name: string;
  /** 配送区域（ISO 3166-1 alpha-2 代码，如 "CN", "US"，或特殊区域 "ALL"） */
  regions: string[];
  /** 该区域的费率列表 */
  rates: ShippingRate[];
}

/**
 * 发货地点组（对应 Shopify 的 Location Group）
 * 用于多仓库场景
 */
export interface LocationGroup {
  /** 地点组 ID */
  id: string;
  /** 关联的发货地点 ID 列表 */
  locationIds: string[];
  /** 该地点组的配送区域 */
  zones: ShippingZone[];
}

/**
 * 配送档案（Shopify 风格）
 * 支持两种模式：
 * - 简化模式（单一发货地点）：使用 zones 字段
 * - 完整模式（多发货地点）：使用 locationGroups 字段
 */
export interface ShippingProfile {
  /** 档案唯一 ID (UUID) */
  profileId: string;
  /** 档案名称 */
  name: string;
  /** 是否为默认档案 */
  isDefault: boolean;
  /** 配送区域列表（简化模式） */
  zones?: ShippingZone[];
  /** 发货地点组列表（完整模式，多仓库） */
  locationGroups?: LocationGroup[];
  /** 关联商品数量（只读，由后端计算） */
  listingCount?: number;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
}

// ============== 工厂函数 ==============

/**
 * 生成唯一 ID（简单实现）
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建空的发货地点
 */
export function createEmptyLocation(isDefault = false): ShippingLocation {
  return {
    id: generateId(),
    name: '',
    isDefault,
  };
}

/**
 * 创建空的配送费率
 */
export function createEmptyRate(currency = 'USD'): ShippingRate {
  return {
    id: generateId(),
    name: '',
    price: '0',
    currency,
    estimatedDelivery: '',
  };
}

/**
 * 创建空的配送区域
 */
export function createEmptyZone(currency = 'USD'): ShippingZone {
  return {
    id: generateId(),
    name: '',
    regions: [],
    rates: [createEmptyRate(currency)],
  };
}

/**
 * 创建空的发货地点组
 */
export function createEmptyLocationGroup(locationIds: string[] = []): LocationGroup {
  return {
    id: generateId(),
    locationIds,
    zones: [],
  };
}

/**
 * 创建空的配送档案
 */
export function createEmptyShippingProfile(isDefault = false): ShippingProfile {
  return {
    profileId: generateId(),
    name: '',
    isDefault,
    zones: [],
  };
}

// ============== 辅助函数 ==============

/**
 * 检查档案是否使用多仓库模式
 */
export function isUsingLocationGroups(profile: ShippingProfile): boolean {
  return (profile.locationGroups?.length ?? 0) > 0;
}

/**
 * 获取档案的所有区域（合并直接 zones 和 LocationGroups 中的 zones）
 * 与后端 getAllZonesFromProfile 保持一致
 */
export function getAllZones(profile: ShippingProfile): ShippingZone[] {
  const zones: ShippingZone[] = [];
  // 先添加直接 zones
  if (profile.zones?.length) {
    zones.push(...profile.zones);
  }
  // 再添加 LocationGroups 中的 zones
  if (profile.locationGroups?.length) {
    for (const lg of profile.locationGroups) {
      if (lg.zones?.length) {
        zones.push(...lg.zones);
      }
    }
  }
  return zones;
}

/**
 * 获取档案的所有费率
 */
export function getAllRates(profile: ShippingProfile): ShippingRate[] {
  return getAllZones(profile).flatMap(zone => zone.rates);
}

/**
 * 获取档案的价格范围
 */
export function getPriceRange(
  profile: ShippingProfile
): { min: number; max: number; currency: string } | null {
  const rates = getAllRates(profile);
  if (rates.length === 0) return null;

  const prices = rates.map(r => parseFloat(r.price) || 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    currency: rates[0].currency,
  };
}

/**
 * 获取档案覆盖的所有区域代码
 */
export function getAllRegions(profile: ShippingProfile): string[] {
  const zones = getAllZones(profile);
  const regions = new Set<string>();
  zones.forEach(zone => zone.regions.forEach(r => regions.add(r)));
  return Array.from(regions);
}

// ============== 配送系统数据 ==============

/**
 * 配送系统数据
 */
export interface ShippingData {
  /** 配送档案列表 */
  shippingProfiles?: ShippingProfile[];
  /** 发货地点列表 */
  shippingLocations?: ShippingLocation[];
}

/**
 * 检查是否有多个发货地点
 */
export function hasMultipleLocations(data: ShippingData): boolean {
  return (data.shippingLocations?.length ?? 0) > 1;
}

// ============== 旧版类型（用于迁移，已废弃）==============

/**
 * @deprecated 使用 ShippingRate 替代
 */
export interface ShippingServiceConfig {
  name: string;
  estimatedDelivery: string;
  startWeight: number;
  endWeight: number;
  firstWeight: number;
  firstFreight: string;
  renewalUnitWeight: number;
  renewalUnitPrice: string;
  registrationFee: string;
}

/**
 * @deprecated 使用 ShippingZone 替代
 */
export interface ShippingOptionConfig {
  id?: number;
  name: string;
  type: 'FIXED_PRICE' | 'LOCAL_PICKUP';
  currency: string;
  serviceType: 'FIRST_RENEWAL_FEE' | 'SAME_WEIGHT_SAME_FEE';
  regions: string[];
  services: ShippingServiceConfig[];
  freeShippingThreshold?: FreeShippingThreshold;
}

/**
 * @deprecated 创建空的配送服务（用于表单初始化）
 */
export function createEmptyShippingService(): ShippingServiceConfig {
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
 * @deprecated 创建空的配送选项（用于表单初始化）
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
