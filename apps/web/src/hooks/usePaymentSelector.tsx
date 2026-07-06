'use client';

import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from './useMediaQuery';
import { useModerators } from './useModerators';
import {
  usePaymentMethods,
  syncCheckoutPaymentSessionStorage,
  sanitizeCheckoutTokenId,
  sanitizeCheckoutFiatProvider,
  persistCheckoutTokenSelection,
  persistCheckoutFiatSelection,
  useFiatPaymentVisible,
  isFiatAllowedByCheckoutPaymentPolicy,
  readCheckoutPaymentPolicyFromSession,
  persistCheckoutPaymentPolicy,
  sanitizeCheckoutPaymentPolicySession,
  normalizeCheckoutPaymentPolicy,
  type CheckoutPaymentPolicy,
} from '@mobazha/core';
import {
  getAvailableFiatProviderIDs,
  getAvailablePaymentTokens,
  PaymentDrawer,
  Moderator,
} from '@/components/Payment';

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
  checkoutAcceptedCurrencies?: string[];
  checkoutPaymentPolicy: CheckoutPaymentPolicy;
}

/**
 * 支付选择器上下文操作
 */
interface PaymentSelectorContextValue extends PaymentSelectorState {
  availableFiatProviders: string[];
  availableCryptoTokenIds: string[];
  acceptedCurrencies: string[];
  moderators: Moderator[];
  isLoadingModerators: boolean;
  showFiatCheckoutMethods: boolean;
  openPaymentSelector: (returnUrl?: string) => void;
  openModeratorSelector: (returnUrl?: string) => void;
  closePaymentDrawer: () => void;
  closeModeratorDrawer: () => void;
  setSelectedTokenId: (tokenId: string) => void;
  setSelectedFiatProvider: (providerID: string) => void;
  setSelectedModerator: (moderator: Moderator) => void;
  setVendorPeerID: (peerID: string | undefined) => void;
  setCheckoutAcceptedCurrencies: (currencies: string[] | undefined) => void;
  setCheckoutPaymentPolicy: (policy: CheckoutPaymentPolicy, orderID?: string) => void;
  restoreFromSession: (options?: {
    orderID?: string;
    paymentPolicy?: CheckoutPaymentPolicy;
  }) => void;
}

const PaymentSelectorContext = createContext<PaymentSelectorContextValue | null>(null);

function readInitialPaymentSelection(): Pick<
  PaymentSelectorState,
  'paymentCategory' | 'selectedTokenId' | 'selectedFiatProvider' | 'checkoutPaymentPolicy'
> {
  const checkoutPaymentPolicy = readCheckoutPaymentPolicyFromSession();
  const session = syncCheckoutPaymentSessionStorage({ paymentPolicy: checkoutPaymentPolicy });
  return {
    paymentCategory: session.category,
    selectedTokenId: session.tokenId,
    selectedFiatProvider: session.fiatProvider,
    checkoutPaymentPolicy: session.paymentPolicy,
  };
}

/**
 * 支付选择器 Provider
 */
