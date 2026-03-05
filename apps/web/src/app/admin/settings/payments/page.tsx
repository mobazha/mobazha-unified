'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { CryptoReceivingSection } from './CryptoReceivingSection';
import { PaymentProvidersSection } from '../integrations/PaymentProvidersSection';

export default function AdminPaymentsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-payments">
      <SettingsPageHeader
        title={t('admin.settings.payments')}
        description={t('admin.settings.paymentsDesc')}
        backHref="/admin/settings"
      />

      <div className="space-y-10">
        <CryptoReceivingSection />

        <div className="border-t border-border" />

        <PaymentProvidersSection />
      </div>
    </div>
  );
}
