'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { Settings, Store, Shield, Truck, Scale, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}

function SettingsCard({ icon: Icon, title, description, href }: SettingsCardProps) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 p-5 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      <div className="p-2.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-medium text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

export default function AdminSettingsPage() {
  const { t } = useI18n();

  return (
    <div data-testid="admin-settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('admin.settings.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('admin.settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SettingsCard
          icon={User}
          title={t('admin.settings.profile')}
          description={t('admin.settings.profileDesc')}
          href="/settings/page-profile"
        />
        <SettingsCard
          icon={Store}
          title={t('admin.settings.store')}
          description={t('admin.settings.storeDesc')}
          href="/settings/store"
        />
        <SettingsCard
          icon={Shield}
          title={t('admin.settings.policies')}
          description={t('admin.settings.policiesDesc')}
          href="/settings/store/policies"
        />
        <SettingsCard
          icon={Truck}
          title={t('admin.settings.shipping')}
          description={t('admin.settings.shippingDesc')}
          href="/settings/store/shipping"
        />
        <SettingsCard
          icon={Scale}
          title={t('admin.settings.moderators')}
          description={t('admin.settings.moderatorsDesc')}
          href="/settings/store/moderators"
        />
        <SettingsCard
          icon={Settings}
          title={t('admin.settings.general')}
          description={t('admin.settings.generalDesc')}
          href="/settings/general"
        />
      </div>
    </div>
  );
}
