'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { StorePoliciesContent } from '@/components/SettingsContent';

export default function AdminPoliciesSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-policies">
      <SettingsPageHeader title={t('settingsExtended.storePolicies')} backHref="/admin/settings" />
      <StorePoliciesContent />
    </div>
  );
}
