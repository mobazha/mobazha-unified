'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import {
  Settings,
  Store,
  Shield,
  Truck,
  Scale,
  User,
  Plug,
  Link2,
  Ban,
  Key,
  Wrench,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';

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

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
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

      <div className="space-y-8">
        {/* Personal & Store */}
        <SettingsSection title={t('admin.settings.sectionPersonal')}>
          <SettingsCard
            icon={User}
            title={t('admin.settings.profile')}
            description={t('admin.settings.profileDesc')}
            href="/admin/settings/profile"
          />
          <SettingsCard
            icon={Store}
            title={t('admin.settings.store')}
            description={t('admin.settings.storeDesc')}
            href="/admin/settings/store"
          />
          <SettingsCard
            icon={Settings}
            title={t('admin.settings.general')}
            description={t('admin.settings.generalDesc')}
            href="/admin/settings/general"
          />
          <SettingsCard
            icon={Link2}
            title={t('admin.settings.account')}
            description={t('admin.settings.accountDesc')}
            href="/admin/settings/account"
          />
        </SettingsSection>

        {/* Transaction Rules */}
        <SettingsSection title={t('admin.settings.sectionTransaction')}>
          <SettingsCard
            icon={Shield}
            title={t('admin.settings.policies')}
            description={t('admin.settings.policiesDesc')}
            href="/admin/settings/policies"
          />
          <SettingsCard
            icon={Wallet}
            title={t('admin.settings.payments')}
            description={t('admin.settings.paymentsDesc')}
            href="/admin/settings/payments"
          />
          <SettingsCard
            icon={Truck}
            title={t('admin.settings.shipping')}
            description={t('admin.settings.shippingDesc')}
            href="/admin/settings/shipping"
          />
          <SettingsCard
            icon={Scale}
            title={t('admin.settings.moderators')}
            description={t('admin.settings.moderatorsDesc')}
            href="/admin/settings/moderators"
          />
        </SettingsSection>

        {/* Privacy & Security */}
        <SettingsSection title={t('admin.settings.sectionPrivacy')}>
          <SettingsCard
            icon={Shield}
            title={t('admin.settings.accessControl')}
            description={t('admin.settings.accessControlDesc')}
            href="/admin/settings/access-control"
          />
          <SettingsCard
            icon={Ban}
            title={t('admin.settings.blocked')}
            description={t('admin.settings.blockedDesc')}
            href="/admin/settings/blocked"
          />
          <SettingsCard
            icon={Key}
            title={t('admin.settings.chatEncryption')}
            description={t('admin.settings.chatEncryptionDesc')}
            href="/admin/settings/chat-encryption"
          />
          <SettingsCard
            icon={Wrench}
            title={t('admin.settings.advanced')}
            description={t('admin.settings.advancedDesc')}
            href="/admin/settings/advanced"
          />
        </SettingsSection>

        {/* Extensions */}
        <SettingsSection title={t('admin.settings.sectionExtensions')}>
          <SettingsCard
            icon={Plug}
            title={t('admin.settings.integrations')}
            description={t('admin.settings.integrationsDesc')}
            href="/admin/settings/integrations"
          />
        </SettingsSection>
      </div>
    </div>
  );
}
