'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { ChevronLeft, ChevronRight, Lock, Users, Layers, Clock } from 'lucide-react';

interface AccessControlItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  href: string;
}

const AccessControlItem: React.FC<AccessControlItemProps> = ({
  icon,
  title,
  description,
  href,
}) => (
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

export default function AccessControlPage() {
  const { t } = useI18n();
  const router = useRouter();

  // 桌面端重定向到 privacy 页面
  React.useEffect(() => {
    const checkAndRedirect = () => {
      if (window.innerWidth >= 1024) {
        router.replace('/settings/access-control/privacy');
      }
    };

    checkAndRedirect();
    window.addEventListener('resize', checkAndRedirect);
    return () => window.removeEventListener('resize', checkAndRedirect);
  }, [router]);

  return (
    <div className="lg:hidden">
      {/* 移动端返回按钮 */}
      <div className="mb-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t('common.back')}</span>
        </Link>
      </div>

      <h1 className="text-xl font-semibold mb-4">{t('settings.sidebar.accessControl')}</h1>

      <div className="bg-card rounded-lg border overflow-hidden">
        <AccessControlItem
          icon={<Lock className="w-5 h-5" />}
          title={t('settings.sidebar.privacy')}
          description={t('settings.accessControl.privacyDesc')}
          href="/settings/access-control/privacy"
        />
        <AccessControlItem
          icon={<Users className="w-5 h-5" />}
          title={t('settings.sidebar.userGroups')}
          description={t('settings.accessControl.userGroupsDesc')}
          href="/settings/access-control/user-groups"
        />
        <AccessControlItem
          icon={<Layers className="w-5 h-5" />}
          title={t('settings.sidebar.productGroups')}
          description={t('settings.accessControl.productGroupsDesc')}
          href="/settings/access-control/product-groups"
        />
        <AccessControlItem
          icon={<Clock className="w-5 h-5" />}
          title={t('settings.sidebar.accessRequests')}
          description={t('settings.accessControl.requestsDesc')}
          href="/settings/access-control/requests"
        />
      </div>
    </div>
  );
}
