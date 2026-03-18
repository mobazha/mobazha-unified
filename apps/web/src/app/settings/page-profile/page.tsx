'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { ProfileSettingsContent } from '@/components/SettingsContent';

export default function PageSettingsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.profile') || t('settings.sidebar.page')} />
      <ProfileSettingsContent />
    </div>
  );
}
