'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useI18n, useFeature } from '@mobazha/core';
import { Bell, Webhook, Sparkles, Package } from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationChannelsSection } from './NotificationChannelsSection';
import { WebhookSection } from './WebhookSection';
import { AIConfigSection } from './AIConfigSection';
import { FulfillmentProvidersSection } from './FulfillmentProvidersSection';

const VALID_TABS = ['notifications', 'ai', 'fulfillment', 'webhooks'] as const;
type TabValue = (typeof VALID_TABS)[number];

const isSovereign = typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__;

function resolveTab(
  param: string | null,
  supplyChainEnabled: boolean,
  aiWorkspaceEnabled: boolean
): TabValue {
  if (param && (VALID_TABS as readonly string[]).includes(param)) {
    if (param === 'ai' && aiWorkspaceEnabled) return 'notifications';
    if (param === 'notifications' && isSovereign) return 'ai';
    if (param === 'fulfillment' && !supplyChainEnabled) return isSovereign ? 'ai' : 'notifications';
    if (param === 'webhooks' && isSovereign) return 'ai';
    return param as TabValue;
  }
  return isSovereign ? 'ai' : 'notifications';
}

export default function AdminIntegrationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const supplyChainEnabled = useFeature('supplyChainEnabled');
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const searchParams = useSearchParams();
  const derivedTab = useMemo(
    () => resolveTab(searchParams.get('tab'), supplyChainEnabled, aiWorkspaceEnabled),
    [searchParams, supplyChainEnabled, aiWorkspaceEnabled]
  );
  const [activeTab, setActiveTab] = useState<TabValue>(derivedTab);
  const [prevDerived, setPrevDerived] = useState(derivedTab);
  if (derivedTab !== prevDerived) {
    setPrevDerived(derivedTab);
    setActiveTab(derivedTab);
  }

  // Sovereign: integrations is not a supported surface — AI Connect lives at
  // `/admin/ai/connect`. Redirect stale bookmarks from the old Settings → AI tab.
  useEffect(() => {
    if (isSovereign) {
      router.replace('/admin/ai/connect');
      return;
    }
    if (aiWorkspaceEnabled && searchParams.get('tab') === 'ai') {
      router.replace('/admin/ai/models');
    }
  }, [router, aiWorkspaceEnabled, searchParams]);

  if (isSovereign) {
    return null;
  }

  return (
    <div data-testid="admin-integrations">
      <SettingsPageHeader
        title={t('admin.integrations.title')}
        description={
          aiWorkspaceEnabled
            ? t('admin.integrations.subtitleNoAi')
            : t('admin.integrations.subtitle')
        }
        backHref="/admin/settings"
      />

      {aiWorkspaceEnabled && (
        <div
          className="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          data-testid="integrations-ai-moved-banner"
        >
          <p className="text-sm text-muted-foreground">{t('admin.integrations.aiMovedBanner')}</p>
          <Link
            href="/admin/ai/models"
            className="text-sm font-medium text-primary hover:underline shrink-0"
          >
            {t('admin.integrations.aiMovedLink')}
          </Link>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabValue)}>
        <TabsList>
          {!isSovereign && (
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="w-4 h-4" />
              {t('admin.integrations.tabNotifications')}
            </TabsTrigger>
          )}
          {!aiWorkspaceEnabled && (
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles className="w-4 h-4" />
              {t('admin.integrations.tabAI')}
            </TabsTrigger>
          )}
          {!isSovereign && supplyChainEnabled && (
            <TabsTrigger value="fulfillment" className="gap-1.5">
              <Package className="w-4 h-4" />
              {t('admin.integrations.tabFulfillment')}
            </TabsTrigger>
          )}
          {!isSovereign && (
            <TabsTrigger value="webhooks" className="gap-1.5">
              <Webhook className="w-4 h-4" />
              {t('admin.integrations.tabWebhooks')}
            </TabsTrigger>
          )}
        </TabsList>

        {!isSovereign && (
          <TabsContent value="notifications" className="mt-6">
            <NotificationChannelsSection />
          </TabsContent>
        )}

        {!aiWorkspaceEnabled && (
          <TabsContent value="ai" className="mt-6">
            <AIConfigSection />
          </TabsContent>
        )}

        {!isSovereign && supplyChainEnabled && (
          <TabsContent value="fulfillment" className="mt-6">
            <FulfillmentProvidersSection />
          </TabsContent>
        )}

        {!isSovereign && (
          <TabsContent value="webhooks" className="mt-6">
            <WebhookSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
