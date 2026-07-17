'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useI18n,
  useUserStore,
  isStandalone,
  useStorefrontMode,
  useFeatureFlags,
  useFeature,
  getAdminStorePaymentsPath,
} from '@mobazha/core';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Tag,
  Layers,
  Palette,
  Eye,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Server,
  Store,
  Bot,
  Compass,
  Wallet,
  WandSparkles,
  Link2,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';
import { isAdminNavItemActive } from './adminNavActive';

interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  /**
   * Sidebar section (`admin.nav.group.*` i18n suffix). A section header is
   * rendered whenever the group changes between consecutive items; items
   * without a group (Dashboard on top, Analytics/AI/Settings/System tail)
   * stay ungrouped.
   */
  group?: 'catalog' | 'sales' | 'marketing' | 'channels';
}

const storePaymentsNavItem: NavItem = {
  id: 'payments',
  labelKey: 'admin.nav.payments',
  href: getAdminStorePaymentsPath(),
  icon: Wallet,
  group: 'sales',
};

function applyAiWorkspaceNav(items: NavItem[], aiWorkspaceEnabled: boolean): NavItem[] {
  if (!aiWorkspaceEnabled) {
    return items;
  }

  return items.map(item =>
    item.id === 'ai-agents'
      ? {
          id: 'ai-workspace',
          labelKey: 'admin.nav.aiWorkspace',
          href: '/admin/ai/workspace',
          icon: WandSparkles,
        }
      : item
  );
}

const baseNavItems: NavItem[] = [
  { id: 'dashboard', labelKey: 'admin.nav.dashboard', href: '/admin', icon: LayoutDashboard },
  {
    id: 'products',
    labelKey: 'admin.nav.products',
    href: '/admin/products',
    icon: Package,
    group: 'catalog',
  },
  {
    id: 'collections',
    labelKey: 'admin.nav.collections',
    href: '/admin/collections',
    icon: Layers,
    group: 'catalog',
  },
  {
    id: 'orders',
    labelKey: 'admin.nav.orders',
    href: '/admin/orders',
    icon: ShoppingCart,
    group: 'sales',
  },
  storePaymentsNavItem,
  {
    id: 'discounts',
    labelKey: 'admin.nav.discounts',
    href: '/admin/discounts',
    icon: Tag,
    group: 'marketing',
  },
  {
    id: 'affiliate',
    labelKey: 'admin.nav.affiliate',
    href: '/admin/affiliate',
    icon: Megaphone,
    group: 'marketing',
  },
  {
    id: 'deal-links',
    labelKey: 'admin.nav.dealLinks',
    href: '/admin/deal-links',
    icon: Link2,
    group: 'marketing',
  },
  {
    id: 'storefront',
    labelKey: 'admin.nav.storefront',
    href: '/admin/storefront',
    icon: Palette,
    group: 'channels',
  },
  { id: 'analytics', labelKey: 'admin.nav.analytics', href: '/admin/analytics', icon: BarChart3 },
  { id: 'ai-agents', labelKey: 'admin.nav.aiAgents', href: '/admin/ai-agents', icon: Bot },
  { id: 'settings', labelKey: 'admin.nav.settings', href: '/admin/settings', icon: Settings },
];

const sourcingNavItem: NavItem = {
  id: 'sourcing',
  labelKey: 'admin.nav.sourcing',
  href: '/admin/sourcing',
  icon: Compass,
  group: 'catalog',
};

const storefrontsNavItem: NavItem = {
  id: 'storefronts',
  labelKey: 'admin.nav.storefronts',
  href: '/admin/storefronts',
  icon: Store,
  group: 'channels',
};

const standaloneNavItems: NavItem[] = [
  ...baseNavItems,
  { id: 'system', labelKey: 'admin.nav.system', href: '/admin/system', icon: Server },
];

const sovereignNavItems: NavItem[] = [
  { id: 'dashboard', labelKey: 'admin.nav.dashboard', href: '/admin', icon: LayoutDashboard },
  {
    id: 'products',
    labelKey: 'admin.nav.products',
    href: '/admin/products',
    icon: Package,
    group: 'catalog',
  },
  {
    id: 'collections',
    labelKey: 'admin.nav.collections',
    href: '/admin/collections',
    icon: Layers,
    group: 'catalog',
  },
  {
    id: 'orders',
    labelKey: 'admin.nav.orders',
    href: '/admin/orders',
    icon: ShoppingCart,
    group: 'sales',
  },
  storePaymentsNavItem,
  {
    id: 'storefront',
    labelKey: 'admin.nav.storefront',
    href: '/admin/storefront',
    icon: Palette,
    group: 'channels',
  },
  { id: 'ai-agents', labelKey: 'admin.nav.aiAgents', href: '/admin/ai-agents', icon: Bot },
  { id: 'settings', labelKey: 'admin.nav.settings', href: '/admin/settings', icon: Settings },
  { id: 'system', labelKey: 'admin.nav.system', href: '/admin/system', icon: Server },
];

