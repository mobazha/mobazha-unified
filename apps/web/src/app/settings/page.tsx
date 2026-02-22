'use client';

import React, { useEffect } from 'react';
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
  Link2,
} from 'lucide-react';

interface SettingsCategoryProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
}

const SettingsCategory: React.FC<SettingsCategoryProps> = ({
  icon,
  title,
  description,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border last:border-0 text-left"
  >
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </button>
);

export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();

  // 桌面端：跳转到 general 设置页
  useEffect(() => {
    const checkAndRedirect = () => {
      if (window.innerWidth >= 1024) {
        router.replace('/settings/general');
      }
    };

    checkAndRedirect();
  }, [router]);

  // 移动端显示分类列表（点击打开 Drawer）
  return (
    <div className="lg:hidden">
      <h1 className="text-lg font-semibold mb-4">{t('settings.title')}</h1>

      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory
          icon={<Settings className="w-5 h-5" />}
          title={t('settings.sidebar.general')}
          description={t('settingsModal.languageDesc')}
          onClick={() => router.push('/settings/general')}
        />
        <SettingsCategory
          icon={<Link2 className="w-5 h-5" />}
          title={t('settings.sidebar.account')}
          description={t('settings.accountBinding.description')}
          onClick={() => router.push('/settings/account')}
        />
        <SettingsCategory
          icon={<User className="w-5 h-5" />}
          title={t('settings.sidebar.page')}
          description={t('settingsModal.shortDescription')}
          onClick={() => router.push('/settings/page-profile')}
        />
        <SettingsCategory
          icon={<Store className="w-5 h-5" />}
          title={t('settings.sidebar.store')}
          description={t('settingsExtended.storePoliciesDesc')}
          onClick={() => router.push('/settings/store')}
        />
      </div>

      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory
          icon={<Shield className="w-5 h-5" />}
          title={t('settings.sidebar.accessControl')}
          description={t('settingsExtended.privateStoreDesc')}
          onClick={() => router.push('/settings/access-control')}
        />
      </div>

      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory
          icon={<MapPin className="w-5 h-5" />}
          title={t('settings.sidebar.addresses')}
          description={t('settingsExtended.manageAddresses')}
          onClick={() => router.push('/settings/addresses')}
        />
        <SettingsCategory
          icon={<Ban className="w-5 h-5" />}
          title={t('settings.sidebar.blocked')}
          description={t('settingsExtended.manageBlocked')}
          onClick={() => router.push('/settings/blocked')}
        />
        <SettingsCategory
          icon={<Scale className="w-5 h-5" />}
          title={t('settings.sidebar.moderation')}
          description={t('settingsExtended.moderatorsDesc')}
          onClick={() => router.push('/settings/moderation')}
        />
        <SettingsCategory
          icon={<Lock className="w-5 h-5" />}
          title={t('settings.sidebar.chatEncryption')}
          onClick={() => router.push('/settings/chat-encryption')}
        />
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <SettingsCategory
          icon={<Wrench className="w-5 h-5" />}
          title={t('settings.sidebar.advanced')}
          description={t('settingsExtended.analyticsDesc')}
          onClick={() => router.push('/settings/advanced')}
        />
      </div>
    </div>
  );
}
