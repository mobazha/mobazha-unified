'use client';

import React, { useState, useCallback, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from './useMediaQuery';
import { PaymentDrawer, Moderator } from '@/components/Payment';

/**
 * 支付选择器上下文状态
 */
interface PaymentSelectorState {
  // 抽屉状态
  isPaymentDrawerOpen: boolean;
  isModeratorDrawerOpen: boolean;
  // 选中的值
  selectedTokenId?: string;
  selectedModerator?: Moderator;
}

/**
 * 支付选择器上下文操作
 */
interface PaymentSelectorContextValue extends PaymentSelectorState {
  // 打开选择器（响应式：移动端跳转页面，桌面端打开抽屉）
  openPaymentSelector: (returnUrl?: string) => void;
  openModeratorSelector: (returnUrl?: string) => void;
  // 关闭抽屉
  closePaymentDrawer: () => void;
  closeModeratorDrawer: () => void;
  // 设置选中值
  setSelectedTokenId: (tokenId: string) => void;
  setSelectedModerator: (moderator: Moderator) => void;
  // 从 sessionStorage 恢复状态
  restoreFromSession: () => void;
}

const PaymentSelectorContext = createContext<PaymentSelectorContextValue | null>(null);

/**
 * 支付选择器 Provider
 */
export function PaymentSelectorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // 使用初始状态函数从 sessionStorage 恢复状态
  const [state, setState] = useState<PaymentSelectorState>(() => {
    // 仅在客户端执行
    if (typeof window === 'undefined') {
      return {
        isPaymentDrawerOpen: false,
        isModeratorDrawerOpen: false,
        selectedTokenId: undefined,
        selectedModerator: undefined,
      };
    }

    const savedTokenId = sessionStorage.getItem('checkout_selected_token');
    const savedModeratorJson = sessionStorage.getItem('checkout_selected_moderator');

    return {
      isPaymentDrawerOpen: false,
      isModeratorDrawerOpen: false,
      selectedTokenId: savedTokenId || undefined,
      selectedModerator: savedModeratorJson ? JSON.parse(savedModeratorJson) : undefined,
    };
  });

  // 从 sessionStorage 恢复状态（供外部调用）
  const restoreFromSession = useCallback(() => {
    if (typeof window === 'undefined') return;

    const savedTokenId = sessionStorage.getItem('checkout_selected_token');
    const savedModeratorJson = sessionStorage.getItem('checkout_selected_moderator');

    setState(prev => ({
      ...prev,
      selectedTokenId: savedTokenId || prev.selectedTokenId,
      selectedModerator: savedModeratorJson
        ? JSON.parse(savedModeratorJson)
        : prev.selectedModerator,
    }));
  }, []);

  // 打开支付方式选择器
  const openPaymentSelector = useCallback(
    (returnUrl?: string) => {
      if (isMobile) {
        // 移动端：跳转到选择页面
        const url = new URL('/checkout/payment-method', window.location.origin);
        if (state.selectedTokenId) {
          url.searchParams.set('selected', state.selectedTokenId);
        }
        if (returnUrl) {
          url.searchParams.set('returnUrl', returnUrl);
        }
        router.push(url.pathname + url.search);
      } else {
        // 桌面端：打开抽屉
        setState(prev => ({ ...prev, isPaymentDrawerOpen: true }));
      }
    },
    [isMobile, router, state.selectedTokenId]
  );

  // 打开仲裁员选择器
  const openModeratorSelector = useCallback(
    (returnUrl?: string) => {
      if (isMobile) {
        // 移动端：跳转到选择页面
        const url = new URL('/checkout/moderator', window.location.origin);
        if (state.selectedModerator?.peerID) {
          url.searchParams.set('selected', state.selectedModerator.peerID);
        }
        if (returnUrl) {
          url.searchParams.set('returnUrl', returnUrl);
        }
        router.push(url.pathname + url.search);
      } else {
        // 桌面端：打开抽屉
        setState(prev => ({ ...prev, isModeratorDrawerOpen: true }));
      }
    },
    [isMobile, router, state.selectedModerator]
  );

  // 关闭支付方式抽屉
  const closePaymentDrawer = useCallback(() => {
    setState(prev => ({ ...prev, isPaymentDrawerOpen: false }));
  }, []);

  // 关闭仲裁员抽屉
  const closeModeratorDrawer = useCallback(() => {
    setState(prev => ({ ...prev, isModeratorDrawerOpen: false }));
  }, []);

  // 设置选中的代币
  const setSelectedTokenId = useCallback((tokenId: string) => {
    setState(prev => ({ ...prev, selectedTokenId: tokenId }));
    // 同步到 sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_selected_token', tokenId);
    }
  }, []);

  // 设置选中的仲裁员
  const setSelectedModerator = useCallback((moderator: Moderator) => {
    setState(prev => ({ ...prev, selectedModerator: moderator }));
    // 同步到 sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_selected_moderator', JSON.stringify(moderator));
    }
  }, []);

  // 处理抽屉中的选择
  const handleTokenSelect = useCallback(
    (tokenId: string) => {
      setSelectedTokenId(tokenId);
      closePaymentDrawer();
    },
    [setSelectedTokenId, closePaymentDrawer]
  );

  const handleModeratorSelect = useCallback(
    (moderator: Moderator) => {
      setSelectedModerator(moderator);
      closeModeratorDrawer();
    },
    [setSelectedModerator, closeModeratorDrawer]
  );

  const contextValue: PaymentSelectorContextValue = {
    ...state,
    openPaymentSelector,
    openModeratorSelector,
    closePaymentDrawer,
    closeModeratorDrawer,
    setSelectedTokenId,
    setSelectedModerator,
    restoreFromSession,
  };

  return (
    <PaymentSelectorContext.Provider value={contextValue}>
      {children}

      {/* 桌面端抽屉（仅在非移动端渲染） */}
      {!isMobile && (
        <>
          <PaymentDrawer
            type="payment"
            isOpen={state.isPaymentDrawerOpen}
            onClose={closePaymentDrawer}
            selectedTokenId={state.selectedTokenId}
            onSelectToken={handleTokenSelect}
          />
          <PaymentDrawer
            type="moderator"
            isOpen={state.isModeratorDrawerOpen}
            onClose={closeModeratorDrawer}
            selectedModerator={state.selectedModerator}
            onSelectModerator={handleModeratorSelect}
          />
        </>
      )}
    </PaymentSelectorContext.Provider>
  );
}

/**
 * 使用支付选择器 Hook
 */
export function usePaymentSelector() {
  const context = useContext(PaymentSelectorContext);
  if (!context) {
    throw new Error('usePaymentSelector must be used within a PaymentSelectorProvider');
  }
  return context;
}
