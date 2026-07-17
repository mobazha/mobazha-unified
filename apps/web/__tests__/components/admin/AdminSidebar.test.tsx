// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.
import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockAiWorkspaceEnabled = true;
let mockStorefrontsEnabled = false;
let mockSupplyChainEnabled = false;

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === 'string' ? href : String(href)} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({ t: (key: string) => key }),
  useUserStore: () => ({ profile: { peerID: 'QmTestPeer' } }),
  isStandalone: () => false,
  useStorefrontMode: () => false,
  useFeatureFlags: () => ({
    isEnabled: (key: string) =>
      key === 'storefrontsEnabled' ? mockStorefrontsEnabled : mockSupplyChainEnabled,
  }),
  useFeature: (key: string) => (key === 'aiWorkspaceEnabled' ? mockAiWorkspaceEnabled : false),
  getAdminStorePaymentsPath: () => '/admin/payments',
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/components/ui/MobazhaLogo', () => ({
  MobazhaLogo: () => <span data-testid="logo" />,
}));

import { AdminSidebar } from '@/components/admin/AdminSidebar';

function navTestIds(): string[] {
  return screen
    .getAllByTestId(/^admin-nav-/)
    .map(el => el.getAttribute('data-testid') as string)
    .filter(id => !id.includes('-badge'));
}

describe('AdminSidebar', () => {
  beforeEach(() => {
    vi.stubGlobal('__SOVEREIGN__', false);
    mockAiWorkspaceEnabled = true;
    mockStorefrontsEnabled = false;
    mockSupplyChainEnabled = false;
  });

  it('keeps Collections in the catalog section right after Products', () => {
    render(<AdminSidebar />);

    const ids = navTestIds();
    expect(ids.indexOf('admin-nav-collections')).toBe(ids.indexOf('admin-nav-products') + 1);
    expect(ids.indexOf('admin-nav-products')).toBeLessThan(ids.indexOf('admin-nav-orders'));
  });

  it('renders section headers for catalog, sales, marketing and channels', () => {
    render(<AdminSidebar />);

    for (const group of ['catalog', 'sales', 'marketing', 'channels']) {
      expect(screen.getByTestId(`admin-nav-group-${group}`)).toHaveTextContent(
        `admin.nav.group.${group}`
      );
    }
  });

  it('shows the AI Workspace entry when aiWorkspaceEnabled is on', () => {
    render(<AdminSidebar />);

    const workspace = screen.getByTestId('admin-nav-ai-workspace');
    expect(workspace).toHaveAttribute('href', '/admin/ai/workspace');
    expect(screen.queryByTestId('admin-nav-ai-agents')).not.toBeInTheDocument();
  });

  it('falls back to the AI Agents entry when the workspace flag is killed', () => {
    mockAiWorkspaceEnabled = false;
    render(<AdminSidebar />);

    const agents = screen.getByTestId('admin-nav-ai-agents');
    expect(agents).toHaveAttribute('href', '/admin/ai-agents');
    expect(screen.queryByTestId('admin-nav-ai-workspace')).not.toBeInTheDocument();
  });

  it('inserts Sourcing after Collections and Storefronts after Storefront when flags are on', () => {
    mockStorefrontsEnabled = true;
    mockSupplyChainEnabled = true;
    render(<AdminSidebar />);

    const ids = navTestIds();
    expect(ids.indexOf('admin-nav-sourcing')).toBe(ids.indexOf('admin-nav-collections') + 1);
    expect(ids.indexOf('admin-nav-storefronts')).toBe(ids.indexOf('admin-nav-storefront') + 1);
  });
});
