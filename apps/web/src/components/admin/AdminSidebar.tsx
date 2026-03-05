'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n, useUserStore, isStandalone } from '@mobazha/core';
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
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobazhaLogo } from '@/components/ui/MobazhaLogo';

interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', labelKey: 'admin.nav.dashboard', href: '/admin', icon: LayoutDashboard },
  { id: 'products', labelKey: 'admin.nav.products', href: '/admin/products', icon: Package },
  { id: 'orders', labelKey: 'admin.nav.orders', href: '/admin/orders', icon: ShoppingCart },
  { id: 'discounts', labelKey: 'admin.nav.discounts', href: '/admin/discounts', icon: Tag },
  {
    id: 'collections',
    labelKey: 'admin.nav.collections',
    href: '/admin/collections',
    icon: Layers,
  },
  {
    id: 'storefront',
    labelKey: 'admin.nav.storefront',
    href: '/admin/storefront',
    icon: Palette,
  },
  { id: 'analytics', labelKey: 'admin.nav.analytics', href: '/admin/analytics', icon: BarChart3 },
  { id: 'settings', labelKey: 'admin.nav.settings', href: '/admin/settings', icon: Settings },
];

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { profile } = useUserStore();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const storePeerID = profile?.peerID;
  const storeUrl = storePeerID ? (isStandalone() ? '/' : `/store/${storePeerID}`) : '/';

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
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
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
                <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-bold rounded-full">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </Link>
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
        <a
          href="https://docs.mobazha.org"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
          )}
          title={collapsed ? t('admin.nav.help') : undefined}
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{t('admin.nav.help')}</span>}
        </a>
      </div>
    </div>
  );
}

export default AdminSidebar;
