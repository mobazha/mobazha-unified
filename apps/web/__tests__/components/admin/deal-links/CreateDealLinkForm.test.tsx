// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { SellerDealLink } from '@mobazha/core';

const createSellerDealLinkMock = vi.fn();
const activateSellerDealLinkMock = vi.fn();
const toastMock = vi.fn();

const LISTING = {
  slug: 'listing-1',
  cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  title: 'Design review',
  status: 'published',
  priceHasRange: false,
  contractType: 'SERVICE',
  price: { amount: '12000', currency: { code: 'USD' } },
};

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

// The real Select is Radix-based (no native <select> a11y tree jsdom/RTL can
// drive with fireEvent.change). Swap in a native <select> that flattens the
// SelectTrigger id and SelectItem value/label pairs out of the same JSX tree,
// so the form under test is unchanged and only the interaction shape differs.
vi.mock('@/components/ui/select', async () => {
  const ReactModule = await import('react');
  const { Children, isValidElement, createElement } = ReactModule.default ?? ReactModule;

  function SelectItem(_props: { value: string; children: React.ReactNode }) {
    return null;
  }
  function SelectTrigger(_props: { id?: string; children?: React.ReactNode }) {
    return null;
  }
  function SelectContent(_props: { children?: React.ReactNode }) {
    return null;
  }
  function SelectValue() {
    return null;
  }

  interface WalkContext {
    id?: string;
    items: Array<{ value: string; label: React.ReactNode }>;
  }

  function walk(node: React.ReactNode, ctx: WalkContext) {
    Children.forEach(node, child => {
      if (!isValidElement(child)) return;
      const el = child as React.ReactElement<Record<string, unknown>>;
      if (el.type === SelectTrigger) {
        ctx.id = el.props.id as string | undefined;
        walk(el.props.children as React.ReactNode, ctx);
        return;
      }
      if (el.type === SelectItem) {
        ctx.items.push({
          value: el.props.value as string,
          label: el.props.children as React.ReactNode,
        });
        return;
      }
      if (el.props.children) walk(el.props.children as React.ReactNode, ctx);
    });
  }

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) {
    const ctx: WalkContext = { items: [] };
    walk(children, ctx);
    return createElement(
      'select',
      {
        id: ctx.id,
        value,
        onChange: (event: { target: { value: string } }) => onValueChange(event.target.value),
      },
      ctx.items.map(item =>
        createElement('option', { key: item.value, value: item.value }, item.label)
      )
    );
  }

  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    useCurrency: () => ({
      formatPrice: (amount: string, currency: string) => `${amount} ${currency}`,
      fromMinimalUnit: (amount: string) => amount,
    }),
    useMyListings: () => ({ listings: [LISTING], isLoading: false }),
    createSellerDealLink: (...args: unknown[]) => createSellerDealLinkMock(...args),
    activateSellerDealLink: (...args: unknown[]) => activateSellerDealLinkMock(...args),
  };
});

import { CreateDealLinkForm } from '@/components/admin/deal-links/CreateDealLinkForm';

