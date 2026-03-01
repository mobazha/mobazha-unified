'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n, useCurrency, discountsApi } from '@mobazha/core';
import type { Discount } from '@mobazha/core';
import {
  Tag,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  Clock,
  Archive,
  FileText,
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
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  active: { icon: Zap, variant: 'success' as const, labelKey: 'admin.discounts.statusActive' },
  scheduled: {
    icon: Clock,
    variant: 'warning' as const,
    labelKey: 'admin.discounts.statusScheduled',
  },
  expired: {
    icon: Archive,
    variant: 'secondary' as const,
    labelKey: 'admin.discounts.statusExpired',
  },
  draft: { icon: FileText, variant: 'outline' as const, labelKey: 'admin.discounts.statusDraft' },
};

function formatDiscountValueLabel(d: Discount): string {
  switch (d.valueType) {
    case 'percentage':
      return d.maxDiscountAmount
        ? `${d.value}% OFF (max ${d.currency} ${d.maxDiscountAmount})`
        : `${d.value}% OFF`;
    case 'fixed_amount':
      return `${d.currency} ${d.value} OFF`;
    case 'free_shipping':
      return 'Free Shipping';
    default:
      return '';
  }
}

function usageLabel(d: Discount): string {
  if (d.usageLimit > 0) {
    return `${d.usageCount}/${d.usageLimit}`;
  }
  return `${d.usageCount}`;
}

export default function AdminDiscountsPage() {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const router = useRouter();
  const { toast } = useToast();

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDiscounts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await discountsApi.listDiscounts(1, 100);
      setDiscounts(res.data || []);
    } catch {
      toast({ variant: 'destructive', title: t('admin.discounts.fetchError') });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await discountsApi.deleteDiscount(deleteTarget);
      setDiscounts(prev => prev.filter(d => d.id !== deleteTarget));
      toast({ title: t('admin.discounts.deleted') });
    } catch {
      toast({ variant: 'destructive', title: t('admin.discounts.deleteError') });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, t, toast]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return discounts;
    const q = searchQuery.toLowerCase();
    return discounts.filter(
      d => d.title.toLowerCase().includes(q) || d.codes?.some(c => c.code.toLowerCase().includes(q))
    );
  }, [discounts, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, Discount[]> = {
      active: [],
      scheduled: [],
      expired: [],
      draft: [],
    };
    for (const d of filtered) {
      const key = d.status in groups ? d.status : 'draft';
      groups[key].push(d);
    }
    return groups;
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-discounts-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {t('admin.discounts.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.discounts.subtitle', { count: discounts.length })}
          </p>
        </div>
        <Button
          onClick={() => router.push('/admin/discounts/new')}
          data-testid="create-discount-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.discounts.create')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('admin.discounts.searchPlaceholder')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty state */}
      {discounts.length === 0 ? (
        <div className="text-center py-16">
          <Tag className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('admin.discounts.emptyTitle')}
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            {t('admin.discounts.emptyDescription')}
          </p>
          <Button onClick={() => router.push('/admin/discounts/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('admin.discounts.create')}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {(['active', 'scheduled', 'draft', 'expired'] as const).map(status => {
            const items = grouped[status];
            if (!items?.length) return null;
            const config = STATUS_CONFIG[status];
            const StatusIcon = config.icon;

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <StatusIcon className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t(config.labelKey)} ({items.length})
                  </h2>
                </div>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {items.map(d => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-foreground truncate">{d.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDiscountValueLabel(d)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {d.method === 'code' && d.codes?.length ? (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                              {d.codes[0].code}
                              {d.codes.length > 1 && ` +${d.codes.length - 1}`}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-xs py-0">
                              {t('admin.discounts.automatic')}
                            </Badge>
                          )}
                          <span>
                            {t('admin.discounts.usageCount')}: {usageLabel(d)}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-w-[44px] min-h-[44px] shrink-0"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => router.push(`/admin/discounts/${d.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(d.id)}
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
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.discounts.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.discounts.deleteConfirmDescription')}
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