export function PaymentSelectorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const fiatVisible = useFiatPaymentVisible();

  // 卖家 PeerID — 用于获取该卖家支持的支付方式（crypto + fiat）
  const [vendorPeerID, setVendorPeerID] = useState<string | undefined>();
  // 获取调解员列表
  const { moderators, isLoading: isLoadingModerators } = useModerators({
    autoFetch: true,
    vendorPeerID,
  });
  const { activeFiat, crypto: sellerAcceptedCurrencies } = usePaymentMethods(vendorPeerID);
  const configuredFiatProviders = useMemo(() => activeFiat.map(p => p.providerID), [activeFiat]);

  const [state, setState] = useState<PaymentSelectorState>(() => {
    if (typeof window === 'undefined') {
      return {
        isPaymentDrawerOpen: false,
        isModeratorDrawerOpen: false,
        paymentCategory: 'crypto' as PaymentCategory,
        selectedTokenId: undefined,
        selectedFiatProvider: undefined,
        selectedModerator: undefined,
        checkoutAcceptedCurrencies: undefined,
        checkoutPaymentPolicy: 'all' as CheckoutPaymentPolicy,
      };
    }

    const savedModeratorJson = sessionStorage.getItem('checkout_selected_moderator');

    return {
      isPaymentDrawerOpen: false,
      isModeratorDrawerOpen: false,
      ...readInitialPaymentSelection(),
      selectedModerator: savedModeratorJson ? JSON.parse(savedModeratorJson) : undefined,
      checkoutAcceptedCurrencies: undefined,
    };
  });

  const acceptedCurrencies = state.checkoutAcceptedCurrencies ?? sellerAcceptedCurrencies;
  const availableFiatProviders = useMemo(
    () => getAvailableFiatProviderIDs(configuredFiatProviders, state.checkoutAcceptedCurrencies),
    [configuredFiatProviders, state.checkoutAcceptedCurrencies]
  );
  const availableCryptoTokenIds = useMemo(
    () => getAvailablePaymentTokens(acceptedCurrencies).map(token => token.id),
    [acceptedCurrencies]
  );

  const restoreFromSession = useCallback(
    (options?: { orderID?: string; paymentPolicy?: CheckoutPaymentPolicy }) => {
      if (typeof window === 'undefined') return;

      const savedModeratorJson = sessionStorage.getItem('checkout_selected_moderator');
      const checkoutPaymentPolicy = options?.paymentPolicy
        ? normalizeCheckoutPaymentPolicy(options.paymentPolicy)
        : readCheckoutPaymentPolicyFromSession(options?.orderID);
      if (options?.orderID && options.paymentPolicy) {
        persistCheckoutPaymentPolicy(checkoutPaymentPolicy, options.orderID);
      }
      const session = syncCheckoutPaymentSessionStorage({ paymentPolicy: checkoutPaymentPolicy });

      setState(prev => ({
        ...prev,
        paymentCategory: session.category,
        selectedTokenId: session.tokenId,
        selectedFiatProvider: session.fiatProvider,
        checkoutPaymentPolicy: session.paymentPolicy,
        selectedModerator: savedModeratorJson
          ? JSON.parse(savedModeratorJson)
          : prev.selectedModerator,
      }));
    },
    []
  );

  const setCheckoutPaymentPolicy = useCallback(
    (policy: CheckoutPaymentPolicy, orderID?: string) => {
      const normalized = normalizeCheckoutPaymentPolicy(policy);
      persistCheckoutPaymentPolicy(normalized, orderID);
      sanitizeCheckoutPaymentPolicySession(normalized);
      const session = syncCheckoutPaymentSessionStorage({ paymentPolicy: normalized });
      setState(prev => ({
        ...prev,
        checkoutPaymentPolicy: normalized,
        paymentCategory: session.category,
        selectedTokenId: session.tokenId,
        selectedFiatProvider: session.fiatProvider,
      }));
    },
    []
  );

  // 打开支付方式选择器
  const openPaymentSelector = useCallback(
    (returnUrl?: string) => {
      if (isMobile) {
        const resolvedReturnUrl =
          returnUrl ??
          (typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : undefined);
        const url = new URL('/checkout/payment-method', window.location.origin);
        if (state.selectedTokenId) {
          url.searchParams.set('selected', state.selectedTokenId);
        }
        if (vendorPeerID) {
          url.searchParams.set('vendor', vendorPeerID);
        }
        if (state.checkoutPaymentPolicy !== 'all') {
          url.searchParams.set('paymentPolicy', state.checkoutPaymentPolicy);
        }
        if (returnUrl) {
          url.searchParams.set('returnUrl', returnUrl);
        } else if (resolvedReturnUrl) {
          url.searchParams.set('returnUrl', resolvedReturnUrl);
        }
        router.push(url.pathname + url.search);
      } else {
        setState(prev => ({ ...prev, isPaymentDrawerOpen: true }));
      }
    },
    [isMobile, router, state.selectedTokenId, state.checkoutPaymentPolicy, vendorPeerID]
  );

  // 打开仲裁员选择器
  const openModeratorSelector = useCallback(
    (returnUrl?: string) => {
      if (isMobile) {
        const resolvedReturnUrl =
          returnUrl ??
          (typeof window !== 'undefined'
            ? `${window.location.pathname}${window.location.search}`
            : undefined);
        const url = new URL('/checkout/moderator', window.location.origin);
        if (state.selectedModerator?.peerID) {
          url.searchParams.set('selected', state.selectedModerator.peerID);
        }
        if (vendorPeerID) {
          url.searchParams.set('vendor', vendorPeerID);
        }
        if (returnUrl) {
          url.searchParams.set('returnUrl', returnUrl);
        } else if (resolvedReturnUrl) {
          url.searchParams.set('returnUrl', resolvedReturnUrl);
        }
        router.push(url.pathname + url.search);
      } else {
        // 桌面端：打开抽屉
        setState(prev => ({ ...prev, isModeratorDrawerOpen: true }));
      }
    },
    [isMobile, router, state.selectedModerator, vendorPeerID]
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
    if (!sanitizeCheckoutTokenId(tokenId)) return;
    setState(prev => ({
      ...prev,
      paymentCategory: 'crypto',
      selectedTokenId: tokenId,
      selectedFiatProvider: undefined,
    }));
    persistCheckoutTokenSelection(tokenId);
  }, []);

  const setSelectedFiatProvider = useCallback(
    (providerID: string) => {
      if (
        !fiatVisible ||
        !isFiatAllowedByCheckoutPaymentPolicy(state.checkoutPaymentPolicy) ||
        !sanitizeCheckoutFiatProvider(providerID)
      ) {
        return;
      }
      setState(prev => ({
        ...prev,
        paymentCategory: 'fiat',
        selectedFiatProvider: providerID,
        selectedTokenId: undefined,
      }));
      persistCheckoutFiatSelection(providerID);
    },
    [fiatVisible, state.checkoutPaymentPolicy]
  );

  // 设置选中的仲裁员
  const setSelectedModerator = useCallback((moderator: Moderator) => {
    setState(prev => ({ ...prev, selectedModerator: moderator }));
    // 同步到 sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('checkout_selected_moderator', JSON.stringify(moderator));
    }
  }, []);

  const setCheckoutAcceptedCurrencies = useCallback((currencies: string[] | undefined) => {
    const normalized = currencies
      ? [...new Set(currencies.map(currency => currency.trim()).filter(Boolean))]
      : undefined;
    setState(prev => ({ ...prev, checkoutAcceptedCurrencies: normalized }));
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

  const showFiatCheckoutMethods =
    fiatVisible && isFiatAllowedByCheckoutPaymentPolicy(state.checkoutPaymentPolicy);

  const contextValue: PaymentSelectorContextValue = {
    ...state,
    availableFiatProviders,
    availableCryptoTokenIds,
    acceptedCurrencies,
    moderators,
    isLoadingModerators,
    showFiatCheckoutMethods,
    openPaymentSelector,
    openModeratorSelector,
    closePaymentDrawer,
    closeModeratorDrawer,
    setSelectedTokenId,
    setSelectedFiatProvider,
    setSelectedModerator,
    setVendorPeerID,
    setCheckoutAcceptedCurrencies,
    setCheckoutPaymentPolicy,
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
            showFiatMethods={showFiatCheckoutMethods}
            paymentPolicyNoteKey={
              showFiatCheckoutMethods ? undefined : 'collectibles.checkout.escrowCryptoOnlyNote'
            }
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
