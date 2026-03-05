'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { Settings, MapPin, Link2, Ban, Key, Wrench, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ReactNode;
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'general',
    labelKey: 'settings.sidebar.general',
    href: '/settings/general',
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: 'account',
    labelKey: 'settings.sidebar.account',
    href: '/settings/account',
    icon: <Link2 className="w-4 h-4" />,
  },
  {
    id: 'addresses',
    labelKey: 'settings.sidebar.addresses',
    href: '/settings/addresses',
    icon: <MapPin className="w-4 h-4" />,
  },
  {
    id: 'blocked',
    labelKey: 'settings.sidebar.blocked',
    href: '/settings/blocked',
    icon: <Ban className="w-4 h-4" />,
  },
  {
    id: 'chat-encryption',
    labelKey: 'settings.sidebar.chatEncryption',
    href: '/settings/chat-encryption',
    icon: <Key className="w-4 h-4" />,
  },
  {
    id: 'moderation',
    labelKey: 'settings.sidebar.moderation',
    href: '/settings/moderation',
    icon: <Scale className="w-4 h-4" />,
  },
  {
    id: 'advanced',
    labelKey: 'settings.sidebar.advanced',
    href: '/settings/advanced',
    icon: <Wrench className="w-4 h-4" />,
  },
];

export const SettingsSidebar: React.FC = () => {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="p-4 pb-8 space-y-1" data-testid="settings-sidebar">
      <h2 className="text-lg font-semibold mb-4 px-3">{t('settings.title')}</h2>
      {sidebarItems.map(item => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.id}
            href={item.href}
            data-testid={`settings-nav-${item.id}`}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {item.icon}
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default SettingsSidebar;
