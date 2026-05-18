/**
 * useOrderDetail Hook
 * 封装订单数据获取和转换逻辑
 *
 * 使用示例：
 * ```typescript
 * const { displayOrder, coreOrder, isLoading, error, refetch } = useOrderDetail(orderId, 'sale');
 * ```
 */

import { useMemo, useEffect, useState } from 'react';
import { useOrder } from './useOrders';
import { useUserStore } from '../stores/userStore';
import { transformCoreOrder } from '../utils/transforms/orderTransform';
import { fetchProfileWithCache } from '../services/profileCache';
import { getImageUrl } from '../services/api/config';
import type { Order as CoreOrder } from '../types/order';
import type { SettlementActionSnapshot } from '../types/order';
import type { DisplayOrder } from '../types/orderDisplay';

/**
 * useOrderDetail Hook 返回值
 */
export interface UseOrderDetailReturn {
  /** 转换后的展示订单数据 */
  displayOrder: DisplayOrder | null;
  /** 原始 API 订单数据 */
  coreOrder: CoreOrder | null;
  /** 最新的结算动作快照（如果存在） */
  latestSettlementAction: SettlementActionSnapshot | null;
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
 * 4. 异步获取 vendor、buyer、moderator 的 profile 信息
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
/**
 * Profile 增强信息
 */
interface ProfileEnhancement {
  vendorName?: string;
  vendorAvatar?: string;
  vendorLocation?: string;
  buyerName?: string;
  buyerAvatar?: string;
  buyerLocation?: string;
  moderatorName?: string;
  moderatorAvatar?: string;
  moderatorLocation?: string;
}

export function useOrderDetail(
  orderId: string,
  viewingContext?: 'sale' | 'purchase'
): UseOrderDetailReturn {
  // 获取当前用户信息
  const currentUser = useUserStore(state => state.profile);
  const currentUserPeerID = currentUser?.peerID || null;

  // 使用 useOrder hook 获取订单数据
  const { order: coreOrder, isLoading, error, refetch } = useOrder(orderId);
  const latestSettlementAction = coreOrder?.settlementActions?.[0] || null;

  // 用于存储异步获取的 profile 增强信息
  const [profileEnhancement, setProfileEnhancement] = useState<ProfileEnhancement>({});

  // 转换订单数据（基础转换）
  const baseDisplayOrder = useMemo(() => {
    if (!coreOrder) return null;
    return transformCoreOrder(coreOrder, {
      currentUserPeerID,
      viewingContext,
    });
  }, [coreOrder, currentUserPeerID, viewingContext]);

  // 异步获取 profile 信息
  useEffect(() => {
    if (!baseDisplayOrder) return;

    // 捕获当前值，避免异步函数中的类型问题
    const currentOrder = baseDisplayOrder;
    let cancelled = false;

    async function fetchProfiles() {
      const enhancement: ProfileEnhancement = {};

      // 并行获取所有需要的 profile
      const peerIDs: string[] = [];
      if (currentOrder.vendor?.peerID) peerIDs.push(currentOrder.vendor.peerID);
      if (currentOrder.buyer?.peerID) peerIDs.push(currentOrder.buyer.peerID);
      if (currentOrder.moderator?.id) peerIDs.push(currentOrder.moderator.id);

      if (peerIDs.length === 0) return;

      const profiles = await Promise.all(peerIDs.map(fetchProfileWithCache));

      if (cancelled) return;

      // 提取 vendor profile
      if (currentOrder.vendor?.peerID) {
        const vendorProfile = profiles[peerIDs.indexOf(currentOrder.vendor.peerID)];
        if (vendorProfile) {
          enhancement.vendorName =
            vendorProfile.name || vendorProfile.handle || currentOrder.vendor.name;
          const avatarHash = vendorProfile.avatarHashes?.medium;
          enhancement.vendorAvatar = avatarHash ? getImageUrl(avatarHash) || '' : '';
          enhancement.vendorLocation = vendorProfile.location;
        }
      }

      // 提取 buyer profile
      if (currentOrder.buyer?.peerID) {
        const buyerProfile = profiles[peerIDs.indexOf(currentOrder.buyer.peerID)];
        if (buyerProfile) {
          enhancement.buyerName =
            buyerProfile.name || buyerProfile.handle || currentOrder.buyer.name;
          const avatarHash = buyerProfile.avatarHashes?.medium;
          enhancement.buyerAvatar = avatarHash ? getImageUrl(avatarHash) || '' : '';
          enhancement.buyerLocation = buyerProfile.location;
        }
      }

      // 提取 moderator profile
      if (currentOrder.moderator?.id) {
        const modProfile = profiles[peerIDs.indexOf(currentOrder.moderator.id)];
        if (modProfile) {
          enhancement.moderatorName =
            modProfile.name || modProfile.handle || currentOrder.moderator.name;
          const avatarHash = modProfile.avatarHashes?.medium;
          enhancement.moderatorAvatar = avatarHash ? getImageUrl(avatarHash) || '' : '';
          enhancement.moderatorLocation = modProfile.location;
        }
      }

      setProfileEnhancement(enhancement);
    }

    fetchProfiles();

    return () => {
      cancelled = true;
    };
  }, [baseDisplayOrder]);

  // 合并基础订单和 profile 增强信息
  const displayOrder = useMemo(() => {
    if (!baseDisplayOrder) return null;

    const order = { ...baseDisplayOrder };

    // 应用 profile 增强
    if (order.vendor && (profileEnhancement.vendorName || profileEnhancement.vendorAvatar)) {
      order.vendor = {
        ...order.vendor,
        name: profileEnhancement.vendorName || order.vendor.name,
        avatar: profileEnhancement.vendorAvatar || order.vendor.avatar,
        location: profileEnhancement.vendorLocation || order.vendor.location,
      };
    }

    if (order.buyer && (profileEnhancement.buyerName || profileEnhancement.buyerAvatar)) {
      order.buyer = {
        ...order.buyer,
        name: profileEnhancement.buyerName || order.buyer.name,
        avatar: profileEnhancement.buyerAvatar || order.buyer.avatar,
        location: profileEnhancement.buyerLocation || order.buyer.location,
      };
    }

    if (
      order.moderator &&
      (profileEnhancement.moderatorName || profileEnhancement.moderatorAvatar)
    ) {
      order.moderator = {
        ...order.moderator,
        name: profileEnhancement.moderatorName || order.moderator.name,
        avatar: profileEnhancement.moderatorAvatar || order.moderator.avatar,
        location: profileEnhancement.moderatorLocation || order.moderator.location,
      };
    }

    return order;
  }, [baseDisplayOrder, profileEnhancement]);

  return {
    displayOrder,
    coreOrder,
    latestSettlementAction,
    isLoading,
    error,
    refetch,
  };
}
