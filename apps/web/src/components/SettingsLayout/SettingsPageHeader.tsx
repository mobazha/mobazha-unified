'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useI18n } from '@mobazha/core';

interface SettingsPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  actions?: React.ReactNode;
}

export const SettingsPageHeader: React.FC<SettingsPageHeaderProps> = ({
  title,
  description,
  backHref = '/settings',
  actions,
}) => {
  const { t } = useI18n();

  return (
    <div className="mb-4 md:mb-6">
      <div className="lg:hidden mb-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">{t('common.back')}</span>
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
