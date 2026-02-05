/**
 * 运费选项验证工具
 * 提供地区冲突检测和重量范围验证功能
 */

import type { ShippingOptionConfig, ShippingServiceConfig } from '../types/shippingConfig';

// 为旧代码保持兼容性的类型别名
type ShippingService = ShippingServiceConfig;

/**
 * 地区冲突检测结果
 */
export interface RegionConflict {
  region: string;
  conflictingOption: string;
}

/**
 * 重量范围间隙
 */
export interface WeightRangeGap {
  start: number;
  end: number;
}

/**
 * 重量范围重叠
 */
export interface WeightRangeOverlap {
  service1Index: number;
  service2Index: number;
  overlapStart: number;
  overlapEnd: number;
}

/**
 * 检测新运费选项与现有选项的地区冲突
 * @param newOption 新的运费选项
 * @param existingOptions 现有的运费选项列表
 * @param excludeId 要排除的选项 ID（编辑时使用）
 * @returns 冲突的地区列表
 */
export function detectRegionConflicts(
  newOption: ShippingOptionConfig,
  existingOptions: ShippingOptionConfig[],
  excludeId?: number
): RegionConflict[] {
  const conflicts: RegionConflict[] = [];

  // 如果新选项包含 ALL，检查是否有其他非 ALL 选项
  const newHasAll = newOption.regions.includes('ALL');

  for (const existing of existingOptions) {
    // 跳过自身（编辑模式）
    if (excludeId && existing.id === excludeId) continue;
    // 跳过 LOCAL_PICKUP 类型（本地自提可以与其他选项共存）
    if (existing.type === 'LOCAL_PICKUP' || newOption.type === 'LOCAL_PICKUP') continue;

    const existingHasAll = existing.regions.includes('ALL');

    // 如果任一选项是 ALL，则与另一个选项的所有地区冲突
    if (newHasAll || existingHasAll) {
      // ALL 与 ALL 冲突
      if (newHasAll && existingHasAll) {
        conflicts.push({
          region: 'ALL',
          conflictingOption: existing.name || 'Unnamed',
        });
      } else if (newHasAll) {
        // 新选项是 ALL，与现有所有地区冲突
        for (const region of existing.regions) {
          if (region !== 'ALL') {
            conflicts.push({
              region,
              conflictingOption: existing.name || 'Unnamed',
            });
          }
        }
      } else {
        // 现有选项是 ALL，新选项的所有地区都冲突
        for (const region of newOption.regions) {
          if (region !== 'ALL') {
            conflicts.push({
              region,
              conflictingOption: existing.name || 'Unnamed',
            });
          }
        }
      }
    } else {
      // 检查具体地区冲突
      for (const region of newOption.regions) {
        if (existing.regions.includes(region)) {
          conflicts.push({
            region,
            conflictingOption: existing.name || 'Unnamed',
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * 验证重量范围完整性（用于 SAME_WEIGHT_SAME_FEE 模式）
 * @param services 服务列表
 * @returns 重量范围间隙列表
 */
export function validateWeightRangeCoverage(services: ShippingService[]): WeightRangeGap[] {
  if (services.length === 0) return [];

  // 按起始重量排序
  const sortedServices = [...services].sort((a, b) => a.startWeight - b.startWeight);

  const gaps: WeightRangeGap[] = [];

  // 检查第一个服务是否从 0 开始
  if (sortedServices[0].startWeight > 0) {
    gaps.push({
      start: 0,
      end: sortedServices[0].startWeight - 1,
    });
  }

  // 检查服务之间的间隙
  for (let i = 0; i < sortedServices.length - 1; i++) {
    const current = sortedServices[i];
    const next = sortedServices[i + 1];

    if (current.endWeight + 1 < next.startWeight) {
      gaps.push({
        start: current.endWeight + 1,
        end: next.startWeight - 1,
      });
    }
  }

  return gaps;
}

/**
 * 检测重量范围重叠
 * @param services 服务列表
 * @returns 重叠列表
 */
export function detectWeightRangeOverlaps(services: ShippingService[]): WeightRangeOverlap[] {
  const overlaps: WeightRangeOverlap[] = [];

  for (let i = 0; i < services.length; i++) {
    for (let j = i + 1; j < services.length; j++) {
      const s1 = services[i];
      const s2 = services[j];

      // 检查是否重叠
      const overlapStart = Math.max(s1.startWeight, s2.startWeight);
      const overlapEnd = Math.min(s1.endWeight, s2.endWeight);

      if (overlapStart <= overlapEnd) {
        overlaps.push({
          service1Index: i,
          service2Index: j,
          overlapStart,
          overlapEnd,
        });
      }
    }
  }

  return overlaps;
}

/**
 * 格式化重量显示（克 -> kg/g）
 * @param grams 重量（克）
 * @returns 格式化后的字符串
 */
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg}kg`;
  }
  return `${grams}g`;
}

/**
 * 综合验证运费选项
 * @param option 运费选项
 * @param existingOptions 现有选项列表
 * @param excludeId 排除的 ID
 * @returns 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  regionConflicts: RegionConflict[];
  weightGaps: WeightRangeGap[];
  weightOverlaps: WeightRangeOverlap[];
}

export function validateShippingOption(
  option: ShippingOptionConfig,
  existingOptions: ShippingOptionConfig[],
  excludeId?: number
): ValidationResult {
  const regionConflicts = detectRegionConflicts(option, existingOptions, excludeId);

  // 只对 SAME_WEIGHT_SAME_FEE 模式验证重量范围
  const weightGaps =
    option.serviceType === 'SAME_WEIGHT_SAME_FEE'
      ? validateWeightRangeCoverage(option.services)
      : [];

  const weightOverlaps =
    option.serviceType === 'SAME_WEIGHT_SAME_FEE' ? detectWeightRangeOverlaps(option.services) : [];

  return {
    isValid: regionConflicts.length === 0 && weightGaps.length === 0 && weightOverlaps.length === 0,
    regionConflicts,
    weightGaps,
    weightOverlaps,
  };
}
