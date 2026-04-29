'use client';

import React from 'react';
import { useI18n, useFeature } from '@mobazha/core';
import { Bell, Webhook, Sparkles, Package } from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationChannelsSection } from './NotificationChannelsSection';
import { WebhookSection } from './WebhookSection';
import { AIConfigSection } from './AIConfigSection';
import { FulfillmentProvidersSection } from './FulfillmentProvidersSection';

export default function AdminIntegrationsPage() {
  const { t } = useI18n();
  const supplyChainEnabled = useFeature('supplyChainEnabled');

  return (
    <div data-testid="admin-integrations">
      <SettingsPageHeader
        title={t('admin.integrations.title')}
        description={t('admin.integrations.subtitle')}
        backHref="/admin/settings"
      />

      <Tabs defaultValue="notifications">
        <TabsList>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="w-4 h-4" />
            {t('admin.integrations.tabNotifications')}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            {t('admin.integrations.tabAI')}
          </TabsTrigger>
          {supplyChainEnabled && (
            <TabsTrigger value="fulfillment" className="gap-1.5">
              <Package className="w-4 h-4" />
              {t('admin.integrations.tabFulfillment')}
            </TabsTrigger>
          )}
          <TabsTrigger value="webhooks" className="gap-1.5">
            <Webhook className="w-4 h-4" />
            {t('admin.integrations.tabWebhooks')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-6">
          <NotificationChannelsSection />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIConfigSection />
        </TabsContent>

        {supplyChainEnabled && (
          <TabsContent value="fulfillment" className="mt-6">
            <FulfillmentProvidersSection />
          </TabsContent>
        )}

        <TabsContent value="webhooks" className="mt-6">
          <WebhookSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
