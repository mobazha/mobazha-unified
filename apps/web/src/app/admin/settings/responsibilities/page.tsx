'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { OperatorResponsibilitiesContent } from '@/components/SettingsContent';

export default function AdminResponsibilitiesSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-responsibilities">
      <SettingsPageHeader
        title={t('settingsExtended.operatorResponsibilities')}
        backHref="/admin/settings"
      />
      <OperatorResponsibilitiesContent />
    </div>
  );
}
