import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { StoreAccessGuard } from '@/components/StoreAccessGuard/StoreAccessGuard';

const mockCheckAccess = vi.fn();

let mockGroupContextLoading = true;
let mockGroupContext: { marketplaceID?: string; chatId?: string; chatTitle?: string } | null = null;
let mockIsAuthenticated = true;
let mockRequestorPeerID = 'QmBuyer';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key, locale: 'en' as const }),
    useUserStore: () => ({
      profile: mockRequestorPeerID ? { peerID: mockRequestorPeerID } : null,
      isAuthenticated: mockIsAuthenticated,
    }),
    useGroupContext: () => ({
      context: mockGroupContext,
      loading: mockGroupContextLoading,
    }),
    useAccessControl: () => ({
      checkAccess: mockCheckAccess,
      submitRequest: vi.fn(),
      error: null,
    }),
  };
});

describe('StoreAccessGuard group-context initialization race', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGroupContextLoading = true;
    mockGroupContext = null;
    mockIsAuthenticated = true;
    mockRequestorPeerID = 'QmBuyer';
    mockCheckAccess.mockResolvedValue({
      hasFullAccess: true,
      hasMarketplaceAccess: false,
      accessType: 'whitelist',
      needsRequest: false,
    });
  });

  it('waits for group context init before checking authenticated non-own stores', async () => {
    const { rerender } = render(
      <StoreAccessGuard storePeerID="QmStore" isOwnStore={false}>
        <div data-testid="store-content">content</div>
      </StoreAccessGuard>
    );

    expect(mockCheckAccess).not.toHaveBeenCalled();

    mockGroupContextLoading = false;
    mockGroupContext = { marketplaceID: 'mp-1', chatId: '-100123' };
    rerender(
      <StoreAccessGuard storePeerID="QmStore" isOwnStore={false}>
        <div data-testid="store-content">content</div>
      </StoreAccessGuard>
    );

    await waitFor(() => {
      expect(mockCheckAccess).toHaveBeenCalledWith('QmStore', 'QmBuyer');
    });
  });

  it('skips access check for own store without waiting for group context', async () => {
    mockGroupContextLoading = true;

    render(
      <StoreAccessGuard storePeerID="QmStore" isOwnStore>
        <div data-testid="store-content">content</div>
      </StoreAccessGuard>
    );

    await waitFor(() => {
      expect(mockCheckAccess).not.toHaveBeenCalled();
    });
  });

  it('skips access check for unauthenticated users without waiting for group context', async () => {
    mockGroupContextLoading = true;
    mockIsAuthenticated = false;
    mockRequestorPeerID = '';

    render(
      <StoreAccessGuard storePeerID="QmStore" isOwnStore={false}>
        <div data-testid="store-content">content</div>
      </StoreAccessGuard>
    );

    await waitFor(() => {
      expect(mockCheckAccess).not.toHaveBeenCalled();
    });
  });

  it('re-runs access check when marketplaceID becomes available', async () => {
    mockGroupContextLoading = false;
    mockGroupContext = null;

    const { rerender } = render(
      <StoreAccessGuard storePeerID="QmStore" isOwnStore={false}>
        <div data-testid="store-content">content</div>
      </StoreAccessGuard>
    );

    await waitFor(() => {
      expect(mockCheckAccess).toHaveBeenCalledTimes(1);
    });

    mockGroupContext = { marketplaceID: 'mp-registered', chatId: '-100123' };
    rerender(
      <StoreAccessGuard storePeerID="QmStore" isOwnStore={false}>
        <div data-testid="store-content">content</div>
      </StoreAccessGuard>
    );

    await waitFor(() => {
      expect(mockCheckAccess).toHaveBeenCalledTimes(2);
    });
  });
});
