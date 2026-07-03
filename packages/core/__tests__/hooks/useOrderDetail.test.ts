import { describe, expect, it } from 'vitest';

import { selectPrimarySettlementAction } from '../../hooks/useOrderDetail';

describe('selectPrimarySettlementAction', () => {
  it('prefers confirmed release actions for finalized orders over later cancel actions', () => {
    const action = selectPrimarySettlementAction({
      state: 'COMPLETED',
      settlementActions: [
        {
          actionId: 'cancel-action',
          action: 'cancel',
          settlementAction: 'cancel',
          state: 'confirmed',
          txHash: '0xcancel',
        },
        {
          actionId: 'confirm-action',
          action: 'confirm',
          settlementAction: 'confirm',
          state: 'confirmed',
          txHash: '0xconfirm',
        },
      ],
    } as any);

    expect(action?.actionId).toBe('confirm-action');
  });

  it('prefers confirmed cancel actions for cancelled orders', () => {
    const action = selectPrimarySettlementAction({
      state: 'CANCELED',
      settlementActions: [
        {
          actionId: 'confirm-action',
          action: 'confirm',
          settlementAction: 'confirm',
          state: 'confirmed',
        },
        {
          actionId: 'cancel-action',
          action: 'cancel',
          settlementAction: 'cancel',
          state: 'confirmed',
        },
      ],
    } as any);

    expect(action?.actionId).toBe('cancel-action');
  });
});
