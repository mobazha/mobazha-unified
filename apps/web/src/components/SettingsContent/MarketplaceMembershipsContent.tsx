// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { ChevronDown, Loader2 } from 'lucide-react';

interface MarketplaceMembershipsContentProps {
  backHref: string;
}

function MembershipCard({
  entry,
  acceptingId,
  decliningId,
  leavingId,
  onAccept,
  onDecline,
  onLeave,
}: {
  entry: MyMarketplaceMembershipEntry;
  acceptingId: string | null;
  decliningId: string | null;
  leavingId: string | null;
  onAccept: (entry: MyMarketplaceMembershipEntry) => void;
  onDecline: (entry: MyMarketplaceMembershipEntry) => void;
  onLeave: (entry: MyMarketplaceMembershipEntry) => void;
}) {
  const { t, formatDate } = useI18n();
  const { marketplace, membership } = entry;
  const isInvited = membership.status === 'invited';
  const isArchivedMarketplace = marketplace.status === 'archived';
  const canAcceptInvitation = isInvited && marketplace.status !== 'archived';
  const canDeclineInvitation = isInvited && marketplace.status !== 'archived';
  const canLeaveMembership =
    !isArchivedMarketplace &&
    (membership.status === 'accepted' ||
      membership.status === 'approved' ||
      membership.status === 'suspended');
  const isMutatingMembership = Boolean(acceptingId || decliningId || leavingId);
  const invitedDate = membership.invitedAt ? formatDate(new Date(membership.invitedAt)) : null;
  const canViewPublicMarketplace = marketplace.status === 'published';
  const reviewUpdatesHref = `/marketplace/${encodeURIComponent(marketplace.slug)}/sell`;
  const showUnreadReviewUpdates = membership.unreadReviewCount > 0;

  return (
    <Card
      key={`${marketplace.id}-${membership.id}`}
      data-testid={`marketplace-membership-${marketplace.id}`}
    >
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">
              {isInvited
                ? t('marketplace.memberships.inviteCardTitle', { name: marketplace.name })
                : marketplace.name}
            </h2>
            <Badge variant="outline">
              {t(MARKETPLACE_MEMBERSHIP_STATUS_KEYS[membership.status])}
            </Badge>
            <Badge variant="secondary">
              {t(MARKETPLACE_LIFECYCLE_STATUS_KEYS[marketplace.status])}
            </Badge>
          </div>
          {isInvited ? (
            <p className="text-sm text-muted-foreground">
              {t('marketplace.memberships.inviteBenefit')}
            </p>
          ) : null}
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
          {canAcceptInvitation ? (
            <Button
              data-testid={`accept-marketplace-invite-${marketplace.id}`}
              disabled={isMutatingMembership}
              onClick={() => onAccept(entry)}
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
          {canDeclineInvitation ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  data-testid={`decline-marketplace-invite-${marketplace.id}`}
                  disabled={isMutatingMembership}
                >
                  {decliningId === marketplace.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('marketplace.memberships.declining')}
                    </>
                  ) : (
                    t('marketplace.memberships.decline')
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('marketplace.memberships.declineConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('marketplace.memberships.declineConfirmDesc')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDecline(entry)}>
                    {t('marketplace.memberships.decline')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          {canLeaveMembership ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  data-testid={`leave-marketplace-${marketplace.id}`}
                  disabled={isMutatingMembership}
                >
                  {leavingId === marketplace.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('marketplace.memberships.leaving')}
                    </>
                  ) : (
                    t('marketplace.memberships.leave')
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('marketplace.memberships.leaveConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('marketplace.memberships.leaveConfirmDesc')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onLeave(entry)}>
                    {t('marketplace.memberships.leave')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
          {isArchivedMarketplace ? (
            <div
              className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
              data-testid={`review-history-static-${marketplace.id}`}
            >
              <span>{t('marketplace.memberships.reviewHistory')}</span>
              {showUnreadReviewUpdates ? (
                <Badge variant="secondary" className="ml-2">
                  {t('marketplace.memberships.reviewUpdatesUnreadBadge', {
                    count: membership.unreadReviewCount,
                  })}
                </Badge>
              ) : null}
            </div>
          ) : (
            <Button
              asChild
              variant="secondary"
              data-testid={`view-review-updates-${marketplace.id}`}
            >
              <Link href={reviewUpdatesHref}>
                {t('marketplace.memberships.reviewUpdates')}
                {showUnreadReviewUpdates ? (
                  <Badge variant="secondary" className="ml-2">
                    {t('marketplace.memberships.reviewUpdatesUnreadBadge', {
                      count: membership.unreadReviewCount,
                    })}
                  </Badge>
                ) : null}
              </Link>
            </Button>
          )}
          {canViewPublicMarketplace ? (
            <Button asChild variant="outline" data-testid={`view-marketplace-${marketplace.id}`}>
              <Link href={`/marketplace/${encodeURIComponent(marketplace.slug)}`}>
                {t('marketplace.memberships.viewMarketplace')}
              </Link>
            </Button>
          ) : (
            <div
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
              data-testid={`marketplace-unavailable-${marketplace.id}`}
            >
              <p className="font-medium text-foreground">
                {t('marketplace.memberships.marketplaceUnavailable')}
              </p>
              <p className="mt-1 text-xs">
                {t('marketplace.memberships.marketplaceUnavailableDesc')}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ArchivedMembershipsSection({
  memberships,
  acceptingId,
  decliningId,
  leavingId,
  onAccept,
  onDecline,
  onLeave,
}: {
  memberships: MyMarketplaceMembershipEntry[];
  acceptingId: string | null;
  decliningId: string | null;
  leavingId: string | null;
  onAccept: (entry: MyMarketplaceMembershipEntry) => void;
  onDecline: (entry: MyMarketplaceMembershipEntry) => void;
  onLeave: (entry: MyMarketplaceMembershipEntry) => void;
}) {
  const { t } = useI18n();

  if (memberships.length === 0) return null;

  return (
    <details
      className="group rounded-lg border border-border bg-muted/20 open:bg-muted/30"
      data-testid="marketplace-memberships-archived-section"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span>{t('marketplace.memberships.archivedSectionTitle')}</span>
        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-4 border-t border-border px-4 pb-4 pt-4">
        {memberships.map(entry => (
          <MembershipCard
            key={`${entry.marketplace.id}-${entry.membership.id}`}
            entry={entry}
            acceptingId={acceptingId}
            decliningId={decliningId}
            leavingId={leavingId}
            onAccept={onAccept}
            onDecline={onDecline}
            onLeave={onLeave}
          />
        ))}
      </div>
    </details>
  );
}

export function MarketplaceMembershipsContent({ backHref }: MarketplaceMembershipsContentProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    memberships,
    loading,
    loadFailed,
    acceptingId,
    decliningId,
    leavingId,
    refresh,
    acceptInvitation,
    declineInvitation,
    leaveMembership,
  } = useMyMarketplaceMemberships();

  const activeMemberships = memberships.filter(entry => entry.marketplace.status !== 'archived');
  const archivedMemberships = memberships.filter(entry => entry.marketplace.status === 'archived');

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

  async function handleDecline(entry: MyMarketplaceMembershipEntry) {
    try {
      await declineInvitation(entry);
      toast({
        title: t('marketplace.memberships.declineSuccess'),
        description: t('marketplace.memberships.declineSuccessDesc'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.memberships.declineFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleLeave(entry: MyMarketplaceMembershipEntry) {
    try {
      await leaveMembership(entry);
      toast({
        title: t('marketplace.memberships.leaveSuccess'),
        description: t('marketplace.memberships.leaveSuccessDesc'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.memberships.leaveFailedTitle'),
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
        <div className="space-y-6">
          {activeMemberships.length > 0 ? (
            <div className="space-y-4" data-testid="marketplace-memberships-active-section">
              {archivedMemberships.length > 0 ? (
                <h2 className="text-sm font-medium text-muted-foreground">
                  {t('marketplace.memberships.activeSectionTitle')}
                </h2>
              ) : null}
              {activeMemberships.map(entry => (
                <MembershipCard
                  key={`${entry.marketplace.id}-${entry.membership.id}`}
                  entry={entry}
                  acceptingId={acceptingId}
                  decliningId={decliningId}
                  leavingId={leavingId}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onLeave={handleLeave}
                />
              ))}
            </div>
          ) : null}

          <ArchivedMembershipsSection
            memberships={archivedMemberships}
            acceptingId={acceptingId}
            decliningId={decliningId}
            leavingId={leavingId}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onLeave={handleLeave}
          />
        </div>
      )}
    </div>
  );
}
