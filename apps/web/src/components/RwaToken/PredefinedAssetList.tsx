'use client';

import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { CheckCircle, Users, TrendingUp, Wallet, RefreshCw, ExternalLink } from 'lucide-react';
import type { PredefinedAsset, AssetTypeCode } from '@mobazha/core';
import {
  useI18n,
  getAssetsByType,
  useWallet,
  batchGetBalances,
  etherscanUrls,
  shortenAddress,
  clearBalanceCache,
  setWalletProvider,
} from '@mobazha/core';
import { cn } from '@/lib/utils';

export interface PredefinedAssetListProps {
  assetType: AssetTypeCode;
  selectedAssetId: string | null;
  onSelect: (asset: PredefinedAsset) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * 预定义资产列表
 * 根据资产类型显示可选的预定义资产
 */
export function PredefinedAssetList({
  assetType,
  selectedAssetId,
  onSelect,
  disabled = false,
  className = '',
}: PredefinedAssetListProps) {
  const { t } = useI18n();

  // 钱包状态
  const { isConnected, walletInfo, getProvider } = useWallet();
  const walletAddress = walletInfo?.address || null;

  // 获取当前类型的资产列表
  const assets = useMemo(() => getAssetsByType(assetType), [assetType]);

  // 余额状态
  const [balances, setBalances] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  // 在钱包连接时设置 Provider
  useEffect(() => {
    if (isConnected && getProvider) {
      const provider = getProvider();
      if (provider) {
        // 获取底层 EIP-1193 provider
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eipProvider = (provider as any)._network?.provider;
        if (eipProvider) {
          setWalletProvider(eipProvider);
          console.log('✅ PredefinedAssetList: 已设置钱包 Provider');
        }
      }
    } else {
      setWalletProvider(null);
    }
  }, [isConnected, getProvider]);

  // 加载余额 (仅在钱包连接时)
  const loadBalances = useCallback(async () => {
    if (assets.length === 0 || !walletAddress) return;
    setLoading(true);
    try {
      const result = await batchGetBalances(assets, walletAddress);
      setBalances(result);
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoading(false);
    }
  }, [assets, walletAddress]);

  // 刷新余额
  const refreshBalances = useCallback(() => {
    clearBalanceCache();
    loadBalances();
  }, [loadBalances]);

  // 初始加载
  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const handleSelect = useCallback(
    (asset: PredefinedAsset) => {
      if (!disabled) {
        onSelect(asset);
      }
    },
    [disabled, onSelect]
  );

  if (assets.length === 0) {
    return null;
  }

  // 获取资产余额 (仅在钱包连接时返回真实余额)
  const getAssetBalance = (asset: PredefinedAsset): string | null => {
    if (!isConnected) return null;
    return balances[asset.id] || null;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* 钱包状态 */}
      <div
        className={cn(
          'flex items-center gap-2 p-3 rounded-lg text-sm',
          isConnected ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
        )}
      >
        <Wallet className="w-4 h-4" />
        {isConnected ? (
          <>
            <span>钱包已连接: {shortenAddress(walletAddress || '')}</span>
            <button
              type="button"
              onClick={refreshBalances}
              disabled={loading}
              className="ml-auto p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
              title="刷新余额"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </>
        ) : (
          <span>请连接钱包以查看您的资产余额</span>
        )}
      </div>

      <label className="block text-sm font-medium text-muted-foreground mb-2">
        {t('listing.rwa.selectAsset') || '选择要出售的资产'}
      </label>
      <div className="space-y-3">
        {assets.map(asset => {
          const isSelected = selectedAssetId === asset.id;
          const isErc1155 = asset.tokenStandard === 'ERC1155';
          const isErc3525 = asset.tokenStandard === 'ERC3525';
          const displayBalance = getAssetBalance(asset);

          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleSelect(asset)}
              disabled={disabled}
              className={cn(
                'w-full relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Emoji 图标 */}
                <div className="text-4xl flex-shrink-0">{asset.emoji}</div>

                {/* 内容区域 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground truncate pr-4">{asset.name}</h3>
                    {isSelected && <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {asset.description}
                  </p>

                  {/* 标签和信息 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                      {asset.typeName}
                    </span>

                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {t('listing.rwa.available') || '可售'}:{' '}
                      {displayBalance !== null ? (
                        <>
                          {displayBalance} {asset.unit}
                          <span className="ml-1 text-success">●</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">连接钱包查看</span>
                      )}
                    </span>

                    {/* Etherscan 链接 */}
                    <a
                      href={etherscanUrls.contract(asset.contractAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Etherscan
                    </a>

                    {/* ERC1155 会员信息 */}
                    {isErc1155 && asset.membership && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        <Users className="w-3 h-3" />
                        {asset.membership.holderCount} {t('listing.rwa.holders') || '人持有'}
                      </span>
                    )}

                    {/* ERC3525 收益信息 */}
                    {isErc3525 && asset.performance && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                        <TrendingUp className="w-3 h-3" />
                        {t('listing.rwa.dividendRate') || '年化'} {asset.performance.dividendRate}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default PredefinedAssetList;
