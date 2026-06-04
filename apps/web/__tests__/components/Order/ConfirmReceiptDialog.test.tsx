import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmReceiptDialog } from '../../../src/components/Order/ConfirmReceiptDialog';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  };
});

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
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
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

describe('ConfirmReceiptDialog', () => {
  it('shows service-specific copy for SERVICE contract type', () => {
    render(
      <ConfirmReceiptDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        contractType="SERVICE"
      />
    );

    expect(screen.getByRole('heading')).toHaveTextContent(
      'order.dialogs.completeOrder.titleService'
    );
    expect(screen.getByText('order.dialogs.completeOrder.descriptionService')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'order.actions.completeService' })
    ).toBeInTheDocument();
  });

  it('calls onConfirm when the primary action is clicked', () => {
    const onConfirm = vi.fn();

    render(
      <ConfirmReceiptDialog
        open
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        contractType="PHYSICAL_GOOD"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'order.actions.complete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
