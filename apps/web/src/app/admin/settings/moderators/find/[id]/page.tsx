'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { SettingsPageHeader } from '@/components/SettingsLayout';
import { ModeratorDetailView } from '@/components/Moderators/ModeratorDetailView';
import { MODERATOR_ROUTES } from '@/lib/routes/moderators';
import { useI18n } from '@mobazha/core';

export default function AdminModeratorDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const peerID = typeof params.id === 'string' ? params.id : '';

  return (
    <div data-testid="admin-find-moderator-detail">
      <SettingsPageHeader
        title={t('moderator.findModerators')}
        description={t('moderator.addToStoreBanner')}
        backHref={MODERATOR_ROUTES.storeDirectory}
      />

      <ModeratorDetailView
        peerID={peerID}
        returnToOverride={MODERATOR_ROUTES.storeSettings}
        backHrefOverride={MODERATOR_ROUTES.storeDirectory}
      />
    </div>
  );
}
