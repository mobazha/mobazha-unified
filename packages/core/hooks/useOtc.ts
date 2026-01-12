/**
 * OTC 交易 Hooks
 *
 * 使用 AppKit provider 进行钱包交互
 */

import { useCallback, useEffect, useState } from 'react';
import { useOtcStore } from '../stores/otcStore';
import { NftOtcService } from '../services/otc/nftOtcService';
import { Erc3525OtcService } from '../services/otc/erc3525OtcService';
import {
  getContractAddress,
  DEMO_NFTS,
  DEMO_RWA_ASSETS,
  DEFAULT_CHAIN_ID,
} from '../config/otcConfig';
import type { CreateNftOrderParams, CreateErc3525OrderParams } from '../types/otc';
import { useWallet } from './useWallet';

// ============================================================
// NFT OTC Hook
// ============================================================

export function useNftOtc() {
  const {
    userNfts,
    nftOrders,
    currentNftOrder,
    selectedNft,
    createOrderStep,
    orderPrice,
    generatedOrderId,
    isLoadingNfts,
    isLoadingOrder,
    isProcessing,
    error,
    setUserNfts,
    setCurrentNftOrder,
    selectNft,
    setCreateOrderStep,
    setOrderPrice,
    setGeneratedOrderId,
    setLoadingNfts,
    setLoadingOrder,
    setProcessing,
    setError,
    clearError,
    resetCreateOrder,
  } = useOtcStore();

  // 使用改造后的 useWallet (基于 AppKit)
  const { isConnected, getCurrentChainId, getCurrentAddress, getProvider, getSigner } = useWallet();

  // 获取钱包地址和链 ID
  const address = getCurrentAddress();
  const chainId = getCurrentChainId() || DEFAULT_CHAIN_ID;

  // 服务实例状态
  const [service, setService] = useState<NftOtcService | null>(null);

  // 初始化服务 - 使用 AppKit provider
  useEffect(() => {
    const initService = async () => {
      const provider = getProvider();
      if (!provider) {
        setService(null);
        return;
      }

      try {
        const signer = await getSigner();
        if (!signer) {
          setService(null);
          return;
        }

        const newService = new NftOtcService(provider, signer, chainId);
        setService(newService);
      } catch (err) {
        console.error('Failed to initialize NftOtcService:', err);
        setService(null);
      }
    };

    if (isConnected) {
      initService();
    } else {
      setService(null);
    }
  }, [isConnected, chainId, getProvider, getSigner]);

  // 加载用户 NFTs
  const loadUserNfts = useCallback(async () => {
    if (!address) return;

    setLoadingNfts(true);
    clearError();

    try {
      // 使用 Demo 数据
      const nftContractAddress = getContractAddress('ExampleNFT', chainId || DEFAULT_CHAIN_ID);
      const nfts = DEMO_NFTS.filter(
        nft => nft.contractAddress.toLowerCase() === nftContractAddress.toLowerCase()
      ).map(nft => ({
        tokenId: nft.tokenId,
        contractAddress: nft.contractAddress,
        metadata: {
          name: nft.name,
          description: nft.description,
          creator: nft.creator,
          mintedAt: 0,
          image: nft.image,
        },
      }));

      setUserNfts(nfts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load NFTs');
    } finally {
      setLoadingNfts(false);
    }
  }, [address, chainId, setUserNfts, setLoadingNfts, setError, clearError]);

  // 加载订单详情
  const loadOrder = useCallback(
    async (privateId: string) => {
      if (!service) return null;

      setLoadingOrder(true);
      clearError();

      try {
        const order = await service.getOrderByPrivateId(privateId);
        setCurrentNftOrder(order);
        return order;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
        return null;
      } finally {
        setLoadingOrder(false);
      }
    },
    [service, setCurrentNftOrder, setLoadingOrder, setError, clearError]
  );

  // 创建私密订单
  const createOrder = useCallback(
    async (params: CreateNftOrderParams) => {
      if (!service) {
        setError('Wallet not connected');
        return null;
      }

      setProcessing(true);
      clearError();

      try {
        const result = await service.createPrivateOrder(params);

        if (result.success && result.txHash) {
          // 生成私密 ID (从交易回执或事件中获取)
          const privateId = service.generatePrivateId();
          setGeneratedOrderId(privateId);
          setCreateOrderStep(3);
          return { ...result, privateId };
        } else {
          setError(result.error || 'Failed to create order');
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create order');
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [service, setProcessing, setError, clearError, setGeneratedOrderId, setCreateOrderStep]
  );

  // 执行交换
  const executeSwap = useCallback(
    async (orderId: string) => {
      if (!service) {
        setError('Wallet not connected');
        return null;
      }

      setProcessing(true);
      clearError();

      try {
        const result = await service.executeSwap(orderId);

        if (result.success) {
          // 刷新订单状态
          await loadOrder(orderId);
        } else {
          setError(result.error || 'Failed to execute swap');
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to execute swap');
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [service, loadOrder, setProcessing, setError, clearError]
  );

  // 取消订单
  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!service) {
        setError('Wallet not connected');
        return null;
      }

      setProcessing(true);
      clearError();

      try {
        const result = await service.cancelOrder(orderId);

        if (result.success) {
          await loadOrder(orderId);
        } else {
          setError(result.error || 'Failed to cancel order');
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel order');
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [service, loadOrder, setProcessing, setError, clearError]
  );

  // 生成分享链接
  const generateShareLinks = useCallback(
    (privateId: string) => {
      if (!service) return { webUrl: '', telegramUrl: '' };
      return service.generateShareLinks(privateId);
    },
    [service]
  );

  // 初始化加载
  useEffect(() => {
    if (isConnected && address) {
      loadUserNfts();
    }
  }, [isConnected, address, loadUserNfts]);

  return {
    // 状态
    userNfts,
    nftOrders,
    currentNftOrder,
    selectedNft,
    createOrderStep,
    orderPrice,
    generatedOrderId,
    isLoadingNfts,
    isLoadingOrder,
    isProcessing,
    error,
    isConnected,
    address,

    // 操作
    loadUserNfts,
    loadOrder,
    createOrder,
    executeSwap,
    cancelOrder,
    selectNft,
    setCreateOrderStep,
    setOrderPrice,
    resetCreateOrder,
    generateShareLinks,
    clearError,

    // 工具
    formatAddress:
      service?.formatAddress || ((addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`),
    getExplorerLink:
      service?.getExplorerLink || ((txHash: string) => `https://sepolia.etherscan.io/tx/${txHash}`),
  };
}

// ============================================================
// ERC3525 OTC Hook
// ============================================================

export function useErc3525Otc() {
  const {
    userHoldings,
    rwaOrders,
    currentRwaOrder,
    selectedHolding,
    sharesToSell,
    createOrderStep,
    orderPrice,
    generatedOrderId,
    isLoadingHoldings,
    isLoadingOrder,
    isProcessing,
    error,
    setUserHoldings,
    setCurrentRwaOrder,
    selectHolding,
    setSharesToSell,
    setCreateOrderStep,
    setOrderPrice,
    setGeneratedOrderId,
    setLoadingHoldings,
    setLoadingOrder,
    setProcessing,
    setError,
    clearError,
    resetCreateOrder,
  } = useOtcStore();

  // 使用改造后的 useWallet (基于 AppKit)
  const { isConnected, getCurrentChainId, getCurrentAddress, getProvider, getSigner } = useWallet();

  // 获取钱包地址和链 ID
  const address = getCurrentAddress();
  const chainId = getCurrentChainId() || DEFAULT_CHAIN_ID;

  // 服务实例状态
  const [service, setService] = useState<Erc3525OtcService | null>(null);

  // 初始化服务 - 使用 AppKit provider
  useEffect(() => {
    const initService = async () => {
      const provider = getProvider();
      if (!provider) {
        setService(null);
        return;
      }

      try {
        const signer = await getSigner();
        if (!signer) {
          setService(null);
          return;
        }

        const newService = new Erc3525OtcService(provider, signer, chainId);
        setService(newService);
      } catch (err) {
        console.error('Failed to initialize Erc3525OtcService:', err);
        setService(null);
      }
    };

    if (isConnected) {
      initService();
    } else {
      setService(null);
    }
  }, [isConnected, chainId, getProvider, getSigner]);

  // 加载用户持仓
  const loadUserHoldings = useCallback(async () => {
    if (!address) return;

    setLoadingHoldings(true);
    clearError();

    try {
      // 使用 Demo 数据
      const holdings = DEMO_RWA_ASSETS.map(asset => ({
        tokenId: asset.tokenId,
        slot: asset.slot,
        value: asset.userShares,
        name: asset.name,
        description: asset.description,
      }));

      setUserHoldings(holdings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load holdings');
    } finally {
      setLoadingHoldings(false);
    }
  }, [address, setUserHoldings, setLoadingHoldings, setError, clearError]);

  // 加载订单详情
  const loadOrder = useCallback(
    async (orderId: string) => {
      if (!service) return null;

      setLoadingOrder(true);
      clearError();

      try {
        const order = await service.getOrder(orderId);
        setCurrentRwaOrder(order);
        return order;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
        return null;
      } finally {
        setLoadingOrder(false);
      }
    },
    [service, setCurrentRwaOrder, setLoadingOrder, setError, clearError]
  );

  // 创建订单
  const createOrder = useCallback(
    async (params: CreateErc3525OrderParams) => {
      if (!service) {
        setError('Wallet not connected');
        return null;
      }

      setProcessing(true);
      clearError();

      try {
        const result = await service.createOrder(params);

        if (result.success && result.orderId) {
          setGeneratedOrderId(result.orderId);
          setCreateOrderStep(3);
          return result;
        } else {
          setError(result.error || 'Failed to create order');
          return null;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create order');
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [service, setProcessing, setError, clearError, setGeneratedOrderId, setCreateOrderStep]
  );

  // 执行交换
  const executeSwap = useCallback(
    async (orderId: string) => {
      if (!service) {
        setError('Wallet not connected');
        return null;
      }

      setProcessing(true);
      clearError();

      try {
        const result = await service.executeSwap(orderId);

        if (result.success) {
          await loadOrder(orderId);
        } else {
          setError(result.error || 'Failed to execute swap');
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to execute swap');
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [service, loadOrder, setProcessing, setError, clearError]
  );

  // 取消订单
  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!service) {
        setError('Wallet not connected');
        return null;
      }

      setProcessing(true);
      clearError();

      try {
        const result = await service.cancelOrder(orderId);

        if (result.success) {
          await loadOrder(orderId);
        } else {
          setError(result.error || 'Failed to cancel order');
        }

        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to cancel order');
        return null;
      } finally {
        setProcessing(false);
      }
    },
    [service, loadOrder, setProcessing, setError, clearError]
  );

  // 获取预期收益
  const getExpectedRevenue = useCallback(
    async (tokenId: number) => {
      if (!service) return { weekly: 0, annualized: 0 };
      return service.getExpectedRevenue(tokenId);
    },
    [service]
  );

  // 生成分享链接
  const generateShareLinks = useCallback(
    (orderId: string) => {
      if (!service) return { webUrl: '', telegramUrl: '' };
      return service.generateShareLinks(orderId);
    },
    [service]
  );

  // 初始化加载
  useEffect(() => {
    if (isConnected && address) {
      loadUserHoldings();
    }
  }, [isConnected, address, loadUserHoldings]);

  return {
    // 状态
    userHoldings,
    rwaOrders,
    currentRwaOrder,
    selectedHolding,
    sharesToSell,
    createOrderStep,
    orderPrice,
    generatedOrderId,
    isLoadingHoldings,
    isLoadingOrder,
    isProcessing,
    error,
    isConnected,
    address,

    // 操作
    loadUserHoldings,
    loadOrder,
    createOrder,
    executeSwap,
    cancelOrder,
    selectHolding,
    setSharesToSell,
    setCreateOrderStep,
    setOrderPrice,
    resetCreateOrder,
    getExpectedRevenue,
    generateShareLinks,
    clearError,

    // 工具
    formatAddress:
      service?.formatAddress || ((addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`),
    getExplorerLink:
      service?.getExplorerLink || ((txHash: string) => `https://sepolia.etherscan.io/tx/${txHash}`),
    formatCurrency:
      service?.formatCurrency ||
      ((amount: number, symbol = 'USDT') => `${amount.toFixed(2)} ${symbol}`),
  };
}
