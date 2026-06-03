import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SellerDigitalDeliveryStatus } from '@/components/Order/SellerDigitalDeliveryStatus';

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@mobazha/core', async () => {
  const [actual, disputeDisplay] = await Promise.all([
    vi.importActual<typeof import('@mobazha/core')>('@mobazha/core'),
    vi.importActual<typeof import('@mobazha/core/utils/disputeRulingDisplay')>(
      '@mobazha/core/utils/disputeRulingDisplay'
    ),
  ]);

  return {
    ...(actual as Record<string, unknown>),
    ...(disputeDisplay as Record<string, unknown>),
    useI18n: () => ({
      t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    }),
    digitalAssetsApi: {
      listAssets: vi.fn().mockResolvedValue([]),
      listLicenseKeys: vi.fn().mockResolvedValue([]),
    },
  };
});

const baseProps = {
  isDigitalOrder: true,
  isLoading: false,
  isSyncing: false,
  assetCount: 0,
  hasPreconfiguredAssets: false,
  error: null,
  onSyncDelivery: vi.fn().mockResolvedValue(false),
  listingSlug: 'digital-planner',
  onManageListing: vi.fn(),
};

describe('SellerDigitalDeliveryStatus', () => {
  it('shows manage assets when manual setup is needed even if status is pending', () => {
    const onManageListing = vi.fn();
    render(
      <SellerDigitalDeliveryStatus
        {...baseProps}
        status="pending"
        onManageListing={onManageListing}
      />
    );

    const button = screen.getByRole('button', { name: 'order.digitalDelivery.manageAssets' });
    fireEvent.click(button);
    expect(onManageListing).toHaveBeenCalledWith('digital-planner');
  });

  it('renders stacked layout with a full-width primary manage action', () => {
    render(
      <SellerDigitalDeliveryStatus
        {...baseProps}
        status="manual_required"
        actionLayout="stacked"
        refreshStatus={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'order.digitalDelivery.manageAssets' });
    expect(button.className).toContain('flex-1');
  });

  it('hides manage assets when assets are already configured', () => {
    render(<SellerDigitalDeliveryStatus {...baseProps} hasPreconfiguredAssets status="ready" />);

    expect(
      screen.queryByRole('button', { name: 'order.digitalDelivery.manageAssets' })
    ).not.toBeInTheDocument();
  });

  it('shows retry delivery when ready and retry is allowed', () => {
    const onRetryDelivery = vi.fn().mockResolvedValue(true);
    render(
      <SellerDigitalDeliveryStatus
        {...baseProps}
        hasPreconfiguredAssets
        assetCount={1}
        status="ready"
        canRetryDelivery
        onRetryDelivery={onRetryDelivery}
      />
    );

    const button = screen.getByRole('button', { name: 'order.actions.retryDigitalDelivery' });
    fireEvent.click(button);
    expect(onRetryDelivery).toHaveBeenCalledTimes(1);
  });

  it('hides retry delivery when ready but retry is not allowed yet', () => {
    render(
      <SellerDigitalDeliveryStatus
        {...baseProps}
        hasPreconfiguredAssets
        assetCount={1}
        status="ready"
        canRetryDelivery={false}
        onRetryDelivery={vi.fn().mockResolvedValue(true)}
      />
    );

    expect(
      screen.queryByRole('button', { name: 'order.actions.retryDigitalDelivery' })
    ).not.toBeInTheDocument();
  });

  it('hides stale pending banner on completed orders after dispute resolution', () => {
    const { container } = render(
      <SellerDigitalDeliveryStatus
        {...baseProps}
        hasPreconfiguredAssets
        status="pending"
        orderStatus="completed"
        disputePhase="resolved"
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
