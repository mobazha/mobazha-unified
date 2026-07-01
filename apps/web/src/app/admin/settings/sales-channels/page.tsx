'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import SalesChannelsContent from './SalesChannelsContent';

export default function SalesChannelsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-sales-channels">
      <SettingsPageHeader
        title={t('admin.salesChannels.title')}
        description={t('admin.salesChannels.subtitle')}
        backHref="/admin/settings"
      />
      <SalesChannelsContent />
    </div>
  );
}
