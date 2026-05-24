import { describe, expect, it } from 'vitest';

import { resolveBackendSettlementTransactionID } from '../../hooks/useOrderAction';

describe('resolveBackendSettlementTransactionID', () => {
  it('uses the submitted transaction hash first', () => {
    expect(
      resolveBackendSettlementTransactionID({
        mode: 'submitted',
        txHash: '0xsettled',
        actionId: 'act-1',
      })
    ).toBe('0xsettled');
  });

  it('uses the action id when no transaction hash is returned', () => {
    expect(resolveBackendSettlementTransactionID({ mode: 'submitted', actionId: 'act-1' })).toBe(
      'act-1'
    );
  });

  it('uses a non-empty marker for completed no-op settlement actions', () => {
    expect(resolveBackendSettlementTransactionID({ mode: 'completed' })).toBe(
      'backend-settlement-completed'
    );
  });
});
