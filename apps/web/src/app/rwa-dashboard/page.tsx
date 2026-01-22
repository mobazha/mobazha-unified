'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
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
  TrendingUp,
  Hash,
} from 'lucide-react';
import { PriceHistoryChart } from '@/components/charts';
import { cn } from '@/lib/utils';

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

// Transaction type helpers - text is passed in from component with i18n
const getTransactionTypeKey = (type: string, from: string): string => {
  if (from === '0x0000000000000000000000000000000000000000') return 'mint';
  if (type === 'in') return 'transferIn';
  if (type === 'out') return 'transferOut';
  return 'unknown';
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
  const { t } = useI18n();
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
        className={cn(
          'bg-card rounded-xl p-4 border cursor-pointer transition-all duration-200',
          'hover:shadow-lg hover:-translate-y-0.5', // Desktop hover effect
          isSelected ? 'border-primary border-2 ring-2 ring-primary/20' : 'hover:border-primary/50'
        )}
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
              <span className="text-xs text-muted-foreground">
                {asset.unit || t('rwaDashboard.shares')}
              </span>
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
    <div
      className={cn(
        'bg-card rounded-xl border overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:-translate-y-0.5' // Desktop hover effect
      )}
    >
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
          <p className="text-xs text-muted-foreground">
            {t('rwaDashboard.assetTypesCount', { count: group.assets.length })}
          </p>
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
          {formatBalance(group.totalBalance)} {t('rwaDashboard.shares')}
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
  const { t } = useI18n();
  const typeKey = getTransactionTypeKey(tx.type, tx.from);
  const typeText = t(`rwaDashboard.txType.${typeKey}`);
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
              {t('rwaDashboard.initiated')}
            </span>
          )}
          <span className="font-medium text-sm">
            {tx.value || '1'} {t('rwaDashboard.shares')}
          </span>
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

