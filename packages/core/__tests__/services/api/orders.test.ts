import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOrderDetails, getPurchases } from '../../../services/api/orders';
import {
  getApiMode,
  getApiModeConfig,
  setApiMode,
  setApiModeConfig,
} from '../../../services/api/mode';

describe('Orders API mock settlement visibility', () => {
  let previousMode = getApiMode();
  let previousConfig = getApiModeConfig();

  beforeEach(() => {
    previousMode = getApiMode();
    previousConfig = { ...getApiModeConfig() };
    setApiMode('mock');
    setApiModeConfig({ mockDelay: 0 });
  });

  afterEach(() => {
    setApiMode(previousMode);
    setApiModeConfig(previousConfig);
  });

  it('exposes settlement summary fields in purchases list', async () => {
    const purchases = await getPurchases();
    const managedOrder = purchases.find(order => order.orderID === 'QmOrderMock002');

    expect(managedOrder).toBeTruthy();
    expect(managedOrder?.settlementAction).toBe('complete');
    expect(managedOrder?.settlementActionId).toBe('settlement-action-complete-002');
    expect(managedOrder?.settlementState).toBe('submitted');
    expect(managedOrder?.settlementTxHash).toMatch(/^0x[a-f0-9]+$/);
  });

  it('returns settlementActions on mock order details', async () => {
    const detail = await getOrderDetails('QmOrderMock002');

    expect(detail).toBeTruthy();
    expect(detail?.settlementActions).toHaveLength(1);
    expect(detail?.settlementActions?.[0]).toMatchObject({
      actionId: 'settlement-action-complete-002',
      action: 'complete',
      settlementAction: 'complete',
      state: 'submitted',
      txHash: '0x7d4f4e2f3a1e4b90c8f21938d6fd97cf14cb1db28a62df7df3fd7ab9d0be4202',
    });
  });
});
