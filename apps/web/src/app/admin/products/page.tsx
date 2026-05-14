'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  useI18n,
  useCurrency,
  getImageUrl,
  useFeature,
  fulfillmentApi,
  FULFILLMENT_PROVIDERS,
} from '@mobazha/core';
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
  Compass,
  ChevronDown,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductImageNative } from '@/components/ui/product-image';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { usePlatform } from '@mobazha/ui/hooks';

type ViewMode = 'table' | 'grid';
type StatusFilter = 'all' | 'active' | 'draft';

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
  const { formatPrice, fromMinimalUnit } = useCurrency();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isEmbeddedApp } = usePlatform();
  const supplyChainEnabled = useFeature('supplyChainEnabled');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncedSlugs, setSyncedSlugs] = useState<Map<string, string>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
      toast({
        title: t('common.error'),
        description: t('common.loadFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!supplyChainEnabled) return;
    (async () => {
      const map = new Map<string, string>();
      for (const p of FULFILLMENT_PROVIDERS) {
        try {
          const synced = await fulfillmentApi.getSyncedProducts(p.id);
          for (const sp of synced) {
            map.set(sp.listingSlug, p.name);
          }
        } catch {
          // provider might not be connected
        }
      }
      setSyncedSlugs(map);
    })();
  }, [supplyChainEnabled]);

  const getEffectiveStatus = useCallback((p: ProductListItem) => p.status ?? 'published', []);

  const filtered = useMemo(() => {
    let result = products;
    if (statusFilter === 'active') {
      result = result.filter(p => getEffectiveStatus(p) === 'published');
    } else if (statusFilter === 'draft') {
      result = result.filter(p => getEffectiveStatus(p) === 'draft');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, searchQuery, statusFilter, getEffectiveStatus]);

  const statusCounts = useMemo(() => {
    const active = products.filter(p => getEffectiveStatus(p) === 'published').length;
    const draft = products.filter(p => getEffectiveStatus(p) === 'draft').length;
    return { all: products.length, active, draft };
  }, [products, getEffectiveStatus]);

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
    if (deleted.size > 0) {
      toast({
        title: t('common.success'),
        description: t('listing.deleteSuccess'),
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

  function renderPrice(price: {
    amount?: number;
    currency?: { code?: string; divisibility?: number };
    currencyCode?: string;
  }): string {
    if (!price.amount) return '—';
    const code = price.currency?.code || price.currencyCode || 'USD';
    const standardAmount = fromMinimalUnit(price.amount, code);
    return formatPrice(standardAmount, code);
  }

  function fulfillmentBadge(slug: string) {
    const provider = syncedSlugs.get(slug);
    if (!provider) return null;
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        <Package className="w-3 h-3" />
        {provider}
      </span>
    );
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

  function statusBadge(status?: string) {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            {t('admin.products.statusActive')}
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning">
            {t('admin.products.statusDraft')}
          </span>
        );
      case 'private':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
            {t('admin.products.statusPrivate')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success">
            {t('admin.products.statusActive')}
          </span>
        );
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
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => {
          if (!open) setDeleteTarget(null);
        }}
        title={t('admin.products.delete')}
        description={
          deleteTarget?.type === 'bulk'
            ? t('admin.products.bulkDeleteConfirm', { count: selectedSlugs.size })
            : t('admin.products.deleteConfirm')
        }
        confirmLabel={t('admin.products.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />

      {/* Header */}
      <div
        className={`flex items-center justify-between gap-3 ${isEmbeddedApp ? 'mb-2' : 'mb-4 sm:mb-6'}`}
      >
        {!isEmbeddedApp && (
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">
              {t('admin.products.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {t('admin.products.count', { count: products.length })}
            </p>
          </div>
        )}
        {isEmbeddedApp && (
          <p className="text-sm text-muted-foreground">
            {t('admin.products.count', { count: products.length })}
          </p>
        )}
        {products.length > 0 && (
          <div className={isEmbeddedApp ? '' : 'hidden md:block'}>
            {supplyChainEnabled ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2" size={isEmbeddedApp ? 'sm' : 'default'}>
                    <Plus className="w-4 h-4" />
                    {t('admin.products.addProduct')}
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/listing/new?from=admin" className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      {t('admin.products.createNew')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin/sourcing/catalog" className="flex items-center">
                      <Compass className="mr-2 h-4 w-4" />
                      {t('admin.products.sourceFromProvider')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/products/import-gumroad" className="flex items-center">
                      <Download className="mr-2 h-4 w-4" />
                      {t('admin.products.importFromGumroad')}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/listing/new?from=admin">
                <Button className="gap-2" size={isEmbeddedApp ? 'sm' : 'default'}>
                  <Plus className="w-4 h-4" />
                  {t('admin.products.addProduct')}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      <div className={`flex gap-1 ${isEmbeddedApp ? 'mb-2' : 'mb-4'} border-b border-border`}>
        {(['all', 'active', 'draft'] as StatusFilter[]).map(filter => {
          const labels: Record<StatusFilter, string> = {
            all: t('admin.products.filterAll'),
            active: t('admin.products.filterActive'),
            draft: t('admin.products.filterDraft'),
          };
          const count = statusCounts[filter];
          return (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                statusFilter === filter
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}
            >
              {labels[filter]} <span className="text-xs text-muted-foreground ml-1">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className={`flex flex-col sm:flex-row gap-3 ${isEmbeddedApp ? 'mb-3' : 'mb-6'}`}>
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
          <div className="hidden md:flex border border-border rounded-lg overflow-hidden">
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

      {/* Mobile compact card list */}
      {isMobile && filtered.length > 0 && (
        <div className="space-y-2 md:hidden pb-16">
          {filtered.map(product => (
            <div
              key={product.slug}
              className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
            >
              <Checkbox
                checked={selectedSlugs.has(product.slug)}
                onCheckedChange={() => toggleSelect(product.slug)}
                aria-label={t('admin.products.selectProduct', { title: product.title })}
                className="shrink-0"
              />
              <Link
                href={`/listing/edit/${product.slug}?from=admin`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                  <ProductImageNative
                    src={getImageUrl(product.thumbnail?.small)}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-foreground truncate">{product.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-primary">
                      {renderPrice(product.price)}
                    </span>
                    {statusBadge(product.status)}
                    {fulfillmentBadge(product.slug)}
                    {product.quantity !== undefined && product.quantity !== null && (
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          product.quantity === 0
                            ? 'bg-destructive/15 text-destructive'
                            : product.quantity <= 5
                              ? 'bg-warning/15 text-warning'
                              : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {product.quantity === 0 ? t('admin.products.outOfStock') : product.quantity}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <ProductActions
                slug={product.slug}
                onRequestDelete={slug => setDeleteTarget({ type: 'single', slug })}
                deleting={deletingSlug === product.slug}
              />
            </div>
          ))}
        </div>
      )}

      {/* Desktop content */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
            <Package className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchQuery || (products.length > 0 && statusFilter !== 'all')
              ? t('admin.products.noResults')
              : t('admin.products.emptyTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            {searchQuery || (products.length > 0 && statusFilter !== 'all')
              ? t('admin.products.noResultsDesc')
              : t('admin.products.emptyDescription')}
          </p>
          {!searchQuery && products.length === 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/listing/new?from=admin">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t('admin.products.addFirstProduct')}
                </Button>
              </Link>
              {supplyChainEnabled && (
                <Link href="/admin/sourcing/catalog">
                  <Button variant="outline" className="gap-2">
                    <Compass className="w-4 h-4" />
                    {t('admin.products.sourceFromProvider')}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="border border-border rounded-xl overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedSlugs.size === filtered.length && filtered.length > 0}
                      onCheckedChange={() => toggleSelectAll()}
                      aria-label={t('admin.products.selectAll')}
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    {t('admin.products.colProduct')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                    {t('admin.products.colStatus')}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                    {t('admin.products.colType')}
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">
                    {t('admin.products.colStock')}
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
                      <Checkbox
                        checked={selectedSlugs.has(product.slug)}
                        onCheckedChange={() => toggleSelect(product.slug)}
                        aria-label={t('admin.products.selectProduct', { title: product.title })}
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {statusBadge(product.status)}
                        {fulfillmentBadge(product.slug)}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        {contractTypeLabel(product.contractType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(() => {
                        const q = product.quantity;
                        if (q === undefined || q === null)
                          return <span className="text-muted-foreground">—</span>;
                        if (q === 0)
                          return (
                            <span className="text-destructive font-medium">
                              {t('admin.products.outOfStock')}
                            </span>
                          );
                        if (q <= 5) return <span className="text-warning font-medium">{q}</span>;
                        return <span className="text-foreground">{q}</span>;
                      })()}
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
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                <div className="absolute top-2 right-2 transition-opacity opacity-0 group-hover:opacity-100">
                  <ProductActions
                    slug={product.slug}
                    onRequestDelete={slug => setDeleteTarget({ type: 'single', slug })}
                    deleting={deletingSlug === product.slug}
                  />
                </div>
                <div className="absolute top-2 left-2">
                  <Checkbox
                    checked={selectedSlugs.has(product.slug)}
                    onCheckedChange={() => toggleSelect(product.slug)}
                    aria-label={t('admin.products.selectProduct', { title: product.title })}
                  />
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-sm text-foreground truncate">{product.title}</p>
                <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
                  <span className="text-sm font-semibold text-primary">
                    {renderPrice(product.price)}
                  </span>
                  {statusBadge(product.status)}
                  {fulfillmentBadge(product.slug)}
                  {product.quantity !== undefined && product.quantity !== null && (
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        product.quantity === 0
                          ? 'bg-destructive/15 text-destructive'
                          : product.quantity <= 5
                            ? 'bg-warning/15 text-warning'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {product.quantity === 0 ? t('admin.products.outOfStock') : product.quantity}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile FAB — hidden in TMA where the top bar already has Add Product */}
      {products.length > 0 && !isEmbeddedApp && (
        <Link
          href="/listing/new?from=admin"
          className="md:hidden fixed right-4 bottom-24 z-40 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label={t('admin.products.addProduct')}
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}
