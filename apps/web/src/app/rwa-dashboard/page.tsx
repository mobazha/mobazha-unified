'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n, useWallet } from '@mobazha/core';
import { useRwaAssets } from '@mobazha/core';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Wallet,
  PieChart,
  Activity,
  Copy,
  Check,
} from 'lucide-react';

// Etherscan URL helper
const getEtherscanUrl = (address: string, type: 'address' | 'tx' | 'token' = 'address') => {
  return `https://sepolia.etherscan.io/${type}/${address}`;
};

// Format address for display
const formatAddress = (address: string) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Asset Card Component
interface AssetCardProps {
  asset: {
    id: string;
    name: string;
    description?: string;
    emoji?: string;
    tokenStandard: string;
    contractAddress: string;
    tokenId?: string;
    slotId?: string;
    balance?: string;
    realtimeBalance?: string | null;
    balanceLoading?: boolean;
    unit?: string;
  };
}

const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(asset.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayBalance = asset.realtimeBalance ?? asset.balance ?? '--';

  return (
    <div className="bg-card rounded-xl p-4 border">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
          {asset.emoji || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">{asset.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{asset.description}</p>

          {/* Balance */}
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg font-bold text-primary">
              {asset.balanceLoading ? (
                <span className="inline-block w-12 h-5 bg-muted animate-pulse rounded" />
              ) : (
                displayBalance
              )}
            </span>
            <span className="text-xs text-muted-foreground">{asset.unit || '份'}</span>
          </div>

          {/* Token Info */}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {asset.tokenStandard}
            </span>
            {asset.tokenId && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Token #{asset.tokenId}
              </span>
            )}
            {asset.slotId && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Slot #{asset.slotId}
              </span>
            )}
          </div>

          {/* Contract Address */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">
              {formatAddress(asset.contractAddress)}
            </span>
            <button
              onClick={handleCopyAddress}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
            <a
              href={getEtherscanUrl(asset.contractAddress, 'address')}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function RwaAssetDashboardPage() {
  const { t } = useI18n();
  const { isConnected, connect, walletInfo } = useWallet();
  const { assets, isLoading, error, refresh } = useRwaAssets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleConnectWallet = async () => {
    await connect();
  };

  // Separate ERC1155 and ERC3525 assets
  const erc1155Assets = assets.filter(a => a.tokenStandard === 'ERC1155');
  const erc3525Assets = assets.filter(a => a.tokenStandard === 'ERC3525');

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center h-11 px-4">
          <Link href="/me" className="p-1 -ml-1 mr-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-base font-semibold flex-1">RWA 资产仪表盘</span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <Container size="sm" className="py-4">
        <VStack gap="md">
          {/* Wallet Connection Status */}
          {!isConnected ? (
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">钱包未连接</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    请连接钱包以查看您的 RWA 资产
                  </p>
                </div>
                <Button size="sm" onClick={handleConnectWallet}>
                  连接钱包
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">钱包已连接</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {walletInfo?.address}
                  </p>
                </div>
                <a
                  href={getEtherscanUrl(walletInfo?.address || '', 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <PieChart className="w-4 h-4" />
                <span className="text-xs">资产总数</span>
              </div>
              <p className="text-2xl font-bold">{isLoading ? '--' : assets.length}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs">资产类型</span>
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? '--' : erc1155Assets.length > 0 && erc3525Assets.length > 0 ? 2 : 1}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20">
              <p className="text-sm text-destructive">{error.message}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-card rounded-xl p-4 border animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-6 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ERC1155 Assets */}
          {!isLoading && erc1155Assets.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                🎮 创作者权益 (ERC1155)
              </h2>
              <div className="space-y-3">
                {erc1155Assets.map(asset => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            </div>
          )}

          {/* ERC3525 Assets */}
          {!isLoading && erc3525Assets.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                🎭 百老汇份额 (ERC3525)
              </h2>
              <div className="space-y-3">
                {erc3525Assets.map(asset => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && isConnected && assets.length === 0 && (
            <div className="bg-card rounded-xl p-8 border text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <PieChart className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">暂无 RWA 资产</h3>
              <p className="text-sm text-muted-foreground">
                您当前没有任何 RWA 资产，可以通过购买获取
              </p>
            </div>
          )}
        </VStack>
      </Container>

      <Footer />
    </div>
  );
}
