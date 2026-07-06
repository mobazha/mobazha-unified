'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, PackageSearch, Search, Trash2 } from 'lucide-react';
import { routedStoreContextService, useI18n } from '@mobazha/core';
import { formatGuestOrderStateLabel } from '@/components/orders/guestOrderDisplay';
import {
  buildGuestOrderRecoveryHref,
  formatRecentGuestOrderPayment,
  forgetGuestOrder,
  loadRecentGuestOrders,
  parseGuestOrderRecoveryInput,
  type RecentGuestOrder,
} from '@/lib/guestOrderRecovery';

function formatLastUpdated(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function TrackOrderPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [recentOrders, setRecentOrders] = useState<RecentGuestOrder[]>([]);

  useEffect(() => {
    setRecentOrders(loadRecentGuestOrders());
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = parseGuestOrderRecoveryInput(input);
    if (!target) {
      setError(t('track.invalid'));
      return;
    }
    setError('');
    if (target.storeRouteToken) {
      routedStoreContextService.setStoreRouteToken(target.storeRouteToken);
    }
    router.push(target.href);
  };

  const handleForget = (orderToken: string) => {
    setRecentOrders(forgetGuestOrder(orderToken));
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-xl space-y-8 px-4 py-8 pb-28">
      <header className="space-y-2 text-center">
        <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-foreground">{t('track.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('track.description')}</p>
      </header>

      {recentOrders.length > 0 && (
        <section className="space-y-3" aria-labelledby="recent-orders-title">
          <div>
            <h2 id="recent-orders-title" className="text-base font-semibold text-foreground">
              {t('track.recentTitle')}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {t('track.deviceOnly')}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
            {recentOrders.map(order => {
              const title = order.itemTitles.join(', ') || t('track.orderFallback');
              const updated = formatLastUpdated(order.updatedAt);
              const payment = formatRecentGuestOrderPayment(order);
              return (
                <div key={order.orderToken} className="flex items-stretch">
                  <Link
                    href={buildGuestOrderRecoveryHref(order.orderToken, {
                      storeRouteToken: order.storeRouteToken,
                    })}
                    onClick={() => {
                      if (order.storeRouteToken) {
                        routedStoreContextService.setStoreRouteToken(order.storeRouteToken);
                      }
                    }}
                    className="min-w-0 flex-1 p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatGuestOrderStateLabel(order.state, 'unknown', t)}
                          {payment ? ` · ${payment}` : ''}
                        </p>
                        {updated && (
                          <p className="mt-1 truncate text-[11px] text-muted-foreground">
                            {t('track.lastUpdated', { date: updated })}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleForget(order.orderToken)}
                    className="flex w-12 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    aria-label={`${t('track.forget')}: ${title}`}
                    title={t('track.forget')}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="find-order-title">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 id="find-order-title" className="text-base font-semibold text-foreground">
            {t('track.findTitle')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <label htmlFor="order-recovery-input" className="sr-only">
            {t('track.inputLabel')}
          </label>
          <input
            id="order-recovery-input"
            type="text"
            value={input}
            onChange={event => {
              setInput(event.target.value);
              if (error) setError('');
            }}
            placeholder={t('track.placeholder')}
            aria-label={t('track.inputLabel')}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'order-recovery-error' : undefined}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {error && (
            <p id="order-recovery-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {t('track.submit')}
          </button>
        </form>
      </section>
    </main>
  );
}
