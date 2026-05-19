'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { OperatorResponsibilitiesContent } from '@/components/SettingsContent';
import { Navigate } from 'react-router-dom';

export default function AdminResponsibilitiesSettingsPage() {
  const { t } = useI18n();

  if (__OUTPOST__) {
    return <Navigate to="/admin/settings" replace />;
  }

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
