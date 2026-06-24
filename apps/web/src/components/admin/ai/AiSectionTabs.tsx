'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { cn } from '@/lib/utils';
import { useAiWorkspaceStatus } from '@/components/admin/workspace/useAiWorkspaceStatus';

export type AiSectionTab = 'workspace' | 'models' | 'connect';

function tabFromPathname(pathname: string): AiSectionTab {
  if (pathname.startsWith('/admin/ai/models')) return 'models';
  if (pathname.startsWith('/admin/ai/connect')) return 'connect';
  return 'workspace';
}

export function AiSectionTabs() {
  const { t } = useI18n();
  const pathname = usePathname();
  const active = tabFromPathname(pathname);
  const { available: aiAvailable, loading: aiStatusLoading } = useAiWorkspaceStatus();
  const showModelsPending = !aiStatusLoading && !aiAvailable;

  const tabs: { id: AiSectionTab; href: string; label: string; hint?: string }[] = [
    {
      id: 'workspace',
      href: '/admin/ai/workspace',
      label: t('admin.ai.tabs.workspace'),
      hint: t('admin.ai.tabs.workspaceHint'),
    },
    {
      id: 'models',
      href: '/admin/ai/models',
      label: t('admin.ai.tabs.models'),
      hint: t('admin.ai.tabs.modelsHint'),
    },
    {
      id: 'connect',
      href: '/admin/ai/connect',
      label: t('admin.ai.tabs.connect'),
      hint: t('admin.ai.tabs.connectHint'),
    },
  ];

  const activeTab = tabs.find(tab => tab.id === active);

  return (
    <div className="mb-6 sm:mb-8" data-testid="admin-ai-section-tabs">
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
            {tab.id === 'models' && showModelsPending && (
              <span
                className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-amber-500"
                aria-label={t('admin.ai.tabs.modelsPending')}
              />
            )}
          </Link>
        ))}
      </div>
      {activeTab?.hint && (
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-2xl">{activeTab.hint}</p>
      )}
    </div>
  );
}