function getNavItems(storefrontsEnabled: boolean, supplyChainEnabled: boolean): NavItem[] {
  if (typeof __SOVEREIGN__ !== 'undefined' && __SOVEREIGN__) return [...sovereignNavItems];
  const items = isStandalone() ? [...standaloneNavItems] : [...baseNavItems];

  if (supplyChainEnabled) {
    const collectionsIdx = items.findIndex(item => item.id === 'collections');
    if (collectionsIdx >= 0) {
      items.splice(collectionsIdx + 1, 0, sourcingNavItem);
    } else {
      items.push(sourcingNavItem);
    }
  }

  if (storefrontsEnabled) {
    const idx = items.findIndex(item => item.id === 'storefront');
    if (idx < 0) {
      items.push(storefrontsNavItem);
    } else {
      items.splice(idx + 1, 0, storefrontsNavItem);
    }
  }

  return items;
}

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromSettings = searchParams.get('from') === 'settings';
  const { t } = useI18n();
  const { profile } = useUserStore();
  const standaloneMode = useStorefrontMode();
  const { isEnabled } = useFeatureFlags();
  const storefrontsEnabled = isEnabled('storefrontsEnabled', 'killStorefrontRoutingDisabled');
  const supplyChainEnabled = isEnabled('supplyChainEnabled');
  const aiWorkspaceEnabled = useFeature('aiWorkspaceEnabled');
  const navEntries = applyAiWorkspaceNav(
    getNavItems(storefrontsEnabled, supplyChainEnabled),
    aiWorkspaceEnabled
  );

  const isActive = (item: NavItem) =>
    isAdminNavItemActive(item.href, pathname, item.id, fromSettings);

  const storePeerID = profile?.peerID;
  const storeUrl = storePeerID ? (standaloneMode ? '/' : `/store/${storePeerID}`) : '/';

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link
        key={item.id}
        href={item.href}
        data-testid={`admin-nav-${item.id}`}
        title={collapsed ? t(item.labelKey) : undefined}
        className={cn(
          'flex items-center gap-3 rounded-lg text-sm transition-colors',
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{t(item.labelKey)}</span>}
        {!collapsed && item.badge != null && item.badge > 0 && (
          <span
            className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-amber-500 text-white text-xs font-bold rounded-full"
            data-testid={`admin-nav-${item.id}-badge`}
            aria-label={t('admin.dealLinks.attentionBadge', { count: item.badge })}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
      data-testid="admin-sidebar"
    >
      {/* Logo + Collapse toggle */}
      <div className="flex items-center h-16 px-3 border-b border-border shrink-0">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2 flex-1 min-w-0">
            <MobazhaLogo size={28} className="text-primary shrink-0" />
            <span className="font-semibold text-base text-foreground truncate">
              {t('admin.title')}
            </span>
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" className="mx-auto">
            <MobazhaLogo size={28} className="text-primary" />
          </Link>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-muted text-muted-foreground transition-colors shrink-0"
          aria-label={collapsed ? t('admin.nav.expandSidebar') : t('admin.nav.collapseSidebar')}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navEntries.map((item, index) => {
          const prevGroup = index > 0 ? navEntries[index - 1].group : undefined;
          const groupChanged = item.group !== prevGroup;
          return (
            <React.Fragment key={item.id}>
              {groupChanged && item.group && !collapsed && (
                <div
                  className="px-3 pt-4 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70 select-none"
                  data-testid={`admin-nav-group-${item.group}`}
                >
                  {t(`admin.nav.group.${item.group}`)}
                </div>
              )}
              {groupChanged && index > 0 && collapsed && (
                <div className="mx-2 my-2 border-t border-border" aria-hidden="true" />
              )}
              {groupChanged && !item.group && !collapsed && (
                <div className="mx-2 my-2 border-t border-border" aria-hidden="true" />
              )}
              {renderNavLink(item)}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border py-3 px-2 space-y-1 shrink-0">
        <Link
          href={storeUrl}
          className={cn(
            'flex items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
          )}
          title={collapsed ? t('admin.nav.viewStore') : undefined}
        >
          <Eye className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t('admin.nav.viewStore')}</span>}
        </Link>
        {!standaloneMode && (
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
              collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
            )}
            title={collapsed ? t('admin.nav.backToShopping') : undefined}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{t('admin.nav.backToShopping')}</span>}
          </Link>
        )}
      </div>
    </div>
  );
}

export default AdminSidebar;
