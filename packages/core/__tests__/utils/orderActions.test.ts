import { describe, expect, it } from 'vitest';

import { getOrderActions } from '../../utils/orderActions';

describe('getOrderActions after-sale dispute', () => {
  it('allows a buyer to report an issue during the after-sale window', () => {
    const actions = getOrderActions('COMPLETED', 'buyer', {
      hasRated: true,
      inAfterSaleWindow: true,
    });

    expect(actions).toContain('AfterSaleDispute');
  });

  it('hides the report issue action after an after-sale dispute has been filed', () => {
    const actions = getOrderActions('COMPLETED', 'buyer', {
      hasRated: true,
      inAfterSaleWindow: true,
      hasAfterSaleDispute: true,
    });

    expect(actions).not.toContain('AfterSaleDispute');
  });
});
