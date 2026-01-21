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
import { getAssetsByType } from '../data/rwaAssetTemplates';
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
  /** 指定要查询的地址 (用于演示模式，不依赖钱包连接) */
  ownerAddress?: string;
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
    ownerAddress: ownerAddressProp,
  } = options;

  // 稳定化 assetTypes，避免每次渲染都创建新数组
  const defaultAssetTypes = useRef<AssetTypeCode[]>(['CREATOR', 'BROADWAY', 'STARLIGHT', 'KPOP']);
  const assetTypes = assetTypesProp || defaultAssetTypes.current;

  // 钱包状态
  const { isConnected, walletInfo, openModal } = useWallet();
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

  // 按 slot 分组的 ERC3525 token 详情 (用于展示每个 token 的具体数量)
  const erc3525TokenDetailsBySlot = useMemo(() => {
    const bySlot: Record<string, { tokens: OwnedERC3525Token[]; totalValue: bigint }> = {};

    for (const token of ownedERC3525Tokens) {
      const slotKey = `${token.contractAddress.toLowerCase()}_${token.slot}`;
      if (!bySlot[slotKey]) {
        bySlot[slotKey] = { tokens: [], totalValue: BigInt(0) };
      }
      bySlot[slotKey].tokens.push(token);
      bySlot[slotKey].totalValue += BigInt(token.value || 0);
    }

    return bySlot;
  }, [ownedERC3525Tokens]);

  // 转换为 RwaAsset 格式
  const assets = useMemo<RwaAsset[]>(() => {
    const result: RwaAsset[] = [];

    // 构建已存在资产的索引 (用于去重)
    // ERC1155: contractAddress + tokenId
    // ERC3525: contractAddress + slotId (同一 slot 的多个 tokenId 属于同一类资产)
    const existingERC1155Keys = new Set<string>();
    const existingERC3525Keys = new Set<string>();

    // 添加预定义资产 (带余额)
    for (const asset of predefinedAssetsWithBalance) {
      // 对于 ERC3525，如果有链上发现的数据，使用合并后的总余额
      let finalBalance = balances[asset.id] || asset.balance.toString();
      let tokenDetails: OwnedERC3525Token[] | undefined;

      if (asset.tokenStandard === 'ERC3525' && asset.slotId) {
        const slotKey = `${asset.contractAddress.toLowerCase()}_${asset.slotId}`;
        const slotData = erc3525TokenDetailsBySlot[slotKey];
        if (slotData) {
          finalBalance = slotData.totalValue.toString();
          tokenDetails = slotData.tokens;
        }
        existingERC3525Keys.add(slotKey);
      } else if (asset.tokenStandard === 'ERC1155') {
        existingERC1155Keys.add(`${asset.contractAddress.toLowerCase()}_${asset.tokenId}`);
      }

      result.push({
        id: asset.id,
        name: asset.name,
        description: asset.description,
        emoji: asset.emoji,
        tokenStandard: asset.tokenStandard,
        contractAddress: asset.contractAddress,
        tokenId: asset.tokenId,
        slotId: asset.slotId,
        balance: finalBalance,
        unit: asset.unit,
        source: 'predefined',
        membership: asset.membership,
        performance: asset.performance,
        rights: asset.rights,
        tokenDetails, // ERC3525 token 详情
      });
    }

    // 添加发现的 ERC3525 资产 (不在预定义列表中的)
    // 按 slot 分组处理
    for (const [slotKey, slotData] of Object.entries(erc3525TokenDetailsBySlot)) {
      if (existingERC3525Keys.has(slotKey)) {
        continue; // 已在预定义资产中
      }

      const firstToken = slotData.tokens[0];
      result.push({
        id: `discovered-erc3525-${firstToken.contractAddress}-slot-${firstToken.slot}`,
        name: `ERC3525 Slot #${firstToken.slot}`,
        description: `${slotData.tokens.length} 个 token`,
        tokenStandard: 'ERC3525',
        contractAddress: firstToken.contractAddress,
        tokenId: firstToken.tokenId,
        slotId: firstToken.slot,
        balance: slotData.totalValue.toString(),
        unit: '份',
        source: 'discovered',
        tokenDetails: slotData.tokens, // ERC3525 token 详情
      });
      existingERC3525Keys.add(slotKey);
    }

    // 添加发现的 ERC1155 资产 (不在预定义列表中的)
    for (const token of ownedERC1155Tokens) {
      const key = `${token.contractAddress.toLowerCase()}_${token.tokenId}`;
      if (existingERC1155Keys.has(key)) {
        continue;
      }

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
      existingERC1155Keys.add(key);
    }

    return result;
  }, [predefinedAssetsWithBalance, ownedERC1155Tokens, erc3525TokenDetailsBySlot, balances]);

  /**
   * 加载资产余额
   */
  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // 使用 ownerAddressProp 或 walletAddress 作为查询地址
    const queryAddress = ownerAddressProp || walletAddress;

    try {
      // 收集所有 ERC3525 合约地址（从预定义资产和配置中）
      const erc3525ContractAddresses = new Set<string>();
      if (SEPOLIA_CONFIG.mockErc3525Address) {
        erc3525ContractAddresses.add(SEPOLIA_CONFIG.mockErc3525Address.toLowerCase());
      }
      allPredefinedAssets
        .filter(a => a.tokenStandard === 'ERC3525')
        .forEach(a => erc3525ContractAddresses.add(a.contractAddress.toLowerCase()));

      // 收集所有 ERC1155 合约地址
      const erc1155ContractAddresses = new Set<string>();
      if (SEPOLIA_CONFIG.mockErc1155Address) {
        erc1155ContractAddresses.add(SEPOLIA_CONFIG.mockErc1155Address.toLowerCase());
      }
      allPredefinedAssets
        .filter(a => a.tokenStandard === 'ERC1155')
        .forEach(a => erc1155ContractAddresses.add(a.contractAddress.toLowerCase()));

      // 构建并行查询任务
      const tasks: Promise<unknown>[] = [];

      // 1. 加载预定义资产的余额
      const balancesTask =
        autoLoadPredefinedBalances && allPredefinedAssets.length > 0
          ? batchGetBalances(allPredefinedAssets, queryAddress || undefined)
          : Promise.resolve({} as Record<string, string | null>);
      tasks.push(balancesTask);

      // 2. 并行查询所有 ERC3525 合约的资产
      const erc3525Tasks = queryAddress
        ? [...erc3525ContractAddresses].map(contractAddr =>
            getERC3525TokensOfOwner(contractAddr, queryAddress).catch(err => {
              console.error(`Failed to load ERC3525 tokens from ${contractAddr}:`, err);
              return [] as OwnedERC3525Token[];
            })
          )
        : [];
      const erc3525CombinedTask = Promise.all(erc3525Tasks);
      tasks.push(erc3525CombinedTask);

      // 3. 并行查询所有 ERC1155 合约的资产
      const erc1155Tasks = queryAddress
        ? [...erc1155ContractAddresses].map(contractAddr => {
            const knownTokenIds = allPredefinedAssets
              .filter(
                a =>
                  a.tokenStandard === 'ERC1155' && a.contractAddress.toLowerCase() === contractAddr
              )
              .map(a => a.tokenId);

            if (knownTokenIds.length > 0) {
              return getERC1155TokensOfOwner(contractAddr, queryAddress, knownTokenIds).catch(
                err => {
                  console.error(`Failed to load ERC1155 tokens from ${contractAddr}:`, err);
                  return [] as OwnedERC1155Token[];
                }
              );
            }
            return Promise.resolve([] as OwnedERC1155Token[]);
          })
        : [];
      const erc1155CombinedTask = Promise.all(erc1155Tasks);
      tasks.push(erc1155CombinedTask);

      // 并行执行所有任务
      const [assetBalances, erc3525Results, erc1155Results] = (await Promise.all(tasks)) as [
        Record<string, string | null>,
        OwnedERC3525Token[][],
        OwnedERC1155Token[][],
      ];

      // 设置余额
      setBalances(assetBalances);

      // 合并 ERC3525 tokens
      const allErc3525Tokens = erc3525Results.flat();
      setOwnedERC3525Tokens(allErc3525Tokens);

      // 合并 ERC1155 tokens
      const allErc1155Tokens = erc1155Results.flat();
      setOwnedERC1155Tokens(allErc1155Tokens);
    } catch (err) {
      console.error('Failed to load assets:', err);
      setError(err instanceof Error ? err : new Error('加载资产失败'));
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddressProp, walletAddress, autoLoadPredefinedBalances, allPredefinedAssets]);

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
          BigInt(t.balance) > BigInt(0)
      );

      if (hasERC1155) return true;

      // 检查 ERC3525
      const hasERC3525 = ownedERC3525Tokens.some(
        t =>
          t.contractAddress.toLowerCase() === normalizedAddress &&
          t.tokenId === tokenId &&
          BigInt(t.value) > BigInt(0)
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
