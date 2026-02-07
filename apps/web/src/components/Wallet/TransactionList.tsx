'use client';

import React from 'react';
import { VStack, HStack } from '@/components/layouts';
import { Skeleton } from '@/components/ui/skeleton-compat';
import { useCurrency } from '@mobazha/core';

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'purchase' | 'sale';
  amount: string;
  amountUSD: string;
  currency: string;
  symbol: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
  address?: string;
  txHash?: string;
  description?: string;
  confirmations?: number;
}

export interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onTransactionClick?: (tx: Transaction) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  isLoading = false,
  onTransactionClick,
}) => {
  const { formatPrice: formatCurrencyPrice } = useCurrency();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getTypeIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return (
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11l5-5m0 0l5 5m-5-5v12"
              />
            </svg>
          </div>
        );
      case 'receive':
        return (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 13l-5 5m0 0l-5-5m5 5V6"
              />
            </svg>
          </div>
        );
      case 'purchase':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>
        );
      case 'sale':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'send':
        return 'Sent';
      case 'receive':
        return 'Received';
      case 'purchase':
        return 'Purchase';
      case 'sale':
        return 'Sale';
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-600 rounded-full">
            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
            Pending
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Confirmed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-600 rounded-full">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Failed
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <VStack gap="md">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-xl">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1">
              <Skeleton variant="text" width="40%" height={18} />
              <Skeleton variant="text" width="60%" height={14} className="mt-1" />
            </div>
            <div className="text-right">
              <Skeleton variant="text" width={80} height={18} />
              <Skeleton variant="text" width={60} height={14} className="mt-1" />
            </div>
          </div>
        ))}
      </VStack>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p className="text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  return (
    <VStack gap="sm">
      {transactions.map(tx => (
        <button
          key={tx.id}
          onClick={() => onTransactionClick?.(tx)}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-xl hover:bg-surface-hover transition-colors text-left"
        >
          {getTypeIcon(tx.type)}

          <div className="flex-1 min-w-0">
            <HStack justify="between" align="center">
              <span className="font-medium text-foreground">
                {tx.description || getTypeLabel(tx.type)}
              </span>
              <span
                className={`font-semibold ${
                  tx.type === 'receive' || tx.type === 'sale' ? 'text-primary' : 'text-foreground'
                }`}
              >
                {tx.type === 'receive' || tx.type === 'sale' ? '+' : '-'}
                {tx.amount} {tx.symbol}
              </span>
            </HStack>
            <HStack justify="between" align="center" className="mt-1">
              <span className="text-sm text-muted-foreground">{formatTime(tx.timestamp)}</span>
              <HStack gap="sm" align="center">
                <span className="text-sm text-muted-foreground">
                  {formatCurrencyPrice(tx.amountUSD, 'USD')}
                </span>
                {getStatusBadge(tx.status)}
              </HStack>
            </HStack>
          </div>
        </button>
      ))}
    </VStack>
  );
};
