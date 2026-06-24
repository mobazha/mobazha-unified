'use client';

import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { Bot, ChevronRight } from 'lucide-react';

export function AiWorkspaceSetupBanner() {
  const { t } = useI18n();

  return (
    <div
      className="rounded-xl border border-amber-200/70 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5"
      data-testid="ai-workspace-setup-banner"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
              {t('admin.workspace.setupBannerTitle')}
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-1">
              {t('admin.workspace.setupBannerDesc')}
            </p>
          </div>
        </div>
        <Link
          href="/admin/ai/models"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0 min-h-[44px] sm:min-h-0"
        >
          {t('admin.workspace.setupBannerCta')}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
