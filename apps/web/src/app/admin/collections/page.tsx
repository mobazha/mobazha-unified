'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n, collectionsApi, getImageUrl } from '@mobazha/core';
import type { Collection } from '@mobazha/core';
import {
  Layers,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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

export default function AdminCollectionsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await collectionsApi.listCollections(1, 100);
      setCollections(res.data || []);
    } catch {
      toast({ variant: 'destructive', title: t('admin.collections.fetchError') });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await collectionsApi.deleteCollection(deleteTarget);
      setCollections(prev => prev.filter(c => c.id !== deleteTarget));
      toast({ title: t('admin.collections.deleted') });
    } catch {
      toast({ variant: 'destructive', title: t('admin.collections.deleteError') });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, t, toast]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const q = searchQuery.toLowerCase();
    return collections.filter(c => c.title.toLowerCase().includes(q));
  }, [collections, searchQuery]);

  const { published, unpublished } = useMemo(() => {
    const pub: Collection[] = [];
    const unpub: Collection[] = [];
    for (const c of filtered) {
      if (c.published) pub.push(c);
      else unpub.push(c);
    }
    return { published: pub, unpublished: unpub };
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-collections-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.collections.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.collections.subtitle', { count: collections.length })}
          </p>
        </div>
        <Button
          onClick={() => router.push('/admin/collections/new')}
          data-testid="create-collection-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.collections.create')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('admin.collections.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty state */}
      {collections.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('admin.collections.emptyTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {t('admin.collections.emptyDescription')}
          </p>
          <Button onClick={() => router.push('/admin/collections/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('admin.collections.create')}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Published collections */}
          {published.length > 0 && (
            <CollectionGroup
              label={t('admin.collections.publishedLabel')}
              icon={<Eye className="w-4 h-4 text-muted-foreground" />}
              items={published}
              onEdit={id => router.push(`/admin/collections/${id}`)}
              onDelete={setDeleteTarget}
              t={t}
            />
          )}

          {/* Unpublished collections */}
          {unpublished.length > 0 && (
            <CollectionGroup
              label={t('admin.collections.unpublishedLabel')}
              icon={<EyeOff className="w-4 h-4 text-muted-foreground" />}
              items={unpublished}
              onEdit={id => router.push(`/admin/collections/${id}`)}
              onDelete={setDeleteTarget}
              t={t}
            />
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.collections.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.collections.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CollectionGroupProps {
  label: string;
  icon: React.ReactNode;
  items: Collection[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function CollectionGroup({ label, icon, items, onEdit, onDelete, t }: CollectionGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {label} ({items.length})
        </h2>
      </div>
      <div className="border border-border rounded-lg divide-y divide-border">
        {items.map(c => (
          <div
            key={c.id}
            className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onEdit(c.id)}
          >
            {c.image ? (
              <img
                src={getImageUrl(c.image)}
                alt={c.title}
                className="w-10 h-10 rounded-md object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-foreground truncate">{c.title}</span>
                {c.published && (
                  <Badge variant="secondary" className="text-xs py-0">
                    {t('admin.collections.publishedLabel')}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {t('admin.collections.productsCount', {
                  count: c.products?.length ?? 0,
                })}
              </span>
            </div>

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
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(c.id);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );
}
