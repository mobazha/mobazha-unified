// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSellerDealLinkOrders } from '@mobazha/core';
import type { SellerDealLinkOrdersPage } from '@mobazha/core';

const listSellerDealLinkOrdersMock =
  vi.fn<
    (
      dealLinkId: string,
      options?: { limit?: number; offset?: number }
    ) => Promise<SellerDealLinkOrdersPage>
  >();

vi.mock('@mobazha/core/services/api/sellerDealLink', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core/services/api/sellerDealLink')>();
  return {
    ...actual,
    listSellerDealLinkOrders: (dealLinkId: string, options?: { limit?: number; offset?: number }) =>
      listSellerDealLinkOrdersMock(dealLinkId, options),
  };
});

function page(total: number): SellerDealLinkOrdersPage {
  return { items: [], total, limit: 20, offset: 0 };
}

describe('useSellerDealLinkOrders', () => {
  beforeEach(() => {
    listSellerDealLinkOrdersMock.mockReset();
  });

  it('refetches with the new limit/offset when the page changes', async () => {
    listSellerDealLinkOrdersMock.mockResolvedValue(page(45));

    const { rerender } = renderHook(
      ({ offset }: { offset: number }) => useSellerDealLinkOrders('deal-1', { limit: 20, offset }),
      { initialProps: { offset: 0 } }
    );

    await waitFor(() =>
      expect(listSellerDealLinkOrdersMock).toHaveBeenCalledWith('deal-1', {
        limit: 20,
        offset: 0,
      })
    );

    rerender({ offset: 20 });

    await waitFor(() =>
      expect(listSellerDealLinkOrdersMock).toHaveBeenCalledWith('deal-1', {
        limit: 20,
        offset: 20,
      })
    );
    expect(listSellerDealLinkOrdersMock).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale in-flight response when the page changes before it resolves', async () => {
    let resolveFirst: (value: SellerDealLinkOrdersPage) => void = () => {};
    listSellerDealLinkOrdersMock.mockImplementationOnce(
      () =>
        new Promise<SellerDealLinkOrdersPage>(resolve => {
          resolveFirst = resolve;
        })
    );
    listSellerDealLinkOrdersMock.mockResolvedValueOnce({
      items: [],
      total: 45,
      limit: 20,
      offset: 20,
    });

    const { result, rerender } = renderHook(
      ({ offset }: { offset: number }) => useSellerDealLinkOrders('deal-1', { limit: 20, offset }),
      { initialProps: { offset: 0 } }
    );

    rerender({ offset: 20 });
    await waitFor(() => expect(result.current.total).toBe(45));

    // The slow first-page request resolves after the second page already
    // landed; it must not clobber the newer result.
    await act(async () => {
      resolveFirst({ items: [], total: 999, limit: 20, offset: 0 });
      await Promise.resolve();
    });
    expect(result.current.total).toBe(45);
  });

  it('does not fetch when the dealLinkId is empty', () => {
    renderHook(() => useSellerDealLinkOrders('', { limit: 20, offset: 0 }));
    expect(listSellerDealLinkOrdersMock).not.toHaveBeenCalled();
  });
});
