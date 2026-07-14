// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    // Echo keys so assertions can target the resolved i18n key.
    useI18n: () => ({ t: (key: string) => key }),
  };
});

import { StoreCredentialNotice } from '@/components/common/StoreCredentialNotice';

describe('StoreCredentialNotice', () => {
  it('offers a refresh-credential action (not OAuth, not plain retry) for STORE_CREDENTIAL_INVALID', () => {
    const onRefreshCredential = vi.fn();
    render(
      <StoreCredentialNotice
        error={{ code: 'STORE_CREDENTIAL_INVALID' }}
        onRefreshCredential={onRefreshCredential}
        // Wire OAuth handlers too to prove they are never rendered for this kind.
        onSwitchAccount={vi.fn()}
        onConnect={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    const notice = screen.getByTestId('store-credential-notice');
    expect(notice).toHaveAttribute('data-kind', 'storeCredentialInvalid');
    expect(notice).toHaveTextContent('storeCredential.storeCredentialInvalidTitle');
    expect(notice).toHaveTextContent('storeCredential.storeCredentialInvalidBody');
    // The recovery action re-registers the store credential — no OAuth affordance
    // and no plain retry are offered.
    expect(screen.queryByTestId('store-credential-action-switchAccount')).toBeNull();
    expect(screen.queryByTestId('store-credential-action-connect')).toBeNull();
    expect(screen.queryByTestId('store-credential-action-retry')).toBeNull();

    fireEvent.click(screen.getByTestId('store-credential-action-refreshCredential'));
    expect(onRefreshCredential).toHaveBeenCalledTimes(1);
  });

  it('offers both switch-account and disconnect for ACCOUNT_STORE_MISMATCH', () => {
    const onSwitchAccount = vi.fn();
    const onDisconnect = vi.fn();
    render(
      <StoreCredentialNotice
        error={{ code: 'ACCOUNT_STORE_MISMATCH' }}
        onSwitchAccount={onSwitchAccount}
        onDisconnect={onDisconnect}
      />
    );

    fireEvent.click(screen.getByTestId('store-credential-action-switchAccount'));
    expect(onSwitchAccount).toHaveBeenCalledTimes(1);
    // Switch account fires immediately; disconnect is confirmation-gated.
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('requires an explicit confirmation before disconnecting the store account', () => {
    const onDisconnect = vi.fn();
    render(
      <StoreCredentialNotice
        error={{ code: 'ACCOUNT_STORE_MISMATCH' }}
        onDisconnect={onDisconnect}
      />
    );

    // Clicking the disconnect action opens a confirmation dialog rather than
    // firing onDisconnect straight away.
    fireEvent.click(screen.getByTestId('store-credential-action-disconnect'));
    expect(onDisconnect).not.toHaveBeenCalled();

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('storeCredential.accountStoreMismatchDisconnectConfirmTitle');
    // The confirm copy reassures that only the association is removed.
    expect(dialog).toHaveTextContent('storeCredential.accountStoreMismatchDisconnectConfirmBody');

    // Confirming fires the disconnect exactly once.
    fireEvent.click(screen.getByText('storeCredential.accountStoreMismatchDisconnectConfirmCta'));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('cancelling the disconnect confirmation does nothing', () => {
    const onDisconnect = vi.fn();
    render(
      <StoreCredentialNotice
        error={{ code: 'ACCOUNT_STORE_MISMATCH' }}
        onDisconnect={onDisconnect}
      />
    );

    fireEvent.click(screen.getByTestId('store-credential-action-disconnect'));
    fireEvent.click(screen.getByText('storeCredential.accountStoreMismatchDisconnectCancelCta'));
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('renders a retry affordance for RATE_LIMITED', () => {
    const onRetry = vi.fn();
    render(<StoreCredentialNotice error={{ code: 'RATE_LIMITED' }} onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('store-credential-action-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows guidance without a button when no handler is wired', () => {
    // ACCOUNT_SESSION_REQUIRED with no onConnect: the body still guides, but no
    // Connect button is forced (Connect stays optional where a surface omits it).
    render(<StoreCredentialNotice error={{ code: 'ACCOUNT_SESSION_REQUIRED' }} />);
    expect(screen.getByTestId('store-credential-notice')).toHaveAttribute(
      'data-kind',
      'accountSessionRequired'
    );
    expect(screen.queryByTestId('store-credential-action-connect')).toBeNull();
  });

  it('spins the busy action, disables all buttons, and shows the connecting label', () => {
    render(
      <StoreCredentialNotice
        error={{ code: 'ACCOUNT_STORE_MISMATCH' }}
        onSwitchAccount={vi.fn()}
        onDisconnect={vi.fn()}
        busyAction="switchAccount"
      />
    );
    const busy = screen.getByTestId('store-credential-action-switchAccount');
    expect(busy).toBeDisabled();
    expect(busy).toHaveTextContent('storeCredential.connecting');
    // Sibling action disabled while another is in flight.
    expect(screen.getByTestId('store-credential-action-disconnect')).toBeDisabled();
  });

  it('shows a reconnecting label while the refresh-credential action is busy', () => {
    render(
      <StoreCredentialNotice
        error={{ code: 'STORE_CREDENTIAL_INVALID' }}
        onRefreshCredential={vi.fn()}
        busyAction="refreshCredential"
      />
    );
    const button = screen.getByTestId('store-credential-action-refreshCredential');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('storeCredential.reconnecting');
  });

  it('surfaces a localized action failure without a raw server string', () => {
    render(
      <StoreCredentialNotice
        error={{ code: 'ACCOUNT_STORE_MISMATCH' }}
        onDisconnect={vi.fn()}
        failedAction="disconnect"
      />
    );
    expect(screen.getByTestId('store-credential-action-error')).toHaveTextContent(
      'storeCredential.disconnectFailed'
    );
  });

  it('renders the fallback for an unrecognized error', () => {
    render(
      <StoreCredentialNotice
        error={new Error('boom')}
        fallback={<p role="alert">fallback-copy</p>}
      />
    );
    expect(screen.queryByTestId('store-credential-notice')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('fallback-copy');
  });
});
