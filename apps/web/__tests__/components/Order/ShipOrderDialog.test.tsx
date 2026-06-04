import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShipOrderDialog } from '../../../src/components/Order/ShipOrderDialog';

const { shipOrderMock, toastMock } = vi.hoisted(() => ({
  shipOrderMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    ordersApi: {
      shipOrder: shipOrderMock,
    },
    walletApi: {
      getReceivingAccounts: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/components/ui', () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  AlertDialogAction: ({
    children,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  AlertDialogCancel: ({
    children,
    disabled,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button type="button" disabled={disabled}>
      {children}
    </button>
  ),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

describe('ShipOrderDialog', () => {
  beforeEach(() => {
    shipOrderMock.mockReset();
    shipOrderMock.mockResolvedValue({ success: true });
    toastMock.mockReset();
  });

  it('submits a note-only shipment for service orders', async () => {
    render(
      <ShipOrderDialog
        open
        onOpenChange={vi.fn()}
        orderId="order-service-1"
        contractType="SERVICE"
        itemCount={2}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('order.ship.notePlaceholder'), {
      target: { value: 'service completed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'order.ship.confirm' }));

    await waitFor(() => expect(shipOrderMock).toHaveBeenCalledTimes(1));
    expect(shipOrderMock).toHaveBeenCalledWith({
      orderID: 'order-service-1',
      shipments: [
        {
          itemIndex: 0,
          note: 'service completed',
        },
        {
          itemIndex: 1,
          note: 'service completed',
        },
      ],
    });
  });
});
