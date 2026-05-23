'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container, VStack, HStack } from '@/components/layouts';
import { Card } from '@/components/ui/card';
import { AvatarCompat as Avatar } from '@/components/ui/avatar-compat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { disputesApi, useI18n, formatUserName, type CaseListItem } from '@mobazha/core';
import { ClipboardList, ChevronRight, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const stateColors: Record<string, string> = {
  OPEN: 'bg-error',
  PENDING: 'bg-warning',
  RESOLVED: 'bg-success',
  EXPIRED: 'bg-muted',
  DECIDED: 'bg-info',
  DISPUTED: 'bg-error',
};

type FilterKey = 'all' | 'open' | 'pending' | 'resolved';
type SortKey = 'newest' | 'oldest' | 'amount';

function compareAmountMinimal(a: string, b: string): number {
  try {
    const diff = BigInt(b || '0') - BigInt(a || '0');
    if (diff > 0n) return 1;
    if (diff < 0n) return -1;
    return 0;
  } catch {
    return (Number(b) || 0) - (Number(a) || 0);
  }
}

export default function CasesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await disputesApi.getCases();
      setCases(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : t('common.error'));
      setCases([]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  const stateLabel = (state: string) => {
    const key = state.toLowerCase() as 'open' | 'pending' | 'resolved' | 'expired' | 'decided';
    return t(`moderation.${key}`, { defaultValue: state });
  };

  const filterLabel = (f: FilterKey) => t(`moderation.${f}`);

  const filteredCases = cases
    .filter(c => {
      if (filter === 'all') return true;
      if (filter === 'open') return c.state === 'OPEN' || c.state === 'DISPUTED';
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
          return compareAmountMinimal(a.amountMinimal, b.amountMinimal);
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
    open: cases.filter(c => c.state === 'OPEN' || c.state === 'DISPUTED').length,
    pending: cases.filter(c => c.state === 'PENDING').length,
    resolved: cases.filter(c => ['RESOLVED', 'DECIDED', 'EXPIRED'].includes(c.state)).length,
  };

  const orderDisputeHref = (orderId: string) =>
    `/orders/${encodeURIComponent(orderId)}?tab=dispute`;

  return (
    <div className="min-h-screen bg-background" data-testid="cases-page">
      <Header />
      <MobilePageHeader title={t('moderation.title')} />

      <main className="py-4 md:py-8">
        <Container size="xl">
          <div className="hidden lg:block mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-1">{t('moderation.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('moderation.description')}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-8">
            {(
              [
                {
                  key: 'all' as const,
                  value: stats.total,
                  valueClass: 'text-foreground',
                  label: t('moderation.totalCases'),
                  testId: 'cases-stat-all',
                },
                {
                  key: 'open' as const,
                  value: stats.open,
                  valueClass: 'text-error',
                  label: t('moderation.open'),
                  testId: 'cases-stat-open',
                },
                {
                  key: 'pending' as const,
                  value: stats.pending,
                  valueClass: 'text-warning',
                  label: t('moderation.pending'),
                  testId: 'cases-stat-pending',
                },
                {
                  key: 'resolved' as const,
                  value: stats.resolved,
                  valueClass: 'text-success',
                  label: t('moderation.resolved'),
                  testId: 'cases-stat-resolved',
                },
              ] as const
            ).map(stat => (
              <button
                key={stat.key}
                type="button"
                onClick={() => setFilter(stat.key)}
                aria-pressed={filter === stat.key}
                aria-label={`${stat.label}: ${stat.value}`}
                data-testid={stat.testId}
                className="w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Card
                  className={cn(
                    'text-center py-3 md:py-4 transition-all hover:shadow-md active:scale-[0.98]',
                    filter === stat.key && 'ring-2 ring-primary border-primary/40 shadow-sm'
                  )}
                >
                  <p className={cn('text-2xl md:text-3xl font-bold', stat.valueClass)}>
                    {stat.value}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                </Card>
              </button>
            ))}
          </div>

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

          {loadError && (
            <Card className="mb-4 p-4 border-destructive/30 bg-destructive/5">
              <p className="text-sm text-destructive">{loadError}</p>
            </Card>
          )}

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
              {filteredCases.map(caseItem => {
                const buyerLabel = formatUserName(
                  { name: caseItem.buyerName, peerID: caseItem.buyerPeerID },
                  { fallback: t('order.buyer') }
                );
                const sellerLabel = formatUserName(
                  { name: caseItem.vendorName, peerID: caseItem.vendorPeerID },
                  { fallback: t('order.seller') }
                );

                const caseHref = orderDisputeHref(caseItem.orderId);
                const shortCaseId = `${caseItem.caseId.slice(0, 8)}…`;

                return (
                  <Card
                    key={caseItem.caseId}
                    className={cn(
                      'relative p-3 md:p-4 transition-all hover:shadow-md',
                      !caseItem.read && 'border-l-4 border-l-primary'
                    )}
                  >
                    {/* Primary action: open case detail (covers most of the row) */}
                    <Link
                      href={caseHref}
                      className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={t('moderation.viewCase', { id: shortCaseId })}
                    />

                    <div className="relative z-10 flex gap-3 pointer-events-none">
                      <div className="w-14 h-14 md:w-20 md:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {caseItem.thumbnail ? (
                          <img
                            src={caseItem.thumbnail}
                            alt={caseItem.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="text-sm font-semibold text-foreground">
                                {t('moderation.caseNumber', { id: shortCaseId })}
                              </h3>
                              <button
                                type="button"
                                className="pointer-events-auto p-1 -m-1 rounded text-muted-foreground hover:text-primary transition-colors"
                                aria-label={t('moderation.copyCaseId')}
                                onClick={e => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void navigator.clipboard.writeText(caseItem.orderId);
                                  toast({ description: t('order.actions.orderIdCopied') });
                                }}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-medium text-white ${stateColors[caseItem.state] || 'bg-muted'}`}
                              >
                                {stateLabel(caseItem.state)}
                              </span>
                              {(caseItem.unreadChatMessages ?? 0) > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-primary/15 text-primary border border-primary/25">
                                  {t('moderation.newMessages', {
                                    count: caseItem.unreadChatMessages,
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {caseItem.title}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-foreground whitespace-nowrap">
                              {caseItem.totalDisplay}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(caseItem.timestamp)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs">
                          {caseItem.buyerPeerID ? (
                            <Link
                              href={`/store/${caseItem.buyerPeerID}`}
                              className="pointer-events-auto flex items-center gap-1.5 min-w-0 rounded-md hover:bg-muted/50 -mx-1 px-1 py-0.5 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <Avatar
                                src={caseItem.buyerAvatar}
                                name={buyerLabel}
                                size="sm"
                                className="w-5 h-5"
                              />
                              <span className="truncate">
                                <span className="text-muted-foreground">
                                  {t('moderation.buyer')}:
                                </span>{' '}
                                <span className="font-medium text-foreground underline-offset-2 hover:underline">
                                  {buyerLabel}
                                </span>
                                {caseItem.buyerOpened && (
                                  <span className="text-error ml-0.5 no-underline">
                                    {t('moderation.opened')}
                                  </span>
                                )}
                              </span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Avatar
                                src={caseItem.buyerAvatar}
                                name={buyerLabel}
                                size="sm"
                                className="w-5 h-5"
                              />
                              <span className="truncate">
                                <span className="text-muted-foreground">
                                  {t('moderation.buyer')}:
                                </span>{' '}
                                <span className="font-medium">{buyerLabel}</span>
                              </span>
                            </div>
                          )}

                          {caseItem.vendorPeerID ? (
                            <Link
                              href={`/store/${caseItem.vendorPeerID}`}
                              className="pointer-events-auto flex items-center gap-1.5 min-w-0 rounded-md hover:bg-muted/50 -mx-1 px-1 py-0.5 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <Avatar
                                src={caseItem.vendorAvatar}
                                name={sellerLabel}
                                size="sm"
                                className="w-5 h-5"
                              />
                              <span className="truncate">
                                <span className="text-muted-foreground">
                                  {t('moderation.seller')}:
                                </span>{' '}
                                <span className="font-medium text-foreground underline-offset-2 hover:underline">
                                  {sellerLabel}
                                </span>
                                {!caseItem.buyerOpened && (
                                  <span className="text-error ml-0.5 no-underline">
                                    {t('moderation.opened')}
                                  </span>
                                )}
                              </span>
                            </Link>
                          ) : (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Avatar
                                src={caseItem.vendorAvatar}
                                name={sellerLabel}
                                size="sm"
                                className="w-5 h-5"
                              />
                              <span className="truncate">
                                <span className="text-muted-foreground">
                                  {t('moderation.seller')}:
                                </span>{' '}
                                <span className="font-medium">{sellerLabel}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex items-center self-center">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </VStack>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
