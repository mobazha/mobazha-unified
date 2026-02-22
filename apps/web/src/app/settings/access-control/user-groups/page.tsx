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
        description={t('settings.accessControl.userGroupsDesc')}
        backHref="/settings/access-control"
      />
      <UserGroupsContent />
    </div>
  );
}
