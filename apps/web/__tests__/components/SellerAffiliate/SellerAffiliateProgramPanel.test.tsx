// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

const getSellerAffiliateProgramMock = vi.fn();
const putSellerAffiliateProgramMock = vi.fn();
const getSellerAffiliateCapabilitiesMock = vi.fn();
const listSellerAffiliateLinksMock = vi.fn();
const listSellerAffiliateStatementsMock = vi.fn();
const copyToClipboardMock = vi.fn<(text: string) => Promise<boolean>>(async () => true);

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: (text: string) => copyToClipboardMock(text),
}));

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key }),
    batchGetProfileDisplayInfo: async () => new Map(),
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
    listSellerAffiliateStatements: (...args: unknown[]) =>
      listSellerAffiliateStatementsMock(...args),
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
    copyToClipboardMock.mockClear();
    // Unrelated panel sections must not inject their own error alerts into
    // program-form assertions.
    getSellerAffiliateCapabilitiesMock.mockResolvedValue({ version: 2, rails: [] });
    listSellerAffiliateLinksMock.mockResolvedValue([]);
    listSellerAffiliateStatementsMock.mockResolvedValue([]);
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
    expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).toHaveValue('7');
    expect(screen.getByTestId('affiliate-window-unit')).toHaveTextContent(
      'sellerAffiliate.unitDays'
    );
    expect(screen.getByTestId('affiliate-status-badge')).toHaveAttribute('data-status', 'active');
    // An active program offers to pause, not enable.
    expect(screen.getByTestId('affiliate-status-toggle')).toHaveTextContent(
      'sellerAffiliate.pauseProgram'
    );
    // On first load, once hydrated, the form must not read as dirty: the toggle
    // stays enabled and no dirty hint appears (regression guard for the
    // pre-hydration render comparing placeholder defaults against the server).
    expect(screen.getByTestId('affiliate-status-toggle')).not.toBeDisabled();
    expect(screen.queryByTestId('affiliate-status-dirty-hint')).not.toBeInTheDocument();
    expect(screen.getByTestId('affiliate-window-help')).toHaveTextContent(
      'sellerAffiliate.attributionWindowHelp'
    );
    const commissionColumn = screen.getByTestId('affiliate-commission-column');
    expect(within(commissionColumn).getByTestId('affiliate-cost-preview')).toBeInTheDocument();
    expect(within(commissionColumn).getByTestId('affiliate-rate-suffix')).toHaveTextContent('%');
    expect(
      within(screen.getByTestId('affiliate-attribution-column')).queryByTestId(
        'affiliate-cost-preview'
      )
    ).not.toBeInTheDocument();
  });

  it('shows a load error without blocking the form for a first-time (no program) seller', async () => {
    getSellerAffiliateProgramMock.mockRejectedValue(new Error('boom'));
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByText('sellerAffiliate.programLoadFailed')).toBeInTheDocument()
    );
    expect(screen.getByTestId('seller-affiliate-program-save')).not.toBeDisabled();
  });

  it('renders the store-credential recovery state when the program load is denied', async () => {
    getSellerAffiliateProgramMock.mockRejectedValue(
      Object.assign(new Error('mismatch'), { code: 'ACCOUNT_STORE_MISMATCH' })
    );
    render(<SellerAffiliateProgramPanel />);

    const notice = await screen.findByTestId('store-credential-notice');
    expect(notice).toHaveAttribute('data-kind', 'accountStoreMismatch');
    expect(screen.queryByText('sellerAffiliate.programLoadFailed')).not.toBeInTheDocument();
    // The affiliate surface offers both account switch and reconnect.
    expect(screen.getByTestId('store-credential-action-switchAccount')).toBeInTheDocument();
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
      expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).toHaveValue('1')
    );
    expect(screen.getByTestId('affiliate-window-unit')).toHaveTextContent(
      'sellerAffiliate.unitHours'
    );
    expect(screen.queryByTestId('affiliate-window-hint')).not.toBeInTheDocument();

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
      expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).toHaveValue('30')
    );
    expect(screen.queryByTestId('affiliate-window-advice')).not.toBeInTheDocument();
  });

  it('disables the form inputs until the stored program has hydrated', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);

    // Before hydration the fields show placeholder defaults; editing them then
    // would either be clobbered or clobber the real program.
    expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toBeDisabled();
    expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).toBeDisabled();
    expect(screen.getByTestId('affiliate-window-unit')).toBeDisabled();

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).not.toBeDisabled()
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

  it('flags an invalid attribution window inline and blocks saving', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('sellerAffiliate.attributionWindow'), {
      target: { value: 'abc' },
    });

    expect(screen.getByTestId('affiliate-window-error')).toHaveTextContent(
      'sellerAffiliate.invalidWindow'
    );
    expect(screen.getByTestId('seller-affiliate-program-save')).toBeDisabled();
    expect(putSellerAffiliateProgramMock).not.toHaveBeenCalled();
  });

  it('applies a suggested window as whole days and saves its exact seconds', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      attributionWindowSeconds: 3600,
    });
    putSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).toHaveValue('1')
    );
    fireEvent.click(screen.getByTestId('affiliate-window-preset-7'));

    expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).toHaveValue('7');
    expect(screen.getByTestId('affiliate-window-unit')).toHaveTextContent(
      'sellerAffiliate.unitDays'
    );
    expect(screen.getByTestId('affiliate-window-preset-7')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));
    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith(
        expect.objectContaining({ attributionWindowSeconds: 7 * 86_400 })
      )
    );
  });

  it('does not let the status toggle commit unsaved form edits', async () => {
    // Editing the commission but clicking pause must not persist the edit; the
    // toggle is a status-only action and is blocked until the form is saved or
    // reset. This guards against pausing silently writing an unsaved rate.
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toHaveValue('10')
    );

    fireEvent.change(screen.getByLabelText('sellerAffiliate.commissionRate'), {
      target: { value: '15' },
    });
    expect(screen.getByTestId('affiliate-status-dirty-hint')).toHaveTextContent(
      'sellerAffiliate.statusDirtyHint'
    );
    expect(screen.getByTestId('affiliate-status-toggle')).toBeDisabled();
    fireEvent.click(screen.getByTestId('affiliate-status-toggle'));
    expect(putSellerAffiliateProgramMock).not.toHaveBeenCalled();
  });

  it('toggles status using the persisted rate and window, not the form', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    putSellerAffiliateProgramMock.mockResolvedValue({ ...EXISTING_PROGRAM, status: 'paused' });
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() =>
      expect(screen.getByTestId('affiliate-status-badge')).toHaveAttribute('data-status', 'active')
    );

    fireEvent.click(screen.getByTestId('affiliate-status-toggle'));

    await waitFor(() =>
      expect(putSellerAffiliateProgramMock).toHaveBeenCalledWith({
        status: 'paused',
        commissionRateBPS: EXISTING_PROGRAM.commissionRateBPS,
        attributionWindowSeconds: EXISTING_PROGRAM.attributionWindowSeconds,
      })
    );
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
    fireEvent.change(screen.getByLabelText('sellerAffiliate.attributionWindow'), {
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

  it('copies a Peer-addressed promoter invite instead of an account-routed program URL', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    render(<SellerAffiliateProgramPanel />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'sellerAffiliate.copyPromoterInvite' })
    );

    await waitFor(() =>
      expect(copyToClipboardMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/promote\/seller-1\/program-1$/)
      )
    );
  });

  it('surfaces a save failure from the API', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    putSellerAffiliateProgramMock.mockRejectedValue(new Error('save_rejected'));
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    expect(await screen.findByRole('alert')).toHaveTextContent('save_rejected');
  });

  it('renders the rate-limit recovery state when a save is throttled', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(null);
    putSellerAffiliateProgramMock.mockRejectedValue(
      Object.assign(new Error('slow down'), { code: 'RATE_LIMITED', status: 429 })
    );
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() => expect(getSellerAffiliateProgramMock).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    const notice = await screen.findByTestId('store-credential-notice');
    expect(notice).toHaveAttribute('data-kind', 'rateLimited');
  });

  it('re-hydrates without a false dirty state when the program prop switches to a different program', async () => {
    // Simulates the parent page swapping in a different program's already-loaded
    // state (e.g. navigating between sellers) rather than a fresh fetch.
    const programA = {
      ...EXISTING_PROGRAM,
      id: 'program-a',
      commissionRateBPS: 500,
      attributionWindowSeconds: 3 * 86_400,
    };
    const programB = {
      ...EXISTING_PROGRAM,
      id: 'program-b',
      commissionRateBPS: 2000,
      attributionWindowSeconds: 14 * 86_400,
    };
    const stateA = {
      program: programA,
      loading: false,
      error: null,
      errorCause: null,
      reload: vi.fn(),
      save: vi.fn(),
    };
    const stateB = {
      program: programB,
      loading: false,
      error: null,
      errorCause: null,
      reload: vi.fn(),
      save: vi.fn(),
    };

    const { rerender } = render(<SellerAffiliateProgramPanel programState={stateA} />);
    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toHaveValue('5')
    );

    rerender(<SellerAffiliateProgramPanel programState={stateB} />);

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toHaveValue('20')
    );
    expect(screen.getByLabelText('sellerAffiliate.attributionWindow')).toHaveValue('14');
    expect(screen.queryByTestId('affiliate-status-dirty-hint')).not.toBeInTheDocument();
    expect(screen.getByTestId('affiliate-status-toggle')).not.toBeDisabled();
  });

  it('clears the dirty state once a save persists the edited rate and window', async () => {
    getSellerAffiliateProgramMock.mockResolvedValue(EXISTING_PROGRAM);
    putSellerAffiliateProgramMock.mockResolvedValue({
      ...EXISTING_PROGRAM,
      commissionRateBPS: 1500,
    });
    render(<SellerAffiliateProgramPanel />);
    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toHaveValue('10')
    );

    fireEvent.change(screen.getByLabelText('sellerAffiliate.commissionRate'), {
      target: { value: '15' },
    });
    expect(screen.getByTestId('affiliate-status-toggle')).toBeDisabled();

    fireEvent.click(screen.getByTestId('seller-affiliate-program-save'));

    await waitFor(() =>
      expect(screen.getByLabelText('sellerAffiliate.commissionRate')).toHaveValue('15')
    );
    expect(screen.getByTestId('affiliate-status-toggle')).not.toBeDisabled();
    expect(screen.queryByTestId('affiliate-status-dirty-hint')).not.toBeInTheDocument();
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
