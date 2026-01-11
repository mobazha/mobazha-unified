'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@mobazha/core';
import { ChevronLeft } from 'lucide-react';
import { PrivacySettingsContent } from '@/components/SettingsContent';

export default function PrivacySettingsPage() {
  const { t } = useI18n();

  return (
    <div>
      {/* 移动端返回按钮 */}
      <div className="lg:hidden mb-4">
        <Link
          href="/settings/access-control"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-6">{t('settings.sidebar.privacy')}</h1>

      <PrivacySettingsContent />
    </div>
  );
}
