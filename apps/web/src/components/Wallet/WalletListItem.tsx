'use client';

import React from 'react';
import { WalletBalance } from './WalletCard';

export interface WalletListItemProps {
  balance: WalletBalance;
  isSelected?: boolean;
  onClick?: () => void;
  onSend?: () => void;
  onReceive?: () => void;
}

export const WalletListItem: React.FC<WalletListItemProps> = ({
  balance,
  isSelected = false,
  onClick,
  onSend,
  onReceive,
}) => {
  return (
    <div className="overflow-hidden">
      {/* Main Row - Always visible */}
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-3 sm:p-4 transition-colors text-left ${
          isSelected ? 'bg-primary/10' : 'hover:bg-surface-hover'
        }`}
      >
        {/* Icon */}
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${balance.color}`}
        >
          {balance.icon}
        </div>

        {/* Currency Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground truncate">{balance.currency}</span>
            <span className="font-bold text-foreground whitespace-nowrap">
              {balance.balance} {balance.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground">{balance.symbol}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">${balance.balanceUSD}</span>
              {balance.change24h !== undefined && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
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
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
            isSelected ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Actions - Only visible when selected */}
      {isSelected && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 bg-muted/30">
          <div className="flex gap-2 sm:gap-3 pt-2">
            <button
              onClick={e => {
                e.stopPropagation();
                onSend?.();
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors text-sm font-medium"
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
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-muted hover:bg-surface-hover text-foreground rounded-lg transition-colors text-sm font-medium"
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
          </div>
        </div>
      )}
    </div>
  );
};
