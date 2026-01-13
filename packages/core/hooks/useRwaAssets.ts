/**
 * useRwaAssets Hook
 * 整合钱包状态与 RWA 资产查询
 *
 * 功能：
 * - 自动监听钱包连接状态变化
 * - 根据钱包地址查询 ERC1155/ERC3525 资产
 * - 提供加载状态和错误处理
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useWallet } from './useWallet';
import {
  getERC1155TokensOfOwner,
  getERC3525TokensOfOwner,
  batchGetBalances,
  clearBalanceCache,
} from '../services/rwa/rwaBalanceService';
import { predefinedAssets, getAssetsByType } from '../data/rwaAssetTemplates';
import type {
  RwaAsset,
  OwnedERC3525Token,
  OwnedERC1155Token,
  AssetTypeCode,
  PredefinedAsset,
} from '../types/rwa';
import { SEPOLIA_CONFIG } from '../types/rwa';

export interface UseRwaAssetsOptions {
  /** 是否自动加载预定义资产的余额 */
  autoLoadPredefinedBalances?: boolean;
  /** 要加载的资产类型 (默认全部) */
  assetTypes?: AssetTypeCode[];
  /** 是否自动刷新 (钱包地址变化时) */
  autoRefresh?: boolean;
}

export interface UseRwaAssetsReturn {
  // 钱包状态
  isWalletConnected: boolean;
  walletAddress: string | null;

  // 资产数据
  assets: RwaAsset[];
  predefinedAssetsWithBalance: PredefinedAsset[];
  ownedERC1155Tokens: OwnedERC1155Token[];
  ownedERC3525Tokens: OwnedERC3525Token[];

  // 加载状态
  isLoading: boolean;
  error: Error | null;

  // 方法
  refresh: () => Promise<void>;
  clearCache: () => void;
  connectWallet: () => Promise<void>;

  // 辅助方法
  getAssetBalance: (assetId: string) => string | null;
  hasAsset: (contractAddress: string, tokenId: string) => boolean;
}

