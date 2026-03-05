'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { useI18n } from '@mobazha/core';
import { ClipboardList, ChevronRight } from 'lucide-react';

interface DisputeCase {
  caseId: string;
  orderId: string;
  state: 'OPEN' | 'PENDING' | 'RESOLVED' | 'EXPIRED' | 'DECIDED';
  timestamp: string;
  total: number;
  coin: string;
  title: string;
  thumbnail: string;
  buyer: { peerID: string; name: string; avatar?: string };
  seller: { peerID: string; name: string; avatar?: string };
  claim: string;
  buyerOpened: boolean;
  read: boolean;
  unreadMessages: number;
}

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
  OPEN: 'bg-error',
  PENDING: 'bg-warning',
  RESOLVED: 'bg-success',
  EXPIRED: 'bg-muted',
  DECIDED: 'bg-info',
};

type FilterKey = 'all' | 'open' | 'pending' | 'resolved';
type SortKey = 'newest' | 'oldest' | 'amount';

export default function ModeratorCasesPage() {
  const { t } = useI18n();
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  useEffect(() => {
    const loadCases = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setCases(mockCases);
      setIsLoading(false);
    };
    loadCases();
  }, []);

  const stateLabel = (state: string) => {
    const key = state.toLowerCase() as 'open' | 'pending' | 'resolved' | 'expired' | 'decided';
    return t(`moderation.${key}`);
  };

  const filterLabel = (f: FilterKey) => t(`moderation.${f}`);

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

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const stats = {
    total: cases.length,
    open: cases.filter(c => c.state === 'OPEN').length,
    pending: cases.filter(c => c.state === 'PENDING').length,
    resolved: cases.filter(c => ['RESOLVED', 'DECIDED', 'EXPIRED'].includes(c.state)).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader title={t('moderation.title')} />

      <main className="py-4 md:py-8">
        <Container size="xl">
          {/* Page Header - desktop only */}
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">{t('moderation.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('moderation.description')}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-8">
            <Card className="text-center py-3 md:py-4">
              <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                {t('moderation.totalCases')}
              </p>
            </Card>
            <Card className="text-center py-3 md:py-4">
              <p className="text-2xl md:text-3xl font-bold text-error">{stats.open}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('moderation.open')}</p>
            </Card>
            <Card className="text-center py-3 md:py-4">
              <p className="text-2xl md:text-3xl font-bold text-warning">{stats.pending}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('moderation.pending')}</p>
            </Card>
            <Card className="text-center py-3 md:py-4">
              <p className="text-2xl md:text-3xl font-bold text-success">{stats.resolved}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{t('moderation.resolved')}</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-4 md:mb-6 p-3 md:p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {(['all', 'open', 'pending', 'resolved'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] ${
                      filter === status
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60'
                    }`}
                  >
                    {filterLabel(status)}
                    {status !== 'all' && (
                      <span className="ml-1.5 text-xs opacity-75">
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
              </div>

              <HStack gap="sm" align="center">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {t('moderation.sort')}:
                </span>
                <Select value={sortBy} onValueChange={value => setSortBy(value as SortKey)}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('moderation.sortNewest')}</SelectItem>
                    <SelectItem value="oldest">{t('moderation.sortOldest')}</SelectItem>
                    <SelectItem value="amount">{t('moderation.sortAmount')}</SelectItem>
                  </SelectContent>
                </Select>
              </HStack>
            </div>
          </Card>

          {/* Cases List */}
          {isLoading ? (
            <VStack gap="md">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse p-4">
                  <div className="h-20 bg-muted rounded" />
                </Card>
              ))}
            </VStack>
          ) : filteredCases.length === 0 ? (
            <Card className="text-center py-12 md:py-16">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-base font-semibold text-foreground mb-2">
                {t('moderation.noCasesFound')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter !== 'all' ? t('moderation.noCasesFilterHint') : t('moderation.noCasesDesc')}
              </p>
            </Card>
          ) : (
            <VStack gap="sm" className="md:gap-3">
              {filteredCases.map(caseItem => (
                <Link key={caseItem.caseId} href={`/moderation/cases/${caseItem.orderId}`}>
                  <Card
                    className={`p-3 md:p-4 transition-all hover:shadow-md active:bg-surface-hover ${
                      !caseItem.read ? 'border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={caseItem.thumbnail}
                          alt={caseItem.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground">
                                {t('moderation.caseNumber', { id: caseItem.caseId })}
                              </h3>
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${stateColors[caseItem.state]}`}
                              >
                                {stateLabel(caseItem.state)}
                              </span>
                              {caseItem.unreadMessages > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-error text-error-foreground">
                                  {t('moderation.newMessages', { count: caseItem.unreadMessages })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {caseItem.title}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-foreground">
                              {caseItem.total} {caseItem.coin}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(caseItem.timestamp)}
                            </p>
                          </div>
                        </div>

                        {/* Claim - hidden on small mobile */}
                        <p className="hidden sm:block text-xs text-muted-foreground line-clamp-1 mb-2">
                          <span className="font-medium">{t('moderation.claim')}:</span>{' '}
                          {caseItem.claim}
                        </p>

                        {/* Parties */}
                        <div className="flex gap-3 md:gap-6 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Avatar
                              src={caseItem.buyer.avatar}
                              name={caseItem.buyer.name}
                              size="sm"
                              className="w-5 h-5"
                            />
                            <span className="truncate">
                              <span className="text-muted-foreground">
                                {t('moderation.buyer')}:
                              </span>{' '}
                              <span className="font-medium">{caseItem.buyer.name}</span>
                              {caseItem.buyerOpened && (
                                <span className="text-error ml-0.5">{t('moderation.opened')}</span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Avatar
                              src={caseItem.seller.avatar}
                              name={caseItem.seller.name}
                              size="sm"
                              className="w-5 h-5"
                            />
                            <span className="truncate">
                              <span className="text-muted-foreground">
                                {t('moderation.seller')}:
                              </span>{' '}
                              <span className="font-medium">{caseItem.seller.name}</span>
                              {!caseItem.buyerOpened && (
                                <span className="text-error ml-0.5">{t('moderation.opened')}</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Arrow - desktop only */}
                      <div className="flex-shrink-0 hidden md:flex items-center">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
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
