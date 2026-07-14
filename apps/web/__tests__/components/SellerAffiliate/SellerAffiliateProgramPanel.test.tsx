// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const getSellerAffiliateProgramMock = vi.fn();
const putSellerAffiliateProgramMock = vi.fn();
const getSellerAffiliateCapabilitiesMock = vi.fn();
const listSellerAffiliateLinksMock = vi.fn();

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
    getSellerAffiliateCapabilities: () => getSellerAffiliateCapabilitiesMock(),
    listSellerAffiliateLinks: (...args: unknown[]) => listSellerAffiliateLinksMock(...args),
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
    getSellerAffiliateCapabilitiesMock.mockReset();
    listSellerAffiliateLinksMock.mockReset();
    // Unrelated panel sections must not inject their own error alerts into
    // program-form assertions.
    getSellerAffiliateCapabilitiesMock.mockResolvedValue({ version: 2, rails: [] });
    listSellerAffiliateLinksMock.mockResolvedValue([]);
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
    expect(screen.getByTestId('affiliate-status-badge')).toHaveAttribute('data-status', 'active');
    // An active program offers to pause, not enable.
    expect(screen.getByTestId('affiliate-status-toggle')).toHaveTextContent(
      'sellerAffiliate.pauseProgram'
    );
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

  it('shows a sub-day window honestly and never rewrites it on an untouched save', async () => {
    // A 1-hour window set out-of-band (API, tests) must not display as "1 day",
    // and clicking Save without touching the field must send back 3600 verbatim
    // instead of silently converting the program to a 1-day window.
    getSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      attributionWindowSeconds: 3600,
    });
    putSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      attributionWindowSeconds: 3600,
    });
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.attributionDays')).toHaveValue('0.04')
    );
    expect(screen.getByTestId('affiliate-window-hint')).toHaveTextContent(
      'sellerAffiliate.attributionWindowExact'
    );

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));
    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith(
        expect.objectContaining({ attributionWindowSeconds: 3600 })
      )
    );
  });

  it('warns that a sub-day attribution window is too short for content promotion', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      attributionWindowSeconds: 3600,
    });
    render(<SellerAffiliateProgramPanel />);

    const advice = await screen.findByTestId('affiliate-window-advice');
    expect(advice).toHaveAttribute('data-advice', 'too_short');
    expect(advice).toHaveTextContent('sellerAffiliate.attributionWindowTooShort');
  });

  it('gives no window advice at or above the recommended one-week window', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      attributionWindowSeconds: 30 * 86_400,
    });
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.attributionDays')).toHaveValue('30')
    );
    expect(screen.queryByTestId('affiliate-window-advice')).not.toBeInTheDocument();
  });

  it('disables the form inputs until the stored program has hydrated', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);

    // Before hydration the fields show placeholder defaults; editing them then
    // would either be clobbered or clobber the real program.
    expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toBeDisabled();
    expect(screen.getByLabelText('sellerAffiliate.attributionDays')).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.attributionDays')).not.toBeDisabled()
    );
  });

  it('flags an out-of-range commission rate inline and blocks saving', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('sellerAffiliate.commissionRate'), {
      target: { value: '150' },
    });

    expect(screen.getByTestId('affiliate-rate-error')).toHaveTextContent(
      'sellerAffiliate.invalidRate'
    );
    expect(screen.getByTestId('seller-affiliate-program-save')).toBeDisabled();
    expect(putSellerAffiliateProgramMock).not.toHaveBeenCalled();
  });

  it('validates the attribution window before saving', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('sellerAffiliate.attributionDays'), {
      target: { value: 'abc' },
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

    // First-time creation activates the program in one action.
    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith({
        status: 'active',
        commissionRateBPS: 750,
        attributionWindowSeconds: 14 * 86_400,
      })
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('creates a first-time program with the create-and-activate CTA', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    // A first-time seller sees no status control and no pause/enable toggle —
    // only a single create-and-activate action.
    expect(screen.getByTestId('seller-affiliate-program-save')).toHaveTextContent(
      'sellerAffiliate.createAndActivate'
    );
    expect(screen.queryByTestId('affiliate-status-toggle')).not.toBeInTheDocument();
  });

  it('confirms a successful save on the button', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    putSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toHaveValue('10')
    );

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    await waitFor(() =>
      expect(screen.getByTestId('seller-affiliate-program-save')).toHaveTextContent(
        'sellerAffiliate.programSaved'
      )
    );
  });

  it('warns that a paused program earns no new commissions and offers to enable it', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      status: 'paused' as const,
    });
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByTestId('affiliate-status-badge')).toHaveAttribute('data-status', 'paused')
    );
    expect(screen.getByTestId('affiliate-paused-hint')).toHaveTextContent(
      'sellerAffiliate.pausedHint'
    );
    // A paused program offers to activate.
    expect(screen.getByTestId('affiliate-status-toggle')).toHaveTextContent(
      'sellerAffiliate.activateProgram'
    );
  });

  it('enables a paused program through the dedicated toggle, not a plain save', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      status: 'paused' as const,
    });
    // Plain save keeps it paused (so the program stays paused); the toggle then activates.
    putSellerAffiliateProgramMock
      .mockResolvedValueOnce({ ...EXISTING_PROGRAM, status: 'paused' })
      .mockResolvedValueOnce(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(screen.getByTestId('affiliate-status-toggle')).toBeInTheDocument());

    // A plain save keeps the program paused; only the toggle activates it.
    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));
    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paused' })
      )
    );

    putSellerAffiliateProgramMock.mockClear();
    fireEvent.click(screen.getByTestId('affiliate-status-toggle'));
    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      )
    );
  });

  it('tells a first-time seller the invite link unlocks after saving', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByTestId('affiliate-invite-hint')).toHaveTextContent(
        'sellerAffiliate.saveBeforeInvite'
      )
    );
    expect(
      screen.queryByRole('button', { name: 'sellerAffiliate.copyPromoterInvite' })
    ).not.toBeInTheDocument();
  });

  it('surfaces a save failure from the API', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    putSellerAffiliateProgramMock.mockRejectedValue(new Error('save_rejected'));
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    expect(await screen.findByRole('alert')).toHaveTextContent('save_rejected');
  });

  it('pauses an active program through the dedicated toggle', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    putSellerAffiliateProgramMock.mockResolvedValue({ ...EXISTING_PROGRAM, status: 'paused' });
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() =>
      expect(screen.getByTestId('affiliate-status-badge')).toHaveAttribute('data-status', 'active')
    );

    fireEvent.click(screen.getByTestId('affiliate-status-toggle'));

    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'paused' })
      )
    );
  });
});
