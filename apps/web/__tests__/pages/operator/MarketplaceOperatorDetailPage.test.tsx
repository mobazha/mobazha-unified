// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import type { MarketplaceStoreMembership, NativeMarketplace } from '@mobazha/core';

const mockToast = vi.fn();
const mockReviewSeller = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockUpdateMarketplace = vi.fn();
const mockArchiveMarketplace = vi.fn();
const mockVerifyCustomDomain = vi.fn();
const mockRefresh = vi.fn();
const mockSetAttributionWindowDays = vi.fn();
const mockPublish = vi.fn();
const mockSuspend = vi.fn();
const mockResume = vi.fn();
const mockAddCurationItem = vi.fn();
const mockReorderCurationByKind = vi.fn();
const mockToggleCurationItem = vi.fn();
const mockRemoveCurationItem = vi.fn();
const mockLoadCurationCandidates = vi.fn();
let mockReviewEventsError: string | null = null;
let mockAttributionSummaryError: string | null = null;
let mockAttributionSummaryLoading = false;
let mockPageLoading = false;
let mockAttributionSummary: {
  from: string;
  to: string;
  visits: number;
  impressions: number;
  listingClicks: number;
  checkoutHandoffs: number;
  listingClickRate: number | null;
  checkoutHandoffRate: number | null;
  previousVisits: number;
  previousOrders: number;
  hasData: boolean;
} | null = null;
let latestSettingsCardProps: {
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
  onVerifyCustomDomain: () => Promise<unknown>;
  onArchive: () => Promise<unknown>;
} | null = null;
let latestCurationPanelProps: {
  onAdd: (
    kind: 'listing' | 'seller' | 'banner',
    payload: { peerID?: string; listingSlug?: string }
  ) => Promise<void> | void;
  onReorder: (kind: 'listing' | 'seller' | 'banner', itemIDs: number[]) => Promise<void> | void;
  onToggle: (itemID: number, isActive: boolean) => Promise<void> | void;
  onRemove: (itemID: number) => Promise<void> | void;
  onLoadCandidates: (params: { q?: string; page?: number; pageSize?: number }) => Promise<unknown>;
} | null = null;

