// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

let mockPathname = '/settings/general';
let mockStandalone = false;

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
  isStandalone: () => mockStandalone,
}));

import { SettingsSidebar } from '@/components/SettingsSidebar/SettingsSidebar';

describe('SettingsSidebar', () => {
  beforeEach(() => {
    mockPathname = '/settings/general';
    mockStandalone = false;
    vi.stubGlobal('__SOVEREIGN__', false);
  });

  it('shows marketplace memberships nav in hosted SaaS mode', () => {
    render(<SettingsSidebar />);

    expect(screen.getByTestId('settings-nav-marketplace-memberships')).toBeInTheDocument();
    expect(screen.getByTestId('settings-nav-marketplace-memberships')).toHaveAttribute(
      'href',
      '/settings/marketplace-memberships'
    );
  });

  it('hides marketplace memberships nav in standalone mode', () => {
    mockStandalone = true;
    render(<SettingsSidebar />);

    expect(screen.queryByTestId('settings-nav-marketplace-memberships')).not.toBeInTheDocument();
  });

  it('hides marketplace memberships nav in sovereign mode', () => {
    vi.stubGlobal('__SOVEREIGN__', true);
    render(<SettingsSidebar />);

    expect(screen.queryByTestId('settings-nav-marketplace-memberships')).not.toBeInTheDocument();
  });
});
