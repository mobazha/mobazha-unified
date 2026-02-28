'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { StoreSettingsContent } from '@/components/SettingsContent';

export default function AdminStoreSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-store">
      <SettingsPageHeader title={t('settings.sidebar.store')} backHref="/admin/settings" />
      <StoreSettingsContent
        policiesHref="/admin/settings/policies"
        moderatorsHref="/admin/settings/moderators"
        shippingHref="/admin/settings/shipping"
        brandingHref="/admin/settings/store/branding"
      />
    </div>
  );
}
