'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Link2, Loader2, Plus } from 'lucide-react';
import { buildSellerDealLinkBrowseHref, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { DealLinkRow } from './DealLinkRow';
import { useDealLinksContext } from './DealLinksContext';

export function ProtectedLinksTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { dealLinks, loading } = useDealLinksContext();

  const [manualCopyToken, setManualCopyToken] = useState('');
  const [showAll, setShowAll] = useState(false);

  const highlightId = searchParams.get('highlight') ?? '';

  const activeDealLinks = useMemo(
    () => dealLinks.filter(link => link.status === 'active'),
    [dealLinks]
  );
  const displayedLinks = showAll ? activeDealLinks : activeDealLinks.slice(0, 10);

  const handleCopyDealLink = useCallback(
    async (publicToken: string) => {
      const href = `${window.location.origin}${buildSellerDealLinkBrowseHref({ publicToken })}`;
      const copied = await copyToClipboard(href);
      if (copied) {
        setManualCopyToken('');
        toast({ title: t('admin.dealLinks.dealCopySuccess') });
      } else {
        setManualCopyToken(publicToken);
        toast({ variant: 'destructive', title: t('admin.dealLinks.dealCopyFailed') });
      }
    },
    [t, toast]
  );

  return (
    <div className="space-y-4" data-testid="deal-links-tab-panel-links">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium">{t('admin.dealLinks.activeDealsTitle')}</h2>
        <Button asChild className="min-h-11 w-full sm:w-auto">
          <Link href="/admin/deal-links/new">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('admin.dealLinks.createLink')}
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t('common.loading')}
        </div>
      ) : null}

      {!loading && !activeDealLinks.length ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center">
          <Link2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
          <h3 className="text-base font-medium">{t('admin.dealLinks.linksEmptyTitle')}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {t('admin.dealLinks.linksEmptyDescription')}
          </p>
          <Button asChild className="mt-4 min-h-11">
            <Link href="/admin/deal-links/new">{t('admin.dealLinks.createLink')}</Link>
          </Button>
        </div>
      ) : null}

      {!loading && activeDealLinks.length ? (
        <div className="space-y-2">
          {displayedLinks.map(link => (
            <DealLinkRow
              key={link.id}
              link={link}
              highlighted={link.id === highlightId}
              manualCopyToken={manualCopyToken}
              onCopy={token => void handleCopyDealLink(token)}
            />
          ))}
          {activeDealLinks.length > 10 ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full"
              onClick={() => setShowAll(current => !current)}
            >
              {showAll
                ? t('admin.dealLinks.showFewerDeals')
                : t('admin.dealLinks.showAllDeals', { count: activeDealLinks.length })}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
