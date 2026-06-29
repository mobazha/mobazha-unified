'use client';

import Link from 'next/link';
import {
  MARKETPLACE_LIFECYCLE_STATUS_KEYS,
  MARKETPLACE_MEMBERSHIP_STATUS_KEYS,
  useI18n,
  useMyMarketplaceMemberships,
} from '@mobazha/core';
import type { MyMarketplaceMembershipEntry } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface MarketplaceMembershipsContentProps {
  backHref: string;
}

export function MarketplaceMembershipsContent({ backHref }: MarketplaceMembershipsContentProps) {
  const { t, formatDate } = useI18n();
  const { toast } = useToast();
  const { memberships, loading, loadFailed, acceptingId, refresh, acceptInvitation } =
    useMyMarketplaceMemberships();

  async function handleAccept(entry: MyMarketplaceMembershipEntry) {
    try {
      await acceptInvitation(entry);
      toast({
        title: t('marketplace.memberships.acceptSuccess'),
        description: t('marketplace.memberships.acceptSuccessDesc'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.memberships.acceptFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  return (
    <div data-testid="marketplace-memberships-page" className="space-y-6">
      <SettingsPageHeader
        title={t('marketplace.memberships.title')}
        description={t('marketplace.memberships.subtitle')}
        backHref={backHref}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : loadFailed ? (
        <Card>
          <CardContent className="space-y-4 py-14 text-center">
            <p className="font-medium">{t('marketplace.memberships.loadFailedTitle')}</p>
            <p className="text-sm text-muted-foreground">
              {t('marketplace.memberships.loadFailedDesc')}
            </p>
            <Button variant="outline" onClick={() => void refresh()}>
              {t('common.retry')}
            </Button>
          </CardContent>
        </Card>
      ) : memberships.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <p className="font-medium">{t('marketplace.memberships.emptyTitle')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('marketplace.memberships.emptyDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {memberships.map(entry => {
            const { marketplace, membership } = entry;
            const isInvited = membership.status === 'invited';
            const invitedDate = membership.invitedAt
              ? formatDate(new Date(membership.invitedAt))
              : null;

            return (
              <Card key={`${marketplace.id}-${membership.id}`}>
                <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{marketplace.name}</h2>
                      <Badge variant="outline">
                        {t(MARKETPLACE_MEMBERSHIP_STATUS_KEYS[membership.status])}
                      </Badge>
                      <Badge variant="secondary">
                        {t(MARKETPLACE_LIFECYCLE_STATUS_KEYS[marketplace.status])}
                      </Badge>
                    </div>
                    {marketplace.description ? (
                      <p className="text-sm text-muted-foreground">{marketplace.description}</p>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      {marketplace.slug}
                      {invitedDate
                        ? ` · ${t('marketplace.memberships.invitedAt', { date: invitedDate })}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isInvited ? (
                      <Button
                        data-testid={`accept-marketplace-invite-${marketplace.id}`}
                        disabled={acceptingId === marketplace.id}
                        onClick={() => void handleAccept(entry)}
                      >
                        {acceptingId === marketplace.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('marketplace.memberships.accepting')}
                          </>
                        ) : (
                          t('marketplace.memberships.accept')
                        )}
                      </Button>
                    ) : null}
                    <Button asChild variant="outline">
                      <Link href={`/marketplace/${encodeURIComponent(marketplace.slug)}`}>
                        {t('marketplace.memberships.viewMarketplace')}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
