/**
 * MobileNav unit tests
 *
 * P0: HIDE_NAV_PATTERNS must correctly hide/show the nav bar on specific routes.
 * This prevents z-index conflicts with page-specific bottom bars (listing wizard,
 * admin tabs, checkout bar, etc.).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@mobazha/core', () => ({
  useChatStore: (selector: any) => {
    const state = {
      openDrawer: vi.fn(),
      drawerOpen: false,
    };
    return selector ? selector(state) : state;
  },
  selectTotalUnreadCount: () => 0,
  useUserStore: () => ({
    isAuthenticated: true,
    profile: null,
  }),
  useCartStore: (selector: any) => {
    const state = { getItemCount: () => 0 };
    return selector ? selector(state) : state;
  },
  useI18n: () => ({
    t: (key: string) => key,
  }),
  getImageUrl: () => undefined,
}));

// ── Import (after mocks) ─────────────────────────────────────────────────────

import { MobileNav } from '@/components/MobileNav/MobileNav';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MobileNav', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  describe('HIDE_NAV_PATTERNS', () => {
    const shouldHidePaths = [
      ['/orders/abc123', 'order detail'],
      ['/chat/peer-xyz', 'chat detail'],
      ['/checkout', 'checkout root'],
      ['/checkout/confirm', 'checkout sub-page'],
      ['/payment', 'payment root'],
      ['/payment/success', 'payment sub-page'],
      ['/product/vintage-tee', 'product detail'],
      ['/listing/new', 'listing create'],
      ['/listing/edit/my-slug', 'listing edit'],
      ['/admin/products', 'admin products'],
      ['/admin/orders', 'admin orders'],
      ['/admin/settings', 'admin settings'],
    ];

    it.each(shouldHidePaths)('hides nav on %s (%s)', path => {
      mockPathname = path as string;
      const { container } = render(<MobileNav />);
      expect(container.innerHTML).toBe('');
    });

    const shouldShowPaths = [
      ['/', 'home'],
      ['/orders', 'orders list'],
      ['/cart', 'cart'],
      ['/me', 'me/profile'],
      ['/search', 'search'],
      ['/discover', 'discover'],
    ];

    it.each(shouldShowPaths)('shows nav on %s (%s)', path => {
      mockPathname = path as string;
      render(<MobileNav />);
      expect(screen.getByTestId('mobile-nav')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('renders home, orders, cart, chat, me items when authenticated', () => {
      mockPathname = '/';
      render(<MobileNav />);
      const nav = screen.getByTestId('mobile-nav');
      expect(nav).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-home')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-orders')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-cart')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-chat')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-nav-title')).toBeInTheDocument();
    });

    it('highlights home tab when on /', () => {
      mockPathname = '/';
      render(<MobileNav />);
      const homeLink = screen.getByTestId('mobile-nav-home');
      expect(homeLink.className).toContain('text-primary');
    });

    it('highlights orders tab when on /orders', () => {
      mockPathname = '/orders';
      render(<MobileNav />);
      const ordersLink = screen.getByTestId('mobile-nav-orders');
      expect(ordersLink.className).toContain('text-primary');
    });
  });
});
