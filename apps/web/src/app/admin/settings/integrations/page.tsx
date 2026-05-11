'use client';

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

const isOutpost = typeof __OUTPOST__ !== 'undefined' && __OUTPOST__;

function resolveTab(param: string | null, supplyChainEnabled: boolean): TabValue {
  if (param && (VALID_TABS as readonly string[]).includes(param)) {
    if (param === 'notifications' && isOutpost) return 'ai';
    if (param === 'fulfillment' && !supplyChainEnabled) return isOutpost ? 'ai' : 'notifications';
    if (param === 'webhooks' && isOutpost) return 'ai';
    return param as TabValue;
  }
  return isOutpost ? 'ai' : 'notifications';
}

export default function AdminIntegrationsPage() {
  const { t } = useI18n();
  const supplyChainEnabled = useFeature('supplyChainEnabled');
  const searchParams = useSearchParams();
  const derivedTab = useMemo(
    () => resolveTab(searchParams.get('tab'), supplyChainEnabled),
    [searchParams, supplyChainEnabled]
  );
  const [activeTab, setActiveTab] = useState<TabValue>(derivedTab);
  const [prevDerived, setPrevDerived] = useState(derivedTab);
  if (derivedTab !== prevDerived) {
    setPrevDerived(derivedTab);
    setActiveTab(derivedTab);
  }

  return (
    <div data-testid="admin-integrations">
      <SettingsPageHeader
        title={t('admin.integrations.title')}
        description={t('admin.integrations.subtitle')}
        backHref="/admin/settings"
      />

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabValue)}>
        <TabsList>
          {!isOutpost && (
            <TabsTrigger value="notifications" className="gap-1.5">
              <Bell className="w-4 h-4" />
              {t('admin.integrations.tabNotifications')}
            </TabsTrigger>
          )}
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            {t('admin.integrations.tabAI')}
          </TabsTrigger>
          {!isOutpost && supplyChainEnabled && (
            <TabsTrigger value="fulfillment" className="gap-1.5">
              <Package className="w-4 h-4" />
              {t('admin.integrations.tabFulfillment')}
            </TabsTrigger>
          )}
          {!isOutpost && (
            <TabsTrigger value="webhooks" className="gap-1.5">
              <Webhook className="w-4 h-4" />
              {t('admin.integrations.tabWebhooks')}
            </TabsTrigger>
          )}
        </TabsList>

        {!isOutpost && (
          <TabsContent value="notifications" className="mt-6">
            <NotificationChannelsSection />
          </TabsContent>
        )}

        <TabsContent value="ai" className="mt-6">
          <AIConfigSection />
        </TabsContent>

        {!isOutpost && supplyChainEnabled && (
          <TabsContent value="fulfillment" className="mt-6">
            <FulfillmentProvidersSection />
          </TabsContent>
        )}

        {!isOutpost && (
          <TabsContent value="webhooks" className="mt-6">
            <WebhookSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
