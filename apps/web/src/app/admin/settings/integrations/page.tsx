'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Bell, Sparkles } from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationChannelsSection } from './NotificationChannelsSection';
import { AIConfigSection } from './AIConfigSection';

export default function AdminIntegrationsPage() {
  const { t } = useI18n();

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
        </TabsList>

        <TabsContent value="notifications" className="mt-6">
          <NotificationChannelsSection />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIConfigSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
