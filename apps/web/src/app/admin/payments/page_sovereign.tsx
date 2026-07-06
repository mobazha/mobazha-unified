'use client';

import { Navigate } from 'react-router-dom';
import { useI18n } from '@mobazha/core';

/** Sovereign Store payments keeps the original XMR Finance entry experience. */
export default function SovereignAdminPaymentsPage() {
  const { t } = useI18n();

  if (typeof __COMMERCIAL_EXTENSION__ !== 'undefined' && __COMMERCIAL_EXTENSION__) {
    return <Navigate to="/admin/finance" replace />;
  }

  return (
    <div data-testid="sovereign-payments-unavailable" className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-semibold text-foreground">
        {t('admin.payments.unavailableTitle')}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">{t('admin.payments.unavailableDesc')}</p>
    </div>
  );
}
