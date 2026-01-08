'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

// Types
interface DisputeCase {
  caseId: string;
  orderId: string;
  state: 'OPEN' | 'PENDING' | 'RESOLVED' | 'EXPIRED' | 'DECIDED';
  timestamp: string;
  total: number;
  coin: string;
  title: string;
  thumbnail: string;
  buyer: {
    peerID: string;
    name: string;
    avatar?: string;
  };
  seller: {
    peerID: string;
    name: string;
    avatar?: string;
  };
  claim: string;
  buyerOpened: boolean;
  read: boolean;
  unreadMessages: number;
}

// Mock data
const mockCases: DisputeCase[] = [
  {
    caseId: 'CASE-001',
    orderId: 'ORD-2024-0001',
    state: 'OPEN',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    total: 189.99,
    coin: 'USDT',
    title: 'Vintage Film Camera - Collector Edition',
    thumbnail: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&h=200&fit=crop',
    buyer: {
      peerID: 'QmBuyer001',
      name: 'John Buyer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=buyer1',
    },
    seller: {
      peerID: 'QmVendor789',
      name: 'Retro Finds',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=retro',
    },
    claim: 'Item not as described. The camera arrived with scratches not shown in photos.',
    buyerOpened: true,
    read: false,
    unreadMessages: 3,
  },
  {
    caseId: 'CASE-002',
    orderId: 'ORD-2024-0002',
    state: 'PENDING',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    total: 599.99,
    coin: 'ETH',
    title: 'Limited Edition Watch',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
    buyer: {
      peerID: 'QmBuyer002',
      name: 'Alice Chen',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    },
    seller: {
      peerID: 'QmVendor456',
      name: 'WearTech',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=weartech',
    },
    claim: 'Product never arrived. Tracking shows delivered but I did not receive it.',
    buyerOpened: true,
    read: true,
    unreadMessages: 0,
  },
  {
    caseId: 'CASE-003',
    orderId: 'ORD-2024-0003',
    state: 'RESOLVED',
    timestamp: new Date(Date.now() - 604800000).toISOString(),
    total: 49.99,
    coin: 'BTC',
    title: 'Wireless Mouse',
    thumbnail: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=200&h=200&fit=crop',
    buyer: {
      peerID: 'QmBuyer003',
      name: 'Bob Smith',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    },
    seller: {
      peerID: 'QmVendor123',
      name: 'TechGear Store',
      avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=techgear',
    },
    claim: 'Wrong item sent.',
    buyerOpened: false,
    read: true,
    unreadMessages: 0,
  },
];

const stateColors: Record<string, string> = {
  OPEN: 'bg-red-500',
  PENDING: 'bg-yellow-500',
  RESOLVED: 'bg-emerald-500',
  EXPIRED: 'bg-slate-500',
  DECIDED: 'bg-blue-500',
};

const stateLabels: Record<string, string> = {
  OPEN: 'Open',
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  EXPIRED: 'Expired',
  DECIDED: 'Decided',
};