const DRAFT: SellerDealLink = {
  id: 'deal-1',
  publicToken: 'tok_abc',
  publicPath: '/deal/tok_abc',
  sellerPeerID: 'seller-1',
  status: 'draft',
  currentRevision: 1,
  title: 'Design review',
  deliveryType: 'fixed_service',
  priceAmount: '120',
  priceCurrency: 'USD',
  terms: { acceptanceHours: 168, deliverables: ['Design review'] },
  termsHash: 'hash',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

async function fillValidForm() {
  fireEvent.change(screen.getByLabelText('admin.dealLinks.productLabel'), {
    target: { value: 'listing-1' },
  });
  await waitFor(() =>
    expect(screen.getByLabelText('admin.dealLinks.priceLabel')).not.toBeDisabled()
  );
  fireEvent.change(screen.getByLabelText('admin.dealLinks.priceLabel'), {
    target: { value: '120' },
  });
  fireEvent.change(screen.getByLabelText('admin.dealLinks.reviewDaysLabel'), {
    target: { value: '7' },
  });
}

describe('CreateDealLinkForm', () => {
  beforeEach(() => {
    createSellerDealLinkMock.mockReset();
    activateSellerDealLinkMock.mockReset();
    toastMock.mockClear();
  });

  it('persists the draft and calls onCreated when both create and activate succeed', async () => {
    createSellerDealLinkMock.mockResolvedValue({ ...DRAFT, status: 'draft' });
    activateSellerDealLinkMock.mockResolvedValue({ ...DRAFT, status: 'active' });
    const onCreated = vi.fn();
    const onDraftSaved = vi.fn();
    render(<CreateDealLinkForm onCreated={onCreated} onDraftSaved={onDraftSaved} />);

    await fillValidForm();
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() => expect(activateSellerDealLinkMock).toHaveBeenCalledWith('deal-1'));
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
    expect(onDraftSaved).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'admin.dealLinks.dealCreateSuccess' })
    );
  });

  it('surfaces the draft as recoverable, not a hard failure, when activation fails after create succeeds', async () => {
    createSellerDealLinkMock.mockResolvedValue({ ...DRAFT, status: 'draft' });
    activateSellerDealLinkMock.mockRejectedValue(new Error('activation_failed'));
    const onCreated = vi.fn();
    const onDraftSaved = vi.fn();
    render(<CreateDealLinkForm onCreated={onCreated} onDraftSaved={onDraftSaved} />);

    await fillValidForm();
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'admin.dealLinks.draftSavedActivateFailed',
        })
      )
    );
    // The seller is handed the persisted draft, not a generic "create failed" —
    // it is recoverable (editable / re-activatable) from the list.
    expect(onDraftSaved).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'deal-1', status: 'draft' })
    );
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('never calls activate when create itself fails', async () => {
    createSellerDealLinkMock.mockRejectedValue(new Error('create_failed'));
    render(<CreateDealLinkForm onCreated={vi.fn()} onDraftSaved={vi.fn()} />);

    await fillValidForm();
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'admin.dealLinks.dealCreateFailed',
        })
      )
    );
    expect(activateSellerDealLinkMock).not.toHaveBeenCalled();
  });

  it('rejects a scientific-notation price instead of forwarding it to the backend', async () => {
    render(<CreateDealLinkForm onCreated={vi.fn()} />);

    await fillValidForm();
    fireEvent.change(screen.getByLabelText('admin.dealLinks.priceLabel'), {
      target: { value: '1e3' },
    });
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'admin.dealLinks.dealCreateValidationError' })
      )
    );
    expect(createSellerDealLinkMock).not.toHaveBeenCalled();
  });

  it('rejects a price with more than 18 fractional digits', async () => {
    render(<CreateDealLinkForm onCreated={vi.fn()} />);

    await fillValidForm();
    fireEvent.change(screen.getByLabelText('admin.dealLinks.priceLabel'), {
      target: { value: `1.${'1'.repeat(19)}` },
    });
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'admin.dealLinks.dealCreateValidationError' })
      )
    );
    expect(createSellerDealLinkMock).not.toHaveBeenCalled();
  });

  it('rejects a zero price', async () => {
    render(<CreateDealLinkForm onCreated={vi.fn()} />);

    await fillValidForm();
    fireEvent.change(screen.getByLabelText('admin.dealLinks.priceLabel'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'admin.dealLinks.dealCreateValidationError' })
      )
    );
    expect(createSellerDealLinkMock).not.toHaveBeenCalled();
  });

  it('accepts a plain fixed-point decimal price', async () => {
    createSellerDealLinkMock.mockResolvedValue({ ...DRAFT, status: 'draft' });
    activateSellerDealLinkMock.mockResolvedValue({ ...DRAFT, status: 'active' });
    render(<CreateDealLinkForm onCreated={vi.fn()} />);

    await fillValidForm();
    fireEvent.change(screen.getByLabelText('admin.dealLinks.priceLabel'), {
      target: { value: '99.99' },
    });
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(createSellerDealLinkMock).toHaveBeenCalledWith(
        expect.objectContaining({ priceAmount: '99.99' })
      )
    );
  });
});
