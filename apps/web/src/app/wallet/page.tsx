'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { Header } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// Mock wallet data
const mockBalances = [
  {
    currency: 'Bitcoin',
    symbol: 'BTC',
    balance: '0.5432',
    balanceUSD: 22879.43,
    change24h: 2.34,
    changeUSD: 523.45,
    color: 'bg-warning',
    icon: (
      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.5 11.5v-2h1.25c.69 0 1.25.56 1.25 1.25v.5c0 .14-.11.25-.25.25H11.5zm0 1h1.75c.14 0 .25.11.25.25v.5c0 .69-.56 1.25-1.25 1.25H11.5v-2z" />
        <path
          fillRule="evenodd"
          d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.5-5h1.75c1.52 0 2.75-1.23 2.75-2.75v-.5c0-.83-.37-1.57-.95-2.08.58-.5.95-1.24.95-2.08v-.59c0-1.52-1.23-2.75-2.75-2.75H10.5v-.75c0-.41-.34-.75-.75-.75s-.75.34-.75.75v.75h-.5c-.41 0-.75.34-.75.75v9c0 .41.34.75.75.75h.5v.75c0 .41.34.75.75.75s.75-.34.75-.75V17z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    currency: 'Ethereum',
    symbol: 'ETH',
    balance: '3.2145',
    balanceUSD: 7523.87,
    change24h: -1.23,
    changeUSD: -93.54,
    color: 'bg-info',
    icon: (
      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1.5l-7 11.5 7 4 7-4-7-11.5zm0 13.5l-7-4 7 11.5 7-11.5-7 4z" />
      </svg>
    ),
  },
  {
    currency: 'Litecoin',
    symbol: 'LTC',
    balance: '12.5',
    balanceUSD: 862.5,
    change24h: 0.87,
    changeUSD: 7.45,
    color: 'bg-muted-foreground',
    icon: (
      <svg className="w-4 h-4 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-4.18v-1.73l1.33-.54 1.21-5.03-2.59 1.02-.37-1.5 2.84-1.1 1.07-4.45H9.18V5h5.89l-1.06 4.46 2.24-.87.37 1.5-2.58 1-.95 3.97 2.45-.97.37 1.5-2.5.97v1.53z" />
      </svg>
    ),
  },
  {
    currency: 'Zcash',
    symbol: 'ZEC',
    balance: '5.0',
    balanceUSD: 141.5,
    change24h: 3.21,
    changeUSD: 4.39,
    color: 'bg-warning',
    icon: <span className="text-white font-bold text-xs sm:text-base">Z</span>,
  },
];

export default function WalletPage() {
  const { t } = useI18n();

  // Calculate totals
  const totalBalanceUSD = mockBalances.reduce((sum, b) => sum + b.balanceUSD, 0);
  const totalChangeUSD = mockBalances.reduce((sum, b) => sum + b.changeUSD, 0);
  const totalChangePercent = (totalChangeUSD / (totalBalanceUSD - totalChangeUSD)) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-4 sm:py-8">
        <Container size="sm">
          {/* Portfolio Summary Card */}
          <Card className="mb-6 overflow-hidden">
            <div className="relative p-4 sm:p-8 bg-success text-center">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative">
                <p className="text-primary-foreground/80 text-xs sm:text-sm mb-1">
                  {t('wallet.totalBalance')}
                </p>
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-1 sm:mb-2">
                  ${totalBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h1>
                <p
                  className={`text-xs sm:text-sm ${totalChangeUSD >= 0 ? 'text-primary-foreground/70' : 'text-error/80'}`}
                >
                  {totalChangeUSD >= 0 ? '▲' : '▼'} {totalChangeUSD >= 0 ? '+' : ''}$
                  {Math.abs(totalChangeUSD).toFixed(2)} ({totalChangePercent >= 0 ? '+' : ''}
                  {totalChangePercent.toFixed(2)}%) {t('wallet.today')}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-3 sm:p-6 bg-card border-t border-border">
              <div className="flex gap-2 sm:gap-3">
                <Button className="flex-1" size="sm">
                  <svg
                    className="w-4 h-4 mr-1.5 sm:mr-2"
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
                  <span className="text-xs sm:text-sm">{t('wallet.send')}</span>
                </Button>
                <Button variant="outline" className="flex-1" size="sm">
                  <svg
                    className="w-4 h-4 mr-1.5 sm:mr-2"
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
                  <span className="text-xs sm:text-sm">{t('wallet.receive')}</span>
                </Button>
                <Button variant="outline" className="flex-1" size="sm">
                  <svg
                    className="w-4 h-4 mr-1.5 sm:mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="text-xs sm:text-sm">{t('wallet.exchange')}</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Assets List */}
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-bold text-foreground">
              {t('wallet.yourAssets')}
            </h2>
            <span className="text-xs sm:text-sm text-muted-foreground">
              {mockBalances.length} coins
            </span>
          </div>

          <Card className="overflow-hidden divide-y divide-border">
            {mockBalances.map(asset => (
              <Link
                key={asset.symbol}
                href={`/wallet/${asset.symbol.toLowerCase()}`}
                className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 hover:bg-surface-hover transition-colors"
              >
                {/* Icon */}
                <div
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${asset.color}`}
                >
                  {asset.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm sm:text-base text-foreground">
                      {asset.currency}
                    </span>
                    <span className="font-bold text-sm sm:text-base text-foreground">
                      ${asset.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      {asset.balance} {asset.symbol}
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-medium ${
                        asset.change24h >= 0 ? 'text-primary' : 'text-destructive'
                      }`}
                    >
                      {asset.change24h >= 0 ? '+' : ''}
                      {asset.change24h.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </Card>
        </Container>
      </main>
    </div>
  );
}
