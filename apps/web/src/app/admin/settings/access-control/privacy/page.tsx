'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { PrivacySettingsContent } from '@/components/SettingsContent';
import { SettingsPageHeader } from '@/components/SettingsLayout';

export default function AdminPrivacySettingsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.privacy')}
        mobileBackHref="/admin/settings/access-control"
      />
      <PrivacySettingsContent />
    </div>
  );
}
