// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const getSellerAffiliateProgramMock = vi.fn();
const putSellerAffiliateProgramMock = vi.fn();

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
  };
});

vi.mock('@mobazha/core/services/api/sellerAffiliate', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@mobazha/core/services/api/sellerAffiliate')>();
  return {
    ...actual,
    getSellerAffiliateProgram: () => getSellerAffiliateProgramMock(),
    putSellerAffiliateProgram: (...args: unknown[]) => putSellerAffiliateProgramMock(...args),
  };
});

import { SellerAffiliateProgramPanel } from '@/components/SellerAffiliate/SellerAffiliateProgramPanel';

const EXISTING_PROGRAM = {
  id: 'program-1',
  sellerPeerID: 'seller-1',
  status: 'active' as const,
  commissionRateBPS: 1000,
  attributionWindowSeconds: 7 * 86_400,
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
};

describe('SellerAffiliateProgramPanel', () => {
  beforeEach(() => {
    getSellerAffiliateProgramMock.mockReset();
    putSellerAffiliateProgramMock.mockReset();
  });

  it('loads and populates the form from the existing program', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);

    expect(screen.getByTestId('seller-affiliate-program-panel')).toHaveAttribute(
      'aria-busy',
      'true'
    );

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toHaveValue('10')
    );
    expect(screen.getByLabelText('sellerAffiliate.attributionDays')).toHaveValue('7');
    expect(screen.getByLabelText('sellerAffiliate.status')).toHaveValue('active');
  });

  it('shows a load error without blocking the form for a first-time (no program) seller', async () => {
    getSellerAffiliateProgramMock.mockRejectedValue(new Error('boom'));
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByText('sellerAffiliate.programLoadFailed')).toBeInTheDocument()
    );
    expect(screen.getByTestId('seller-affiliate-program-save')).not.toBeDisabled();
  });

  it('treats a not-found program as a fresh seller instead of an error', async () => {
    getSellerAffiliateProgramMock.mockRejectedValue(new Error('program not found'));
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByTestId('seller-affiliate-program-panel')).toHaveAttribute(
        'aria-busy',
        'false'
      )
    );
    expect(screen.queryByText('sellerAffiliate.programLoadFailed')).not.toBeInTheDocument();
  });

  it('validates the commission rate and attribution window before saving', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('sellerAffiliate.commissionRate'), {
      target: { value: '150' },
    });
    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    expect(await screen.findByRole('alert')).toHaveTextContent('sellerAffiliate.invalidProgram');
    expect(putSellerAffiliateProgramMock).not.toHaveBeenCalled();
  });

  it('saves valid input and clears a previous validation error', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    putSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      commissionRateBPS: 750,
    });
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('sellerAffiliate.commissionRate'), {
      target: { value: '7.5' },
    });
    fireEvent.change(screen.getByLabelText('sellerAffiliate.attributionDays'), {
      target: { value: '14' },
    });
    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith({
        status: 'paused',
        commissionRateBPS: 750,
        attributionWindowSeconds: 14 * 86_400,
      })
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('surfaces a save failure from the API', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    putSellerAffiliateProgramMock.mockRejectedValue(new Error('save_rejected'));
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    expect(await screen.findByRole('alert')).toHaveTextContent('save_rejected');
  });

  it('toggles between active and paused', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    putSellerAffiliateProgramMock.mockResolvedValue({ ...EXISTING_PROGRAM, status: 'paused' });
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.status')).toHaveValue('active')
    );

    fireEvent.change(screen.getByLabelText('sellerAffiliate.status'), {
      target: { value: 'paused' },
    });
    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paused' })
      )
    );
  });
});
