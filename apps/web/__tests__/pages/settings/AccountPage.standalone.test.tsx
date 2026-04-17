import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ── Module mocks (must precede imports) ──────────────────────────────────────

const mockAcquireSaaSToken = vi.fn();
const mockHasSaaSToken = vi.fn(() => false);
const mockGetLinkedAccounts = vi.fn();
const mockGetLinkConfig = vi.fn();
const mockGetMyStandaloneStore = vi.fn();
const mockGetSetupStatus = vi.fn();
const mockToast = vi.fn();

vi.mock('@mobazha/core/services/api/system', () => ({
  getSetupStatus: (...args: unknown[]) => mockGetSetupStatus(...args),
}));

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue || key,
  }),
  isStandalone: () => true,
  getLinkedAccounts: (...args: unknown[]) => mockGetLinkedAccounts(...args),
  unlinkAccount: vi.fn(),
  startLinkAccount: vi.fn(),
  getLinkConfig: (...args: unknown[]) => mockGetLinkConfig(...args),
  directLinkTelegram: vi.fn(),
  hasLinkCallback: () => false,
  getLinkCallbackParams: () => ({ code: null, state: null, providerId: null }),
  getLinkCallbackStorefrontReturn: () => null,
  handleLinkCallback: vi.fn(),
  clearLinkCallbackParams: vi.fn(),
  SUPPORTED_PROVIDERS: [
    { id: 'telegram', name: 'Telegram' },
    { id: 'discord', name: 'Discord' },
    { id: 'google', name: 'Google' },
  ],
  standaloneStoresApi: {
    getMyStandaloneStore: (...args: unknown[]) => mockGetMyStandaloneStore(...args),
  },
  systemApi: {
    connectPlatform: vi.fn().mockResolvedValue(undefined),
  },
  acquireSaaSToken: (...args: unknown[]) => mockAcquireSaaSToken(...args),
  hasSaaSToken: () => mockHasSaaSToken(),
}));

type MockProps = { children?: React.ReactNode; [key: string]: unknown };

vi.mock('@/components/ui', () => ({
  AlertDialog: ({ children }: MockProps) => <div>{children}</div>,
  AlertDialogAction: ({ children }: MockProps) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: MockProps) => <button>{children}</button>,
  AlertDialogContent: ({ children }: MockProps) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: MockProps) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: MockProps) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: MockProps) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: MockProps) => <h2>{children}</h2>,
  useToast: () => ({ toast: mockToast }),
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: MockProps) => (
    <div className={className as string}>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: MockProps) => (
    <button onClick={onClick as React.MouseEventHandler} disabled={disabled as boolean} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/SettingsLayout', () => ({
  SettingsPageHeader: ({ title, description }: MockProps) => (
    <div data-testid="settings-header">
      <h1>{title as string}</h1>
      <p>{description as string}</p>
    </div>
  ),
}));

vi.mock('@/components/ProviderIcon', () => ({
  ProviderIcon: ({ provider }: MockProps) => (
    <span data-testid={`icon-${provider}`}>{provider as string}</span>
  ),
}));

vi.mock('lucide-react', () => ({
  Link2: ({ className }: MockProps) => <span className={className as string}>Link2</span>,
  Loader2: ({ className }: MockProps) => <span className={className as string}>Loader2</span>,
  Unlink: () => <span>Unlink</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  Check: () => <span>Check</span>,
  Server: () => <span>Server</span>,
  ExternalLink: () => <span>ExternalLink</span>,
  Wifi: () => <span>Wifi</span>,
  WifiOff: () => <span>WifiOff</span>,
}));

import AccountSettingsPage from '../../../src/app/settings/account/page';

