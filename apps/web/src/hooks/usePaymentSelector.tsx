'use client';

import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from './useMediaQuery';
import { useModerators } from './useModerators';
import { usePaymentMethods } from '@mobazha/core';
import { PaymentDrawer, Moderator } from '@/components/Payment';

type PaymentCategory = 'crypto' | 'fiat';

/**
 * 支付选择器上下文状态
 */
interface PaymentSelectorState {
  isPaymentDrawerOpen: boolean;
  isModeratorDrawerOpen: boolean;
  paymentCategory: PaymentCategory;
  selectedTokenId?: string;
  selectedFiatProvider?: string;
  selectedModerator?: Moderator;
}

/**
 * 支付选择器上下文操作
 */
interface PaymentSelectorContextValue extends PaymentSelectorState {
  availableFiatProviders: string[];
  acceptedCurrencies: string[];
  openPaymentSelector: (returnUrl?: string) => void;
  openModeratorSelector: (returnUrl?: string) => void;
  closePaymentDrawer: () => void;
  closeModeratorDrawer: () => void;
  setSelectedTokenId: (tokenId: string) => void;
  setSelectedFiatProvider: (providerID: string) => void;
  setSelectedModerator: (moderator: Moderator) => void;
  setVendorPeerID: (peerID: string | undefined) => void;
  restoreFromSession: () => void;
}

const PaymentSelectorContext = createContext<PaymentSelectorContextValue | null>(null);

/**
 * 支付选择器 Provider
 */
export function PaymentSelectorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // 获取调解员列表
  const { moderators, isLoading: isLoadingModerators } = useModerators({ autoFetch: true });

  // 卖家 PeerID — 用于获取该卖家支持的支付方式（crypto + fiat）
  const [vendorPeerID, setVendorPeerID] = useState<string | undefined>();
  const { activeFiat, crypto: acceptedCurrencies } = usePaymentMethods(vendorPeerID);
  const availableFiatProviders = useMemo(() => activeFiat.map(p => p.providerID), [activeFiat]);

  const [state, setState] = useState<PaymentSelectorState>(() => {
    if (typeof window === 'undefined') {
      return {
        isPaymentDrawerOpen: false,
        isModeratorDrawerOpen: false,
        paymentCategory: 'crypto' as PaymentCategory,
        selectedTokenId: undefined,
        selectedFiatProvider: undefined,
        selectedModerator: undefined,
      };
    }

    const savedTokenId = sessionStorage.getItem('checkout_selected_token');
    const savedFiatProvider = sessionStorage.getItem('checkout_selected_fiat_provider');
    const savedModeratorJson = sessionStorage.getItem('checkout_selected_moderator');
    const category: PaymentCategory = savedFiatProvider ? 'fiat' : 'crypto';

    return {
      isPaymentDrawerOpen: false,
      isModeratorDrawerOpen: false,
      paymentCategory: category,
      selectedTokenId: savedTokenId || undefined,
      selectedFiatProvider: savedFiatProvider || undefined,
      selectedModerator: savedModeratorJson ? JSON.parse(savedModeratorJson) : undefined,
    };
  });

  const restoreFromSession = useCallback(() => {
    if (typeof window === 'undefined') return;

    const savedTokenId = sessionStorage.getItem('checkout_selected_token');
    const savedFiatProvider = sessionStorage.getItem('checkout_selected_fiat_provider');
    const savedModeratorJson = sessionStorage.getItem('checkout_selected_moderator');

    setState(prev => ({
      ...prev,
      paymentCategory: savedFiatProvider ? 'fiat' : 'crypto',
      selectedTokenId: savedTokenId || prev.selectedTokenId,
      selectedFiatProvider: savedFiatProvider || prev.selectedFiatProvider,
      selectedModerator: savedModeratorJson
        ? JSON.parse(savedModeratorJson)
        : prev.selectedModerator,
    }));
  }, []);

  // 打开支付方式选择器
  const openPaymentSelector = useCallback(
    (returnUrl?: string) => {
      if (isMobile) {
        const url = new URL('/checkout/payment-method', window.location.origin);
        if (state.selectedTokenId) {
          url.searchParams.set('selected', state.selectedTokenId);
        }
        if (vendorPeerID) {
          url.searchParams.set('vendor', vendorPeerID);
        }
        if (returnUrl) {
          url.searchParams.set('returnUrl', returnUrl);
        }
        router.push(url.pathname + url.search);
      } else {
        setState(prev => ({ ...prev, isPaymentDrawerOpen: true }));
      }
    },
    [isMobile, router, state.selectedTokenId, vendorPeerID]
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

  const setSelectedTokenId = useCallback((tokenId: string) => {
    setState(prev => ({
      ...prev,
      paymentCategory: 'crypto',
      selectedTokenId: tokenId,
      selectedFiatProvider: undefined,
    }));
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_selected_token', tokenId);
      sessionStorage.removeItem('checkout_selected_fiat_provider');
    }
  }, []);

  const setSelectedFiatProvider = useCallback((providerID: string) => {
    setState(prev => ({
      ...prev,
      paymentCategory: 'fiat',
      selectedFiatProvider: providerID,
      selectedTokenId: undefined,
    }));
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_selected_fiat_provider', providerID);
      sessionStorage.removeItem('checkout_selected_token');
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

  const handleTokenSelect = useCallback(
    (tokenId: string) => {
      setSelectedTokenId(tokenId);
      closePaymentDrawer();
    },
    [setSelectedTokenId, closePaymentDrawer]
  );

  const handleFiatSelect = useCallback(
    (providerID: string) => {
      setSelectedFiatProvider(providerID);
      closePaymentDrawer();
    },
    [setSelectedFiatProvider, closePaymentDrawer]
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
    availableFiatProviders,
    acceptedCurrencies,
    openPaymentSelector,
    openModeratorSelector,
    closePaymentDrawer,
    closeModeratorDrawer,
    setSelectedTokenId,
    setSelectedFiatProvider,
    setSelectedModerator,
    setVendorPeerID,
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
            selectedFiatProvider={state.selectedFiatProvider}
            onSelectFiat={handleFiatSelect}
            availableFiatProviders={availableFiatProviders}
            acceptedCurrencies={acceptedCurrencies}
          />
          <PaymentDrawer
            type="moderator"
            isOpen={state.isModeratorDrawerOpen}
            onClose={closeModeratorDrawer}
            selectedModerator={state.selectedModerator}
            onSelectModerator={handleModeratorSelect}
            moderatorList={moderators}
            isLoadingModerators={isLoadingModerators}
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
