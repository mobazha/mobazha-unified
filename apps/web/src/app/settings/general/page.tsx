'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { GeneralSettingsContent } from '@/components/SettingsContent';

export default function GeneralSettingsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.general')} />
      <GeneralSettingsContent />
    </div>
  );
}
