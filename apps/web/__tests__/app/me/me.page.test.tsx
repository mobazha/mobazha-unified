import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

let mockHosted = true;
let mockStandalone = false;
let mockAuthenticated = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/hooks/useMiniAppRegister', () => ({
  useMiniAppRegister: () => ({ promptRegister: vi.fn() }),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@mobazha/ui/hooks', () => ({
  usePlatform: () => ({ isTGMiniApp: false, isEmbeddedApp: false }),
  isEmbeddedRuntime: () => false,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en',
      setLocale: vi.fn(),
      supportedLocales: ['en'] as const,
      localeInfo: { en: { nativeName: 'English', flag: '🇺🇸' } },
    }),
    useUserStore: () => ({
      isAuthenticated: mockAuthenticated,
      profile: mockAuthenticated ? { peerID: 'QmTestPeer', name: 'Test User' } : null,
      isLoading: false,
      logout: vi.fn(),
    }),
    useUserContext: () => ({
      hasStore: false,
      isPureBuyer: false,
    }),
    useCartStore: (selector?: (state: { items: unknown[] }) => unknown) => {
      const state = { items: [] as unknown[] };
      return selector ? selector(state) : state;
    },
    useTheme: () => ({ isDark: false, toggleDarkMode: vi.fn() }),
    useFeatureFlags: () => ({ isEnabled: () => false }),
    useFeature: () => false,
    useMiniAppRole: () => ({
      role: null,
      isLoading: false,
      storeClaimed: null,
      refetch: vi.fn(),
    }),
    isHosted: () => mockHosted,
    useStorefrontMode: () => mockStandalone,
    getImageUrl: () => undefined,
    startCasdoorLogin: vi.fn(),
  };
});

import MePage from '@/app/me/page';

describe('MePage MaaS navigation', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    mockHosted = true;
    mockStandalone = false;
    mockAuthenticated = true;
    vi.stubGlobal('__OUTPOST__', false);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('shows marketplace operator and invitations in hosted SaaS mode', () => {
    render(<MePage />);

    const operatorLink = screen.getByTestId('me-operator-marketplaces');
    expect(operatorLink).toBeInTheDocument();
    expect(operatorLink).toHaveAttribute('href', '/operator/marketplaces');
    expect(operatorLink).toHaveTextContent('userMenu.operatorMarketplaces');

    const invitationsLink = screen.getByTestId('me-marketplace-invitations');
    expect(invitationsLink).toBeInTheDocument();
    expect(invitationsLink).toHaveAttribute('href', '/settings/marketplace-memberships');
    expect(invitationsLink).toHaveTextContent('userMenu.marketplaceInvitations');
  });

  it('hides marketplace entries in standalone storefront mode', () => {
    mockStandalone = true;
    render(<MePage />);

    expect(screen.queryByTestId('me-operator-marketplaces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('me-marketplace-invitations')).not.toBeInTheDocument();
  });

  it('hides marketplace entries in outpost mode', () => {
    vi.stubGlobal('__OUTPOST__', true);
    render(<MePage />);

    expect(screen.queryByTestId('me-operator-marketplaces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('me-marketplace-invitations')).not.toBeInTheDocument();
  });

  it('hides marketplace entries when not authenticated', () => {
    mockAuthenticated = false;
    render(<MePage />);

    expect(screen.queryByTestId('me-operator-marketplaces')).not.toBeInTheDocument();
    expect(screen.queryByTestId('me-marketplace-invitations')).not.toBeInTheDocument();
  });
});