describe('AccountSettingsPage — standalone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasSaaSToken.mockReturnValue(false);
    // Default: platform not bound yet (empty ownerUserId)
    mockGetSetupStatus.mockResolvedValue({ ownerUserId: '' });
    mockGetLinkedAccounts.mockRejectedValue(new Error('should not be called'));
    mockGetLinkConfig.mockRejectedValue(new Error('should not be called'));
    mockGetMyStandaloneStore.mockRejectedValue(new Error('not found'));
  });

  // =========================================================================
  // Before SaaS connection: shows connect prompt
  // =========================================================================
  describe('before SaaS connection', () => {
    it('renders "Connect to Mobazha Platform" button', async () => {
      render(<AccountSettingsPage />);
      expect(await screen.findByText('Connect to Mobazha Platform')).toBeInTheDocument();
    });

    it('renders Social Account Binding heading', async () => {
      render(<AccountSettingsPage />);
      expect(await screen.findByText('Social Account Binding')).toBeInTheDocument();
    });

    it('shows provider icons as preview', async () => {
      render(<AccountSettingsPage />);
      expect(await screen.findByTestId('icon-telegram')).toBeInTheDocument();
      expect(screen.getByTestId('icon-discord')).toBeInTheDocument();
      expect(screen.getByTestId('icon-google')).toBeInTheDocument();
    });

    it('does not call getLinkedAccounts before SaaS connection', async () => {
      render(<AccountSettingsPage />);
      // Wait for platformBound to resolve so any post-effect fetches would fire
      await screen.findByText('Connect to Mobazha Platform');
      expect(mockGetLinkedAccounts).not.toHaveBeenCalled();
    });

    it('does not call getLinkConfig before SaaS connection', async () => {
      render(<AccountSettingsPage />);
      await screen.findByText('Connect to Mobazha Platform');
      expect(mockGetLinkConfig).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Connect button interaction
  // =========================================================================
  describe('connect button interaction', () => {
    it('calls acquireSaaSToken when connect button is clicked', async () => {
      mockAcquireSaaSToken.mockResolvedValue({ success: true, token: 'new-jwt' });
      mockGetLinkedAccounts.mockResolvedValue({ accounts: [], totalCount: 0, minRequired: 1 });
      mockGetLinkConfig.mockResolvedValue({ providers: {} });
      mockGetMyStandaloneStore.mockRejectedValue(new Error('not found'));

      render(<AccountSettingsPage />);

      const btn = await screen.findByText('Connect to Mobazha Platform');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockAcquireSaaSToken).toHaveBeenCalledTimes(1);
      });
    });

    it('shows error when acquireSaaSToken fails', async () => {
      mockAcquireSaaSToken.mockResolvedValue({ success: false, error: 'Popup blocked' });

      render(<AccountSettingsPage />);

      const btn = await screen.findByText('Connect to Mobazha Platform');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.getByText('Popup blocked')).toBeInTheDocument();
      });
    });

    it('transitions to binding UI after successful connection', async () => {
      mockAcquireSaaSToken.mockResolvedValue({ success: true, token: 'jwt-123' });
      mockGetLinkedAccounts.mockResolvedValue({
        accounts: [{ provider: 'telegram', providerId: '111', canUnlink: true }],
        totalCount: 1,
        minRequired: 1,
      });
      mockGetLinkConfig.mockResolvedValue({ providers: { telegram: { botUsername: 'testbot' } } });
      mockGetMyStandaloneStore.mockRejectedValue(new Error('not found'));

      render(<AccountSettingsPage />);

      const btn = await screen.findByText('Connect to Mobazha Platform');
      fireEvent.click(btn);

      await waitFor(() => {
        expect(screen.queryByText('Connect to Mobazha Platform')).not.toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // After SaaS connection: shows binding UI
  // =========================================================================
  describe('after SaaS connection (platform bound)', () => {
    beforeEach(() => {
      mockHasSaaSToken.mockReturnValue(true);
      // Platform bound: ownerUserId is non-empty
      mockGetSetupStatus.mockResolvedValue({ ownerUserId: 'user-123' });
      mockGetLinkedAccounts.mockResolvedValue({
        accounts: [{ provider: 'telegram', providerId: '12345', canUnlink: true }],
        totalCount: 1,
        minRequired: 1,
      });
      mockGetLinkConfig.mockResolvedValue({
        providers: { telegram: { botUsername: 'testbot' } },
      });
      mockGetMyStandaloneStore.mockRejectedValue(new Error('not found'));
    });

    it('renders linked accounts section', async () => {
      render(<AccountSettingsPage />);

      await waitFor(() => {
        expect(mockGetLinkedAccounts).toHaveBeenCalled();
      });
    });

    it('fetches link config on mount', async () => {
      render(<AccountSettingsPage />);

      await waitFor(() => {
        expect(mockGetLinkConfig).toHaveBeenCalled();
      });
    });

    it('does not show connect button when already connected', async () => {
      render(<AccountSettingsPage />);
      // Wait for the binding UI to load, then assert connect button is not present
      await waitFor(() => {
        expect(mockGetLinkedAccounts).toHaveBeenCalled();
      });
      expect(screen.queryByText('Connect to Mobazha Platform')).not.toBeInTheDocument();
    });
  });
});
