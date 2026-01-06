'use client';

import React from 'react';
import { Card, HStack, VStack } from '@mobazha/ui';

export interface WalletBalance {
  currency: string;
  symbol: string;
  balance: string;
  balanceUSD: string;
  icon: React.ReactNode;
  color: string;
  change24h?: number;
}

export interface WalletCardProps {
  balance: WalletBalance;
  onSend?: () => void;
  onReceive?: () => void;
  onClick?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ balance, onSend, onReceive, onClick }) => {
  return (
    <Card
      variant="elevated"
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="p-6">
        <HStack justify="between" align="start" className="mb-4">
          <HStack gap="md" align="center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${balance.color}`}
            >
              {balance.icon}
            </div>
            <VStack gap="none">
              <span className="text-sm text-slate-500">{balance.currency}</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {balance.balance} {balance.symbol}
              </span>
            </VStack>
          </HStack>

          {balance.change24h !== undefined && (
            <span
              className={`text-sm font-medium px-2 py-1 rounded ${
                balance.change24h >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {balance.change24h >= 0 ? '+' : ''}
              {balance.change24h.toFixed(2)}%
            </span>
          )}
        </HStack>

        <p className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          ${balance.balanceUSD}
        </p>

        <HStack gap="md">
          <button
            onClick={e => {
              e.stopPropagation();
              onSend?.();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 11l5-5m0 0l5 5m-5-5v12"
              />
            </svg>
            Send
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onReceive?.();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 13l-5 5m0 0l-5-5m5 5V6"
              />
            </svg>
            Receive
          </button>
        </HStack>
      </div>
    </Card>
  );
};
