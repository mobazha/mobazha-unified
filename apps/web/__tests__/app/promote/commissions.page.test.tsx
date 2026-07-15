// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const routerPushMock = vi.fn();
const setLoginRedirectPathMock = vi.fn();
const useSellerAffiliateStatementsMock = vi.fn();

let isAuthenticated = true;
let routeParams = { sellerPeerID: 'seller-1', programId: 'program-1' };

vi.mock('@/components', () => ({
  Header: () => <div data-testid="mock-header" />,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
  useParams: () => routeParams,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useUserStore: (selector: (state: { isAuthenticated: boolean }) => unknown) =>
      selector({ isAuthenticated }),
    setLoginRedirectPath: (...args: unknown[]) => setLoginRedirectPathMock(...args),
    useSellerAffiliateStatements: (...args: unknown[]) => useSellerAffiliateStatementsMock(...args),
  };
});

import PromoteCommissionsPage from '@/app/promote/[sellerPeerID]/[programId]/commissions/page';

describe('PromoteCommissionsPage (/promote/:sellerPeerID/:programId/commissions)', () => {
  beforeEach(() => {
    isAuthenticated = true;
    routeParams = { sellerPeerID: 'seller-1', programId: 'program-1' };
    routerPushMock.mockClear();
    setLoginRedirectPathMock.mockClear();
    useSellerAffiliateStatementsMock.mockReset().mockReturnValue({
      statements: [],
      loading: false,
      error: null,
      reload: vi.fn(),
    });
  });

  it('requires sign-in and redirects when not authenticated', () => {
    isAuthenticated = false;
    render(<PromoteCommissionsPage />);

    expect(screen.getByTestId('promote-commissions-auth-required')).toBeInTheDocument();
    fireEvent.click(screen.getByText('promote.signInCta'));

    const returnPath = '/promote/seller-1/program-1/commissions';
    expect(setLoginRedirectPathMock).toHaveBeenCalledWith(returnPath);
    expect(routerPushMock).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent(returnPath)}`
    );
  });

  it('shows the promoter statement panel when authenticated', () => {
    render(<PromoteCommissionsPage />);

    expect(screen.getByTestId('promote-commissions-page')).toBeInTheDocument();
    expect(screen.getByTestId('seller-affiliate-statements-promoter')).toBeInTheDocument();
    expect(useSellerAffiliateStatementsMock).toHaveBeenCalledWith('promoter', true, {
      sellerPeerID: 'seller-1',
      programID: 'program-1',
    });
  });
});
