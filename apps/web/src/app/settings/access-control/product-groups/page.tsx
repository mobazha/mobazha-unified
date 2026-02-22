'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { ProductGroupsContent } from '@/components/SettingsContent';
import { SettingsPageHeader } from '@/components/SettingsLayout';

export default function ProductGroupsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.productGroups')}
        backHref="/settings/access-control"
      />
      <ProductGroupsContent />
    </div>
  );
}
