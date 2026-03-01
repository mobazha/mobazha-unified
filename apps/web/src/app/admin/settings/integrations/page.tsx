'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { ArrowLeft, Bell, CreditCard, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationChannelsSection } from './NotificationChannelsSection';
import { AIConfigSection } from './AIConfigSection';
import { PaymentProvidersSection } from './PaymentProvidersSection';

export default function AdminIntegrationsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-integrations">
      <div className="mb-6">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('admin.settings.title')}
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.integrations.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin.integrations.subtitle')}</p>
        </div>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments" className="gap-1.5">
            <CreditCard className="w-4 h-4" />
            {t('admin.integrations.tabPayments')}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="w-4 h-4" />
            {t('admin.integrations.tabNotifications')}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5">
            <Sparkles className="w-4 h-4" />
            {t('admin.integrations.tabAI')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="mt-6">
          <PaymentProvidersSection />
        </TabsContent>

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
