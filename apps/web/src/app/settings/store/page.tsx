'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { StoreSettingsContent } from '@/components/SettingsContent';

export default function StoreSettingsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.store')} />
      <StoreSettingsContent />
    </div>
  );
}
