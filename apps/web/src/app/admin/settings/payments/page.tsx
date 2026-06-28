'use client';

import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { CryptoReceivingSection } from './CryptoReceivingSection';

export default function AdminPaymentsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-payments">
      <SettingsPageHeader
        title={t('admin.settings.payments')}
        description={t('admin.settings.paymentsDesc')}
        backHref="/admin/settings"
      />

      <div className="space-y-6 md:space-y-10">
        <CryptoReceivingSection />
      </div>
    </div>
  );
}
