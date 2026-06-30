import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { MarketplaceStoreMembership, NativeMarketplace } from '@mobazha/core';

const mockToast = vi.fn();
const mockReviewSeller = vi.fn();
const mockPush = vi.fn();
const mockUpdateMarketplace = vi.fn();
const mockArchiveMarketplace = vi.fn();
let mockReviewEventsError: string | null = null;
let latestSettingsCardProps: {
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
  onArchive: () => Promise<unknown>;
} | null = null;

const marketplace: NativeMarketplace = {
  id: 'mp-1',
  name: 'Operator Market',
  slug: 'operator-market',
  status: 'published',
  ownerUserID: 'owner-1',
  joinMode: 'approval',
  catalogMode: 'curated',
  discoverability: 'public',
  sellerEntryMode: 'operator_invited',
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

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mp-1' }),
  useRouter: () => ({ push: mockPush }),
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
    useOperatorMarketplace: () => ({
      marketplace,
      stores,
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
      loading: false,
      loadFailed: false,
      reviewEventsError: mockReviewEventsError,
      working: null,
      refresh: vi.fn(),
      publish: vi.fn(),
      update: mockUpdateMarketplace,
      archive: mockArchiveMarketplace,
      invite: vi.fn(),
      reviewSeller: mockReviewSeller,
    }),
  };
});

vi.mock('@/components', () => ({
  Header: () => <div data-testid="header" />,
  Footer: () => <div data-testid="footer" />,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/Operator/OperatorMarketplaceSettingsCard', () => ({
  OperatorMarketplaceSettingsCard: (props: {
    onSave: (data: Record<string, unknown>) => Promise<unknown>;
    onArchive: () => Promise<unknown>;
  }) => {
    latestSettingsCardProps = props;
    return <div data-testid="settings-card" />;
  },
}));

import MarketplaceOperatorDetailPage from '@/app/operator/marketplaces/[id]/page';

describe('MarketplaceOperatorDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviewEventsError = null;
    latestSettingsCardProps = null;
    mockUpdateMarketplace.mockResolvedValue(marketplace);
    mockArchiveMarketplace.mockResolvedValue({ archived: true, id: marketplace.id });
  });

  it('wires settings save to useOperatorMarketplace.update and shows success toast', async () => {
    render(<MarketplaceOperatorDetailPage />);
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
    expect(latestSettingsCardProps).not.toBeNull();

    await act(async () => {
      await latestSettingsCardProps?.onArchive();
    });

    expect(mockArchiveMarketplace).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/operator/marketplaces');
  });

  it('shows pending count/filter without invited stores', async () => {
    render(<MarketplaceOperatorDetailPage />);

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

    const disclosure = screen.getByTestId('operator-review-history-peer-applied');
    expect(disclosure).toBeInTheDocument();
    fireEvent.click(disclosure.querySelector('summary') as HTMLElement);
    expect(screen.getByText('marketplace.operator.reviewHistoryTransition')).toBeInTheDocument();
    expect(screen.getByText('marketplace.operator.reviewHistoryBy')).toBeInTheDocument();
    expect(screen.getByText('marketplace.operator.reviewHistoryReason')).toBeInTheDocument();
  });

  it('shows localized generic review-history load error without raw API text', () => {
    mockReviewEventsError = 'RAW_REVIEW_HISTORY_FAILURE';
    render(<MarketplaceOperatorDetailPage />);

    expect(screen.getByTestId('operator-review-events-error')).toBeInTheDocument();
    expect(screen.getByText('marketplace.operator.reviewHistoryLoadFailed')).toBeInTheDocument();
    expect(screen.queryByText('RAW_REVIEW_HISTORY_FAILURE')).not.toBeInTheDocument();
  });
});
