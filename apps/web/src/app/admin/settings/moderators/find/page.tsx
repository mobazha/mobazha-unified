'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { Card } from '@/components/ui/card';
import { ModeratorDirectoryView } from '@/components/Moderators/ModeratorDirectoryView';
import { MODERATOR_ROUTES, storeModeratorDetailHref } from '@/lib/routes/moderators';

export default function AdminFindModeratorsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-find-moderators">
      <SettingsPageHeader
        title={t('moderator.findModerators')}
        description={t('moderator.addToStoreBanner')}
        backHref={MODERATOR_ROUTES.storeSettings}
      />

      <Card className="mb-6 border-primary/20 bg-primary/5 p-4">
        <p className="text-sm leading-6 text-foreground">{t('moderator.pageIntro')}</p>
      </Card>

      <ModeratorDirectoryView
        forceAddToStore
        returnToOverride={MODERATOR_ROUTES.storeSettings}
        detailHrefForModerator={storeModeratorDetailHref}
      />
    </div>
  );
}
