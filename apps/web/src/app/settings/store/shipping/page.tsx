'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { ShippingSettingsContent } from '@/components/SettingsContent/ShippingSettingsContent';

export default function StoreShippingSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="store-settings-shipping">
      <SettingsPageHeader
        title={t('shipping.shippingProfiles')}
        description={t('settingsExtended.shippingOptionsDesc')}
        backHref="/settings/store"
      />
      <ShippingSettingsContent />
    </div>
  );
}