export default function ModeratorCasesPage() {
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'pending' | 'resolved'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');

  useEffect(() => {
    // Simulate loading
    const loadCases = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setCases(mockCases);
      setIsLoading(false);
    };
    loadCases();
  }, []);

  const filteredCases = cases
    .filter(c => {
      if (filter === 'all') return true;
      if (filter === 'open') return c.state === 'OPEN';
      if (filter === 'pending') return c.state === 'PENDING';
      if (filter === 'resolved') return ['RESOLVED', 'DECIDED', 'EXPIRED'].includes(c.state);
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'amount':
          return b.total - a.total;
        default:
          return 0;
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const stats = {
    total: cases.length,
    open: cases.filter(c => c.state === 'OPEN').length,
    pending: cases.filter(c => c.state === 'PENDING').length,
    resolved: cases.filter(c => ['RESOLVED', 'DECIDED', 'EXPIRED'].includes(c.state)).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <Container size="xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Moderation Cases</h1>
            <p className="text-muted-foreground">
              Review and resolve disputes between buyers and sellers
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="text-center">
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Cases</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-red-500">{stats.open}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-emerald-500">{stats.resolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <HStack justify="between" className="flex-wrap gap-4">
              <HStack gap="sm" className="flex-wrap">
                {(['all', 'open', 'pending', 'resolved'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === status
                        ? 'bg-emerald-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {status !== 'all' && (
                      <span className="ml-2 text-xs opacity-75">
                        (
                        {status === 'open'
                          ? stats.open
                          : status === 'pending'
                            ? stats.pending
                            : stats.resolved}
                        )
                      </span>
                    )}
                  </button>
                ))}
              </HStack>

              <HStack gap="sm" align="center">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <Select value={sortBy} onValueChange={value => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                  </SelectContent>
                </Select>
              </HStack>
            </HStack>
          </Card>

          {/* Cases List */}
          {isLoading ? (
            <VStack gap="md">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </Card>
              ))}
            </VStack>
          ) : filteredCases.length === 0 ? (
            <Card className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No cases found</h3>
              <p className="text-muted-foreground">
                {filter !== 'all'
                  ? 'Try changing the filter to see more cases.'
                  : 'You have no moderation cases at this time.'}
              </p>
            </Card>
          ) : (
            <VStack gap="md">
              {filteredCases.map(caseItem => (
                <Link key={caseItem.caseId} href={`/moderator/cases/${caseItem.orderId}`}>
                  <Card
                    className={`transition-all hover:shadow-lg ${!caseItem.read ? 'border-l-4 border-l-emerald-500' : ''}`}
                  >
                    <HStack gap="lg" align="start" className="flex-wrap md:flex-nowrap">
                      {/* Thumbnail */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
                        <img
                          src={caseItem.thumbnail}
                          alt={caseItem.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <HStack justify="between" align="start" className="mb-2">
                          <div>
                            <HStack gap="sm" align="center" className="mb-1">
                              <h3 className="font-semibold text-foreground truncate">
                                Case #{caseItem.caseId}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium text-white ${stateColors[caseItem.state]}`}
                              >
                                {stateLabels[caseItem.state]}
                              </span>
                              {caseItem.unreadMessages > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                                  {caseItem.unreadMessages} new
                                </span>
                              )}
                            </HStack>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {caseItem.title}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-foreground">
                              {caseItem.total} {caseItem.coin}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(caseItem.timestamp)}
                            </p>
                          </div>
                        </HStack>

                        {/* Claim */}
                        <p className="text-sm text-slate-500 line-clamp-2 mb-3">
                          <span className="font-medium text-muted-foreground">Claim:</span>{' '}
                          {caseItem.claim}
                        </p>

                        {/* Parties */}
                        <HStack gap="lg" className="text-sm">
                          <HStack gap="sm" align="center">
                            <Avatar
                              src={caseItem.buyer.avatar}
                              name={caseItem.buyer.name}
                              size="sm"
                            />
                            <div>
                              <span className="text-muted-foreground">Buyer:</span>{' '}
                              <span className="font-medium text-foreground">
                                {caseItem.buyer.name}
                              </span>
                              {caseItem.buyerOpened && (
                                <span className="ml-1 text-xs text-red-500">(Opened)</span>
                              )}
                            </div>
                          </HStack>
                          <HStack gap="sm" align="center">
                            <Avatar
                              src={caseItem.seller.avatar}
                              name={caseItem.seller.name}
                              size="sm"
                            />
                            <div>
                              <span className="text-muted-foreground">Seller:</span>{' '}
                              <span className="font-medium text-foreground">
                                {caseItem.seller.name}
                              </span>
                              {!caseItem.buyerOpened && (
                                <span className="ml-1 text-xs text-red-500">(Opened)</span>
                              )}
                            </div>
                          </HStack>
                        </HStack>
                      </div>

                      {/* Action Arrow */}
                      <div className="flex-shrink-0 hidden md:block">
                        <svg
                          className="w-6 h-6 text-slate-400"
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
                      </div>
                    </HStack>
                  </Card>
                </Link>
              ))}
            </VStack>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
