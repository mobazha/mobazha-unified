import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { CollectibleCheckoutHolderWallet } from '@/components/Checkout/CollectibleCheckoutHolderWallet';

vi.mock('@mobazha/core', async importOriginal => {
  const actual = await importOriginal<typeof import('@mobazha/core')>();
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key,
      locale: 'en' as const,
    }),
  };
});

describe('CollectibleCheckoutHolderWallet', () => {
  it('renders nothing when holder wallet is not required', () => {
    const { container } = render(
      <CollectibleCheckoutHolderWallet
        requiresHolderWallet={false}
        holderWallet={null}
        isReady
        isWrongNamespace={false}
        isConnecting={false}
        onConnect={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows connect action when Solana wallet is missing', () => {
    render(
      <CollectibleCheckoutHolderWallet
        requiresHolderWallet
        holderWallet={null}
        isReady={false}
        isWrongNamespace={false}
        isConnecting={false}
        onConnect={vi.fn()}
      />
    );

    expect(screen.getByTestId('collectible-checkout-holder-wallet')).toBeInTheDocument();
    expect(screen.getByText('collectibles.checkout.holderWalletMissing')).toBeInTheDocument();
    expect(screen.getByTestId('collectible-checkout-connect-solana')).toHaveTextContent(
      'collectibles.checkout.connectSolanaWallet'
    );
  });

  it('shows wrong-namespace message when an EVM wallet is active', () => {
    render(
      <CollectibleCheckoutHolderWallet
        requiresHolderWallet
        holderWallet={null}
        isReady={false}
        isWrongNamespace
        isConnecting={false}
        onConnect={vi.fn()}
      />
    );

    expect(
      screen.getByText('collectibles.checkout.holderWalletWrongNamespace')
    ).toBeInTheDocument();
    expect(screen.getByTestId('collectible-checkout-connect-solana')).toHaveTextContent(
      'collectibles.checkout.switchSolanaWallet'
    );
  });

  it('shows truncated address when Solana wallet is ready', () => {
    render(
      <CollectibleCheckoutHolderWallet
        requiresHolderWallet
        holderWallet="BuyerSol1111111111111111111111111111111"
        isReady
        isWrongNamespace={false}
        isConnecting={false}
        onConnect={vi.fn()}
      />
    );

    expect(screen.getByText('collectibles.checkout.holderWalletConnected')).toBeInTheDocument();
    expect(screen.getByText(/BuyerS\.\.\./i)).toBeInTheDocument();
  });

  it('calls connectSolana handler from the button', () => {
    const onConnect = vi.fn();
    render(
      <CollectibleCheckoutHolderWallet
        requiresHolderWallet
        holderWallet={null}
        isReady={false}
        isWrongNamespace={false}
        isConnecting={false}
        onConnect={onConnect}
      />
    );

    fireEvent.click(screen.getByTestId('collectible-checkout-connect-solana'));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });
});
