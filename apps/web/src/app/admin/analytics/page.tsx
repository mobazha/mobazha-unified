'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { BarChart3 } from 'lucide-react';

export default function AdminAnalyticsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-analytics">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.analytics.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.analytics.subtitle')}</p>
      </div>

      <div className="text-center py-16 border border-dashed border-border rounded-xl">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
          <BarChart3 className="w-7 h-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {t('admin.analytics.comingSoon')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t('admin.analytics.comingSoonDesc')}
        </p>
      </div>
    </div>
  );
}
