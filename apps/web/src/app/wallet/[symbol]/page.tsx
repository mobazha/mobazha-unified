'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { Header } from '@/components';
import { MobilePageHeader } from '@/components/MobilePageHeader/MobilePageHeader';
import { Container, VStack, HStack } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Mock data - in real app this would come from API
const mockAssets: Record<
  string,
  {
    currency: string;
    symbol: string;
    balance: string;
    balanceUSD: number;
    change24h: number;
    changeUSD: number;
    color: string;
    address: string;
  }
> = {
  btc: {
    currency: 'Bitcoin',
    symbol: 'BTC',
    balance: '0.5432',
    balanceUSD: 22879.43,
    change24h: 2.34,
    changeUSD: 523.45,
    color: 'bg-warning',
    address: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
  },
  eth: {
    currency: 'Ethereum',
    symbol: 'ETH',
    balance: '3.2145',
    balanceUSD: 7523.87,
    change24h: -1.23,
    changeUSD: -93.54,
    color: 'bg-info',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
  },
  ltc: {
    currency: 'Litecoin',
    symbol: 'LTC',
    balance: '12.5',
    balanceUSD: 862.5,
    change24h: 0.87,
    changeUSD: 7.45,
    color: 'bg-muted-foreground',
    address: 'LcHK7a24cKhP9pHbVHVqPfSqJ4gQ8GJgBL',
  },
  zec: {
    currency: 'Zcash',
    symbol: 'ZEC',
    balance: '5.0',
    balanceUSD: 141.5,
    change24h: 3.21,
    changeUSD: 4.39,
    color: 'bg-warning',
    address: 't1VShHAhsQc5RVndQLyM3G97U3ChMvtCqgd',
  },
};

// Mock transactions
const mockTransactions = [
  {
    id: 'tx1',
    type: 'receive' as const,
    amount: '0.1234',
    amountUSD: 5234.12,
    timestamp: '2024-01-21T14:30:00',
    address: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
    status: 'confirmed' as const,
  },
  {
    id: 'tx2',
    type: 'send' as const,
    amount: '0.05',
    amountUSD: 2125.0,
    timestamp: '2024-01-20T10:15:00',
    address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    status: 'confirmed' as const,
  },
  {
    id: 'tx3',
    type: 'receive' as const,
    amount: '0.25',
    amountUSD: 10625.0,
    timestamp: '2024-01-18T09:00:00',
    address: '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
    status: 'confirmed' as const,
  },
];

export default function AssetDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const symbol = (params.symbol as string)?.toLowerCase();
  const asset = mockAssets[symbol];
  const [activeTab, setActiveTab] = useState<'all' | 'sent' | 'received'>('all');

  if (!asset) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MobilePageHeader title={t('nav.wallet')} />
        <main className="py-8">
          <Container size="sm">
            <div className="text-center py-8 sm:py-16">
              <h1 className="text-lg sm:text-xl font-bold text-foreground mb-2">Asset not found</h1>
              <Link href="/wallet" className="text-primary hover:underline">
                {t('wallet.back')}
              </Link>
            </div>
          </Container>
        </main>
      </div>
    );
  }

  const filteredTransactions = mockTransactions.filter(tx => {
    if (activeTab === 'sent') return tx.type === 'send';
    if (activeTab === 'received') return tx.type === 'receive';
    return true;
  });

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
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={asset.currency} />

      <main className="py-4 sm:py-8">
        <Container size="sm">
          {/* Asset Header Card */}
          <Card className="mb-4 sm:mb-6 overflow-hidden">
            <div className={`p-4 sm:p-8 ${asset.color} text-white text-center`}>
              <p className="text-white/80 text-xs sm:text-sm mb-1">{asset.currency}</p>
              <h1 className="text-2xl sm:text-4xl font-bold mb-0.5 sm:mb-1">
                {asset.balance} {asset.symbol}
              </h1>
              <p className="text-lg sm:text-2xl text-white/90 mb-1 sm:mb-2">
                ${asset.balanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p
                className={`text-xs sm:text-sm ${asset.change24h >= 0 ? 'text-primary-foreground/70' : 'text-error/80'}`}
              >
                {asset.change24h >= 0 ? '▲' : '▼'} {asset.change24h >= 0 ? '+' : ''}
                {asset.change24h.toFixed(2)}% ({asset.changeUSD >= 0 ? '+' : ''}$
                {Math.abs(asset.changeUSD).toFixed(2)}) {t('wallet.today')}
              </p>
            </div>

            {/* Action Buttons */}
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
              </div>
            </div>
          </Card>

          {/* Wallet Address */}
          <Card className="mb-4 sm:mb-6 p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1.5 sm:mb-2">
              {t('wallet.yourAddress')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs sm:text-sm text-foreground bg-muted px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg truncate">
                {asset.address}
              </code>
              <Button variant="outline" size="sm" className="h-11 w-11 p-0 sm:h-9 sm:w-9">
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </Button>
            </div>
          </Card>

          {/* Transactions */}
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {t('wallet.transactions')}
            </h2>
            <HStack gap="xs">
              {(['all', 'sent', 'received'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-h-[44px] sm:min-h-0 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                    activeTab === tab
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
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

          <Card className="overflow-hidden">
            {filteredTransactions.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
                {t('wallet.noTransactions')}
              </div>
            ) : (
              <VStack gap="none" className="divide-y divide-border">
                {filteredTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4">
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'receive' ? 'bg-primary/20' : 'bg-destructive/20'
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${tx.type === 'receive' ? 'text-primary' : 'text-destructive'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {tx.type === 'receive' ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 13l-5 5m0 0l-5-5m5 5V6"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 11l5-5m0 0l5 5m-5-5v12"
                          />
                        )}
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm sm:text-base text-foreground">
                          {tx.type === 'receive' ? t('wallet.received') : t('wallet.sent')}
                        </span>
                        <span
                          className={`font-semibold text-sm sm:text-base ${tx.type === 'receive' ? 'text-primary' : 'text-foreground'}`}
                        >
                          {tx.type === 'receive' ? '+' : '-'}
                          {tx.amount} {asset.symbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {formatTime(tx.timestamp)}
                        </span>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          ${tx.amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </VStack>
            )}
          </Card>
        </Container>
      </main>
    </div>
  );
}
