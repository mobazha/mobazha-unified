'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { ExternalLink } from 'lucide-react';

export function TelegramSetupGuide() {
  const { t } = useI18n();

  return (
    <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
      <p className="text-xs font-medium text-foreground">
        {t('admin.integrations.telegramSetupTitle')}
      </p>
      <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
        <li>{t('admin.integrations.telegramStep1')}</li>
        <li>{t('admin.integrations.telegramStep2')}</li>
        <li>{t('admin.integrations.telegramStep3')}</li>
      </ol>
      <a
        href="https://core.telegram.org/bots#how-do-i-create-a-bot"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {t('admin.integrations.telegramDocsLink')}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
