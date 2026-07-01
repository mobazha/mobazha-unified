'use client';

/**
 * useUserContext — 能力 + 上下文统一判断 hook
 *
 * 角色判断的单一可靠信号源：
 * - isStoreOwner (Zustand persisted) — 登录时确定性检测
 *   · basic auth → true
 *   · JWT + ownerUserId 匹配 → true
 *   · 其余 → false
 * - authMode — 认证机制标识
 *   · 'hosted' = SaaS 平台
 *   · 'basic' / 'standalone' = 独立站
 *
 * 不依赖 isStandaloneMode() 等环境级检测，避免 Next.js
 * 客户端导航 / Suspense 重挂载导致的不稳定问题。
 *
 * @see docs/product/ROLE_AND_VIEW_MODEL.md
 */

import { useMemo } from 'react';
import { useUserStore } from '../stores/userStore';

export interface UserContext {
  /** 用户是否已认证 */
  isAuthenticated: boolean;
  /** 是否拥有店铺（独立站: isStoreOwner, SaaS: vendor flag） */
  hasStore: boolean;
  /** 是否有买家节点（有 peerID 即可） */
  hasBuyerNode: boolean;
  /** 纯卖家（独立站店主 — 物理隔离不能购买） */
  isPureSeller: boolean;
  /** 纯买家（独立站非店主 — 物理隔离不能管理店铺） */
  isPureBuyer: boolean;
  /** SaaS 用户天然双角色（既能买也能管理店铺，如果有店铺的话） */
  isDualRole: boolean;
  /** 当前用户的店铺是否处于暂停状态（度假模式） */
  isStorePaused: boolean;
}

export function useUserContext(): UserContext {
  const { isAuthenticated, profile, authMode, isStoreOwner } = useUserStore();

  return useMemo(() => {
    // isStoreOwner: 独立站店主 (basic auth 或 ownerUserId 匹配的 OAuth)
    // profile.vendor: SaaS 用户已开店
    const hasStore = isStoreOwner || (authMode === 'hosted' && profile?.vendor === true);

    const hasBuyerNode = !!profile?.peerID;

    // 纯卖家: 独立站店主, 非 hosted (SaaS 双角色无此限制)
    const isPureSeller = isStoreOwner && authMode !== 'hosted';
    // 纯买家: 已认证、非店主、非 hosted
    const isPureBuyer = isAuthenticated && !isStoreOwner && authMode !== 'hosted';
    // SaaS 双角色
    const isDualRole = authMode === 'hosted' && isAuthenticated;

    const isStorePaused = hasStore && profile?.storePaused === true;

    return {
      isAuthenticated,
      hasStore,
      hasBuyerNode,
      isPureSeller,
      isPureBuyer,
      isDualRole,
      isStorePaused,
    };
  }, [
    isAuthenticated,
    profile?.vendor,
    profile?.peerID,
    profile?.storePaused,
    authMode,
    isStoreOwner,
  ]);
}
