// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { MyMarketplaceMembershipEntry } from '@mobazha/core';

const mockAcceptInvitation = vi.fn();
const mockDeclineInvitation = vi.fn();
const mockLeaveMembership = vi.fn();
const mockMutationState: {
  acceptingId: string | null;
  decliningId: string | null;
  leavingId: string | null;
} = {
  acceptingId: null,
  decliningId: null,
  leavingId: null,
};

const mockMemberships: MyMarketplaceMembershipEntry[] = [
  {
    marketplace: {
      id: 'mp-published',
      name: 'Published Market',
      slug: 'published-market',
      status: 'published',
    },
    membership: {
      id: 1,
      tenantID: 'tenant-1',
      marketplaceID: 'mp-published',
      userID: 'user-1',
      peerID: 'peer-1',
      status: 'approved',
      unreadReviewCount: 0,
      isVisible: true,
      productGroupIDs: [],
      productGroups: [],
    },
  },
  {
    marketplace: {
      id: 'mp-draft',
      name: 'Draft Market',
      slug: 'draft-market',
      status: 'draft',
    },
    membership: {
      id: 2,
      tenantID: 'tenant-1',
      marketplaceID: 'mp-draft',
      userID: 'user-1',
      peerID: 'peer-1',
      status: 'invited',
      unreadReviewCount: 2,
      isVisible: false,
      productGroupIDs: [],
      productGroups: [],
      invitedAt: '2026-01-02T00:00:00Z',
    },
  },
  {
    marketplace: {
      id: 'mp-archived',
      name: 'Archived Market',
      slug: 'archived-market',
      status: 'archived',
    },
    membership: {
      id: 3,
      tenantID: 'tenant-1',
      marketplaceID: 'mp-archived',
      userID: 'user-1',
      peerID: 'peer-1',
      status: 'invited',
      unreadReviewCount: 1,
      isVisible: false,
      productGroupIDs: [],
      productGroups: [],
      invitedAt: '2026-01-03T00:00:00Z',
    },
  },
];

vi.mock('@mobazha/core', () => ({
  MARKETPLACE_LIFECYCLE_STATUS_KEYS: {
    draft: 'marketplace.enums.lifecycle.draft',
    published: 'marketplace.enums.lifecycle.published',
    suspended: 'marketplace.enums.lifecycle.suspended',
    archived: 'marketplace.enums.lifecycle.archived',
  },
  MARKETPLACE_MEMBERSHIP_STATUS_KEYS: {
    invited: 'marketplace.memberships.statusInvited',
    accepted: 'marketplace.memberships.statusAccepted',
    applied: 'marketplace.memberships.statusApplied',
    approved: 'marketplace.memberships.statusApproved',
    rejected: 'marketplace.memberships.statusRejected',
    suspended: 'marketplace.memberships.statusSuspended',
    left: 'marketplace.memberships.statusLeft',
  },
  useI18n: () => ({
    t: (key: string) => key,
    formatDate: () => 'Jan 2, 2026',
  }),
  useMyMarketplaceMemberships: () => ({
    memberships: mockMemberships,
    loading: false,
    loadFailed: false,
    ...mockMutationState,
    refresh: vi.fn(),
    acceptInvitation: mockAcceptInvitation,
    declineInvitation: mockDeclineInvitation,
    leaveMembership: mockLeaveMembership,
  }),
}));

vi.mock('@/components/SettingsLayout', () => ({
  SettingsPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { MarketplaceMembershipsContent } from '@/components/SettingsContent/MarketplaceMembershipsContent';

describe('MarketplaceMembershipsContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutationState.acceptingId = null;
    mockMutationState.decliningId = null;
    mockMutationState.leavingId = null;
  });

  it('renders public marketplace link only for published marketplaces', () => {
    render(<MarketplaceMembershipsContent backHref="/settings" />);

    expect(screen.getByTestId('view-marketplace-mp-published')).toBeInTheDocument();
    expect(screen.queryByTestId('view-marketplace-mp-draft')).not.toBeInTheDocument();
    expect(screen.getByTestId('marketplace-unavailable-mp-draft')).toBeInTheDocument();
    expect(screen.getByTestId('view-review-updates-mp-draft')).toBeInTheDocument();
  });

  it('keeps archived memberships in a separate history section', () => {
    render(<MarketplaceMembershipsContent backHref="/settings" />);

    expect(screen.getByTestId('marketplace-memberships-active-section')).toBeInTheDocument();
    expect(screen.getByTestId('marketplace-memberships-archived-section')).toBeInTheDocument();
    expect(screen.getByTestId('marketplace-membership-mp-archived')).toBeInTheDocument();
    expect(screen.queryByTestId('view-marketplace-mp-archived')).not.toBeInTheDocument();
    expect(screen.queryByTestId('view-review-updates-mp-archived')).not.toBeInTheDocument();
    expect(screen.getByTestId('review-history-static-mp-archived')).toBeInTheDocument();
  });

  it('does not offer accept invitation for archived marketplaces', () => {
    render(<MarketplaceMembershipsContent backHref="/settings" />);

    expect(screen.getByTestId('accept-marketplace-invite-mp-draft')).toBeInTheDocument();
    expect(screen.queryByTestId('accept-marketplace-invite-mp-archived')).not.toBeInTheDocument();
    expect(screen.getByTestId('decline-marketplace-invite-mp-draft')).toBeInTheDocument();
    expect(screen.queryByTestId('decline-marketplace-invite-mp-archived')).not.toBeInTheDocument();
  });

  it('offers leave only for active seller memberships', () => {
    render(<MarketplaceMembershipsContent backHref="/settings" />);

    expect(screen.getByTestId('leave-marketplace-mp-published')).toBeInTheDocument();
    expect(screen.queryByTestId('leave-marketplace-mp-draft')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leave-marketplace-mp-archived')).not.toBeInTheDocument();
  });

  it('disables actions on every card while any membership mutation is pending', () => {
    mockMutationState.acceptingId = 'mp-draft';

    render(<MarketplaceMembershipsContent backHref="/settings" />);

    expect(screen.getByTestId('accept-marketplace-invite-mp-draft')).toBeDisabled();
    expect(screen.getByTestId('decline-marketplace-invite-mp-draft')).toBeDisabled();
    expect(screen.getByTestId('leave-marketplace-mp-published')).toBeDisabled();
  });

  it('shows unread review-updates badge for memberships with unread events', () => {
    render(<MarketplaceMembershipsContent backHref="/settings" />);

    expect(screen.getAllByText('marketplace.memberships.reviewUpdatesUnreadBadge').length).toBe(2);
  });
});
