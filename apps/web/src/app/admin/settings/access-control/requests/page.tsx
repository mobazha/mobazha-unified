'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { AccessRequestsContent } from '@/components/SettingsContent';
import { SettingsPageHeader } from '@/components/SettingsLayout';

export default function AdminAccessRequestsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.accessRequests')}
        description={t('settings.accessControl.requestsDescription')}
        mobileBackHref="/admin/settings/access-control"
      />
      <AccessRequestsContent />
    </div>
  );
}