const marketplace: NativeMarketplace = {
  id: 'mp-1',
  name: 'Operator Market',
  slug: 'operator-market',
  status: 'published',
  draftRevision: 2,
  publishedRevision: 1,
  hasUnpublishedChanges: false,
  publishedAt: '2026-01-01T00:00:00Z',
  ownerUserID: 'owner-1',
  buyerAccessMode: 'open',
  sellerReviewMode: 'manual',
  catalogMode: 'curated',
  discoverability: 'public',
  sellerEntryMode: 'operator_invited',
  operatorCommissionBps: 0,
  vertical: 'collectibles',
  plan: 'free',
  domains: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function buildStore(
  partial: Partial<MarketplaceStoreMembership> & Pick<MarketplaceStoreMembership, 'id' | 'peerID'>
): MarketplaceStoreMembership {
  const { id, peerID, ...rest } = partial;
  return {
    id,
    tenantID: 'tenant-1',
    marketplaceID: 'mp-1',
    peerID,
    status: 'invited',
    unreadReviewCount: 0,
    isVisible: false,
    productGroupIDs: [],
    productGroups: [],
    ...rest,
  };
}

const stores = [
  buildStore({
    id: 1,
    peerID: 'peer-approved',
    status: 'approved',
    productGroups: [{ id: 9, name: 'Featured', description: 'Hot picks', itemCount: 2 }],
    appliedAt: '2026-01-02T00:00:00Z',
  }),
  buildStore({
    id: 2,
    peerID: 'peer-applied',
    status: 'applied',
    productGroups: [],
    productGroupIDs: [],
    appliedAt: '2026-02-01T00:00:00Z',
  }),
  buildStore({
    id: 3,
    peerID: 'peer-accepted',
    status: 'accepted',
    productGroups: [],
    productGroupIDs: [1, 2],
    acceptedAt: '2026-01-15T00:00:00Z',
  }),
  buildStore({
    id: 4,
    peerID: 'peer-invited',
    status: 'invited',
    invitedAt: '2026-01-20T00:00:00Z',
  }),
];
let currentMarketplace: NativeMarketplace = marketplace;
let currentStores: MarketplaceStoreMembership[] = stores;
let mockSearchParams = new URLSearchParams();
const mockPathname = '/operator/marketplaces/mp-1';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mp-1' }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => mockPathname,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    MARKETPLACE_CATALOG_MODE_KEYS: {
      open: 'marketplace.enums.catalogMode.open',
      curated: 'marketplace.enums.catalogMode.curated',
    },
    MARKETPLACE_DISCOVERABILITY_KEYS: {
      public: 'marketplace.enums.discoverability.public',
      unlisted: 'marketplace.enums.discoverability.unlisted',
    },
    MARKETPLACE_DOMAIN_KIND_KEYS: {
      subdomain: 'marketplace.enums.domainKind.subdomain',
      custom: 'marketplace.enums.domainKind.custom',
    },
    MARKETPLACE_DOMAIN_VERIFICATION_KEYS: {
      pending: 'marketplace.enums.domainVerification.pending',
      verified: 'marketplace.enums.domainVerification.verified',
    },
    MARKETPLACE_LIFECYCLE_STATUS_KEYS: {
      draft: 'marketplace.enums.lifecycle.draft',
      published: 'marketplace.enums.lifecycle.published',
      suspended: 'marketplace.enums.lifecycle.suspended',
      archived: 'marketplace.enums.lifecycle.archived',
    },
    MARKETPLACE_MEMBERSHIP_STATUS_KEYS: {
      invited: 'marketplace.memberships.statusInvited',
      applied: 'marketplace.memberships.statusApplied',
      accepted: 'marketplace.memberships.statusAccepted',
      approved: 'marketplace.memberships.statusApproved',
      rejected: 'marketplace.memberships.statusRejected',
      suspended: 'marketplace.memberships.statusSuspended',
      left: 'marketplace.memberships.statusLeft',
    },
    formatUserName: ({ peerID }: { peerID: string }, { prefix }: { prefix?: string } = {}) =>
      `${prefix ?? ''}${prefix ? ' ' : ''}${peerID}`,
    useI18n: () => ({
      t: (key: string) => key,
      formatDate: (value: string) => `formatted:${value}`,
    }),
    useRuntimeCapability: () => true,
    useOperatorMarketplace: () => ({
      marketplace: currentMarketplace,
      stores: currentStores,
      reviewEvents: [
        {
          id: 8,
          marketplaceID: 'mp-1',
          marketplaceStoreID: 2,
          peerID: 'peer-applied',
          actorID: 'actor-1',
          previousStatus: 'accepted',
          status: 'applied',
          reason: 'Need more details',
          createdAt: '2026-02-02T00:00:00Z',
        },
      ],
      counts: {
        waiting: 4,
        applied: 1,
        invited: 1,
        approved: 1,
        rejected: 0,
        suspended: 0,
      },
      loading: mockPageLoading,
      loadFailed: false,
      reviewEventsError: mockReviewEventsError,
      attributionSummary: mockAttributionSummary,
      attributionSummaryError: mockAttributionSummaryError,
      attributionSummaryLoading: mockAttributionSummaryLoading,
      attributionWindowDays: 30,
      setAttributionWindowDays: mockSetAttributionWindowDays,
      curationItems: [],
      curationCandidates: {
        sellers: [],
        listings: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPage: 0,
      },
      curationLoading: false,
      curationCandidatesLoading: false,
      curationError: null,
      working: null,
      refresh: mockRefresh,
      publish: mockPublish,
      suspend: mockSuspend,
      resume: mockResume,
      update: mockUpdateMarketplace,
      archive: mockArchiveMarketplace,
      invite: vi.fn(),
      reviewSeller: mockReviewSeller,
      verifyCustomDomain: mockVerifyCustomDomain,
      addCurationItem: mockAddCurationItem,
      reorderCurationByKind: mockReorderCurationByKind,
      toggleCurationItem: mockToggleCurationItem,
      removeCurationItem: mockRemoveCurationItem,
      loadCurationCandidates: mockLoadCurationCandidates,
    }),
  };
});

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/ui/tabs', async () => {
  const ReactActual = await vi.importActual<typeof import('react')>('react');
  const TabsContext = ReactActual.createContext<{
    value: string;
    onValueChange: (value: string) => void;
  } | null>(null);

  return {
    Tabs: ({
      defaultValue,
      value,
      onValueChange,
      children,
      className,
    }: {
      defaultValue?: string;
      value?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
      className?: string;
    }) => {
      const [internalValue, setInternalValue] = ReactActual.useState(defaultValue ?? '');
      const activeValue = value ?? internalValue;
      const handleValueChange = (nextValue: string) => {
        if (value === undefined) setInternalValue(nextValue);
        onValueChange?.(nextValue);
      };
      return (
        <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
          <div className={className}>{children}</div>
        </TabsContext.Provider>
      );
    },
    TabsList: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div role="tablist" className={className} {...props}>
        {children}
      </div>
    ),
    TabsTrigger: ({
      value,
      children,
      className,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) => {
      const context = ReactActual.useContext(TabsContext);
      const selected = context?.value === value;
      return (
        <button
          type="button"
          role="tab"
          aria-selected={selected}
          className={className}
          onClick={() => context?.onValueChange(value)}
          {...props}
        >
          {children}
        </button>
      );
    },
    TabsContent: ({
      value,
      children,
      className,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { value: string }) => {
      const context = ReactActual.useContext(TabsContext);
      if (context?.value !== value) return null;
      return (
        <div role="tabpanel" className={className} {...props}>
          {children}
        </div>
      );
    },
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/Operator/OperatorMarketplaceSettingsCard', () => ({
  OperatorMarketplaceSettingsCard: (props: {
    onSave: (data: Record<string, unknown>) => Promise<unknown>;
    onVerifyCustomDomain: () => Promise<unknown>;
    onArchive: () => Promise<unknown>;
  }) => {
    latestSettingsCardProps = props;
    return <div data-testid="settings-card" />;
  },
}));