/**
 * useRwaAssets Hook
 *
 * @example
 * ```tsx
 * const {
 *   isWalletConnected,
 *   walletAddress,
 *   assets,
 *   isLoading,
 *   refresh,
 *   connectWallet,
 * } = useRwaAssets();
 *
 * if (!isWalletConnected) {
 *   return <button onClick={connectWallet}>连接钱包查看资产</button>;
 * }
 *
 * return (
 *   <div>
 *     {assets.map(asset => (
 *       <div key={asset.id}>
 *         {asset.name}: {asset.balance} {asset.unit}
 *       </div>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useRwaAssets(options: UseRwaAssetsOptions = {}): UseRwaAssetsReturn {
  const {
    autoLoadPredefinedBalances = true,
    assetTypes: assetTypesProp,
    autoRefresh = true,
  } = options;

  // 稳定化 assetTypes，避免每次渲染都创建新数组
  const defaultAssetTypes = useRef<AssetTypeCode[]>(['CREATOR', 'BROADWAY']);
  const assetTypes = assetTypesProp || defaultAssetTypes.current;

  // 钱包状态
  const { isConnected, walletInfo, connect, openModal } = useWallet();
  const walletAddress = walletInfo?.address || null;

  // 追踪上一次的钱包地址，防止重复加载
  const prevWalletAddressRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef(true);

  // 本地状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [balances, setBalances] = useState<Record<string, string | null>>({});
  const [ownedERC1155Tokens, setOwnedERC1155Tokens] = useState<OwnedERC1155Token[]>([]);
  const [ownedERC3525Tokens, setOwnedERC3525Tokens] = useState<OwnedERC3525Token[]>([]);

  // 获取所有预定义资产 - 使用 JSON.stringify 来稳定化依赖
  const assetTypesKey = JSON.stringify(assetTypes);
  const allPredefinedAssets = useMemo(() => {
    const assets: PredefinedAsset[] = [];
    for (const typeCode of assetTypes) {
      assets.push(...getAssetsByType(typeCode));
    }
    return assets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetTypesKey]);

  // 带余额的预定义资产
  const predefinedAssetsWithBalance = useMemo(() => {
    return allPredefinedAssets.map(asset => ({
      ...asset,
      balance: balances[asset.id] ? parseInt(balances[asset.id] || '0', 10) : asset.balance,
    }));
  }, [allPredefinedAssets, balances]);

  // 转换为 RwaAsset 格式
  const assets = useMemo<RwaAsset[]>(() => {
    const result: RwaAsset[] = [];

    // 添加预定义资产 (带余额)
    for (const asset of predefinedAssetsWithBalance) {
      result.push({
        id: asset.id,
        name: asset.name,
        description: asset.description,
        emoji: asset.emoji,
        tokenStandard: asset.tokenStandard,
        contractAddress: asset.contractAddress,
        tokenId: asset.tokenId,
        slotId: asset.slotId,
        balance: balances[asset.id] || asset.balance.toString(),
        unit: asset.unit,
        source: 'predefined',
        membership: asset.membership,
        performance: asset.performance,
        rights: asset.rights,
      });
    }

    // 添加发现的 ERC3525 资产 (不在预定义列表中的)
    for (const token of ownedERC3525Tokens) {
      const exists = result.some(
        a =>
          a.contractAddress.toLowerCase() === token.contractAddress.toLowerCase() &&
          a.tokenId === token.tokenId
      );

      if (!exists) {
        result.push({
          id: `discovered-erc3525-${token.contractAddress}-${token.tokenId}`,
          name: `ERC3525 Token #${token.tokenId}`,
          description: `Slot: ${token.slot}`,
          tokenStandard: 'ERC3525',
          contractAddress: token.contractAddress,
          tokenId: token.tokenId,
          slotId: token.slot,
          balance: token.value,
          unit: '份',
          source: 'discovered',
        });
      }
    }

    // 添加发现的 ERC1155 资产 (不在预定义列表中的)
    for (const token of ownedERC1155Tokens) {
      const exists = result.some(
        a =>
          a.contractAddress.toLowerCase() === token.contractAddress.toLowerCase() &&
          a.tokenId === token.tokenId
      );

      if (!exists) {
        result.push({
          id: `discovered-erc1155-${token.contractAddress}-${token.tokenId}`,
          name: `ERC1155 Token #${token.tokenId}`,
          tokenStandard: 'ERC1155',
          contractAddress: token.contractAddress,
          tokenId: token.tokenId,
          balance: token.balance,
          unit: '份',
          source: 'discovered',
        });
      }
    }

    return result;
  }, [predefinedAssetsWithBalance, ownedERC3525Tokens, ownedERC1155Tokens, balances]);

  /**
   * 加载资产余额
   */
  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. 加载预定义资产的余额
      if (autoLoadPredefinedBalances && allPredefinedAssets.length > 0) {
        const assetBalances = await batchGetBalances(
          allPredefinedAssets,
          walletAddress || undefined
        );
        setBalances(assetBalances);
      }

      // 2. 如果钱包已连接，发现用户拥有的 ERC3525 资产
      if (walletAddress) {
        // 查询 ERC3525 资产
        if (SEPOLIA_CONFIG.mockErc3525Address) {
          try {
            const erc3525Tokens = await getERC3525TokensOfOwner(
              SEPOLIA_CONFIG.mockErc3525Address,
              walletAddress
            );
            setOwnedERC3525Tokens(erc3525Tokens);
          } catch (err) {
            console.error('Failed to load ERC3525 tokens:', err);
          }
        }

        // 查询 ERC1155 资产 (基于预定义的 tokenId)
        if (SEPOLIA_CONFIG.mockErc1155Address) {
          try {
            const knownTokenIds = allPredefinedAssets
              .filter(
                a =>
                  a.tokenStandard === 'ERC1155' &&
                  a.contractAddress.toLowerCase() ===
                    SEPOLIA_CONFIG.mockErc1155Address?.toLowerCase()
              )
              .map(a => a.tokenId);

            if (knownTokenIds.length > 0) {
              const erc1155Tokens = await getERC1155TokensOfOwner(
                SEPOLIA_CONFIG.mockErc1155Address,
                walletAddress,
                knownTokenIds
              );
              setOwnedERC1155Tokens(erc1155Tokens);
            }
          } catch (err) {
            console.error('Failed to load ERC1155 tokens:', err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError(err instanceof Error ? err : new Error('加载资产失败'));
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, autoLoadPredefinedBalances, allPredefinedAssets]);

  /**
   * 刷新资产
   */
  const refresh = useCallback(async () => {
    clearBalanceCache();
    await loadAssets();
  }, [loadAssets]);

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    clearBalanceCache();
    setBalances({});
    setOwnedERC3525Tokens([]);
    setOwnedERC1155Tokens([]);
  }, []);

  /**
   * 连接钱包
   */
  const connectWallet = useCallback(async () => {
    try {
      await openModal({ view: 'Connect' });
    } catch (err) {
      // 用户可能取消了连接
      console.log('Wallet connection cancelled or failed:', err);
    }
  }, [openModal]);

  /**
   * 获取资产余额
   */
  const getAssetBalance = useCallback(
    (assetId: string): string | null => {
      return balances[assetId] || null;
    },
    [balances]
  );

  /**
   * 检查是否拥有某个资产
   */
  const hasAsset = useCallback(
    (contractAddress: string, tokenId: string): boolean => {
      const normalizedAddress = contractAddress.toLowerCase();

      // 检查 ERC1155
      const hasERC1155 = ownedERC1155Tokens.some(
        t =>
          t.contractAddress.toLowerCase() === normalizedAddress &&
          t.tokenId === tokenId &&
          BigInt(t.balance) > 0n
      );

      if (hasERC1155) return true;

      // 检查 ERC3525
      const hasERC3525 = ownedERC3525Tokens.some(
        t =>
          t.contractAddress.toLowerCase() === normalizedAddress &&
          t.tokenId === tokenId &&
          BigInt(t.value) > 0n
      );

      return hasERC3525;
    },
    [ownedERC1155Tokens, ownedERC3525Tokens]
  );

  // 监听钱包地址变化，自动刷新
  useEffect(() => {
    // 只在初始加载或钱包地址变化时加载
    const shouldLoad =
      autoRefresh && (isInitialLoadRef.current || prevWalletAddressRef.current !== walletAddress);

    if (shouldLoad) {
      isInitialLoadRef.current = false;
      prevWalletAddressRef.current = walletAddress;
      loadAssets();
    }
    // 故意不将 loadAssets 放入依赖数组，因为我们使用 ref 来追踪状态变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, autoRefresh]);

  return {
    // 钱包状态
    isWalletConnected: isConnected,
    walletAddress,

    // 资产数据
    assets,
    predefinedAssetsWithBalance,
    ownedERC1155Tokens,
    ownedERC3525Tokens,

    // 加载状态
    isLoading,
    error,

    // 方法
    refresh,
    clearCache,
    connectWallet,

    // 辅助方法
    getAssetBalance,
    hasAsset,
  };
}

export default useRwaAssets;
