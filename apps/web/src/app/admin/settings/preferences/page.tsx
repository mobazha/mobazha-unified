'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { GeneralSettingsContent } from '@/components/SettingsContent';

export default function AdminPreferencesSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-preferences">
      <SettingsPageHeader
        title={t('admin.settings.preferences')}
        description={t('admin.settings.preferencesDesc')}
        backHref="/admin/settings"
      />
      <GeneralSettingsContent />
    </div>
  );
}
