import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockSubmitApplication = vi.fn();
const mockWithdrawApplication = vi.fn();
const mockUseProductGroups = vi.fn();
const mockToast = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-market' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/MobilePageHeader/MobilePageHeader', () => ({
  MobilePageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/components/CommunityMarketplace', () => ({
  MarketplaceLogo: () => <div data-testid="marketplace-logo" />,
}));

vi.mock('@/components/CommunityMarketplace/CollectibleCardSubmissionsWorkspace', () => ({
  CollectibleCardSubmissionsWorkspace: () => null,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useNativeMarketplaceSell: vi.fn(),
    useProductGroups: (...args: unknown[]) => mockUseProductGroups(...args),
    useUserStore: () => ({ isAuthenticated: true }),
    getCasdoorUserId: () => 'user-1',
    useI18n: () => ({ t: (key: string) => key, formatDate: (value: string) => `date:${value}` }),
    isHosted: () => false,
    startCasdoorLogin: vi.fn(),
    resolveCurationMarketBackHref: (href: string) => href,
    marketplaceHref: () => '/marketplace/test-market',
    marketplaceJoinModeKey: () => 'marketplace.joinModeApproval',
    marketplaceVerticalKey: () => 'marketplace.vertical.general',
    MARKETPLACE_CATALOG_MODE_KEYS: {
      open: 'marketplace.enums.catalogMode.open',
      curated: 'marketplace.enums.catalogMode.curated',
    },
    isCollectibleMarketplaceVertical: () => false,
  };
});

import { useNativeMarketplaceSell } from '@mobazha/core';
import MarketplaceSellPage from '@/app/marketplace/[slug]/sell/page';

const mockUseNativeMarketplaceSell = useNativeMarketplaceSell as ReturnType<typeof vi.fn>;

const baseMarketplace = {
  id: 'mp-1',
  name: 'Test Market',
  slug: 'test-market',
  publicURL: 'https://test.example',
  joinMode: 'approval',
  catalogMode: 'curated',
  discoverability: 'public',
  sellerEntryMode: 'seller_self_serve',
  vertical: 'general',
  sellerCount: 0,
  productCount: 0,
};

function mockSellHook(overrides: Record<string, unknown> = {}) {
  const refresh = vi.fn();
  mockUseNativeMarketplaceSell.mockReturnValue({
    marketplace: baseMarketplace,
    application: null,
    reviewEvents: [],
    loading: false,
    error: null,
    reviewEventsLoading: false,
    reviewEventsError: null,
    readingReviewEventID: null,
    isSubmitting: false,
    isWithdrawing: false,
    refresh,
    refreshReviewEvents: vi.fn(),
    submitApplication: mockSubmitApplication,
    withdrawApplication: mockWithdrawApplication,
    markReviewEventRead: vi.fn(),
    ...overrides,
  });
  return { refresh };
}