// Transaction Row Component for Desktop Table View
interface TransactionRowProps {
  tx: TokenTransfer;
  getAssetName: (contractAddress: string, tokenId?: string, slotId?: string) => string;
  currentUserAddress?: string;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
  tx,
  getAssetName,
  currentUserAddress,
}) => {
  const { t } = useI18n();
  const typeKey = getTransactionTypeKey(tx.type, tx.from);
  const typeText = t(`rwaDashboard.txType.${typeKey}`);
  const typeColor = getTransactionTypeColor(tx.type, tx.from);

  const isUserInitiatedToOther =
    tx.initiatedBy &&
    currentUserAddress &&
    tx.initiatedBy.toLowerCase() === currentUserAddress.toLowerCase() &&
    tx.to?.toLowerCase() !== currentUserAddress.toLowerCase();

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${typeColor}`}>
            {tx.type === 'in' ? (
              <ArrowDownLeft className="w-3.5 h-3.5" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5" />
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${typeColor}`}>{typeText}</span>
          {isUserInitiatedToOther && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
              {t('rwaDashboard.initiated')}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex flex-col">
          <span className="text-sm truncate max-w-[200px]">
            {getAssetName(tx.contractAddress || '', tx.tokenId, tx.slotId)}
          </span>
          {tx.tokenId && (
            <span className="text-xs text-muted-foreground font-mono">#{tx.tokenId}</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="font-medium">
          {tx.value || '1'} {t('rwaDashboard.shares')}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatTimestamp(tx.timestamp)}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <a
          href={getEtherscanUrl(tx.hash, 'tx')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <span className="font-mono">{formatAddress(tx.hash)}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </td>
    </tr>
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

  // Transaction list expansion state
  const [isTransactionsExpanded, setIsTransactionsExpanded] = useState(false);
  const [txDisplayLimit, setTxDisplayLimit] = useState(5);
  const TX_LOAD_BATCH_SIZE = 20;

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
      // 对于 ERC3525，尝试从预定义资产中获取 contractName
      if (asset.tokenStandard === 'ERC3525') {
        const predefined = findPredefinedAsset({
          tokenAddress: asset.contractAddress,
          tokenStandard: 'ERC3525',
          slotId: asset.slotId,
        });
        if (predefined?.contractName) {
          return predefined.contractName;
        }
        // 回退到通用名称
        return t('rwaDashboard.erc3525Contract');
      }

      // 对于其他类型，使用资产名称或地址
      if (asset.name) {
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
  }, [assets, t]);

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

  // Toggle transactions expand state
  const toggleTransactionsExpand = useCallback(() => {
    setIsTransactionsExpanded(prev => {
      if (prev) {
        // Collapse: reset display limit
        setTxDisplayLimit(5);
      } else {
        // Expand: show more
        setTxDisplayLimit(20);
      }
      return !prev;
    });
  }, []);

  // Load more transactions on scroll
  const loadMoreTransactions = useCallback(() => {
    if (!isTransactionsExpanded) return;
    if (txDisplayLimit < filteredTransactions.length) {
      setTxDisplayLimit(prev => prev + TX_LOAD_BATCH_SIZE);
    }
  }, [isTransactionsExpanded, txDisplayLimit, filteredTransactions.length]);

  // Handle scroll event for infinite loading
  const handleTransactionsScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!isTransactionsExpanded) return;
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        loadMoreTransactions();
      }
    },
    [isTransactionsExpanded, loadMoreTransactions]
  );

  // Displayed transactions with limit
  const displayedTransactions = useMemo(() => {
    return filteredTransactions.slice(0, txDisplayLimit);
  }, [filteredTransactions, txDisplayLimit]);

  // Check if there are more transactions to load
  const hasMoreTransactions = useMemo(() => {
    return txDisplayLimit < filteredTransactions.length;
  }, [txDisplayLimit, filteredTransactions.length]);

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

      return tokenId ? `Token #${tokenId}` : t('rwaDashboard.unknownAsset');
    },
    [assets, t]
  );

  // Statistics
  const erc1155Assets = assets.filter(a => a.tokenStandard === 'ERC1155');
  const erc3525Assets = assets.filter(a => a.tokenStandard === 'ERC3525');

  // Calculate total balance
  const totalBalance = useMemo(() => {
    return assets.reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);
  }, [assets]);

  // Today's transactions count
  const todayTxCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return transactions.filter(tx => {
      const txDate = new Date(tx.timestamp * 1000);
      return txDate >= today;
    }).length;
  }, [transactions]);

  // Get selected asset for detail view
  const selectedAsset = useMemo(() => {
    if (!selectedAssetFilter) return null;
    const parts = selectedAssetFilter.split(':');
    const filterContract = parts[0];
    const filterType = parts.length > 1 ? parts[1] : null;
    const filterId = parts.length > 2 ? parts[2] : null;

    return assets.find(a => {
      if (a.contractAddress?.toLowerCase() !== filterContract) return false;
      if (filterType === 'slot') return a.slotId === filterId;
      if (filterType === 'token') return a.tokenId === filterId;
      return true;
    });
  }, [assets, selectedAssetFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Page Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <Container size="xl" className="lg:max-w-6xl">
          <div className="flex items-center h-12 lg:h-14">
            <Link href="/me" className="p-1 -ml-1 mr-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="text-base lg:text-lg font-semibold flex-1">
              {t('rwaDashboard.title')}
            </span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </Container>
      </div>

      <Container size="xl" className="py-4 lg:py-6 lg:max-w-6xl">
        {/* Responsive Layout: Mobile Single Column | Desktop Two Column */}
        <div className="lg:flex lg:gap-6">
          {/* Left Sidebar - Desktop: Fixed width, sticky */}
          <aside className="lg:w-80 lg:shrink-0 space-y-4">
            {/* Wallet Connection Status */}
            {!isConnected ? (
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">
                      {t('rwaDashboard.walletNotConnected')}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('rwaDashboard.connectWalletHint')}
                    </p>
                  </div>
                  <Button size="sm" onClick={handleConnectWallet}>
                    {t('rwaDashboard.connectWallet')}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{t('rwaDashboard.walletConnected')}</h3>
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

            {/* Statistics - Mobile: 2 cols, Desktop: 2 cols in sidebar */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <PieChart className="w-4 h-4" />
                  <span className="text-xs">{t('rwaDashboard.totalAssets')}</span>
                </div>
                <p className="text-2xl font-bold">{isLoading ? '--' : assets.length}</p>
              </div>
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">{t('rwaDashboard.assetTypes')}</span>
                </div>
                <p className="text-2xl font-bold">
                  {isLoading
                    ? '--'
                    : (erc1155Assets.length > 0 ? 1 : 0) + (erc3525Assets.length > 0 ? 1 : 0)}
                </p>
              </div>
            </div>

            {/* Assets List - Desktop: Sticky sidebar */}
            <div className="lg:sticky lg:top-20">
              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 rounded-xl p-4 border border-destructive/20 mb-4">
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
                  <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                    {t('rwaDashboard.heldAssets')}
                  </h2>
                  <div className="space-y-3 lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto lg:pr-1">
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

              {/* Empty State - Assets */}
              {!isLoading && isConnected && assets.length === 0 && (
                <div className="bg-card rounded-xl p-8 border text-center">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <PieChart className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">{t('rwaDashboard.noAssets')}</h3>
                  <p className="text-sm text-muted-foreground">{t('rwaDashboard.noAssetsHint')}</p>
                </div>
              )}
            </div>
          </aside>

          {/* Right Main Content Area */}
          <main className="flex-1 space-y-4 mt-4 lg:mt-0">
            {/* Statistics Panel - Desktop: 4 columns */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-3">
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <PieChart className="w-4 h-4" />
                  <span className="text-xs">{t('rwaDashboard.totalAssets')}</span>
                </div>
                <p className="text-2xl font-bold">{isLoading ? '--' : assets.length}</p>
              </div>
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs">{t('rwaDashboard.assetTypes')}</span>
                </div>
                <p className="text-2xl font-bold">
                  {isLoading
                    ? '--'
                    : (erc1155Assets.length > 0 ? 1 : 0) + (erc3525Assets.length > 0 ? 1 : 0)}
                </p>
              </div>
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs">{t('rwaDashboard.totalBalance')}</span>
                </div>
                <p className="text-2xl font-bold">
                  {isLoading ? '--' : formatBalance(totalBalance)}
                </p>
              </div>
              <div
                className={cn(
                  'bg-card rounded-xl p-4 border transition-all duration-200',
                  'hover:shadow-lg hover:-translate-y-0.5'
                )}
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs">{t('rwaDashboard.todayTransactions')}</span>
                </div>
                <p className="text-2xl font-bold">{isLoading ? '--' : todayTxCount}</p>
              </div>
            </div>

            {/* Selected Asset Detail with Price History */}
            {!isLoading && selectedAsset && (
              <div
                className={cn(
                  'bg-card rounded-xl border overflow-hidden transition-all duration-200',
                  'hover:shadow-lg'
                )}
              >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                      {selectedAsset.emoji || '📦'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{selectedAsset.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            selectedAsset.tokenStandard === 'ERC1155'
                              ? 'bg-indigo-500/10 text-indigo-500'
                              : 'bg-pink-500/10 text-pink-500'
                          }`}
                        >
                          {selectedAsset.tokenStandard}
                        </span>
                        {selectedAsset.slotId && (
                          <span className="text-xs text-muted-foreground">
                            Slot #{selectedAsset.slotId}
                          </span>
                        )}
                        {selectedAsset.tokenId && (
                          <span className="text-xs text-muted-foreground">
                            Token #{selectedAsset.tokenId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={clearFilter}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Price History Chart */}
                <div className="p-4">
                  <PriceHistoryChart
                    contractAddress={selectedAsset.contractAddress}
                    tokenId={selectedAsset.tokenId}
                    slotId={selectedAsset.slotId}
                  />
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            {!isLoading && isConnected && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                      {t('rwaDashboard.recentTransactions')}
                    </h2>
                    {selectedAssetFilter && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {t('rwaDashboard.filtered')}
                        <button
                          onClick={clearFilter}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  {filteredTransactions.length > 5 && (
                    <button
                      onClick={toggleTransactionsExpand}
                      className="text-xs text-primary hover:underline"
                    >
                      {isTransactionsExpanded
                        ? t('rwaDashboard.collapse')
                        : t('rwaDashboard.viewAll')}
                    </button>
                  )}
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
                  <>
                    {/* Mobile: Card List */}
                    <div
                      className={cn(
                        'lg:hidden bg-card rounded-xl border divide-y divide-border',
                        isTransactionsExpanded && 'max-h-[500px] overflow-y-auto'
                      )}
                      onScroll={handleTransactionsScroll}
                    >
                      {displayedTransactions.map(tx => (
                        <TransactionItem
                          key={tx.hash}
                          tx={tx}
                          getAssetName={getAssetName}
                          currentUserAddress={walletInfo?.address}
                        />
                      ))}
                      {isTransactionsExpanded && hasMoreTransactions && (
                        <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-xs">{t('rwaDashboard.loadingMore')}</span>
                        </div>
                      )}
                    </div>

                    {/* Desktop: Table View */}
                    <div
                      className={cn(
                        'hidden lg:block bg-card rounded-xl border overflow-hidden',
                        isTransactionsExpanded && 'max-h-[500px] overflow-y-auto'
                      )}
                      onScroll={handleTransactionsScroll}
                    >
                      <table className="w-full">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="text-left text-xs text-muted-foreground">
                            <th className="py-3 px-4 font-medium">
                              {t('rwaDashboard.txType.label')}
                            </th>
                            <th className="py-3 px-4 font-medium">{t('rwaDashboard.asset')}</th>
                            <th className="py-3 px-4 font-medium">{t('rwaDashboard.amount')}</th>
                            <th className="py-3 px-4 font-medium">{t('rwaDashboard.time')}</th>
                            <th className="py-3 px-4 font-medium">{t('rwaDashboard.txHash')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {displayedTransactions.map(tx => (
                            <TransactionRow
                              key={tx.hash}
                              tx={tx}
                              getAssetName={getAssetName}
                              currentUserAddress={walletInfo?.address}
                            />
                          ))}
                        </tbody>
                      </table>
                      {isTransactionsExpanded && hasMoreTransactions && (
                        <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground border-t">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span className="text-xs">{t('rwaDashboard.loadingMore')}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-card rounded-xl p-8 border text-center">
                    <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {selectedAssetFilter
                        ? t('rwaDashboard.noTransactionsFiltered')
                        : t('rwaDashboard.noTransactions')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Placeholder when no asset selected on desktop */}
            {!isLoading && !selectedAsset && isConnected && assets.length > 0 && (
              <div className="hidden lg:block bg-card rounded-xl p-8 border text-center">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <Hash className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold mb-2">{t('rwaDashboard.selectAsset')}</h3>
                <p className="text-sm text-muted-foreground">{t('rwaDashboard.selectAssetHint')}</p>
              </div>
            )}
          </main>
        </div>
      </Container>

      <Footer />
    </div>
  );
}
