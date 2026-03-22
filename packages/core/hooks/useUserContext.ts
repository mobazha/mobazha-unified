'use client';

/**
 * useUserContext — 能力 + 上下文统一判断 hook
 *
 * 将角色判断从"认证方式代理"升级为"能力 + 上下文"模型，
 * 统一 SaaS / 独立站 / TMA 三端的角色逻辑。
 *
 * 设计原则：
 * - 能力（Capabilities）= 用户能做什么？由后端数据决定（profile.vendor）
 * - 上下文（Context）= 用户在做什么？由当前路由/部署模式决定
 *
 * @see docs/product/ROLE_AND_VIEW_MODEL.md
 */

import { useMemo } from 'react';
import { useUserStore } from '../stores/userStore';
import { isStandalone } from '../services/auth';

export interface UserContext {
  /** 用户是否已认证 */
  isAuthenticated: boolean;
  /** 是否拥有店铺（SaaS: vendor flag, 独立站: basic auth） */
  hasStore: boolean;
  /** 是否有买家节点（有 peerID 即可） */
  hasBuyerNode: boolean;
  /** 纯卖家（仅独立站成立 — basic auth 管理店铺，物理隔离不能购买） */
  isPureSeller: boolean;
  /** 纯买家（仅独立站成立 — standalone auth 购物，物理隔离不能管理店铺） */
  isPureBuyer: boolean;
  /** SaaS 用户天然双角色（既能买也能管理店铺，如果有店铺的话） */
  isDualRole: boolean;
  /** 当前用户的店铺是否处于暂停状态（度假模式） */
  isStorePaused: boolean;
}

/**
 * 统一用户上下文 hook
 *
 * 替代各组件中 `authMode === 'basic'` / `authMode === 'standalone'` 的分散判断逻辑。
 *
 * @example
 * ```tsx
 * const { hasStore, isPureSeller, isPureBuyer } = useUserContext();
 *
 * // Admin 入口：有店铺且非纯买家才显示
 * {hasStore && !isPureBuyer && <Link href="/admin">Admin</Link>}
 *
 * // 订单入口：非纯卖家才显示
 * {!isPureSeller && <Link href="/orders">Orders</Link>}
 * ```
 */
export function useUserContext(): UserContext {
  const { isAuthenticated, profile, authMode } = useUserStore();
  const standaloneMode = isStandalone();

  return useMemo(() => {
    // --- 能力层（来自后端数据 / 部署模式）---
    const hasStore = standaloneMode ? authMode === 'basic' : profile?.vendor === true;

    const hasBuyerNode = !!profile?.peerID;

    // --- 互斥角色（仅独立站存在）---
    // 独立站是物理隔离的：卖家用 basic auth 管理，买家用 OAuth 购物
    const isPureSeller = standaloneMode && authMode === 'basic';
    const isPureBuyer = standaloneMode && authMode === 'standalone';

    // SaaS 用户天然双角色
    const isDualRole = !standaloneMode && isAuthenticated;

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
    standaloneMode,
  ]);
}