describe('MarketplaceSellPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProductGroups.mockReturnValue({
      groups: [{ id: 1, name: 'Group A', itemCount: 2 }],
      loading: false,
      loadGroups: vi.fn(),
    });
    mockSubmitApplication.mockResolvedValue({
      hasApplication: true,
      productGroupIDs: [1],
      autoApproved: false,
      membership: { status: 'applied' },
    });
    mockWithdrawApplication.mockResolvedValue({
      hasApplication: true,
      productGroupIDs: [],
      autoApproved: false,
      membership: { status: 'left' },
    });
  });

  it('shows submit for curated markets when a product group is selected', async () => {
    mockSellHook();

    render(<MarketplaceSellPage />);

    const groupButton = screen.getByRole('button', { name: /Group A/i });
    expect(groupButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(groupButton);
    expect(groupButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('marketplace.sell.applicationRequirementsMet')).toBeInTheDocument();
    expect(screen.getByTestId('sell-submit-application')).toBeEnabled();
  });

  it('allows selecting a zero-item owned group for curated applications', async () => {
    mockUseProductGroups.mockReturnValue({
      groups: [{ id: 7, name: 'Empty Group', itemCount: 0 }],
      loading: false,
      loadGroups: vi.fn(),
    });
    mockSellHook();

    render(<MarketplaceSellPage />);

    fireEvent.click(screen.getByRole('button', { name: /Empty Group/i }));
    expect(screen.getByTestId('sell-submit-application')).toBeEnabled();
  });

  it('keeps submit mounted and disabled while submitting', async () => {
    mockSellHook({ isSubmitting: true });

    render(<MarketplaceSellPage />);

    const submitButton = screen.getByTestId('sell-submit-application');
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('common.submitting')).toBeInTheDocument();
  });

  it('shows withdraw for applied applications and hides submit', async () => {
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: { status: 'applied', unreadReviewCount: 0 },
      },
    });

    render(<MarketplaceSellPage />);

    expect(screen.queryByTestId('sell-submit-application')).toBeNull();
    expect(screen.getByTestId('sell-withdraw-application')).toBeInTheDocument();
    expect(screen.getByTestId('sell-status-card')).toBeInTheDocument();
  });

  it('shows seller-visible decision reason for rejected applications', async () => {
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: {
          status: 'rejected',
          decisionReason: 'Missing compliance document',
          unreadReviewCount: 0,
        },
      },
    });

    render(<MarketplaceSellPage />);

    expect(screen.getByText('marketplace.sell.decisionReasonTitle')).toBeInTheDocument();
    expect(screen.getByText('Missing compliance document')).toBeInTheDocument();
    expect(screen.getByTestId('sell-submit-application')).toBeEnabled();
  });

  it('keeps withdraw mounted and disabled while withdrawing', async () => {
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: { status: 'applied', unreadReviewCount: 0 },
      },
      isWithdrawing: true,
    });

    render(<MarketplaceSellPage />);

    const withdrawButton = screen.getByTestId('sell-withdraw-application');
    expect(withdrawButton).toBeInTheDocument();
    expect(withdrawButton).toBeDisabled();
    expect(screen.getByText('common.submitting')).toBeInTheDocument();
  });

  it('shows submit for open catalogs with zero groups before submission', async () => {
    mockUseProductGroups.mockReturnValue({
      groups: [],
      loading: false,
      loadGroups: vi.fn(),
    });
    mockSellHook({
      marketplace: {
        ...baseMarketplace,
        catalogMode: 'open',
        joinMode: 'open',
      },
    });

    render(<MarketplaceSellPage />);

    expect(screen.getByTestId('sell-submit-application')).toBeEnabled();
  });

  it('resets selected groups when application productGroupIDs becomes empty', async () => {
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: { status: 'applied', unreadReviewCount: 0 },
      },
    });

    const { rerender } = render(<MarketplaceSellPage />);
    expect(screen.getByText('1')).toBeInTheDocument();

    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [],
        autoApproved: false,
        membership: { status: 'left', unreadReviewCount: 0 },
      },
    });
    rerender(<MarketplaceSellPage />);

    await waitFor(() => {
      const summaryValue = screen.getByText(
        'marketplace.sell.productGroupsSelected'
      ).nextElementSibling;
      expect(summaryValue).toHaveTextContent('0');
    });
  });

  it('does not reuse a local draft when server productGroupIDs change', async () => {
    mockUseProductGroups.mockReturnValue({
      groups: [
        { id: 1, name: 'Group A', itemCount: 2 },
        { id: 2, name: 'Group B', itemCount: 1 },
      ],
      loading: false,
      loadGroups: vi.fn(),
    });
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [],
        autoApproved: false,
        membership: { status: 'rejected', unreadReviewCount: 0 },
      },
    });

    const { rerender } = render(<MarketplaceSellPage />);

    fireEvent.click(screen.getByRole('button', { name: /Group B/i }));
    expect(screen.getByRole('button', { name: /Group B/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: { status: 'rejected', unreadReviewCount: 0 },
      },
    });
    rerender(<MarketplaceSellPage />);

    expect(screen.getByRole('button', { name: /Group A/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /Group B/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('blocks self-service UI for invite-only markets', async () => {
    mockSellHook({
      marketplace: {
        ...baseMarketplace,
        sellerEntryMode: 'seller_self_serve',
        joinMode: 'invite',
      },
    });

    render(<MarketplaceSellPage />);

    expect(screen.getByText('marketplace.sell.inviteOnlyPolicy')).toBeInTheDocument();
    expect(screen.queryByTestId('sell-submit-application')).toBeNull();
  });

  it('does not expose submit when seller application failed to load and offers retry', async () => {
    const { refresh } = mockSellHook({
      error: 'Seller application unavailable',
      application: null,
    });

    render(<MarketplaceSellPage />);

    expect(screen.getByText('Seller application unavailable')).toBeInTheDocument();
    expect(screen.queryByTestId('sell-submit-application')).toBeNull();
    expect(screen.queryByTestId('sell-withdraw-application')).toBeNull();

    fireEvent.click(screen.getByTestId('sell-load-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders review updates card with unread event mark-read action', async () => {
    const markReviewEventRead = vi.fn();
    const refreshReviewEvents = vi.fn();
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: { status: 'rejected', unreadReviewCount: 1, marketplaceID: 'mp-1' },
      },
      reviewEvents: [
        {
          id: 44,
          marketplaceID: 'mp-1',
          marketplaceStoreID: 3,
          peerID: 'QmSeller',
          actorID: 'QmOperator',
          previousStatus: 'applied',
          status: 'rejected',
          reason: 'Need compliance docs',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      markReviewEventRead,
      refreshReviewEvents,
    });

    render(<MarketplaceSellPage />);

    expect(screen.getByTestId('sell-review-updates-card')).toBeInTheDocument();
    expect(screen.getByTestId('sell-review-unread-badge')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('sell-review-mark-read-44'));
    expect(markReviewEventRead).toHaveBeenCalledWith(44);
    expect(refreshReviewEvents).not.toHaveBeenCalled();
  });

  it('shows localized generic review-updates load error without raw API text', () => {
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: { status: 'rejected', unreadReviewCount: 1, marketplaceID: 'mp-1' },
      },
      reviewEventsError: 'RAW_BACKEND_ERROR',
    });

    render(<MarketplaceSellPage />);

    expect(screen.getByText('marketplace.sell.reviewUpdatesLoadFailed')).toBeInTheDocument();
    expect(screen.queryByText('RAW_BACKEND_ERROR')).not.toBeInTheDocument();
  });

  it('catches mark-read failure and shows localized toast', async () => {
    const markReviewEventRead = vi.fn().mockRejectedValue(new Error('boom'));
    mockSellHook({
      application: {
        hasApplication: true,
        productGroupIDs: [1],
        autoApproved: false,
        membership: { status: 'rejected', unreadReviewCount: 1, marketplaceID: 'mp-1' },
      },
      reviewEvents: [
        {
          id: 55,
          marketplaceID: 'mp-1',
          marketplaceStoreID: 3,
          peerID: 'QmSeller',
          actorID: 'QmOperator',
          previousStatus: 'applied',
          status: 'rejected',
          reason: 'Need docs',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      markReviewEventRead,
    });

    render(<MarketplaceSellPage />);
    fireEvent.click(screen.getByTestId('sell-review-mark-read-55'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'common.error',
          description: 'marketplace.sell.reviewUpdatesMarkReadFailed',
          variant: 'destructive',
        })
      );
    });
  });
});
