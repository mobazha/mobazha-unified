/**
 * AdminMobileBottomTabs unit tests
 *
 * P1: Route highlighting and accessibility attributes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPathname = '/admin';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string, params?: { defaultValue?: string }) => {
      const translations: Record<string, string> = {
        'admin.nav.dashboard': 'Dashboard',
        'admin.nav.products': 'Products',
        'admin.nav.orders': 'Orders',
        'admin.nav.settings': 'Settings',
        'admin.nav.mainNavigation': 'Main navigation',
      };
      return translations[key] || params?.defaultValue || key;
    },
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// ── Import (after mocks) ─────────────────────────────────────────────────────

import { AdminMobileBottomTabs } from '@/components/admin/AdminMobileBottomTabs';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AdminMobileBottomTabs', () => {
  beforeEach(() => {
    mockPathname = '/admin';
  });

  describe('rendering', () => {
    it('renders all four tabs', () => {
      render(<AdminMobileBottomTabs />);
      expect(screen.getByTestId('mobile-tab-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-tab-products')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-tab-orders')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-tab-settings')).toBeInTheDocument();
    });

    it('renders correct labels', () => {
      render(<AdminMobileBottomTabs />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('has correct href for each tab', () => {
      render(<AdminMobileBottomTabs />);
      expect(screen.getByTestId('mobile-tab-dashboard')).toHaveAttribute('href', '/admin');
      expect(screen.getByTestId('mobile-tab-products')).toHaveAttribute('href', '/admin/products');
      expect(screen.getByTestId('mobile-tab-orders')).toHaveAttribute('href', '/admin/orders');
      expect(screen.getByTestId('mobile-tab-settings')).toHaveAttribute('href', '/admin/settings');
    });
  });

  describe('active state highlighting', () => {
    it('highlights dashboard tab on /admin', () => {
      mockPathname = '/admin';
      render(<AdminMobileBottomTabs />);
      const tab = screen.getByTestId('mobile-tab-dashboard');
      expect(tab.className).toContain('text-primary');
      expect(tab).toHaveAttribute('aria-current', 'page');
    });

    it('highlights products tab on /admin/products', () => {
      mockPathname = '/admin/products';
      render(<AdminMobileBottomTabs />);
      const tab = screen.getByTestId('mobile-tab-products');
      expect(tab.className).toContain('text-primary');
      expect(tab).toHaveAttribute('aria-current', 'page');
    });

    it('highlights orders tab on /admin/orders', () => {
      mockPathname = '/admin/orders';
      render(<AdminMobileBottomTabs />);
      const tab = screen.getByTestId('mobile-tab-orders');
      expect(tab.className).toContain('text-primary');
      expect(tab).toHaveAttribute('aria-current', 'page');
    });

    it('highlights settings tab on /admin/settings', () => {
      mockPathname = '/admin/settings';
      render(<AdminMobileBottomTabs />);
      const tab = screen.getByTestId('mobile-tab-settings');
      expect(tab.className).toContain('text-primary');
      expect(tab).toHaveAttribute('aria-current', 'page');
    });

    it('does not highlight dashboard on /admin/products (exact match for /admin)', () => {
      mockPathname = '/admin/products';
      render(<AdminMobileBottomTabs />);
      const tab = screen.getByTestId('mobile-tab-dashboard');
      expect(tab.className).not.toContain('text-primary');
      expect(tab).not.toHaveAttribute('aria-current');
    });

    it('highlights products tab on sub-path /admin/products/new', () => {
      mockPathname = '/admin/products/new';
      render(<AdminMobileBottomTabs />);
      const tab = screen.getByTestId('mobile-tab-products');
      expect(tab.className).toContain('text-primary');
    });
  });

  describe('accessibility', () => {
    it('has aria-label on nav element', () => {
      render(<AdminMobileBottomTabs />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');
    });

    it('sets aria-current=page only on active tab', () => {
      mockPathname = '/admin/orders';
      render(<AdminMobileBottomTabs />);

      expect(screen.getByTestId('mobile-tab-orders')).toHaveAttribute('aria-current', 'page');
      expect(screen.getByTestId('mobile-tab-dashboard')).not.toHaveAttribute('aria-current');
      expect(screen.getByTestId('mobile-tab-products')).not.toHaveAttribute('aria-current');
      expect(screen.getByTestId('mobile-tab-settings')).not.toHaveAttribute('aria-current');
    });

    it('all tabs have minimum 44px touch target', () => {
      render(<AdminMobileBottomTabs />);
      const tabs = [
        screen.getByTestId('mobile-tab-dashboard'),
        screen.getByTestId('mobile-tab-products'),
        screen.getByTestId('mobile-tab-orders'),
        screen.getByTestId('mobile-tab-settings'),
      ];
      tabs.forEach(tab => {
        expect(tab.className).toContain('min-h-[44px]');
      });
    });
  });
});
