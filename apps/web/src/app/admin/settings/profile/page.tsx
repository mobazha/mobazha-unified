'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { ProfileSettingsContent } from '@/components/SettingsContent';

export default function AdminProfileSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-profile">
      <SettingsPageHeader
        title={t('settings.sidebar.profile') || t('settings.sidebar.page')}
        backHref="/admin/settings"
      />
      <ProfileSettingsContent />
    </div>
  );
}
