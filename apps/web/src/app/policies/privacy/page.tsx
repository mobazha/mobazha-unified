'use client';

import React from 'react';
import { useI18n, isStandalone } from '@mobazha/core';
import { VStack } from '@/components/layouts';
import { Eye, Database, Users, Lock } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const { t } = useI18n();
  const standalone = isStandalone();

  const sections = [
    {
      icon: Database,
      title: t('policies.privacyCollection'),
      desc: standalone
        ? t('policies.privacyCollectionDesc')
        : t('policies.privacyCollectionDescPlatform'),
    },
    { icon: Eye, title: t('policies.privacyUsage'), desc: t('policies.privacyUsageDesc') },
    { icon: Users, title: t('policies.privacySharing'), desc: t('policies.privacySharingDesc') },
    { icon: Lock, title: t('policies.privacySecurity'), desc: t('policies.privacySecurityDesc') },
  ];

  return (
    <VStack gap="lg">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          {t('policies.privacyTitle')}
        </h1>
        <p className="text-muted-foreground">{t('policies.privacyIntro')}</p>
      </div>

      <div className="space-y-6">
        {sections.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        {t('policies.lastUpdated')}: March 2026
      </p>
    </VStack>
  );
}
