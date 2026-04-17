'use client';

/**
 * My Stores console — Phase MS1.2
 *
 * Lists every store the authenticated user can manage (hosted + self-hosted).
 * Backend: GET /platform/v1/stores/my  (see packages/core/services/api/myStores.ts)
 *
 * Gating:
 *   - Route requires authentication. Unauthenticated users see a sign-in prompt
 *     instead of a redirect, matching the /me pattern.
 *   - Visibility of this whole route in nav menus is gated by the
 *     `multistoreMyStoresUI` feature flag — that wiring lives in MS1.2c.
 *
 * TECHDEBT(TD-049): inline empty-state + card markup. Extract a reusable
 * `StoreCard` when MS1.2b grows (e.g. MS-Phase-3 adds staff/role chips).
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useI18n,
  useUserStore,
  myStoresApi,
  useFeatureFlags,
  isHosted,
  startCasdoorLogin,
  type MyStoreItem,
  type StoreConnectivity,
  type StoreNodeType,
} from '@mobazha/core';
import { Header, Footer, MobilePageHeader } from '@/components';
import { Container } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Store,
  Plus,
  Link2,
  ExternalLink,
  Wifi,
  WifiOff,
  RefreshCw,
  LogIn,
  AlertCircle,
  ChevronRight,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MyStoresPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, isLoading: userLoading } = useUserStore();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();

  // Kill-switch honored server-side, but we short-circuit the UI too so we
  // don't show a stale "My Stores" page while the backend returns an empty list.
  const featureOn = isEnabled('multistoreMyStoresUI', 'killMultistoreReadsDisabled');

  const handleLogin = useCallback(() => {
    if (isHosted()) {
      startCasdoorLogin();
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MobilePageHeader
        title={t('stores.console.title', { defaultValue: 'My Stores' })}
        onBack={() => router.push('/me')}
      />

      <main className="py-4 sm:py-8">
        <Container size="lg">
          {userLoading || (isAuthenticated && flagsLoading) ? (
            <PageSkeleton />
          ) : !isAuthenticated ? (
            <UnauthenticatedState onLogin={handleLogin} />
          ) : !featureOn ? (
            <FeatureDisabledState />
          ) : (
            <AuthenticatedContent />
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Authenticated content: loads /platform/v1/stores/my and renders list / empty.
// ---------------------------------------------------------------------------

function AuthenticatedContent() {
  const { t } = useI18n();
  const router = useRouter();

  const [stores, setStores] = useState<MyStoreItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const list = await myStoresApi.getMyStores();
      setStores(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load('initial');
  }, [load]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="py-12">
        <EmptyState
          icon={AlertCircle}
          title={t('stores.console.loadError', {
            defaultValue: 'Could not load your stores. Please try again.',
          })}
          description={error}
          action={{
            label: t('stores.console.retry', { defaultValue: 'Retry' }),
            onClick: () => {
              void load('initial');
            },
          }}
        />
      </div>
    );
  }

  const list = stores ?? [];

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title={t('stores.console.emptyTitle', { defaultValue: 'No stores yet' })}
        description={t('stores.console.emptyDescription', {
          defaultValue:
            'Create a hosted store on Mobazha or connect a self-hosted node you already run.',
        })}
        action={{
          label: t('stores.console.createHosted', { defaultValue: 'Create a hosted store' }),
          onClick: () => router.push('/onboarding'),
        }}
        secondaryAction={{
          label: t('stores.console.claimStandalone', {
            defaultValue: 'Connect a self-hosted store',
          }),
          onClick: () => router.push('/settings/account'),
        }}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <ListHeader
        total={list.length}
        refreshing={refreshing}
        onRefresh={() => {
          void load('refresh');
        }}
      />

      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {list.map(store => (
          <StoreCard key={store.peer_id} store={store} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button variant="default" onClick={() => router.push('/onboarding')} className="gap-2">
          <Plus className="w-4 h-4" />
          {t('stores.console.createHosted', { defaultValue: 'Create a hosted store' })}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/settings/account')}
          className="gap-2"
        >
          <Link2 className="w-4 h-4" />
          {t('stores.console.claimStandalone', { defaultValue: 'Connect a self-hosted store' })}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header with count + refresh
// ---------------------------------------------------------------------------

function ListHeader({
  total,
  refreshing,
  onRefresh,
}: {
  total: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  const countLabel =
    total === 1
      ? t('stores.console.totalCount', { count: total, defaultValue: '{{count}} store' })
      : t('stores.console.totalCount_plural', {
          count: total,
          defaultValue: '{{count}} stores',
        });

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold hidden lg:block">
          {t('stores.console.title', { defaultValue: 'My Stores' })}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 hidden lg:block">
          {t('stores.console.subtitle', {
            defaultValue: 'Manage every store you operate — hosted on Mobazha or on your own VPS.',
          })}
        </p>
        <p className="text-xs text-muted-foreground lg:mt-2">{countLabel}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        className="gap-2 flex-shrink-0"
      >
        <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        <span className="hidden sm:inline">
          {t('stores.console.refresh', { defaultValue: 'Refresh' })}
        </span>
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Store card
// ---------------------------------------------------------------------------

function StoreCard({ store }: { store: MyStoreItem }) {
  const { t } = useI18n();

  const displayName = store.store_name?.trim() || truncatePeerID(store.peer_id);
  const typeLabel = t(`stores.console.nodeType.${store.node_type}`, {
    defaultValue: store.node_type === 'saas' ? 'Hosted' : 'Self-hosted',
  });
  const statusLabel = t(`stores.console.status.${store.status}`, {
    defaultValue: capitalize(store.status),
  });

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5',
        'bg-card rounded-xl border border-border',
        'hover:border-primary/30 hover:shadow-sm transition-all'
      )}
    >
      {/* Icon + identity */}
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className={cn(
            'w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center flex-shrink-0',
            store.node_type === 'saas'
              ? 'bg-primary/10 text-primary'
              : 'bg-secondary text-secondary-foreground'
          )}
        >
          {store.node_type === 'saas' ? (
            <Store className="w-6 h-6" />
          ) : (
            <Server className="w-6 h-6" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold truncate text-base">{displayName}</h3>
            <NodeTypeBadge type={store.node_type} label={typeLabel} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate font-mono">
            {truncatePeerID(store.peer_id)}
          </p>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <ConnectivityChip isOnline={store.is_online} connectivity={store.connectivity} />
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                store.status === 'active'
                  ? 'bg-muted text-muted-foreground'
                  : store.status === 'suspended'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {statusLabel}
            </span>
            {store.domain && (
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {store.domain}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {store.last_active_at
              ? t('stores.console.lastActive', {
                  when: formatRelativeTime(store.last_active_at),
                  defaultValue: `Last active ${formatRelativeTime(store.last_active_at)}`,
                })
              : t('stores.console.neverActive', { defaultValue: 'Never connected' })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:justify-center">
        <Link
          href={`/store/${store.peer_id}`}
          className="flex-1 sm:flex-none"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="sm" className="w-full gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            {t('stores.console.open', { defaultValue: 'Open storefront' })}
          </Button>
        </Link>
        <Link
          href={buildManageHref(store)}
          className="flex-1 sm:flex-none"
          {...(store.node_type === 'standalone' && store.endpoint_url
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          <Button variant="default" size="sm" className="w-full gap-1.5">
            {t('stores.console.manage', { defaultValue: 'Manage' })}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function NodeTypeBadge({ type, label }: { type: StoreNodeType; label: string }) {
  return (
    <span
      className={cn(
        'text-[11px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded border',
        type === 'saas'
          ? 'bg-primary/5 text-primary border-primary/20'
          : 'bg-muted text-muted-foreground border-border'
      )}
    >
      {label}
    </span>
  );
}

function ConnectivityChip({
  isOnline,
  connectivity,
}: {
  isOnline: boolean;
  connectivity: StoreConnectivity;
}) {
  const { t } = useI18n();

  if (!isOnline) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <WifiOff className="w-3.5 h-3.5" />
        {t('stores.console.offline', { defaultValue: 'Offline' })}
      </span>
    );
  }

  const connectivityLabel = t(`stores.console.connectivity.${connectivity}`, {
    defaultValue:
      connectivity === 'public'
        ? 'Online'
        : connectivity === 'tunnel'
          ? 'Online via tunnel'
          : connectivity === 'nat'
            ? 'Reachable'
            : 'Status unknown',
  });

  return (
    <span className="inline-flex items-center gap-1 text-xs text-success">
      <Wifi className="w-3.5 h-3.5" />
      {connectivityLabel}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Empty / gated / unauthenticated states
// ---------------------------------------------------------------------------

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-muted rounded animate-pulse w-40" />
      <div className="space-y-3">
        {[0, 1].map(i => (
          <div key={i} className="h-24 bg-muted/60 rounded-xl border border-border animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function UnauthenticatedState({ onLogin }: { onLogin: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={LogIn}
      title={t('me.notLoggedIn', { defaultValue: 'Not signed in' })}
      description={t('me.loginPrompt', { defaultValue: 'Sign in to manage your stores.' })}
      action={{
        label: t('nav.login', { defaultValue: 'Sign in' }),
        onClick: onLogin,
      }}
    />
  );
}

function FeatureDisabledState() {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <EmptyState
      icon={AlertCircle}
      title={t('stores.console.emptyTitle', { defaultValue: 'My Stores is not available yet' })}
      description={t('stores.console.subtitle', {
        defaultValue: 'Manage every store you operate — hosted on Mobazha or on your own VPS.',
      })}
      action={{
        label: t('nav.back', { defaultValue: 'Back' }),
        onClick: () => router.push('/me'),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function truncatePeerID(peerID: string): string {
  if (!peerID) return '';
  if (peerID.length <= 16) return peerID;
  return `${peerID.slice(0, 10)}…${peerID.slice(-6)}`;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function buildManageHref(store: MyStoreItem): string {
  // Self-hosted nodes manage via their own admin URL when known.
  if (store.node_type === 'standalone' && store.endpoint_url) {
    const base = store.endpoint_url.replace(/\/+$/, '');
    return `${base}/settings`;
  }
  // Hosted stores manage inside the unified app.
  return `/settings/store?peerID=${encodeURIComponent(store.peer_id)}`;
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
