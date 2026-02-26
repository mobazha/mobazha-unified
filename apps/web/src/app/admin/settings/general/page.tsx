'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { GeneralSettingsContent } from '@/components/SettingsContent';

export default function AdminGeneralSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-general">
      <SettingsPageHeader title={t('settings.sidebar.general')} backHref="/admin/settings" />
      <GeneralSettingsContent />
    </div>
  );
}
