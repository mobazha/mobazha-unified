'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { AccessRequestsContent } from '@/components/SettingsContent';
import { SettingsPageHeader } from '@/components/SettingsLayout';

export default function AccessRequestsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.accessRequests')}
        backHref="/settings/access-control"
      />
      <AccessRequestsContent />
    </div>
  );
}
