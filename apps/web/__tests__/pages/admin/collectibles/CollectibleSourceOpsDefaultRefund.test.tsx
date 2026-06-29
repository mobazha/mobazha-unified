import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import CollectiblesHubOpsPage from '@/app/admin/collectibles/ops/page';

const mockToast = vi.fn();
const mockListSourceDeposits = vi.fn();
const mockDefaultSourceDeposit = vi.fn();

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({
    value,
    onChange,
    id,
    ...props
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    id?: string;
  }) => <input id={id} value={value ?? ''} onChange={onChange} {...props} />,
}));

vi.mock('@/app/collectibles/CollectiblesFeatureGuard', () => ({
  CollectiblesFeatureGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en',
    }),
    useFeatureFlags: () => ({ isEnabled: () => true, loading: false }),
    collectiblesApi: {
      ...actual.collectiblesApi,
      listCollectibleSourceDeposits: (...args: unknown[]) => mockListSourceDeposits(...args),
      defaultCollectibleSourceDeposit: (...args: unknown[]) => mockDefaultSourceDeposit(...args),
      listCollectibleHubSlots: vi.fn().mockResolvedValue({ items: [] }),
      listCollectibleHubRedemptions: vi.fn().mockResolvedValue({ items: [] }),
      listCollectiblePrimarySaleReleaseQueue: vi.fn().mockResolvedValue({ items: [] }),
    },
  };
});

const pendingDeposit = {
  sourceDepositID: 'dep-pending-refund',
  certNumber: 'PSA-PENDING',
  status: 'redeem_requested',
  defaultReason: 'Seller missed SLA',
  defaultRefundStatus: 'pending',
};

const failedDeposit = {
  sourceDepositID: 'dep-failed-refund',
  certNumber: 'PSA-FAILED',
  status: 'in_circulation',
  defaultReason: 'Card unavailable',
  defaultRefundStatus: 'failed',
  defaultRefundError: 'Escrow refund rejected',
};

describe('CollectiblesHubOpsPage default refund UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListSourceDeposits.mockResolvedValue({ items: [pendingDeposit, failedDeposit] });
  });

  async function loadDeposits() {
    render(<CollectiblesHubOpsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'collectibles.sourceOps.refreshQueue' }));
    await waitFor(() => {
      expect(mockListSourceDeposits).toHaveBeenCalled();
    });
    await screen.findByText('PSA-PENDING');
  }

  it('shows pending refund refresh action instead of mark defaulted', async () => {
    await loadDeposits();

    expect(
      screen.getByText('collectibles.sourceDeposit.defaultRefund.status.pending')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'collectibles.sourceOps.refreshDefaultRefund' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'collectibles.sourceOps.markDefaulted' })
    ).not.toBeInTheDocument();
  });

  it('does not toast default success while refund is still pending', async () => {
    mockDefaultSourceDeposit.mockResolvedValue({
      ...pendingDeposit,
      defaultRefundStatus: 'pending',
    });

    await loadDeposits();
    fireEvent.click(
      screen.getByRole('button', { name: 'collectibles.sourceOps.refreshDefaultRefund' })
    );

    await waitFor(() => {
      expect(mockDefaultSourceDeposit).toHaveBeenCalledWith('dep-pending-refund', {
        defaultReason: 'Seller missed SLA',
      });
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'collectibles.sourceOps.defaultRefundPending',
      })
    );
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'collectibles.sourceOps.defaultSuccess',
      })
    );
  });

  it('shows failed refund error and retry action', async () => {
    await loadDeposits();

    expect(screen.getAllByText('Escrow refund rejected').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', { name: 'collectibles.sourceOps.retryDefaultRefund' })
    ).toBeInTheDocument();
  });
});
