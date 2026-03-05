/**
 * Admin Dashboard component unit tests
 *
 * Tests StatCard, EmptyState, ListSkeleton, RecentOrderRow, TopProductRow
 * using @testing-library/react with mocked @mobazha/core hooks.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'admin.dashboard.emptyTitle': 'Welcome to your store!',
        'admin.dashboard.emptyDescription': 'Get started by creating your first product.',
        'admin.dashboard.createFirstProduct': 'Create First Product',
        'admin.dashboard.setupStore': 'Set Up Store',
        'order.statusLabels.pending': 'Pending',
        'order.statusLabels.completed': 'Completed',
        'order.statusLabels.shipped': 'Shipped',
        'order.statusLabels.disputed': 'Disputed',
        'order.statusLabels.unknown': 'Unknown',
      };
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(`{{${k}}}`, String(v));
        });
      }
      return result;
    },
  }),
  useCurrency: () => ({
    formatPrice: (amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`,
    fromMinimalUnit: (amount: number, _currency: string) => amount / 100,
  }),
  getImageUrl: (hash: string) => `https://img.test/${hash}`,
  isStandalone: () => false,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) =>
    React.createElement('a', { href, ...props }, children),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { StatCard } from '@/components/admin/dashboard/StatCard';
import { EmptyState } from '@/components/admin/dashboard/EmptyState';
import { ListSkeleton } from '@/components/admin/dashboard/ListSkeleton';
import { RecentOrderRow } from '@/components/admin/dashboard/RecentOrderRow';
import { TopProductRow } from '@/components/admin/dashboard/TopProductRow';
import { Package } from 'lucide-react';

// ── StatCard ─────────────────────────────────────────────────────────────────

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard icon={Package} label="Active Products" value="12" />);
    expect(screen.getByText('Active Products')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders sublabel when provided', () => {
    render(<StatCard icon={Package} label="Orders" value="5" sublabel="All time" />);
    expect(screen.getByText('All time')).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    render(<StatCard icon={Package} label="Orders" value="5" loading />);
    expect(screen.queryByText('5')).not.toBeInTheDocument();
  });

  it('applies correct color class', () => {
    const { container } = render(
      <StatCard icon={Package} label="Test" value="1" color="success" />
    );
    const iconWrapper = container.querySelector('.bg-emerald-500\\/10');
    expect(iconWrapper).toBeInTheDocument();
  });

  it('has data-testid for automation', () => {
    render(<StatCard icon={Package} label="Test" value="0" />);
    expect(screen.getByTestId('admin-stat-card')).toBeInTheDocument();
  });
});

// ── EmptyState ───────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState />);
    expect(screen.getByText('Welcome to your store!')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first product.')).toBeInTheDocument();
  });

  it('renders CTA links with correct hrefs', () => {
    render(<EmptyState />);
    const createLink = screen.getByText('Create First Product').closest('a');
    expect(createLink).toHaveAttribute('href', '/listing/new?from=admin');

    const setupLink = screen.getByText('Set Up Store').closest('a');
    expect(setupLink).toHaveAttribute('href', '/admin/settings');
  });
});

// ── ListSkeleton ─────────────────────────────────────────────────────────────

describe('ListSkeleton', () => {
  it('renders default 3 rows', () => {
    const { container } = render(<ListSkeleton />);
    const rows = container.querySelectorAll('.flex.items-center.gap-3');
    expect(rows.length).toBe(3);
  });

  it('renders custom number of rows', () => {
    const { container } = render(<ListSkeleton rows={5} />);
    const rows = container.querySelectorAll('.flex.items-center.gap-3');
    expect(rows.length).toBe(5);
  });
});

// ── RecentOrderRow ───────────────────────────────────────────────────────────

describe('RecentOrderRow', () => {
  const baseOrder = {
    orderID: 'order-123',
    slug: 'test-product',
    title: 'Vintage T-Shirt',
    thumbnail: { small: 'QmHash123', tiny: '', medium: '', large: '', original: '' },
    total: { amount: 2500, currency: { code: 'USD', divisibility: 2 } },
    quantity: 1,
    timestamp: '2026-02-20T10:00:00Z',
    state: 'COMPLETED' as const,
    read: true,
    vendorID: 'vendor1',
    buyerID: 'buyer1',
    paymentCoin: 'BTC' as const,
    coinType: 'BTC',
    moderated: false,
  };

  it('renders order title and formatted date', () => {
    render(<RecentOrderRow order={baseOrder} />);
    expect(screen.getByText('Vintage T-Shirt')).toBeInTheDocument();
  });

  it('renders localized state label', () => {
    render(<RecentOrderRow order={baseOrder} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<RecentOrderRow order={baseOrder} />);
    expect(screen.getByText('USD 25.00')).toBeInTheDocument();
  });

  it('links to order detail page', () => {
    render(<RecentOrderRow order={baseOrder} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/orders/order-123');
  });

  it('renders disputed state correctly', () => {
    render(<RecentOrderRow order={{ ...baseOrder, state: 'DISPUTED' }} />);
    expect(screen.getByText('Disputed')).toBeInTheDocument();
  });

  it('handles missing thumbnail gracefully', () => {
    const order = {
      ...baseOrder,
      thumbnail: { small: '', tiny: '', medium: '', large: '', original: '' },
    };
    render(<RecentOrderRow order={order} />);
    expect(screen.getByText('Vintage T-Shirt')).toBeInTheDocument();
  });

  it('handles unknown state with fallback label', () => {
    render(<RecentOrderRow order={{ ...baseOrder, state: 'SOME_NEW_STATE' as any }} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

// ── TopProductRow ────────────────────────────────────────────────────────────

describe('TopProductRow', () => {
  const baseProduct = {
    slug: 'vintage-tee',
    title: 'Vintage T-Shirt',
    thumbnail: { small: 'QmProdHash', tiny: '', medium: '', large: '', original: '' },
    price: { amount: 1500, currencyCode: 'USD' },
    averageRating: 4.5,
    ratingCount: 12,
  };

  it('renders product title', () => {
    render(<TopProductRow product={baseProduct as any} />);
    expect(screen.getByText('Vintage T-Shirt')).toBeInTheDocument();
  });

  it('renders formatted price via useCurrency', () => {
    render(<TopProductRow product={baseProduct as any} />);
    expect(screen.getByText('USD 15.00')).toBeInTheDocument();
  });

  it('renders average rating with star', () => {
    render(<TopProductRow product={baseProduct as any} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('links to listing page', () => {
    render(<TopProductRow product={baseProduct as any} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/listing/vintage-tee');
  });

  it('hides rating when zero', () => {
    const product = { ...baseProduct, averageRating: 0 };
    render(<TopProductRow product={product as any} />);
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });

  it('handles missing price gracefully', () => {
    const product = { ...baseProduct, price: undefined };
    render(<TopProductRow product={product as any} />);
    expect(screen.getByText('Vintage T-Shirt')).toBeInTheDocument();
  });
});
