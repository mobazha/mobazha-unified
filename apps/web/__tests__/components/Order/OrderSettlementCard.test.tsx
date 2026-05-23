import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@mobazha/core', () => ({
  getExplorerResourceUrl: () => undefined,
}));

import { OrderSettlementCard } from '@/components/Order/cards/OrderSettlementCard';

describe('OrderSettlementCard', () => {
  it('does not show stale confirmation snapshots for confirmed settlement actions', () => {
    render(
      <OrderSettlementCard
        settlementAction={{
          actionId: 'action-1',
          action: 'confirm',
          settlementAction: 'confirm',
          state: 'confirmed',
          txHash: '0xabc',
          confirmations: 1,
          updatedAt: '2026-05-23T00:00:00Z',
        }}
      />
    );

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.queryByText('Confirmations')).not.toBeInTheDocument();
  });

  it('shows confirmation progress while settlement actions are still pending', () => {
    render(
      <OrderSettlementCard
        settlementAction={{
          actionId: 'action-1',
          action: 'confirm',
          settlementAction: 'confirm',
          state: 'submitted',
          txHash: '0xabc',
          confirmations: 1,
          updatedAt: '2026-05-23T00:00:00Z',
        }}
      />
    );

    expect(screen.getByText('Confirmations')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
