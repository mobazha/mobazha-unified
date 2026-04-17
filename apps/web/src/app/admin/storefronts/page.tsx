'use client';

/**
 * Admin → Storefronts list page (MS-Phase-2a · MS2a.4).
 *
 * Lists all storefronts for the authenticated owner's default node, split
 * into Default / Active / Archived groups. Rendering is gated behind the
 * `storefrontsEnabled` feature flag; when the flag is off we render a
 * banner pointing at the platform admin.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useI18n,
  useUserStore,
  useFeatureFlags,
  storefrontsLiteApi,
  DEFAULT_STOREFRONT_ID,
} from '@mobazha/core';
import type { Storefront, StorefrontVisibility } from '@mobazha/core';
import {
  Archive,
  Home,
  Layers,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Store,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

type TKey = (key: string, params?: Record<string, string | number>) => string;

function visibilityLabel(v: StorefrontVisibility, t: TKey): string {
  switch (v) {
    case 'public':
      return t('admin.storefronts.visibilityPublic');
    case 'unlisted':
      return t('admin.storefronts.visibilityUnlisted');
    case 'private':
      return t('admin.storefronts.visibilityPrivate');
    default:
      return v;
  }
}

function visibilityVariant(v: StorefrontVisibility): 'default' | 'secondary' | 'outline' {
  switch (v) {
    case 'public':
      return 'default';
    case 'unlisted':
      return 'secondary';
    case 'private':
      return 'outline';
    default:
      return 'outline';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export default function AdminStorefrontsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useUserStore();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();

  const peerID = profile?.peerID ?? '';
  const storefrontsEnabled = isEnabled('storefrontsEnabled', 'killStorefrontRoutingDisabled');

  const [list, setList] = useState<Storefront[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Storefront | null>(null);
  const [archiving, setArchiving] = useState(false);

  const fetchStorefronts = useCallback(async () => {
    if (!peerID) return;
    try {
      setLoading(true);
      const res = await storefrontsLiteApi.listStorefronts(peerID);
      setList(Array.isArray(res) ? res : []);
    } catch {
      toast({
        variant: 'destructive',
        title: t('admin.storefronts.fetchError'),
      });
    } finally {
      setLoading(false);
    }
  }, [peerID, t, toast]);

  useEffect(() => {
    if (!flagsLoading && storefrontsEnabled && peerID) {
      void fetchStorefronts();
    } else if (!flagsLoading && !storefrontsEnabled) {
      setLoading(false);
    }
  }, [flagsLoading, storefrontsEnabled, peerID, fetchStorefronts]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        (s.slug ?? '').toLowerCase().includes(q)
    );
  }, [list, searchQuery]);

  const { defaults, actives, archived } = useMemo(() => {
    const d: Storefront[] = [];
    const a: Storefront[] = [];
    const ar: Storefront[] = [];
    for (const sf of filtered) {
      if (sf.archived_at) ar.push(sf);
      else if (sf.is_default || sf.id === DEFAULT_STOREFRONT_ID) d.push(sf);
      else a.push(sf);
    }
    return { defaults: d, actives: a, archived: ar };
  }, [filtered]);

  const handleArchive = useCallback(async () => {
    if (!archiveTarget || !peerID) return;
    if (archiveTarget.is_default || archiveTarget.id === DEFAULT_STOREFRONT_ID) {
      toast({
        variant: 'destructive',
        title: t('admin.storefronts.defaultArchiveError'),
      });
      setArchiveTarget(null);
      return;
    }
    try {
      setArchiving(true);
      await storefrontsLiteApi.archiveStorefront(peerID, archiveTarget.id);
      toast({ title: t('admin.storefronts.archived') });
      setArchiveTarget(null);
      await fetchStorefronts();
    } catch {
      toast({
        variant: 'destructive',
        title: t('admin.storefronts.archiveError'),
      });
    } finally {
      setArchiving(false);
    }
  }, [archiveTarget, peerID, fetchStorefronts, t, toast]);

  if (flagsLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!storefrontsEnabled) {
    return (
      <div className="space-y-6" data-testid="admin-storefronts-disabled">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.storefronts.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.storefronts.subtitle')}</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <Store className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('admin.storefronts.comingSoonHint')}
          </p>
        </div>
      </div>
    );
  }

  const totalActive = defaults.length + actives.length;

  return (
    <div className="space-y-6" data-testid="admin-storefronts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.storefronts.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.storefronts.subtitle')}</p>
        </div>
        <Button
          onClick={() => router.push('/admin/storefronts/new')}
          data-testid="create-storefront-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.storefronts.create')}
        </Button>
      </div>

      {/* Search */}
      {totalActive + archived.length > 1 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.storefronts.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Default */}
      {defaults.length > 0 && (
        <StorefrontGroup
          label={t('admin.storefronts.defaultGroupLabel')}
          icon={<Home className="w-4 h-4 text-muted-foreground" />}
          items={defaults}
          onEdit={sfID => router.push(`/admin/storefronts/${encodeURIComponent(sfID)}`)}
          t={t}
        />
      )}

      {/* Active custom */}
      {actives.length > 0 ? (
        <StorefrontGroup
          label={t('admin.storefronts.activeGroupLabel')}
          icon={<Store className="w-4 h-4 text-muted-foreground" />}
          items={actives}
          onEdit={sfID => router.push(`/admin/storefronts/${encodeURIComponent(sfID)}`)}
          onArchive={setArchiveTarget}
          t={t}
        />
      ) : (
        totalActive === defaults.length &&
        archived.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-lg">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t('admin.storefronts.emptyTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {t('admin.storefronts.emptyDescription')}
            </p>
            <Button onClick={() => router.push('/admin/storefronts/new')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('admin.storefronts.create')}
            </Button>
          </div>
        )
      )}

      {/* Archived */}
      {archived.length > 0 && (
        <StorefrontGroup
          label={t('admin.storefronts.archivedGroupLabel')}
          icon={<Archive className="w-4 h-4 text-muted-foreground" />}
          items={archived}
          onEdit={sfID => router.push(`/admin/storefronts/${encodeURIComponent(sfID)}`)}
          t={t}
          archived
        />
      )}

      {/* Archive confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={open => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.storefronts.archiveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.storefronts.archiveDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('admin.storefronts.archiveConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface StorefrontGroupProps {
  label: string;
  icon: React.ReactNode;
  items: Storefront[];
  onEdit: (sfID: string) => void;
  onArchive?: (sf: Storefront) => void;
  t: TKey;
  archived?: boolean;
}

function StorefrontGroup({
  label,
  icon,
  items,
  onEdit,
  onArchive,
  t,
  archived = false,
}: StorefrontGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {label} ({items.length})
        </h2>
      </div>
      <div className="border border-border rounded-lg divide-y divide-border">
        {items.map(sf => {
          const isDefault = sf.is_default || sf.id === DEFAULT_STOREFRONT_ID;
          return (
            <div
              key={sf.id}
              className={[
                'flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors',
                archived ? 'opacity-70' : 'cursor-pointer',
              ].join(' ')}
              onClick={archived ? undefined : () => onEdit(sf.id)}
              data-testid={`storefront-row-${sf.id}`}
            >
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                {isDefault ? (
                  <Home className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Store className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <span className="font-medium text-foreground truncate">{sf.name}</span>
                  {isDefault && (
                    <Badge variant="secondary" className="text-xs py-0">
                      {t('admin.storefronts.defaultBadge')}
                    </Badge>
                  )}
                  <Badge variant={visibilityVariant(sf.visibility)} className="text-xs py-0">
                    {visibilityLabel(sf.visibility, t)}
                  </Badge>
                  {archived && (
                    <Badge variant="outline" className="text-xs py-0">
                      {t('admin.storefronts.archivedBadge')}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono truncate">{sf.id}</span>
                  {sf.slug ? (
                    <span className="truncate">
                      {t('admin.storefronts.slugLabel')}: {sf.slug}
                    </span>
                  ) : (
                    <span className="italic">{t('admin.storefronts.noSlug')}</span>
                  )}
                  {sf.theme?.base && (
                    <span>
                      {t('admin.storefronts.themeLabel')}: {sf.theme.base}
                    </span>
                  )}
                  <span>
                    {t('admin.storefronts.createdAt', { date: formatDate(sf.created_at) })}
                  </span>
                </div>
              </div>

              {!archived && (onArchive || isDefault) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-w-[36px] min-h-[36px] shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                      onClick={e => {
                        e.stopPropagation();
                        onEdit(sf.id);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('common.edit')}
                    </DropdownMenuItem>
                    {!isDefault && onArchive && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation();
                            onArchive(sf);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          {t('admin.storefronts.archive')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
