/**
 * OTC Store - 管理 OTC 交易状态
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  NftOrder,
  Erc3525Order,
  UserNft,
  Erc3525Holding,
  NftOrderStatus,
  Erc3525OrderStatus,
} from '../types/otc';

// ============================================================
// 类型定义
// ============================================================

interface OtcState {
  // NFT OTC 状态
  userNfts: UserNft[];
  nftOrders: NftOrder[];
  currentNftOrder: NftOrder | null;
  
  // ERC3525 OTC 状态
  userHoldings: Erc3525Holding[];
  rwaOrders: Erc3525Order[];
  currentRwaOrder: Erc3525Order | null;
  
  // 加载状态
  isLoadingNfts: boolean;
  isLoadingHoldings: boolean;
  isLoadingOrder: boolean;
  isProcessing: boolean;
  
  // 错误状态
  error: string | null;
  
  // 创建订单状态 (用于多步骤流程)
  createOrderStep: number;
  selectedNft: UserNft | null;
  selectedHolding: Erc3525Holding | null;
  sharesToSell: number;
  orderPrice: number;
  generatedOrderId: string | null;
}

interface OtcActions {
  // NFT 相关
  setUserNfts: (nfts: UserNft[]) => void;
  setNftOrders: (orders: NftOrder[]) => void;
  setCurrentNftOrder: (order: NftOrder | null) => void;
  selectNft: (nft: UserNft | null) => void;
  
  // ERC3525 相关
  setUserHoldings: (holdings: Erc3525Holding[]) => void;
  setRwaOrders: (orders: Erc3525Order[]) => void;
  setCurrentRwaOrder: (order: Erc3525Order | null) => void;
  selectHolding: (holding: Erc3525Holding | null) => void;
  setSharesToSell: (shares: number) => void;
  
  // 订单创建流程
  setCreateOrderStep: (step: number) => void;
  setOrderPrice: (price: number) => void;
  setGeneratedOrderId: (orderId: string | null) => void;
  resetCreateOrder: () => void;
  
  // 加载状态
  setLoadingNfts: (loading: boolean) => void;
  setLoadingHoldings: (loading: boolean) => void;
  setLoadingOrder: (loading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  
  // 错误处理
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // 重置
  reset: () => void;
}

type OtcStore = OtcState & OtcActions;

// ============================================================
// 初始状态
// ============================================================

const initialState: OtcState = {
  // NFT OTC 状态
  userNfts: [],
  nftOrders: [],
  currentNftOrder: null,
  
  // ERC3525 OTC 状态
  userHoldings: [],
  rwaOrders: [],
  currentRwaOrder: null,
  
  // 加载状态
  isLoadingNfts: false,
  isLoadingHoldings: false,
  isLoadingOrder: false,
  isProcessing: false,
  
  // 错误状态
  error: null,
  
  // 创建订单状态
  createOrderStep: 1,
  selectedNft: null,
  selectedHolding: null,
  sharesToSell: 0,
  orderPrice: 0,
  generatedOrderId: null,
};

// ============================================================
// Store 创建
// ============================================================

export const useOtcStore = create<OtcStore>()(
  devtools(
    (set) => ({
      ...initialState,

      // NFT 相关
      setUserNfts: (nfts) => set({ userNfts: nfts }),
      setNftOrders: (orders) => set({ nftOrders: orders }),
      setCurrentNftOrder: (order) => set({ currentNftOrder: order }),
      selectNft: (nft) => set({ selectedNft: nft }),

      // ERC3525 相关
      setUserHoldings: (holdings) => set({ userHoldings: holdings }),
      setRwaOrders: (orders) => set({ rwaOrders: orders }),
      setCurrentRwaOrder: (order) => set({ currentRwaOrder: order }),
      selectHolding: (holding) => set({
        selectedHolding: holding,
        sharesToSell: holding?.value || 0,
      }),
      setSharesToSell: (shares) => set({ sharesToSell: shares }),

      // 订单创建流程
      setCreateOrderStep: (step) => set({ createOrderStep: step }),
      setOrderPrice: (price) => set({ orderPrice: price }),
      setGeneratedOrderId: (orderId) => set({ generatedOrderId: orderId }),
      resetCreateOrder: () => set({
        createOrderStep: 1,
        selectedNft: null,
        selectedHolding: null,
        sharesToSell: 0,
        orderPrice: 0,
        generatedOrderId: null,
      }),

      // 加载状态
      setLoadingNfts: (loading) => set({ isLoadingNfts: loading }),
      setLoadingHoldings: (loading) => set({ isLoadingHoldings: loading }),
      setLoadingOrder: (loading) => set({ isLoadingOrder: loading }),
      setProcessing: (processing) => set({ isProcessing: processing }),

      // 错误处理
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // 重置
      reset: () => set(initialState),
    }),
    { name: 'otc-store' }
  )
);

// ============================================================
// Selectors
// ============================================================

export const selectUserNfts = (state: OtcStore) => state.userNfts;
export const selectNftOrders = (state: OtcStore) => state.nftOrders;
export const selectActiveNftOrders = (state: OtcStore) =>
  state.nftOrders.filter((o) => o.status === 0);
export const selectCompletedNftOrders = (state: OtcStore) =>
  state.nftOrders.filter((o) => o.status === 1);

export const selectUserHoldings = (state: OtcStore) => state.userHoldings;
export const selectRwaOrders = (state: OtcStore) => state.rwaOrders;
export const selectActiveRwaOrders = (state: OtcStore) =>
  state.rwaOrders.filter((o) => o.status === 0);

export const selectIsLoading = (state: OtcStore) =>
  state.isLoadingNfts || state.isLoadingHoldings || state.isLoadingOrder;

export const selectCreateOrderProgress = (state: OtcStore) => ({
  step: state.createOrderStep,
  selectedNft: state.selectedNft,
  selectedHolding: state.selectedHolding,
  sharesToSell: state.sharesToSell,
  orderPrice: state.orderPrice,
  generatedOrderId: state.generatedOrderId,
});
