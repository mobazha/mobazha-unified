'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { GeneralSettingsContent } from '@/components/SettingsContent';

export default function GeneralSettingsPage() {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (__SOVEREIGN__) router.replace('/admin/settings/preferences');
  }, [router]);

  if (__SOVEREIGN__) return null;

  return (
    <div>
      <SettingsPageHeader title={t('settings.sidebar.general')} />
      <GeneralSettingsContent />
    </div>
  );
}
