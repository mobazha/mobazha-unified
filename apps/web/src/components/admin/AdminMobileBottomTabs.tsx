'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@mobazha/core';
import { LayoutDashboard, Package, ShoppingCart, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ElementType;
}

const tabs: TabItem[] = [
  { id: 'dashboard', labelKey: 'admin.nav.dashboard', href: '/admin', icon: LayoutDashboard },
  { id: 'products', labelKey: 'admin.nav.products', href: '/admin/products', icon: Package },
  { id: 'orders', labelKey: 'admin.nav.orders', href: '/admin/orders', icon: ShoppingCart },
  { id: 'settings', labelKey: 'admin.nav.settings', href: '/admin/settings', icon: Settings },
];

export function AdminMobileBottomTabs() {
  const pathname = usePathname();
  const { t } = useI18n();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border pb-[env(safe-area-inset-bottom)]"
      aria-label={t('admin.nav.mainNavigation', { defaultValue: 'Main navigation' })}
    >
      <div className="flex items-stretch h-14">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              data-testid={`mobile-tab-${tab.id}`}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                active ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className={cn('text-[10px] leading-tight', active && 'font-semibold')}>
                {t(tab.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
