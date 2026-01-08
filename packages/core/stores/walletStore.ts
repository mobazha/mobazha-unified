/**
 * 钱包状态管理
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  WalletBalance,
  Transaction,
  CryptoType,
  SendTransactionRequest,
  FeeEstimate,
} from '../types';
import { walletApi } from '../services/api';

interface WalletState {
  // 状态
  balances: Record<string, WalletBalance>;
  transactions: Record<string, Transaction[]>;
  addresses: Record<string, string>;
  // 注意: 汇率统一使用 currencyStore，不在此处存储
  selectedCoin: CryptoType;
  isLoading: boolean;
  error: string | null;

  // 动作
  fetchBalances: () => Promise<void>;
  fetchBalance: (coin: CryptoType) => Promise<void>;
  fetchTransactions: (coin: CryptoType, limit?: number) => Promise<void>;
  fetchAddress: (coin: CryptoType) => Promise<string | null>;
  // 汇率统一使用 currencyStore.refreshRates()
  estimateFee: (coin: CryptoType, amount: number) => Promise<FeeEstimate | null>;
  sendTransaction: (
    request: SendTransactionRequest
  ) => Promise<{ success: boolean; txid?: string; error?: string }>;
  setSelectedCoin: (coin: CryptoType) => void;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>()(
  devtools(
    (set, get) => ({
      // 初始状态
      balances: {},
      transactions: {},
      addresses: {},
      selectedCoin: 'TETH',
      isLoading: false,
      error: null,

      // 获取所有余额
      fetchBalances: async () => {
        set({ isLoading: true, error: null });

        try {
          const balances = await walletApi.getAllBalances();
          set({ balances, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '获取余额失败',
            isLoading: false,
          });
        }
      },

      // 获取单个币种余额
      fetchBalance: async (coin: CryptoType) => {
        set({ isLoading: true, error: null });

        try {
          const balance = await walletApi.getBalance(coin);
          if (balance) {
            set(state => ({
              balances: { ...state.balances, [coin]: balance },
              isLoading: false,
            }));
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '获取余额失败',
            isLoading: false,
          });
        }
      },

      // 获取交易记录
      fetchTransactions: async (coin: CryptoType, limit = 20) => {
        set({ isLoading: true, error: null });

        try {
          const txs = await walletApi.getTransactions(coin, limit);
          set(state => ({
            transactions: { ...state.transactions, [coin]: txs },
            isLoading: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '获取交易记录失败',
            isLoading: false,
          });
        }
      },

      // 获取钱包地址
      fetchAddress: async (coin: CryptoType) => {
        try {
          const address = await walletApi.getAddress(coin);
          if (address) {
            set(state => ({
              addresses: { ...state.addresses, [coin]: address },
            }));
          }
          return address;
        } catch {
          return null;
        }
      },

      // 估算交易费用
      estimateFee: async (coin: CryptoType, amount: number) => {
        try {
          return await walletApi.estimateFee(coin, amount);
        } catch {
          return null;
        }
      },

      // 发送交易
      sendTransaction: async (request: SendTransactionRequest) => {
        set({ isLoading: true, error: null });

        try {
          const result = await walletApi.sendTransaction(request);

          if (result.success) {
            // 刷新余额和交易记录
            get().fetchBalance(request.currency);
            get().fetchTransactions(request.currency);

            set({ isLoading: false });
            return { success: true, txid: result.txid };
          }

          set({
            error: result.error || '发送失败',
            isLoading: false,
          });
          return { success: false, error: result.error };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '发送失败';
          set({
            error: errorMsg,
            isLoading: false,
          });
          return { success: false, error: errorMsg };
        }
      },

      // 设置选中的币种
      setSelectedCoin: (coin: CryptoType) => set({ selectedCoin: coin }),

      // 清除错误
      clearError: () => set({ error: null }),
    }),
    { name: 'WalletStore' }
  )
);

// 选择器
export const selectBalances = (state: WalletState) => state.balances;
export const selectSelectedCoinBalance = (state: WalletState) => state.balances[state.selectedCoin];
export const selectSelectedCoinTransactions = (state: WalletState) =>
  state.transactions[state.selectedCoin] || [];
export const selectWalletLoading = (state: WalletState) => state.isLoading;
export const selectWalletError = (state: WalletState) => state.error;
