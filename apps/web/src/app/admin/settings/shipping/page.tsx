'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { ShippingSettingsContent } from '@/components/SettingsContent/ShippingSettingsContent';

export default function AdminShippingSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings-shipping">
      <SettingsPageHeader
        title={t('shipping.shippingProfiles')}
        description={t('settingsExtended.shippingOptionsDesc')}
        backHref="/admin/settings"
      />
      <ShippingSettingsContent />
    </div>
  );
}
