'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { UserGroupsContent } from '@/components/SettingsContent';
import { SettingsPageHeader } from '@/components/SettingsLayout';

export default function UserGroupsPage() {
  const { t } = useI18n();

  return (
    <div>
      <SettingsPageHeader
        title={t('settings.sidebar.userGroups')}
        backHref="/settings/access-control"
      />
      <UserGroupsContent />
    </div>
  );
}
