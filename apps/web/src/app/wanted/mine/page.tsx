// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import Link from 'next/link';
import { Header, Footer, AuthGuard } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorAlert } from '@/components/ui/error-alert';
import { BuyRequestStatusBadge } from '@/components/wanted/BuyRequestStatusBadge';
import { wantedCoinLabel } from '@/components/wanted/wantedCoins';
import { getImageUrl, useCancelBuyRequest, useI18n, useMyBuyRequests } from '@mobazha/core';
import type { BuyRequest } from '@mobazha/core';

/**
 * The buyer's own requests.
 *
 * This reads the node's own board rather than the search index: a request lives
 * on the node that published it, and that is where its offers, its thread and
 * closing it happen. The index only ever holds the copy other nodes read.
 */
export default function MyWantedRequestsPage() {
  return (
    <AuthGuard>
      <MyWantedRequests />
    </AuthGuard>
  );
}

function MyWantedRequests() {
  const { t } = useI18n();
  const { requests, isLoading, error, refetch } = useMyBuyRequests();

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <Container size="lg" className="py-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">
              {t('wanted.mineTitle', { defaultValue: 'My requests' })}
            </h1>
            <Button asChild>
              <Link href="/wanted/new">{t('wanted.postCta', { defaultValue: 'Post a request' })}</Link>
            </Button>
          </div>

          <ErrorAlert
            error={typeof error === 'string' ? error : null}
            onRetry={() => void refetch()}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              {t('common.loading')}
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              title={t('wanted.mineEmpty', { defaultValue: 'You have not posted a request yet' })}
              description={t('wanted.mineEmptyBody', {
                defaultValue: 'Requests you post appear here, with what sellers answer.',
              })}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map(request => (
                <MyRequestCard key={request.slug} request={request} />
              ))}
            </div>
          )}
        </Container>
      </div>
      <Footer />
    </>
  );
}

/** One row, so that the close action belongs to the request it closes. */
function MyRequestCard({ request }: { request: BuyRequest }) {
  const { t } = useI18n();
  const cancel = useCancelBuyRequest(request.slug);
  const budget = request.budget?.max;
  const cover = request.images?.[0];
  const isOpen = request.status === 'open';

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          {cover ? (
            <img
              src={getImageUrl(cover.small || cover.original)}
              alt={request.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Link href={`/wanted/${encodeURIComponent(request.slug)}`} className="min-w-0">
              <h2 className="truncate font-medium hover:text-primary">{request.title}</h2>
            </Link>
            <BuyRequestStatusBadge status={request.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {[
              budget ? `${budget.amount} ${wantedCoinLabel(budget.currency)}` : '',
              request.quantity ? `×${request.quantity}` : '',
              request.deliverTo,
              request.expiresAt ? new Date(request.expiresAt).toLocaleDateString() : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isOpen && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/wanted/${encodeURIComponent(request.slug)}/edit`}>
                  {t('wanted.editCta', { defaultValue: 'Edit' })}
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                {t('wanted.closeRequest', { defaultValue: 'Close request' })}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
