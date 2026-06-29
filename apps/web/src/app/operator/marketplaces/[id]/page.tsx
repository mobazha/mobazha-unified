'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  MARKETPLACE_CATALOG_MODE_KEYS,
  MARKETPLACE_DISCOVERABILITY_KEYS,
  MARKETPLACE_DOMAIN_KIND_KEYS,
  MARKETPLACE_DOMAIN_VERIFICATION_KEYS,
  MARKETPLACE_LIFECYCLE_STATUS_KEYS,
  MARKETPLACE_MEMBERSHIP_STATUS_KEYS,
  formatUserName,
  useI18n,
  useOperatorMarketplace,
} from '@mobazha/core';
import type { MarketplaceStoreMembership } from '@mobazha/core';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Check, Loader2, Send, ShieldCheck } from 'lucide-react';

export default function MarketplaceOperatorDetailPage() {
  const params = useParams();
  const id = String(params.id ?? '');
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    marketplace,
    stores,
    counts,
    loading,
    loadFailed,
    working,
    publish,
    invite,
    reviewSeller,
  } = useOperatorMarketplace(id);
  const [peerID, setPeerID] = useState('');

  async function handlePublish() {
    try {
      await publish();
      toast({ title: t('marketplace.operator.publishSuccess') });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.publishFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleInvite() {
    const value = peerID.trim();
    if (!value) return;
    try {
      await invite(value);
      setPeerID('');
      toast({
        title: t('marketplace.operator.inviteSuccess'),
        description: t('marketplace.operator.inviteSuccessDesc'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.inviteFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  async function handleReview(
    store: MarketplaceStoreMembership,
    status: 'approved' | 'rejected' | 'suspended'
  ) {
    try {
      await reviewSeller(store, status);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.reviewFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      </div>
    );
  }

  if (loadFailed || !marketplace) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="py-10">
          <Container size="md">
            <Card>
              <CardContent className="space-y-4 py-10 text-center">
                <p className="text-muted-foreground">
                  {t('marketplace.operator.detailLoadFailed')}
                </p>
                <Button asChild variant="outline">
                  <Link href="/operator/marketplaces">
                    {t('marketplace.operator.backToConsole')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="operator-marketplace-detail">
      <Header />
      <main className="py-10">
        <Container size="xl">
          <Link
            href="/operator/marketplaces"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('marketplace.operator.backToConsole')}
          </Link>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{marketplace.name}</h1>
                <Badge>{t(MARKETPLACE_LIFECYCLE_STATUS_KEYS[marketplace.status])}</Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                {marketplace.description || t('marketplace.operator.noDescription')}
              </p>
            </div>
            {marketplace.status === 'draft' && (
              <Button onClick={() => void handlePublish()} disabled={Boolean(working)}>
                {working === 'publish' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {t('marketplace.operator.publish')}
              </Button>
            )}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace.operator.publishAndDomains')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  {t('marketplace.operator.discoverability')}:{' '}
                  {t(MARKETPLACE_DISCOVERABILITY_KEYS[marketplace.discoverability])}
                </p>
                <p>
                  {t('marketplace.operator.catalogMode')}:{' '}
                  {t(MARKETPLACE_CATALOG_MODE_KEYS[marketplace.catalogMode])}
                </p>
                {marketplace.domains.map(domain => (
                  <div key={domain.host} className="rounded-md border p-3">
                    <div className="font-medium">{domain.host}</div>
                    <div className="mt-1 text-muted-foreground">
                      {t(MARKETPLACE_DOMAIN_KIND_KEYS[domain.kind])} ·{' '}
                      {t(MARKETPLACE_DOMAIN_VERIFICATION_KEYS[domain.verificationStatus])}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace.operator.storeAdmission')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{t('marketplace.operator.waitingCount', { count: counts.waiting })}</p>
                <p>{t('marketplace.operator.approvedCount', { count: counts.approved })}</p>
                <p className="text-muted-foreground">
                  {t('marketplace.operator.inviteNotApproval')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('marketplace.operator.responsibilityBoundary')}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t('marketplace.operator.responsibilityDesc')}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('marketplace.operator.inviteStore')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={peerID}
                onChange={event => setPeerID(event.target.value)}
                placeholder={t('marketplace.operator.peerIdPlaceholder')}
              />
              <Button
                onClick={() => void handleInvite()}
                disabled={!peerID.trim() || Boolean(working)}
              >
                <Send className="mr-2 h-4 w-4" />
                {t('marketplace.operator.sendInvite')}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{t('marketplace.operator.storeMemberships')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stores.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  {t('marketplace.operator.noStoresYet')}
                </p>
              ) : (
                stores.map(store => {
                  const canApprove = store.status === 'accepted' || store.status === 'applied';
                  return (
                    <div
                      key={store.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {formatUserName({ peerID: store.peerID }, { prefix: 'Store' })}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">
                            {t(MARKETPLACE_MEMBERSHIP_STATUS_KEYS[store.status])}
                          </Badge>
                          {store.isVisible && (
                            <span className="text-xs text-muted-foreground">
                              {t('marketplace.operator.catalogVisible')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {canApprove && (
                          <Button
                            size="sm"
                            onClick={() => void handleReview(store, 'approved')}
                            disabled={Boolean(working)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            {t('marketplace.operator.approve')}
                          </Button>
                        )}
                        {store.status !== 'rejected' && store.status !== 'left' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void handleReview(
                                store,
                                store.status === 'approved' ? 'suspended' : 'rejected'
                              )
                            }
                            disabled={Boolean(working)}
                          >
                            {store.status === 'approved'
                              ? t('marketplace.operator.suspend')
                              : t('marketplace.operator.reject')}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
