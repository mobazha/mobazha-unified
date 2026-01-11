'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import {
  Settings,
  User,
  Store,
  Shield,
  MapPin,
  Ban,
  Scale,
  Lock,
  Wrench,
  ChevronRight,
} from 'lucide-react';

interface SettingsCategoryProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  href: string;
}

const SettingsCategory: React.FC<SettingsCategoryProps> = ({ icon, title, description, href }) => (
  <Link
    href={href}
    className="flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-0"
  >
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </Link>
);

export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();

  // 桌面端重定向到 general 页面
  React.useEffect(() => {
    const checkAndRedirect = () => {
      if (window.innerWidth >= 1024) {
        router.replace('/settings/general');
      }
    };

    checkAndRedirect();
    window.addEventListener('resize', checkAndRedirect);
    return () => window.removeEventListener('resize', checkAndRedirect);
  }, [router]);

  // 移动端显示分类列表
  return (
    <div className="lg:hidden">
      <h1 className="text-xl font-semibold mb-4">{t('settings.title')}</h1>

      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory
          icon={<Settings className="w-5 h-5" />}
          title={t('settings.sidebar.general')}
          description={t('settingsModal.languageDesc')}
          href="/settings/general"
        />
        <SettingsCategory
          icon={<User className="w-5 h-5" />}
          title={t('settings.sidebar.page')}
          description={t('settingsModal.shortDescription')}
          href="/settings/page-profile"
        />
        <SettingsCategory
          icon={<Store className="w-5 h-5" />}
          title={t('settings.sidebar.store')}
          description={t('settingsExtended.storePoliciesDesc')}
          href="/settings/store"
        />
      </div>

      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory
          icon={<Shield className="w-5 h-5" />}
          title={t('settings.sidebar.accessControl')}
          description={t('settingsExtended.privateStoreDesc')}
          href="/settings/access-control"
        />
      </div>

      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory
          icon={<MapPin className="w-5 h-5" />}
          title={t('settings.sidebar.addresses')}
          description={t('settingsExtended.manageAddresses')}
          href="/settings/addresses"
        />
        <SettingsCategory
          icon={<Ban className="w-5 h-5" />}
          title={t('settings.sidebar.blocked')}
          description={t('settingsExtended.manageBlocked')}
          href="/settings/blocked"
        />
        <SettingsCategory
          icon={<Scale className="w-5 h-5" />}
          title={t('settings.sidebar.moderation')}
          description={t('settingsExtended.moderatorsDesc')}
          href="/settings/moderation"
        />
        <SettingsCategory
          icon={<Lock className="w-5 h-5" />}
          title={t('settings.sidebar.chatEncryption')}
          href="/settings/chat-encryption"
        />
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <SettingsCategory
          icon={<Wrench className="w-5 h-5" />}
          title={t('settings.sidebar.advanced')}
          description={t('settingsExtended.analyticsDesc')}
          href="/settings/advanced"
        />
      </div>
    </div>
  );
}
