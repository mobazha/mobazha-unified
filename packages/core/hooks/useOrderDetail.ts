/**
 * useOrderDetail Hook
 * 封装订单数据获取和转换逻辑
 *
 * 使用示例：
 * ```typescript
 * const { displayOrder, coreOrder, isLoading, error, refetch } = useOrderDetail(orderId, 'sale');
 * ```
 */

import { useMemo } from 'react';
import { useOrder } from './useOrders';
import { useUserStore } from '../stores/userStore';
import { transformCoreOrder } from '../utils/transforms/orderTransform';
import type { Order as CoreOrder } from '../types/order';
import type { DisplayOrder } from '../types/orderDisplay';

/**
 * useOrderDetail Hook 返回值
 */
export interface UseOrderDetailReturn {
  /** 转换后的展示订单数据 */
  displayOrder: DisplayOrder | null;
  /** 原始 API 订单数据 */
  coreOrder: CoreOrder | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 重新获取数据 */
  refetch: () => void;
}

/**
 * 订单详情 Hook
 *
 * 封装了：
 * 1. 从 API 获取订单数据 (useOrder)
 * 2. 从 store 获取当前用户 peerID
 * 3. 将 API 数据转换为 UI 展示格式 (transformCoreOrder)
 *
 * @param orderId - 订单 ID
 * @param viewingContext - 查看上下文，用于后备角色判断
 *   - 'sale': 从卖家视角查看（如来自销售订单列表）
 *   - 'purchase': 从买家视角查看（如来自购买订单列表）
 *   - undefined: 仅依赖 peerID 匹配判断角色
 *
 * @returns UseOrderDetailReturn
 *
 * @example
 * ```typescript
 * // 从销售订单列表点击进入
 * const { displayOrder, isLoading } = useOrderDetail(orderId, 'sale');
 *
 * // 从购买订单列表点击进入
 * const { displayOrder, isLoading } = useOrderDetail(orderId, 'purchase');
 *
 * // 直接访问订单详情页（无上下文）
 * const { displayOrder, isLoading } = useOrderDetail(orderId);
 * ```
 */
export function useOrderDetail(
  orderId: string,
  viewingContext?: 'sale' | 'purchase'
): UseOrderDetailReturn {
  // 获取当前用户信息
  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;

  // 使用 useOrder hook 获取订单数据
  const { order: coreOrder, isLoading, error, refetch } = useOrder(orderId);

  // 转换订单数据
  const displayOrder = useMemo(() => {
    if (!coreOrder) return null;
    return transformCoreOrder(coreOrder, {
      currentUserPeerID,
      viewingContext,
    });
  }, [coreOrder, currentUserPeerID, viewingContext]);

  return {
    displayOrder,
    coreOrder,
    isLoading,
    error,
    refetch,
  };
}
