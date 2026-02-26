'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { StoreModeratorsContent } from '@/components/SettingsContent';

export default function AdminModeratorsSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-moderators">
      <SettingsPageHeader
        title={t('settingsExtended.storeModerators')}
        description={t('settingsExtended.storeModeratorsDesc')}
        backHref="/admin/settings"
      />
      <StoreModeratorsContent />
    </div>
  );
}
