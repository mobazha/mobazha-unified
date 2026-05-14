'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { DataExportContent } from '@/components/SettingsContent/DataExportContent';

export default function AdminDataExportSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-data-export">
      <SettingsPageHeader title={t('dataExport.pageTitle')} backHref="/admin/settings" />
      <DataExportContent />
    </div>
  );
}