vi.mock('@/components/Operator/OperatorMarketplaceCurationPanel', () => ({
  OperatorMarketplaceCurationPanel: (props: {
    onAdd: (
      kind: 'listing' | 'seller' | 'banner',
      payload: { peerID?: string; listingSlug?: string }
    ) => Promise<void> | void;
    onReorder: (kind: 'listing' | 'seller' | 'banner', itemIDs: number[]) => Promise<void> | void;
    onToggle: (itemID: number, isActive: boolean) => Promise<void> | void;
    onRemove: (itemID: number) => Promise<void> | void;
    onLoadCandidates: (params: {
      q?: string;
      page?: number;
      pageSize?: number;
    }) => Promise<unknown>;
  }) => {
    latestCurationPanelProps = props;
    return <div data-testid="curation-panel" />;
  },
}));

import MarketplaceOperatorDetailPage from '@/app/operator/marketplaces/[id]/page';

function goToOperatorTab(tab: 'overview' | 'curation' | 'sellers' | 'settings') {
  fireEvent.click(screen.getByTestId(`operator-tab-${tab}`));
}

describe('MarketplaceOperatorDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    currentMarketplace = marketplace;
    currentStores = stores;
    mockReviewEventsError = null;
    mockAttributionSummaryError = null;
    mockAttributionSummaryLoading = false;
    mockPageLoading = false;
    mockAttributionSummary = {
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T00:00:00Z',
      visits: 80,
      impressions: 64,
      listingClicks: 30,
      checkoutHandoffs: 9,
      listingClickRate: 0.375,
      checkoutHandoffRate: 0.3,
      previousVisits: 60,
      previousOrders: 0,
      hasData: true,
    };
    latestSettingsCardProps = null;
    mockUpdateMarketplace.mockResolvedValue(marketplace);
    mockArchiveMarketplace.mockResolvedValue({ archived: true, id: marketplace.id });
    mockVerifyCustomDomain.mockResolvedValue({
      domain: {
        host: 'shop.example.com',
        kind: 'custom',
        verificationStatus: 'verified',
        isPrimary: true,
      },
      verified: true,
      result: 'verified',
    });
    mockAddCurationItem.mockResolvedValue(undefined);
    mockReorderCurationByKind.mockResolvedValue(undefined);
    mockToggleCurationItem.mockResolvedValue(undefined);
    mockRemoveCurationItem.mockResolvedValue(undefined);
    mockLoadCurationCandidates.mockResolvedValue(undefined);
    latestCurationPanelProps = null;
  });

  it('defaults to overview and switches tabs to the right workspaces', () => {
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-tab-content-overview')).toBeInTheDocument();
    expect(screen.getByTestId('operator-metrics-row')).toBeInTheDocument();
    expect(screen.getByTestId('operator-attribution-funnel-card')).toBeInTheDocument();
    expect(screen.queryByTestId('curation-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings-card')).not.toBeInTheDocument();
    expect(screen.queryByTestId('operator-membership-filters')).not.toBeInTheDocument();

    goToOperatorTab('curation');
    expect(screen.getByTestId('operator-tab-content-curation')).toBeInTheDocument();
    expect(screen.getByTestId('curation-panel')).toBeInTheDocument();

    goToOperatorTab('sellers');
    expect(screen.getByTestId('operator-tab-content-sellers')).toBeInTheDocument();
    expect(screen.getByTestId('operator-membership-filters')).toBeInTheDocument();

    goToOperatorTab('settings');
    expect(screen.getByTestId('operator-tab-content-settings')).toBeInTheDocument();
    expect(screen.getByTestId('settings-card')).toBeInTheDocument();
  });

  it('initializes active tab from a valid tab query (deep link)', () => {
    mockSearchParams = new URLSearchParams('tab=sellers');
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-tab-content-sellers')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-tab-content-overview')).not.toBeInTheDocument();
  });

  it('falls back to overview when tab query is invalid', () => {
    mockSearchParams = new URLSearchParams('tab=invalid-tab');
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-tab-content-overview')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-tab-content-settings')).not.toBeInTheDocument();
  });

  it('updates URL tab query and preserves unrelated params when tab changes', () => {
    mockSearchParams = new URLSearchParams('foo=bar&sort=asc');
    render(<MarketplaceOperatorDetailPage />);

    goToOperatorTab('settings');
    expect(mockReplace).toHaveBeenCalledWith(
      '/operator/marketplaces/mp-1?foo=bar&sort=asc&tab=settings',
      { scroll: false }
    );
  });

  it('reacts to tab query changes after initial render', () => {
    const { rerender } = render(<MarketplaceOperatorDetailPage />);
    expect(screen.getByTestId('operator-tab-content-overview')).toBeInTheDocument();

    mockSearchParams = new URLSearchParams('foo=bar&tab=curation');
    rerender(<MarketplaceOperatorDetailPage />);
    expect(screen.getByTestId('operator-tab-content-curation')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-tab-content-overview')).not.toBeInTheDocument();
  });

  it('keeps the curation tab active across the loading refresh after a mutation', () => {
    const { rerender } = render(<MarketplaceOperatorDetailPage />);

    goToOperatorTab('curation');
    expect(screen.getByTestId('operator-tab-content-curation')).toBeInTheDocument();

    mockPageLoading = true;
    rerender(<MarketplaceOperatorDetailPage />);
    expect(screen.queryByTestId('operator-tab-curation')).not.toBeInTheDocument();

    mockPageLoading = false;
    rerender(<MarketplaceOperatorDetailPage />);
    expect(screen.getByTestId('operator-tab-content-curation')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-tab-content-overview')).not.toBeInTheDocument();
  });

  it('keeps self-serve empty marketplaces publish/resume-eligible when domain is verified', () => {
    currentMarketplace = {
      ...marketplace,
      status: 'draft',
      sellerEntryMode: 'seller_self_serve',
      operatorCommissionBps: 0,
      domains: [
        {
          host: 'market.example.test',
          kind: 'subdomain',
          verificationStatus: 'verified',
          isPrimary: true,
        },
      ],
    };
    currentStores = [];
    const { unmount } = render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-marketplace-publish')).toBeEnabled();
    expect(
      screen.getByText('marketplace.operator.launchChecklistSellerSelfServe')
    ).toBeInTheDocument();

    unmount();
    currentMarketplace = { ...currentMarketplace, status: 'suspended' };
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-marketplace-resume')).toBeEnabled();
  });

  it('disables suspended resume until launch checklist readiness is met', async () => {
    currentMarketplace = {
      ...marketplace,
      status: 'suspended',
      sellerEntryMode: 'operator_invited',
      operatorCommissionBps: 0,
      domains: [],
    };
    currentStores = [];

    render(<MarketplaceOperatorDetailPage />);

    const resumeButton = screen.getByTestId('operator-marketplace-resume');
    expect(resumeButton).toBeDisabled();
    goToOperatorTab('settings');
    expect(screen.getByTestId('operator-launch-checklist')).toBeInTheDocument();
    goToOperatorTab('overview');
    expect(screen.getByTestId('operator-resume-disabled-hint')).toBeInTheDocument();

    fireEvent.click(resumeButton);
    await waitFor(() => expect(mockResume).not.toHaveBeenCalled());
  });

  it('enables suspended resume and calls API when readiness checklist is complete', async () => {
    const { unmount } = render(<MarketplaceOperatorDetailPage />);
    fireEvent.click(screen.getByTestId('operator-marketplace-suspend'));
    await waitFor(() => expect(mockSuspend).toHaveBeenCalledTimes(1));

    unmount();
    currentMarketplace = {
      ...marketplace,
      status: 'suspended',
      sellerEntryMode: 'operator_invited',
      operatorCommissionBps: 0,
      domains: [
        {
          host: 'market.example.test',
          kind: 'subdomain',
          verificationStatus: 'verified',
          isPrimary: true,
        },
      ],
    };
    currentStores = [
      buildStore({
        id: 99,
        peerID: 'peer-ready',
        status: 'approved',
        isVisible: true,
      }),
    ];
    render(<MarketplaceOperatorDetailPage />);

    const resumeButton = screen.getByTestId('operator-marketplace-resume');
    expect(resumeButton).toBeEnabled();
    expect(screen.queryByTestId('operator-resume-disabled-hint')).not.toBeInTheDocument();

    fireEvent.click(resumeButton);
    await waitFor(() => expect(mockResume).toHaveBeenCalledTimes(1));
  });

  it('shows publish-changes action for published marketplace with unpublished draft and calls publish', async () => {
    currentMarketplace = {
      ...marketplace,
      status: 'published',
      hasUnpublishedChanges: true,
    };
    render(<MarketplaceOperatorDetailPage />);

    const publishChangesButton = screen.getByTestId('operator-marketplace-publish');
    expect(publishChangesButton).toBeInTheDocument();
    expect(screen.getByTestId('operator-marketplace-suspend')).toBeInTheDocument();
    fireEvent.click(publishChangesButton);

    await waitFor(() => expect(mockPublish).toHaveBeenCalledTimes(1));
  });

  it('shows preview draft link only when marketplace is not archived', () => {
    const { rerender } = render(<MarketplaceOperatorDetailPage />);
    expect(screen.getByTestId('operator-marketplace-preview-link')).toBeInTheDocument();

    currentMarketplace = {
      ...marketplace,
      status: 'archived',
    };
    rerender(<MarketplaceOperatorDetailPage />);
    expect(screen.queryByTestId('operator-marketplace-preview-link')).not.toBeInTheDocument();
  });

  it('wires settings save to useOperatorMarketplace.update and shows success toast', async () => {
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('settings');
    expect(latestSettingsCardProps).not.toBeNull();

    await act(async () => {
      await latestSettingsCardProps?.onSave({ name: 'Updated Name', domain: '' });
    });

    expect(mockUpdateMarketplace).toHaveBeenCalledWith({ name: 'Updated Name', domain: '' });
    expect(mockToast).toHaveBeenCalledWith({ title: 'marketplace.operator.saveSuccess' });
  });

  it('shows destructive toast when settings save fails', async () => {
    mockUpdateMarketplace.mockRejectedValueOnce(new Error('update failed'));
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('settings');
    expect(latestSettingsCardProps).not.toBeNull();

    await act(async () => {
      await latestSettingsCardProps?.onSave({ name: 'Updated Name' });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'marketplace.operator.saveFailedTitle',
        description: 'update failed',
      })
    );
  });

  it('wires archive action and navigates back to console on success', async () => {
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('settings');
    expect(latestSettingsCardProps).not.toBeNull();

    await act(async () => {
      await latestSettingsCardProps?.onArchive();
    });

    expect(mockArchiveMarketplace).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/operator/marketplaces');
  });

  it('shows localized toast for custom-domain verify result variants', async () => {
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('settings');
    expect(latestSettingsCardProps).not.toBeNull();

    await act(async () => {
      await latestSettingsCardProps?.onVerifyCustomDomain();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'marketplace.operator.customDomainVerifySuccessTitle',
      })
    );

    mockVerifyCustomDomain.mockResolvedValueOnce({
      domain: {
        host: 'shop.example.com',
        kind: 'custom',
        verificationStatus: 'pending',
        isPrimary: false,
      },
      verified: false,
      result: 'record_not_found',
    });
    await act(async () => {
      await latestSettingsCardProps?.onVerifyCustomDomain();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'marketplace.operator.customDomainVerifyPendingTitle',
        description: 'marketplace.operator.customDomainVerifyRecordNotFound',
      })
    );

    mockVerifyCustomDomain.mockResolvedValueOnce({
      domain: {
        host: 'shop.example.com',
        kind: 'custom',
        verificationStatus: 'pending',
        isPrimary: false,
      },
      verified: false,
      result: 'challenge_unavailable',
    });
    await act(async () => {
      await latestSettingsCardProps?.onVerifyCustomDomain();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'marketplace.operator.customDomainVerifyFailedTitle',
        description: 'marketplace.operator.customDomainVerifyChallengeUnavailable',
      })
    );
  });

  it('shows pending count/filter without invited stores', async () => {
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('sellers');

    const rows = screen.getAllByTestId('operator-membership-row');
    expect(rows[0]).toHaveAttribute('data-peerid', 'peer-applied');
    expect(rows[1]).toHaveAttribute('data-peerid', 'peer-accepted');
    expect(rows[2]).toHaveAttribute('data-peerid', 'peer-invited');
    expect(rows[3]).toHaveAttribute('data-peerid', 'peer-approved');
    expect(screen.getByTestId('operator-filter-count-pending')).toHaveTextContent('2');
    expect(screen.getAllByText('marketplace.operator.appliedAt')).toHaveLength(2);

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-filter-pending'));
    });
    expect(screen.getAllByTestId('operator-membership-row')).toHaveLength(2);
    expect(screen.queryByTestId('operator-approve-peer-invited')).not.toBeInTheDocument();
  });

  it('shows curated empty-group message and group description/item count', async () => {
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('sellers');

    expect(screen.getByText('marketplace.operator.productGroupWithCount')).toBeInTheDocument();
    expect(screen.getByText('Hot picks')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-filter-applied'));
    });
    expect(
      screen.getByText('marketplace.operator.productGroupsNoneSelectedCurated')
    ).toBeInTheDocument();
  });

  it('uses valid actions only for each status', () => {
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('sellers');

    expect(screen.getByTestId('operator-approve-peer-applied')).toBeInTheDocument();
    expect(screen.getByTestId('operator-reject-peer-applied')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-suspend-peer-applied')).not.toBeInTheDocument();

    expect(screen.getByTestId('operator-suspend-peer-approved')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-approve-peer-approved')).not.toBeInTheDocument();
    expect(screen.queryByTestId('operator-reject-peer-approved')).not.toBeInTheDocument();
  });

  it('keeps dialogs open on API failure and preserves reason input', async () => {
    mockReviewSeller.mockRejectedValueOnce(new Error('failed approve'));
    mockReviewSeller.mockRejectedValueOnce(new Error('failed reject'));

    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('sellers');

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-approve-peer-applied'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-approve-confirm'));
    });
    expect(screen.getByTestId('operator-approve-confirm')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-reject-peer-accepted'));
    });
    const reasonInput = screen.getByTestId('operator-review-reason-input');
    await act(async () => {
      fireEvent.change(reasonInput, { target: { value: 'preserve this reason' } });
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-review-reason-submit'));
    });

    expect(screen.getByTestId('operator-review-reason-input')).toHaveValue('preserve this reason');
    expect(screen.getByTestId('operator-review-reason-submit')).toBeInTheDocument();
  });

  it('confirms approve and forwards trimmed reject reason', async () => {
    mockReviewSeller.mockResolvedValue(undefined);
    mockReviewSeller.mockResolvedValue(undefined);

    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('sellers');

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-approve-peer-applied'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-approve-confirm'));
    });

    await waitFor(() => {
      expect(mockReviewSeller).toHaveBeenCalledWith(
        expect.objectContaining({ peerID: 'peer-applied' }),
        'approved',
        undefined
      );
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-reject-peer-accepted'));
    });
    const reasonInput = screen.getByTestId('operator-review-reason-input');
    const submit = screen.getByTestId('operator-review-reason-submit');

    expect(submit).toBeDisabled();
    await act(async () => {
      fireEvent.change(reasonInput, { target: { value: '  missing compliance docs  ' } });
    });
    expect(submit).toBeEnabled();
    await act(async () => {
      fireEvent.click(submit);
    });

    await waitFor(() => {
      expect(mockReviewSeller).toHaveBeenCalledWith(
        expect.objectContaining({ peerID: 'peer-accepted' }),
        'rejected',
        'missing compliance docs'
      );
    });
  });

  it('renders per-store review history disclosure', () => {
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('sellers');

    const disclosure = screen.getByTestId('operator-review-history-peer-applied');
    expect(disclosure).toBeInTheDocument();
    fireEvent.click(disclosure.querySelector('summary') as HTMLElement);
    expect(screen.getByText('marketplace.operator.reviewHistoryTransition')).toBeInTheDocument();
    expect(screen.getByText('marketplace.operator.reviewHistoryBy')).toBeInTheDocument();
    expect(screen.getByText('marketplace.operator.reviewHistoryReason')).toBeInTheDocument();
  });

  it('handles curation mutation failures with destructive toast without throwing', async () => {
    mockAddCurationItem.mockRejectedValueOnce(new Error('add failed'));
    mockReorderCurationByKind.mockRejectedValueOnce(new Error('reorder failed'));
    mockToggleCurationItem.mockRejectedValueOnce(new Error('toggle failed'));
    mockRemoveCurationItem.mockRejectedValueOnce(new Error('remove failed'));
    mockLoadCurationCandidates.mockRejectedValueOnce(new Error('candidate failed'));

    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('curation');
    expect(latestCurationPanelProps).not.toBeNull();

    await expect(
      latestCurationPanelProps?.onAdd('listing', { peerID: 'peer-a', listingSlug: 'alpha' })
    ).resolves.toBe(false);
    await expect(
      latestCurationPanelProps?.onReorder('listing', [3, 1, 2])
    ).resolves.toBeUndefined();
    await expect(latestCurationPanelProps?.onToggle(99, false)).resolves.toBeUndefined();
    await expect(latestCurationPanelProps?.onRemove(99)).resolves.toBeUndefined();
    await expect(
      latestCurationPanelProps?.onLoadCandidates({ q: 'rare', page: 2, pageSize: 20 })
    ).resolves.toBe(false);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'marketplace.operator.curation.addFailedTitle',
        description: 'add failed',
      })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'marketplace.operator.curation.candidatesLoadFailedTitle',
        description: 'candidate failed',
      })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'marketplace.operator.curation.reorderFailedTitle',
        description: 'reorder failed',
      })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'marketplace.operator.curation.toggleFailedTitle',
        description: 'toggle failed',
      })
    );
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'destructive',
        title: 'marketplace.operator.curation.removeFailedTitle',
        description: 'remove failed',
      })
    );
  });

  it('shows localized generic review-history load error without raw API text', () => {
    mockReviewEventsError = 'RAW_REVIEW_HISTORY_FAILURE';
    render(<MarketplaceOperatorDetailPage />);
    goToOperatorTab('sellers');

    expect(screen.getByTestId('operator-review-events-error')).toBeInTheDocument();
    expect(screen.getByText('marketplace.operator.reviewHistoryLoadFailed')).toBeInTheDocument();
    expect(screen.queryByText('RAW_REVIEW_HISTORY_FAILURE')).not.toBeInTheDocument();
  });

  it('renders attribution funnel steps with transition rates when samples are large enough', () => {
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-attribution-funnel-card')).toBeInTheDocument();
    const funnel = screen.getByTestId('operator-attribution-has-data');
    expect(funnel).toBeInTheDocument();
    expect(within(funnel).getByText('80')).toBeInTheDocument();
    expect(within(funnel).getByText('30')).toBeInTheDocument();
    expect(within(funnel).getByText('9')).toBeInTheDocument();
    expect(within(funnel).getByText('38%')).toBeInTheDocument();
    expect(within(funnel).getByText('30%')).toBeInTheDocument();
  });

  it('suppresses rates on tiny samples and flags deep-linked checkouts', () => {
    mockAttributionSummary = {
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T00:00:00Z',
      visits: 2,
      impressions: 1,
      listingClicks: 0,
      checkoutHandoffs: 1,
      listingClickRate: 0,
      checkoutHandoffRate: null,
      previousVisits: 0,
      previousOrders: 0,
      hasData: true,
    };
    render(<MarketplaceOperatorDetailPage />);

    const funnel = screen.getByTestId('operator-attribution-has-data');
    // 0.0% over 2 visits is noise, not signal — no percentage renders at all.
    expect(within(funnel).queryByText(/%/)).not.toBeInTheDocument();
    // 0 clicks but 1 checkout: the deep-link note explains the non-monotonic step.
    // (The test i18n mock returns raw keys, so assert on the key.)
    expect(
      within(screen.getByTestId('operator-attribution-step-handoffs')).getByText(
        /attributionDeepLinkNote/
      )
    ).toBeInTheDocument();
  });

  it('lets the operator switch the attribution window', () => {
    render(<MarketplaceOperatorDetailPage />);

    fireEvent.click(screen.getByTestId('operator-attribution-window-7'));
    expect(mockSetAttributionWindowDays).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getByTestId('operator-attribution-window-90'));
    expect(mockSetAttributionWindowDays).toHaveBeenCalledWith(90);
  });

  it('renders empty-state copy when attribution summary has no data', () => {
    mockAttributionSummary = {
      from: '2026-01-01T00:00:00Z',
      to: '2026-01-31T00:00:00Z',
      visits: 0,
      impressions: 0,
      listingClicks: 0,
      checkoutHandoffs: 0,
      listingClickRate: null,
      checkoutHandoffRate: null,
      previousVisits: 0,
      previousOrders: 0,
      hasData: false,
    };
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-attribution-no-data')).toBeInTheDocument();
  });

  it('shows summary-load error state without no-data fallback and provides retry', async () => {
    mockAttributionSummary = null;
    mockAttributionSummaryError = 'summary failed';
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-attribution-summary-error')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-attribution-no-data')).not.toBeInTheDocument();
    expect(screen.getByTestId('operator-attribution-summary-retry')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('operator-attribution-summary-retry'));
    });
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    goToOperatorTab('sellers');
    expect(screen.getByTestId('operator-membership-filters')).toBeInTheDocument();
  });

  it('renders summary loading state without no-data or error state', () => {
    mockAttributionSummaryLoading = true;
    mockAttributionSummary = null;
    mockAttributionSummaryError = null;
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-attribution-summary-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('operator-attribution-no-data')).not.toBeInTheDocument();
    expect(screen.queryByTestId('operator-attribution-summary-error')).not.toBeInTheDocument();
  });
});
