'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { useI18n, useWallet } from '@mobazha/core';
import { useRwaAssets } from '@mobazha/core';
import {
  getUserTransactionHistory,
  formatTimestamp,
} from '@mobazha/core/services/rwa/rwaTransactionService';
import { findPredefinedAsset } from '@mobazha/core/data/rwaAssetTemplates';
import type { TokenTransfer, RwaAsset } from '@mobazha/core/types/rwa';
import {
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Wallet,
  PieChart,
  Activity,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  X,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
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

// Format balance
const formatBalance = (balance: string | number | undefined): string => {
  if (balance === undefined || balance === null) return '0';
  const num = typeof balance === 'string' ? parseInt(balance, 10) : balance;
  return isNaN(num) ? '0' : num.toLocaleString();
};

// Asset Group interface
interface AssetGroup {
  contractAddress: string;
  contractName: string;
  tokenStandard: string;
  assets: RwaAsset[];
  totalBalance: number;
  totalValue: number;
}

// Transaction type helpers
const getTransactionTypeText = (type: string, from: string): string => {
  if (from === '0x0000000000000000000000000000000000000000') return '铸造';
  if (type === 'in') return '转入';
  if (type === 'out') return '转出';
  return '未知';
};

const getTransactionTypeColor = (type: string, from: string): string => {
  if (from === '0x0000000000000000000000000000000000000000') return 'text-blue-500 bg-blue-500/10';
  if (type === 'in') return 'text-green-500 bg-green-500/10';
  if (type === 'out') return 'text-red-500 bg-red-500/10';
  return 'text-gray-500 bg-gray-500/10';
};

// Compact Asset Card for nested display
interface CompactAssetCardProps {
  asset: RwaAsset;
  isSelected: boolean;
  onClick: () => void;
}

const CompactAssetCard: React.FC<CompactAssetCardProps> = ({ asset, isSelected, onClick }) => {
  const [showTokenDetails, setShowTokenDetails] = useState(false);
  const displayBalance = asset.balance ?? '0';
  const hasTokenDetails =
    asset.tokenStandard === 'ERC3525' && asset.tokenDetails && asset.tokenDetails.length > 0;

  const handleToggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTokenDetails(!showTokenDetails);
  };

  return (
    <div className="w-full">
      <button
        onClick={onClick}
        className={`w-full text-left p-3 rounded-lg transition-colors ${
          isSelected
            ? 'bg-primary/10 border-2 border-primary'
            : 'bg-muted/50 hover:bg-muted border border-transparent'
        } ${hasTokenDetails && showTokenDetails ? 'rounded-b-none' : ''}`}
      >
        <div className="flex items-center gap-3">
          {/* ERC3525 token 详情展开箭头 */}
          {hasTokenDetails ? (
            <button
              onClick={handleToggleDetails}
              className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {showTokenDetails ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <span className="text-xl">{asset.emoji || '📦'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{asset.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {asset.tokenStandard === 'ERC3525' && asset.slotId && (
                <span className="text-xs text-pink-500">Slot {asset.slotId}</span>
              )}
              {asset.tokenStandard === 'ERC1155' && asset.tokenId && (
                <span className="text-xs text-indigo-500">#{asset.tokenId}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm text-primary">{formatBalance(displayBalance)}</p>
            <p className="text-xs text-muted-foreground">{asset.unit || '份'}</p>
          </div>
        </div>
      </button>
      {/* ERC3525 Token ID 详情 */}
      {hasTokenDetails && showTokenDetails && (
        <div className="bg-muted/30 border-t border-border rounded-b-lg px-4 py-2 ml-8">
          {asset.tokenDetails!.map(token => (
            <div
              key={`${asset.id}-token-${token.tokenId}`}
              className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0"
            >
              <span className="text-xs text-muted-foreground">Token #{token.tokenId}</span>
              <span className="text-xs font-medium">
                {formatBalance(token.value)} {asset.unit || '份'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Contract Group Component
interface ContractGroupProps {
  group: AssetGroup;
  isExpanded: boolean;
  selectedAssetFilter: string;
  onToggle: () => void;
  onAssetClick: (asset: RwaAsset) => void;
  getAssetFilterKey: (asset: RwaAsset) => string;
}

const ContractGroup: React.FC<ContractGroupProps> = ({
  group,
  isExpanded,
  selectedAssetFilter,
  onToggle,
  onAssetClick,
  getAssetFilterKey,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(group.contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Single asset - display directly
  if (group.assets.length === 1) {
    const asset = group.assets[0];
    const isSelected = selectedAssetFilter === getAssetFilterKey(asset);
    const displayBalance = asset.balance ?? '0';

    return (
      <div
        className={`bg-card rounded-xl p-4 border cursor-pointer transition-all ${
          isSelected ? 'border-primary border-2 ring-2 ring-primary/20' : 'hover:border-primary/50'
        }`}
        onClick={() => onAssetClick(asset)}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
            {asset.emoji || '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{asset.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{asset.description}</p>

            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-lg font-bold text-primary">
                {formatBalance(displayBalance)}
              </span>
              <span className="text-xs text-muted-foreground">{asset.unit || '份'}</span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded-full ${
                  asset.tokenStandard === 'ERC1155'
                    ? 'bg-indigo-500/10 text-indigo-500'
                    : 'bg-pink-500/10 text-pink-500'
                }`}
              >
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
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Multiple assets - collapsible group
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      {/* Group Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xl">📦</span>
        <div className="flex-1 text-left">
          <p className="font-semibold text-sm">{group.contractName}</p>
          <p className="text-xs text-muted-foreground">{group.assets.length} 种资产</p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            group.tokenStandard === 'ERC1155'
              ? 'bg-indigo-500/10 text-indigo-500'
              : 'bg-pink-500/10 text-pink-500'
          }`}
        >
          {group.tokenStandard}
        </span>
        <span className="font-semibold text-sm text-primary">
          {formatBalance(group.totalBalance)} 份
        </span>
      </button>

      {/* Expanded Assets */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {group.assets.map(asset => (
            <CompactAssetCard
              key={asset.id}
              asset={asset}
              isSelected={selectedAssetFilter === getAssetFilterKey(asset)}
              onClick={() => onAssetClick(asset)}
            />
          ))}
          <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">{formatAddress(group.contractAddress)}</span>
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
              href={getEtherscanUrl(group.contractAddress, 'address')}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

// Transaction Item Component
interface TransactionItemProps {
  tx: TokenTransfer;
  getAssetName: (contractAddress: string, tokenId?: string, slotId?: string) => string;
  currentUserAddress?: string;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  tx,
  getAssetName,
  currentUserAddress,
}) => {
  const typeText = getTransactionTypeText(tx.type, tx.from);
  const typeColor = getTransactionTypeColor(tx.type, tx.from);

  // 判断是否为用户发起但转给他人的交易
  const isUserInitiatedToOther =
    tx.initiatedBy &&
    currentUserAddress &&
    tx.initiatedBy.toLowerCase() === currentUserAddress.toLowerCase() &&
    tx.to?.toLowerCase() !== currentUserAddress.toLowerCase();

  // 格式化 value 来源
  const valueSourceText =
    tx.valueSources && tx.valueSources.length > 0
      ? `${tx.valueSources.map(s => `#${s.fromTokenId}`).join(', ')} → #${tx.tokenId}`
      : null;

  return (
    <a
      href={getEtherscanUrl(tx.hash, 'tx')}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${typeColor}`}>
        {tx.type === 'in' ? (
          <ArrowDownLeft className="w-4 h-4" />
        ) : (
          <ArrowUpRight className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded ${typeColor}`}>{typeText}</span>
          {/* 用户发起但转给他人的交易显示标识 */}
          {isUserInitiatedToOther && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
              发起
            </span>
          )}
          <span className="font-medium text-sm">{tx.value || '1'} 份</span>
          {/* 显示对方的 Token ID */}
          {tx.tokenId && tx.to !== '0x0000000000000000000000000000000000000000' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-mono">
              #{tx.tokenId}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {getAssetName(tx.contractAddress || '', tx.tokenId, tx.slotId)}
        </p>
        {/* 显示 ERC3525 value 来源 */}
        {valueSourceText && (
          <p className="text-xs text-muted-foreground/70 italic mt-0.5">{valueSourceText}</p>
        )}
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{formatTimestamp(tx.timestamp)}</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-0.5">{formatAddress(tx.hash)}</p>
      </div>
    </a>
  );
};

// 演示地址（用于展示资产，不依赖钱包连接）
const DEMO_OWNER_ADDRESS = '0xC4736E41D02faa7D735819AA9afa2ffee1Ce5931';

export default function RwaAssetDashboardPage() {
  const { t } = useI18n();
  const { isConnected, connect, walletInfo } = useWallet();
  // 使用演示地址，确保能发现所有 ERC3525 token
  const { assets, isLoading, error, refresh } = useRwaAssets({
    ownerAddress: DEMO_OWNER_ADDRESS,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Grouping and filtering state
  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({});
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('');
  const [transactions, setTransactions] = useState<TokenTransfer[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  // Generate asset filter key: ERC3525 uses contractAddress:slot:slotId, ERC1155 uses contractAddress:token:tokenId
  const getAssetFilterKey = useCallback((asset: RwaAsset): string => {
    const addr = asset.contractAddress?.toLowerCase() || '';
    if (asset.tokenStandard === 'ERC3525' && asset.slotId !== undefined) {
      return `${addr}:slot:${asset.slotId}`;
    }
    if (asset.tokenStandard === 'ERC1155' && asset.tokenId !== undefined) {
      return `${addr}:token:${asset.tokenId}`;
    }
    return addr;
  }, []);

  // Group assets by contract
  const groupedAssets = useMemo<AssetGroup[]>(() => {
    const groups: Record<string, AssetGroup> = {};

    const getDisplayName = (asset: RwaAsset): string => {
      if (asset.name) {
        if (asset.tokenStandard === 'ERC3525') {
          return 'ERC3525 合约';
        }
        return asset.name;
      }
      const addr = asset.contractAddress || '';
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    for (const asset of assets) {
      const contractAddress = asset.contractAddress?.toLowerCase();
      if (!contractAddress) continue;

      if (!groups[contractAddress]) {
        groups[contractAddress] = {
          contractAddress: asset.contractAddress,
          contractName: getDisplayName(asset),
          tokenStandard: asset.tokenStandard,
          assets: [],
          totalBalance: 0,
          totalValue: 0,
        };
      }

      groups[contractAddress].assets.push(asset);
      const balance = parseFloat(asset.balance || '0');
      groups[contractAddress].totalBalance += balance;
      groups[contractAddress].totalValue += balance;
    }

    return Object.values(groups).sort((a, b) => {
      if (a.assets.length !== b.assets.length) {
        return b.assets.length - a.assets.length;
      }
      return a.contractName.localeCompare(b.contractName);
    });
  }, [assets]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!selectedAssetFilter) {
      return transactions;
    }

    // Parse filter key: format is contractAddress:type:id (type is 'slot' or 'token')
    const parts = selectedAssetFilter.split(':');
    const filterContract = parts[0];
    const filterType = parts.length > 1 ? parts[1] : null; // 'slot' or 'token'
    const filterId = parts.length > 2 ? parts[2] : null;

    return transactions.filter(tx => {
      const txContract = tx.contractAddress?.toLowerCase();
      if (txContract !== filterContract) {
        return false;
      }
      // ERC3525: match slotId
      if (filterType === 'slot' && filterId !== null) {
        return tx.slotId !== undefined && String(tx.slotId) === filterId;
      }
      // ERC1155: match tokenId
      if (filterType === 'token' && filterId !== null) {
        return tx.tokenId !== undefined && String(tx.tokenId) === filterId;
      }
      return true;
    });
  }, [transactions, selectedAssetFilter]);

  // Load transactions
  useEffect(() => {
    const loadTransactions = async () => {
      if (!walletInfo?.address || assets.length === 0) {
        setTransactions([]);
        return;
      }

      setTxLoading(true);
      try {
        const txs = await getUserTransactionHistory(walletInfo.address, assets);
        setTransactions(txs);
      } catch (err) {
        console.error('Failed to load transactions:', err);
        setTransactions([]);
      } finally {
        setTxLoading(false);
      }
    };

    loadTransactions();
  }, [walletInfo?.address, assets]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleConnectWallet = async () => {
    await connect();
  };

  const toggleContractExpand = useCallback((contractAddress: string) => {
    setExpandedContracts(prev => ({
      ...prev,
      [contractAddress]: !prev[contractAddress],
    }));
  }, []);

  const handleAssetClick = useCallback(
    (asset: RwaAsset) => {
      const filterKey = getAssetFilterKey(asset);
      if (selectedAssetFilter === filterKey) {
        setSelectedAssetFilter('');
      } else {
        setSelectedAssetFilter(filterKey);
      }
    },
    [selectedAssetFilter, getAssetFilterKey]
  );

  const clearFilter = useCallback(() => {
    setSelectedAssetFilter('');
  }, []);

  // Get asset name from contract and tokenId/slotId
  const getAssetName = useCallback(
    (contractAddress: string, tokenId?: string, slotId?: string): string => {
      if (slotId !== undefined) {
        const predefined = findPredefinedAsset({
          tokenAddress: contractAddress,
          tokenStandard: 'ERC3525',
          slotId: String(slotId),
        });
        if (predefined) {
          return predefined.name;
        }
      }

      // Try to find in assets
      const asset = assets.find(
        a =>
          a.contractAddress?.toLowerCase() === contractAddress?.toLowerCase() &&
          (a.tokenId === tokenId || a.slotId === slotId)
      );
      if (asset) {
        return asset.name;
      }

      return tokenId ? `Token #${tokenId}` : '未知资产';
    },
    [assets]
  );

  // Statistics
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
                {isLoading
                  ? '--'
                  : (erc1155Assets.length > 0 ? 1 : 0) + (erc3525Assets.length > 0 ? 1 : 0)}
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

          {/* Assets by Contract Group */}
          {!isLoading && groupedAssets.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">持有资产</h2>
              <div className="space-y-3">
                {groupedAssets.map(group => (
                  <ContractGroup
                    key={group.contractAddress}
                    group={group}
                    isExpanded={expandedContracts[group.contractAddress] || false}
                    selectedAssetFilter={selectedAssetFilter}
                    onToggle={() => toggleContractExpand(group.contractAddress)}
                    onAssetClick={handleAssetClick}
                    getAssetFilterKey={getAssetFilterKey}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Transactions */}
          {!isLoading && isConnected && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-muted-foreground">最近交易</h2>
                  {selectedAssetFilter && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                      已筛选
                      <button
                        onClick={clearFilter}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {txLoading ? (
                <div className="bg-card rounded-xl p-4 border">
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/4" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="bg-card rounded-xl border divide-y divide-border">
                  {filteredTransactions.slice(0, 5).map(tx => (
                    <TransactionItem
                      key={tx.hash}
                      tx={tx}
                      getAssetName={getAssetName}
                      currentUserAddress={walletInfo?.address}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-xl p-8 border text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {selectedAssetFilter ? '该资产暂无交易记录' : '暂无交易记录'}
                  </p>
                </div>
              )}
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
