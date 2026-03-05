'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { ChevronRight, Lock, Users, Layers, Clock } from 'lucide-react';
import { SettingsPageHeader } from '@/components/SettingsLayout';

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

export default function AdminAccessControlPage() {
  const { t } = useI18n();
  const router = useRouter();

  React.useEffect(() => {
    if (window.innerWidth >= 1024) {
      router.replace('/admin/settings/access-control/privacy');
    }
  }, [router]);

  return (
    <div className="lg:hidden">
      <SettingsPageHeader title={t('settings.sidebar.accessControl')} backHref="/admin/settings" />

      <div className="bg-card rounded-lg border overflow-hidden">
        <AccessControlItem
          icon={<Lock className="w-5 h-5" />}
          title={t('settings.sidebar.privacy')}
          description={t('settings.accessControl.privacyDesc')}
          href="/admin/settings/access-control/privacy"
        />
        <AccessControlItem
          icon={<Users className="w-5 h-5" />}
          title={t('settings.sidebar.userGroups')}
          description={t('settings.accessControl.userGroupsDesc')}
          href="/admin/settings/access-control/user-groups"
        />
        <AccessControlItem
          icon={<Layers className="w-5 h-5" />}
          title={t('settings.sidebar.productGroups')}
          description={t('settings.accessControl.productGroupsDesc')}
          href="/admin/settings/access-control/product-groups"
        />
        <AccessControlItem
          icon={<Clock className="w-5 h-5" />}
          title={t('settings.sidebar.accessRequests')}
          description={t('settings.accessControl.requestsDesc')}
          href="/admin/settings/access-control/requests"
        />
      </div>
    </div>
  );
}
