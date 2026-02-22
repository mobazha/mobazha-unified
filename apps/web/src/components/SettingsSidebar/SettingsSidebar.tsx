'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Users,
  Layers,
  Clock,
  ChevronRight,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  children?: SidebarItem[];
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
    id: 'page',
    labelKey: 'settings.sidebar.page',
    href: '/settings/page-profile',
    icon: <User className="w-4 h-4" />,
  },
  {
    id: 'store',
    labelKey: 'settings.sidebar.store',
    href: '/settings/store',
    icon: <Store className="w-4 h-4" />,
  },
  {
    id: 'access-control',
    labelKey: 'settings.sidebar.accessControl',
    href: '/settings/access-control',
    icon: <Shield className="w-4 h-4" />,
    children: [
      {
        id: 'privacy',
        labelKey: 'settings.sidebar.privacy',
        href: '/settings/access-control/privacy',
        icon: <Lock className="w-4 h-4" />,
      },
      {
        id: 'user-groups',
        labelKey: 'settings.sidebar.userGroups',
        href: '/settings/access-control/user-groups',
        icon: <Users className="w-4 h-4" />,
      },
      {
        id: 'product-groups',
        labelKey: 'settings.sidebar.productGroups',
        href: '/settings/access-control/product-groups',
        icon: <Layers className="w-4 h-4" />,
      },
      {
        id: 'requests',
        labelKey: 'settings.sidebar.accessRequests',
        href: '/settings/access-control/requests',
        icon: <Clock className="w-4 h-4" />,
      },
    ],
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
    id: 'moderation',
    labelKey: 'settings.sidebar.moderation',
    href: '/settings/moderation',
    icon: <Scale className="w-4 h-4" />,
  },
  {
    id: 'chat-encryption',
    labelKey: 'settings.sidebar.chatEncryption',
    href: '/settings/chat-encryption',
    icon: <Lock className="w-4 h-4" />,
  },
  {
    id: 'advanced',
    labelKey: 'settings.sidebar.advanced',
    href: '/settings/advanced',
    icon: <Wrench className="w-4 h-4" />,
  },
];

interface SidebarNavItemProps {
  item: SidebarItem;
  isActive: boolean;
  isChildActive?: boolean;
  depth?: number;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  isActive,
  isChildActive,
  depth = 0,
}) => {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = React.useState(isActive || isChildActive);

  const hasChildren = item.children && item.children.length > 0;

  // 自动展开当前激活的父级
  React.useEffect(() => {
    if (isChildActive) {
      setIsExpanded(true);
    }
  }, [isChildActive]);

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid={`settings-nav-${item.id}`}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
            isActive || isChildActive
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          {item.icon}
          <span className="flex-1 text-left">{t(item.labelKey)}</span>
          <ChevronRight className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-90')} />
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l border-border pl-3">
            {item.children?.map(child => (
              <SidebarNavItemLink key={child.id} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return <SidebarNavItemLink item={item} depth={depth} />;
};

interface SidebarNavItemLinkProps {
  item: SidebarItem;
  depth?: number;
}

const SidebarNavItemLink: React.FC<SidebarNavItemLinkProps> = ({ item, depth = 0 }) => {
  const { t } = useI18n();
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

  return (
    <Link
      href={item.href}
      data-testid={`settings-nav-${item.id}`}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        depth > 0 && 'text-[13px]'
      )}
    >
      {item.icon}
      <span>{t(item.labelKey)}</span>
    </Link>
  );
};

export const SettingsSidebar: React.FC = () => {
  const { t } = useI18n();
  const pathname = usePathname();

  const isItemActive = (item: SidebarItem): boolean => {
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  const isChildActive = (item: SidebarItem): boolean => {
    if (!item.children) return false;
    return item.children.some(
      child => pathname === child.href || pathname.startsWith(child.href + '/')
    );
  };

  return (
    <nav className="p-4 space-y-1" data-testid="settings-sidebar">
      <h2 className="text-lg font-semibold mb-4 px-3">{t('settings.title')}</h2>
      {sidebarItems.map(item => (
        <SidebarNavItem
          key={item.id}
          item={item}
          isActive={isItemActive(item)}
          isChildActive={isChildActive(item)}
        />
      ))}
    </nav>
  );
};

export default SettingsSidebar;
