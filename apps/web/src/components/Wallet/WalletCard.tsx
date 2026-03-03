'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@mobazha/core';

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
  const { t } = useI18n();
  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
      onClick={onClick}
    >
      <div className="p-3 sm:p-6">
        {/* Header: Icon + Currency Info + Change Badge */}
        <div className="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${balance.color}`}
          >
            {balance.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground truncate">
                {balance.currency}
              </span>
              {balance.change24h !== undefined && (
                <span
                  className={`text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap ${
                    balance.change24h >= 0
                      ? 'bg-primary/20 text-primary'
                      : 'bg-destructive/20 text-destructive'
                  }`}
                >
                  {balance.change24h >= 0 ? '+' : ''}
                  {balance.change24h.toFixed(2)}%
                </span>
              )}
            </div>
            <p className="text-base sm:text-xl font-bold text-foreground truncate">
              {balance.balance} {balance.symbol}
            </p>
          </div>
        </div>

        {/* USD Balance */}
        <p className="text-lg sm:text-2xl font-bold text-foreground mb-3 sm:mb-6">
          ${balance.balanceUSD}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-4">
          <button
            onClick={e => {
              e.stopPropagation();
              onSend?.();
            }}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-xs sm:text-sm"
          >
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
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
            <span>{t('wallet.send')}</span>
          </button>
          <button
            onClick={e => {
              e.stopPropagation();
              onReceive?.();
            }}
            className="flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 bg-muted hover:bg-surface-hover text-foreground rounded-lg transition-colors text-xs sm:text-sm"
          >
            <svg
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
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
            <span>{t('wallet.receive')}</span>
          </button>
        </div>
      </div>
    </Card>
  );
};
