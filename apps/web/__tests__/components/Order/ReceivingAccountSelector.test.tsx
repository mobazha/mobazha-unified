import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ReceivingAccountSelector } from '@/components/Order/ReceivingAccountSelector';

const { getReceivingAccounts, getCompatibleChainTypes } = vi.hoisted(() => ({
  getReceivingAccounts: vi.fn(),
  getCompatibleChainTypes: vi.fn(),
}));

vi.mock('@mobazha/core', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
  walletApi: {
    getReceivingAccounts,
  },
  getCompatibleChainTypes,
}));

describe('ReceivingAccountSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getReceivingAccounts.mockResolvedValue([
      {
        id: 1,
        name: 'ETH Account',
        chainType: 'ETH',
        address: '0x1111111111111111111111111111111111111111',
        isActive: true,
      },
      {
        id: 2,
        name: 'BTC Account',
        chainType: 'BTC',
        address: 'bc1qexampleaddress0000000000000000000000000',
        isActive: true,
      },
    ]);
  });

  it('fails closed when a chain hint exists but compatible chain types cannot be determined', async () => {
    getCompatibleChainTypes.mockReturnValue([]);

    render(<ReceivingAccountSelector paymentCoin="NOT_A_REAL_CHAIN" />);

    await waitFor(() => {
      expect(screen.getByText('order.ship.noReceivingAccount')).toBeInTheDocument();
    });

    expect(screen.queryByText(/ETH Account/)).not.toBeInTheDocument();
    expect(screen.queryByText(/BTC Account/)).not.toBeInTheDocument();
  });

  it('shows active accounts when no chain hint is provided', async () => {
    getCompatibleChainTypes.mockReturnValue([]);

    render(<ReceivingAccountSelector />);

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    expect(screen.getByText(/ETH Account/)).toBeInTheDocument();
    expect(screen.getByText(/BTC Account/)).toBeInTheDocument();
  });
});
