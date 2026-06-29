'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MARKETPLACE_LIFECYCLE_STATUS_KEYS,
  useI18n,
  useMyOperatorMarketplaces,
} from '@mobazha/core';
import { Header, Footer } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, Loader2, Plus } from 'lucide-react';

export default function MarketplaceOperatorPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const { marketplaces, loading, loadFailed, refresh, create } = useMyOperatorMarketplaces();
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [vertical, setVertical] = useState('general');
  const [subdomain, setSubdomain] = useState('');

  async function createMarketplace() {
    if (!name.trim()) return;
    try {
      setCreating(true);
      const created = await create({
        name: name.trim(),
        vertical: vertical.trim() || 'general',
        subdomain: subdomain.trim() || undefined,
        catalogMode: 'curated',
        sellerEntryMode: 'operator_invited',
      });
      router.push(`/operator/marketplaces/${encodeURIComponent(created.id)}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('marketplace.operator.createFailedTitle'),
        description: error instanceof Error ? error.message : t('common.retry'),
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-background" data-testid="operator-marketplaces-page">
      <Header />
      <main className="py-10">
        <Container size="xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">{t('marketplace.operator.badge')}</p>
              <h1 className="mt-1 text-3xl font-bold">{t('marketplace.operator.listTitle')}</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {t('marketplace.operator.listSubtitle')}
              </p>
            </div>
            <Button onClick={() => setShowCreate(value => !value)}>
              <Plus className="mr-2 h-4 w-4" /> {t('marketplace.operator.createCta')}
            </Button>
          </div>

          {showCreate && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>{t('marketplace.operator.createDraftTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <Input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder={t('marketplace.operator.namePlaceholder')}
                />
                <Input
                  value={vertical}
                  onChange={event => setVertical(event.target.value)}
                  placeholder={t('marketplace.operator.verticalPlaceholder')}
                />
                <Input
                  value={subdomain}
                  onChange={event => setSubdomain(event.target.value)}
                  placeholder={t('marketplace.operator.subdomainPlaceholder')}
                />
                <div className="md:col-span-3 flex justify-end">
                  <Button
                    disabled={!name.trim() || creating}
                    onClick={() => void createMarketplace()}
                  >
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('marketplace.operator.createAndConfigure')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 grid gap-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : loadFailed ? (
              <Card>
                <CardContent className="space-y-4 py-14 text-center">
                  <p className="font-medium">{t('marketplace.operator.loadFailedTitle')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('marketplace.operator.loadFailedDesc')}
                  </p>
                  <Button variant="outline" onClick={() => void refresh()}>
                    {t('common.retry')}
                  </Button>
                </CardContent>
              </Card>
            ) : marketplaces.length === 0 ? (
              <Card>
                <CardContent className="py-14 text-center">
                  <p className="font-medium">{t('marketplace.operator.emptyTitle')}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('marketplace.operator.emptyDesc')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              marketplaces.map(marketplace => (
                <button
                  key={marketplace.id}
                  className="text-left"
                  onClick={() =>
                    router.push(`/operator/marketplaces/${encodeURIComponent(marketplace.id)}`)
                  }
                >
                  <Card className="transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center justify-between gap-4 py-5">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="font-semibold">{marketplace.name}</h2>
                          <Badge variant="outline">
                            {t(MARKETPLACE_LIFECYCLE_STATUS_KEYS[marketplace.status])}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {marketplace.slug} · {marketplace.vertical} ·{' '}
                          {t('marketplace.operator.domainCount', {
                            count: marketplace.domains.length,
                          })}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </button>
              ))
            )}
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
