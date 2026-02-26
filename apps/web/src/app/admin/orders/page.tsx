'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { ShoppingCart, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function AdminOrdersPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-orders">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.orders.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.orders.subtitle')}</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          {t('admin.orders.export')}
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('admin.orders.searchPlaceholder')} className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            {t('admin.orders.filterAll')}
          </Button>
          <Button variant="ghost" size="sm">
            {t('admin.orders.filterPending')}
          </Button>
          <Button variant="ghost" size="sm">
            {t('admin.orders.filterCompleted')}
          </Button>
        </div>
      </div>

      {/* Empty state */}
      <div className="text-center py-16 border border-dashed border-border rounded-xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
          <ShoppingCart className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {t('admin.orders.emptyTitle')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t('admin.orders.emptyDescription')}
        </p>
      </div>
    </div>
  );
}
