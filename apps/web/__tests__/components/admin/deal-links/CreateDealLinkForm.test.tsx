// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ApiError, type SellerDealLink } from '@mobazha/core';

const createSellerDealLinkMock = vi.fn();
const activateSellerDealLinkMock = vi.fn();
const updateSellerDealLinkMock = vi.fn();
const toastMock = vi.fn();

// The product-detail listing surfaced by the mocked `useListing`. Tests that
// exercise variant options set this to a listing whose `item.options` should
// render as pickers; by default no detail loads, matching a plain listing.
let mockProductDetail: unknown = null;

const LISTING = {
  slug: 'listing-1',
  cid: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
  title: 'Design review',
  status: 'published',
  priceHasRange: false,
  contractType: 'SERVICE',
  price: { amount: '12000', currency: { code: 'USD' } },
};
let mockListings = [LISTING];

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

// ProductListingPicker owns the rich combobox interaction and is tested
// separately. Keep this form suite focused on the product-selection effects.
vi.mock('@/components/pickers/ProductListingPicker', () => ({
  ProductListingPicker: ({
    id,
    listings,
    value,
    onValueChange,
  }: {
    id?: string;
    listings: Array<typeof LISTING>;
    value?: string;
    onValueChange: (value: string) => void;
  }) => (
    <select
      id={id}
      value={value}
      onChange={event => onValueChange(event.target.value)}
      data-testid="deal-product-picker"
    >
      <option value="">Choose</option>
      {listings.map(listing => (
        <option key={listing.slug} value={listing.slug}>
          {listing.title}
        </option>
      ))}
    </select>
  ),
}));

// Other form fields still use Radix Select. Swap it for a native select so the
// form's expiry and product-option behavior stays easy to drive in jsdom.
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
    useMyListings: () => ({ listings: mockListings, isLoading: false }),
    useListing: () => ({ listing: mockProductDetail, isOffline: false, isLoading: false }),
    createSellerDealLink: (...args: unknown[]) => createSellerDealLinkMock(...args),
    activateSellerDealLink: (...args: unknown[]) => activateSellerDealLinkMock(...args),
    updateSellerDealLink: (...args: unknown[]) => updateSellerDealLinkMock(...args),
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

const EDIT_LINK: SellerDealLink = {
  ...DRAFT,
  status: 'active',
  currentRevision: 3,
  // 10 + 10 + 6 chars → truncates to '0123456789…UVWXYZ'.
  termsHash: '0123456789abcdefghijklmnopqrstUVWXYZ',
  purchaseTemplate: {
    listingHash: 'QmABC',
    quantity: '2',
    options: [{ name: 'Tier', value: 'Pro' }],
    optionalFeatures: [],
  },
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
    updateSellerDealLinkMock.mockReset();
    toastMock.mockClear();
    mockProductDetail = null;
    mockListings = [LISTING];
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

  it('explains how a protected link differs from a normal product link', () => {
    render(<CreateDealLinkForm onCreated={vi.fn()} />);
    expect(screen.getByTestId('deal-link-what-is')).toHaveTextContent(
      'admin.dealLinks.whatIsTitle'
    );
  });

  it('freezes the chosen quantity and product options into the purchase template', async () => {
    mockProductDetail = {
      slug: 'listing-1',
      item: { options: [{ name: 'Tier', variants: [{ name: 'Basic' }, { name: 'Pro' }] }] },
    };
    createSellerDealLinkMock.mockResolvedValue({ ...DRAFT, status: 'draft' });
    activateSellerDealLinkMock.mockResolvedValue({ ...DRAFT, status: 'active' });
    render(<CreateDealLinkForm onCreated={vi.fn()} />);

    await fillValidForm();
    fireEvent.change(screen.getByTestId('deal-quantity'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Tier'), { target: { value: 'Pro' } });
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(createSellerDealLinkMock).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaseTemplate: expect.objectContaining({
            quantity: '3',
            options: [{ name: 'Tier', value: 'Pro' }],
          }),
        })
      )
    );
  });

  it('rejects a non-positive-integer quantity instead of sending it', async () => {
    render(<CreateDealLinkForm onCreated={vi.fn()} />);

    await fillValidForm();
    fireEvent.change(screen.getByTestId('deal-quantity'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'admin.dealLinks.dealCreateValidationError' })
      )
    );
    expect(createSellerDealLinkMock).not.toHaveBeenCalled();
  });

  it('shows the locked revision and truncated terms hash, and preserves the template on save', async () => {
    mockListings = [{ ...LISTING, cid: 'QmABC', slug: 'locked-design-review' }];
    updateSellerDealLinkMock.mockResolvedValue({ ...EDIT_LINK, currentRevision: 4 });
    render(<CreateDealLinkForm editLink={EDIT_LINK} onSaved={vi.fn()} />);

    expect(screen.getByTestId('deal-link-revision-summary')).toHaveTextContent(
      'admin.dealLinks.revisionValue'
    );
    expect(screen.getByTestId('deal-link-terms-hash')).toHaveTextContent('0123456789…UVWXYZ');
    expect(screen.getByTestId('deal-link-product-locked-badge')).toHaveTextContent(
      'admin.dealLinks.productLockedLabel'
    );
    expect(screen.getByTestId('deal-link-locked-product')).toHaveTextContent(
      'locked-design-review'
    );
    expect(screen.getByTestId('deal-link-product-version')).toHaveTextContent('QmABC');
    expect(screen.getByTestId('deal-link-locked-product')).toHaveTextContent(
      'admin.dealLinks.productLockedHint'
    );
    expect(screen.queryByTestId('deal-link-product-version-warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('deal-quantity')).toHaveValue('2');

    fireEvent.change(screen.getByTestId('deal-quantity'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(updateSellerDealLinkMock).toHaveBeenCalledWith(
        'deal-1',
        expect.objectContaining({
          purchaseTemplate: expect.objectContaining({
            listingHash: 'QmABC',
            quantity: '5',
            options: [{ name: 'Tier', value: 'Pro' }],
          }),
        })
      )
    );
  });

  it('keeps the locked product identifiable when the current listing version is unavailable', () => {
    render(<CreateDealLinkForm editLink={EDIT_LINK} onSaved={vi.fn()} />);

    expect(screen.getByTestId('deal-link-locked-product')).toHaveTextContent('Design review');
    expect(screen.getByTestId('deal-link-product-version')).toHaveAttribute('title', 'QmABC');
    expect(screen.getByTestId('deal-link-product-version-warning')).toHaveTextContent(
      'admin.dealLinks.productVersionUnavailable'
    );
  });

  it('surfaces a permission-denied message when the backend rejects an edit with 403', async () => {
    updateSellerDealLinkMock.mockRejectedValue(new ApiError('forbidden', 403));
    render(<CreateDealLinkForm editLink={EDIT_LINK} onSaved={vi.fn()} />);

    fireEvent.click(screen.getByTestId('admin-deal-links-create-link'));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'admin.dealLinks.dealErrorDenied',
        })
      )
    );
  });
});
