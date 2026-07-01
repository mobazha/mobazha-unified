/**
 * 配送系统类型定义 - Shopify 风格
 * 与后端 pkg/models/shipping.go 中的结构对齐
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
 * 所有配送区域通过 locationGroups 管理。
 * 单仓库卖家使用一个默认 LocationGroup（locationIds 为空表示"所有地点"）。
 * 多仓库卖家使用多个 LocationGroup，每个关联不同发货地点。
 */
export interface ShippingProfile {
  /** 档案唯一 ID (UUID) */
  profileId: string;
  /** 档案名称 */
  name: string;
  /** 是否为默认档案 */
  isDefault: boolean;
  /** 发货地点组列表（至少一个） */
  locationGroups: LocationGroup[];
  /** 乐观锁版本号（更新时必传） */
  version?: number;
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
 * 默认包含一个空的 LocationGroup（单仓库模式）
 */
export function createEmptyShippingProfile(isDefault = false): ShippingProfile {
  return {
    profileId: generateId(),
    name: '',
    isDefault,
    locationGroups: [createEmptyLocationGroup()],
  };
}

// ============== 辅助函数 ==============

/**
 * 获取档案的所有区域（从所有 LocationGroups 中提取）
 * 与后端 getAllZonesFromProfile 保持一致
 */
export function getAllZones(profile: ShippingProfile): ShippingZone[] {
  const zones: ShippingZone[] = [];
  for (const lg of profile.locationGroups ?? []) {
    if (lg.zones?.length) {
      zones.push(...lg.zones);
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
