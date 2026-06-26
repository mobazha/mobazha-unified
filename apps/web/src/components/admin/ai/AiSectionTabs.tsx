'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n, useFeature, getAdminAiModelsPath } from '@mobazha/core';
import { ArrowLeft, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiWorkspaceStatus } from '@/components/admin/workspace/useAiWorkspaceStatus';

export type AiSectionTab = 'workspace' | 'connect' | 'models';

function tabFromPathname(pathname: string): AiSectionTab {
  if (pathname.startsWith('/admin/ai/models')) return 'models';
  if (pathname.startsWith('/admin/ai/connect')) return 'connect';
  return 'workspace';
}

export function AiSectionTabs() {
  const { t } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = tabFromPathname(pathname);
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const aiModelsPath = getAdminAiModelsPath(aiWorkspaceEnabled);
  const { available: aiAvailable, loading: aiStatusLoading } = useAiWorkspaceStatus();
  const showModelsPending = !aiStatusLoading && !aiAvailable;

  const fromSettings = searchParams.get('from') === 'settings';
  const backHref = fromSettings ? '/admin/settings' : '/admin/ai/workspace';
  const backLabel = fromSettings ? t('admin.settings.title') : t('admin.ai.tabs.backToWorkspace');

  const tabs: {
    id: Exclude<AiSectionTab, 'models'>;
    href: string;
    label: string;
    hint?: string;
  }[] = [
    {
      id: 'workspace',
      href: '/admin/ai/workspace',
      label: t('admin.ai.tabs.workspace'),
      hint: t('admin.ai.tabs.workspaceHint'),
    },
    {
      id: 'connect',
      href: '/admin/ai/connect',
      label: t('admin.ai.tabs.connect'),
      hint: t('admin.ai.tabs.connectHint'),
    },
  ];

  const activeTab = tabs.find(tab => tab.id === active);

  if (active === 'models') {
    return (
      <div className="mb-6 sm:mb-8" data-testid="admin-ai-section-tabs">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 min-h-[44px] sm:min-h-0"
          data-testid="admin-ai-settings-back"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {backLabel}
        </Link>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">
            {fromSettings ? t('admin.settings.aiModelsCard') : t('admin.ai.tabs.settings')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">{t('admin.ai.tabs.modelsHint')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 sm:mb-8" data-testid="admin-ai-section-tabs">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div
          className="flex gap-1 p-1 rounded-lg bg-muted/50 border border-border w-full sm:w-fit overflow-x-auto"
          role="tablist"
        >
          {tabs.map(tab => (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={active === tab.id}
              data-testid={`admin-ai-tab-${tab.id}`}
              className={cn(
                'px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap min-h-[44px] sm:min-h-0 flex items-center shrink-0',
                active === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <Link
          href={aiModelsPath}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] sm:min-h-9 px-3 rounded-md border border-border bg-background shrink-0"
          data-testid="admin-ai-settings-link"
        >
          <Settings className="h-4 w-4" />
          {t('admin.ai.tabs.settings')}
          {showModelsPending && (
            <span
              className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"
              aria-label={t('admin.ai.tabs.modelsPending')}
            />
          )}
        </Link>
      </div>
      {activeTab?.hint && (
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl">{activeTab.hint}</p>
      )}
    </div>
  );
}
