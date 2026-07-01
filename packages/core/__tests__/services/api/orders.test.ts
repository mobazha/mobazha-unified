import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getOrderDetails, getPurchases } from '../../../services/api/orders';
import {
  getApiMode,
  getApiModeConfig,
  setApiMode,
  setApiModeConfig,
} from '../../../services/api/mode';

describe('Orders API Community Edition mock projection', () => {
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

  it('does not expose private settlement summary fields in purchases list', async () => {
    const purchases = await getPurchases();
    const order = purchases.find(item => item.orderID === 'QmOrderMock002');

    expect(order).toBeTruthy();
    expect(order?.settlementAction).toBeUndefined();
    expect(order?.settlementActionId).toBeUndefined();
    expect(order?.settlementState).toBeUndefined();
    expect(order?.settlementTxHash).toBeUndefined();
  });

  it('does not synthesize private settlement actions in mock order details', async () => {
    const detail = await getOrderDetails('QmOrderMock002');

    expect(detail).toBeTruthy();
    expect(detail?.settlementActions).toBeUndefined();
  });
});
