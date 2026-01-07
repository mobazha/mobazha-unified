'use client';

import React, { useState } from 'react';
import { Header } from '@/components';
import { Container, Grid, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { WalletCard, TransactionList, WalletBalance, Transaction } from '@/components/Wallet';
import { useI18n } from '@mobazha/core';

// Mock wallet data
const mockBalances: WalletBalance[] = [
  {
    currency: 'Bitcoin',
    symbol: 'BTC',
    balance: '0.5432',
    balanceUSD: '22,879.43',
    change24h: 2.34,
    color: 'bg-orange-100 dark:bg-orange-900/30',
    icon: (
      <svg className="w-6 h-6 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
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
    balanceUSD: '7,523.87',
    change24h: -1.23,
    color: 'bg-blue-100 dark:bg-blue-900/30',
    icon: (
      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1.5l-7 11.5 7 4 7-4-7-11.5zm0 13.5l-7-4 7 11.5 7-11.5-7 4z" />
      </svg>
    ),
  },
  {
    currency: 'Litecoin',
    symbol: 'LTC',
    balance: '12.5',
    balanceUSD: '862.50',
    change24h: 0.87,
    color: 'bg-gray-100 dark:bg-gray-800',
    icon: (
      <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-4.18v-1.73l1.33-.54 1.21-5.03-2.59 1.02-.37-1.5 2.84-1.1 1.07-4.45H9.18V5h5.89l-1.06 4.46 2.24-.87.37 1.5-2.58 1-.95 3.97 2.45-.97.37 1.5-2.5.97v1.53z" />
      </svg>
    ),
  },
  {
    currency: 'Zcash',
    symbol: 'ZEC',
    balance: '5.0',
    balanceUSD: '141.50',
    change24h: 3.21,
    color: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: (
      <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
          Z
        </text>
      </svg>
    ),
  },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx1',
    type: 'receive',
    amount: '0.1234',
    amountUSD: '5,234.12',
    currency: 'Bitcoin',
    symbol: 'BTC',
    status: 'confirmed',
    timestamp: '2024-01-21T14:30:00',
    address: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
    txHash: 'a1b2c3d4e5f6...',
    confirmations: 6,
  },
  {
    id: 'tx2',
    type: 'purchase',
    amount: '0.05',
    amountUSD: '2,125.00',
    currency: 'Bitcoin',
    symbol: 'BTC',
    status: 'confirmed',
    timestamp: '2024-01-20T10:15:00',
    description: 'Premium Headphones - TechGear Store',
  },
  {
    id: 'tx3',
    type: 'send',
    amount: '0.5',
    amountUSD: '1,175.00',
    currency: 'Ethereum',
    symbol: 'ETH',
    status: 'pending',
    timestamp: '2024-01-21T16:45:00',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
    txHash: '0xabc123...',
    confirmations: 2,
  },
  {
    id: 'tx4',
    type: 'sale',
    amount: '0.025',
    amountUSD: '1,062.50',
    currency: 'Bitcoin',
    symbol: 'BTC',
    status: 'confirmed',
    timestamp: '2024-01-19T08:30:00',
    description: 'Leather Wallet - Order #LW-2024-0012',
  },
  {
    id: 'tx5',
    type: 'receive',
    amount: '2.5',
    amountUSD: '172.50',
    currency: 'Litecoin',
    symbol: 'LTC',
    status: 'confirmed',
    timestamp: '2024-01-18T12:00:00',
    address: 'LcHK7a24cKhP9pHbVHVqPfSqJ4gQ8GJgBL',
  },
];

export default function WalletPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  const totalBalanceUSD = mockBalances.reduce(
    (sum, b) => sum + parseFloat(b.balanceUSD.replace(/,/g, '')),
    0
  );

  const filteredTransactions = mockTransactions.filter(tx => {
    if (selectedCurrency && tx.currency !== selectedCurrency) return false;
    if (activeTab === 'sent' && tx.type !== 'send' && tx.type !== 'purchase') return false;
    if (activeTab === 'received' && tx.type !== 'receive' && tx.type !== 'sale') return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="py-4 sm:py-8">
        <Container>
          {/* Portfolio Summary */}
          <Card className="mb-4 sm:mb-8 overflow-hidden">
            <div className="relative p-4 sm:p-8 bg-gradient-to-br from-emerald-600 to-emerald-800">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative">
                <p className="text-emerald-100 mb-1 sm:mb-2 text-sm">
                  {t('wallet.totalPortfolioValue')}
                </p>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4">
                  ${totalBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h1>
                <HStack gap="xs" className="flex-wrap">
                  <Button
                    size="sm"
                    className="bg-white text-emerald-700 hover:bg-emerald-50 touch-feedback"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
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
                    {t('wallet.send')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 touch-feedback"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
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
                    {t('wallet.receive')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 touch-feedback"
                  >
                    <svg
                      className="w-4 h-4 mr-1.5"
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
                    {t('wallet.exchange')}
                  </Button>
                </HStack>
              </div>
            </div>
          </Card>

          {/* Wallet Cards */}
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
            {t('wallet.yourWallets')}
          </h2>
          <Grid cols={4} colsMobile={2} colsTablet={2} gap="sm" className="mb-4 sm:mb-8">
            {mockBalances.map(balance => (
              <WalletCard
                key={balance.symbol}
                balance={balance}
                onClick={() =>
                  setSelectedCurrency(
                    selectedCurrency === balance.currency ? null : balance.currency
                  )
                }
              />
            ))}
          </Grid>

          {/* Transaction History */}
          <Card className="overflow-hidden">
            <div className="p-3 sm:p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">
                  {t('wallet.transactionHistory')}
                  {selectedCurrency && (
                    <span className="ml-2 text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">
                      ({selectedCurrency})
                      <button
                        onClick={() => setSelectedCurrency(null)}
                        className="ml-2 text-emerald-600 hover:text-emerald-700"
                      >
                        {t('wallet.clear')}
                      </button>
                    </span>
                  )}
                </h2>

                <HStack gap="xs">
                  {(['all', 'sent', 'received'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-feedback ${
                        activeTab === tab
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {tab === 'all'
                        ? t('wallet.all')
                        : tab === 'sent'
                          ? t('wallet.sent')
                          : t('wallet.received')}
                    </button>
                  ))}
                </HStack>
              </div>
            </div>

            <div className="p-3 sm:p-6">
              <TransactionList
                transactions={filteredTransactions}
                onTransactionClick={_tx => {
                  /* TODO: Open transaction details */
                }}
              />
            </div>
          </Card>
        </Container>
      </main>
    </div>
  );
}
