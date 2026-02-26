'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n, useCurrency, getImageUrl } from '@mobazha/core';
import { productDataService } from '@mobazha/core';
import type { ProductListItem } from '@mobazha/core';
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
  Grid3X3,
  List,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductImageNative } from '@/components/ui/product-image';
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
import { cn } from '@/lib/utils';

type ViewMode = 'table' | 'grid';

interface ProductActionsProps {
  slug: string;
  onRequestDelete: (slug: string) => void;
  deleting: boolean;
}

function ProductActions({ slug, onRequestDelete, deleting }: ProductActionsProps) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="min-w-[44px] min-h-[44px]">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={() => window.open(`/product/${slug}`, '_blank')}>
          <Eye className="mr-2 h-4 w-4" /> {t('admin.products.preview')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/listing/edit/${slug}?from=admin`)}>
          <Pencil className="mr-2 h-4 w-4" /> {t('admin.products.edit')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/listing/new?duplicate=${slug}&from=admin`)}>
          <Copy className="mr-2 h-4 w-4" /> {t('admin.products.duplicate')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onRequestDelete(slug)}
          disabled={deleting}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t('admin.products.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AdminProductsPage() {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<
    { type: 'single'; slug: string } | { type: 'bulk' } | null
  >(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productDataService.getMyListings();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const executeDelete = useCallback(
    async (slug: string) => {
      setDeletingSlug(slug);
      try {
        await productDataService.deleteListing(slug);
        setProducts(prev => prev.filter(p => p.slug !== slug));
        setSelectedSlugs(prev => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      } catch (err) {
        console.error('Failed to delete:', err);
        toast({
          title: t('common.error'),
          description: t('common.saveFailed'),
          variant: 'destructive',
        });
      } finally {
        setDeletingSlug(null);
      }
    },
    [t, toast]
  );

  const executeBulkDelete = useCallback(async () => {
    const slugs = [...selectedSlugs];
    const failed: string[] = [];
    for (const slug of slugs) {
      try {
        await productDataService.deleteListing(slug);
      } catch (err) {
        console.error(`Failed to delete ${slug}:`, err);
        failed.push(slug);
      }
    }
    const deleted = new Set(slugs.filter(s => !failed.includes(s)));
    setProducts(prev => prev.filter(p => !deleted.has(p.slug)));
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      deleted.forEach(s => next.delete(s));
      return next;
    });
    if (failed.length > 0) {
      toast({
        title: t('common.error'),
        description: t('common.saveFailed'),
        variant: 'destructive',
      });
    }
  }, [selectedSlugs, t, toast]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'single') {
      await executeDelete(deleteTarget.slug);
    } else {
      await executeBulkDelete();
    }
    setDeleteTarget(null);
  }, [deleteTarget, executeDelete, executeBulkDelete]);

  const toggleSelect = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSlugs.size === filtered.length) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(filtered.map(p => p.slug)));
    }
  };

  function renderPrice(price: { amount?: number; currencyCode?: string }): string {
    if (!price.amount) return '—';
    return formatPrice(price.amount, price.currencyCode || 'USD');
  }

  function contractTypeLabel(type?: string): string {
    switch (type) {
      case 'PHYSICAL_GOOD':
        return t('admin.products.typePhysical');
      case 'DIGITAL_GOOD':
        return t('admin.products.typeDigital');
      case 'SERVICE':
        return t('admin.products.typeService');
      case 'CRYPTOCURRENCY':
        return t('admin.products.typeCrypto');
      default:
        return type || '—';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-testid="admin-products">
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.products.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'bulk'
                ? t('admin.products.bulkDeleteConfirm', { count: selectedSlugs.size })
                : t('admin.products.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('admin.products.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.products.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.products.count', { count: products.length })}
          </p>
        </div>
        <Link href="/listing/new?from=admin">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {t('admin.products.addProduct')}
          </Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('admin.products.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 items-center">
          {selectedSlugs.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget({ type: 'bulk' })}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('admin.products.deleteSelected', { count: selectedSlugs.size })}
            </Button>
          )}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'min-w-[44px] min-h-[44px] flex items-center justify-center',
                viewMode === 'table'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
              aria-label={t('admin.products.viewTable')}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'min-w-[44px] min-h-[44px] flex items-center justify-center',
                viewMode === 'grid'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              )}
              aria-label={t('admin.products.viewGrid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery ? t('admin.products.noResults') : t('admin.products.emptyTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            {searchQuery ? t('admin.products.noResultsDesc') : t('admin.products.emptyDescription')}
          </p>
          {!searchQuery && (
            <Link href="/listing/new?from=admin">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {t('admin.products.addFirstProduct')}
              </Button>
            </Link>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSlugs.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('admin.products.colProduct')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                    {t('admin.products.colType')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    {t('admin.products.colPrice')}
                  </th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(product => (
                  <tr key={product.slug} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSlugs.has(product.slug)}
                        onChange={() => toggleSelect(product.slug)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                          <ProductImageNative
                            src={getImageUrl(product.thumbnail?.small)}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                            {product.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        {contractTypeLabel(product.contractType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {renderPrice(product.price)}
                    </td>
                    <td className="px-4 py-3">
                      <ProductActions
                        slug={product.slug}
                        onRequestDelete={slug => setDeleteTarget({ type: 'single', slug })}
                        deleting={deletingSlug === product.slug}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(product => (
            <div
              key={product.slug}
              className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-sm transition-shadow group"
            >
              <div className="aspect-square bg-muted relative">
                <ProductImageNative
                  src={getImageUrl(product.thumbnail?.small)}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ProductActions
                    slug={product.slug}
                    onRequestDelete={slug => setDeleteTarget({ type: 'single', slug })}
                    deleting={deletingSlug === product.slug}
                  />
                </div>
                <div className="absolute top-2 left-2">
                  <input
                    type="checkbox"
                    checked={selectedSlugs.has(product.slug)}
                    onChange={() => toggleSelect(product.slug)}
                    className="rounded border-border w-4 h-4"
                  />
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-foreground truncate">{product.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-primary">
                    {renderPrice(product.price)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {contractTypeLabel(product.contractType)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
