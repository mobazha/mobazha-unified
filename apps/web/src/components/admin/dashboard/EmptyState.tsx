import React from 'react';
import Link from 'next/link';
import { Package, Plus, ArrowRight } from 'lucide-react';
import { useI18n } from '@mobazha/core';

export function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
        <Package className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        {t('admin.dashboard.emptyTitle')}
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {t('admin.dashboard.emptyDescription')}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/listing/new?from=admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('admin.dashboard.createFirstProduct')}
        </Link>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
        >
          {t('admin.dashboard.setupStore')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
