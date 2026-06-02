import { describe, expect, it } from 'vitest';
import {
  createRulingDraftForConstraints,
  createRulingDraftFromPreset,
  createRulingDraftFromPresetWithConstraints,
  isModeratorRulingDraftValid,
  isVendorOrderUnconfirmedFromCase,
  mapModeratorDisputeApiError,
  percentagesFromPreset,
  rulingDraftWithBuyerPercentage,
  rulingDraftWithVendorPercentage,
  validateModeratorRulingDraft,
} from '../../utils/moderatorDisputeRuling';

describe('moderatorDisputeRuling', () => {
  it('percentagesFromPreset matches common outcomes', () => {
    expect(percentagesFromPreset('buyer')).toEqual({ buyerPercentage: 100, vendorPercentage: 0 });
    expect(percentagesFromPreset('seller')).toEqual({ buyerPercentage: 0, vendorPercentage: 100 });
    expect(percentagesFromPreset('split')).toEqual({ buyerPercentage: 50, vendorPercentage: 50 });
  });

  it('keeps buyer and vendor percentages summing to 100', () => {
    const next = rulingDraftWithBuyerPercentage(createRulingDraftFromPreset('split'), 70);
    expect(next).toEqual({
      buyerPercentage: 70,
      vendorPercentage: 30,
      resolution: '',
    });
  });

  it('requires resolution text of minimum length', () => {
    const invalid = validateModeratorRulingDraft({
      buyerPercentage: 50,
      vendorPercentage: 50,
      resolution: 'short',
    });
    expect(invalid.resolution).toBe('minLength');

    const valid = {
      buyerPercentage: 50,
      vendorPercentage: 50,
      resolution: 'Buyer receives half due to partial delivery.',
    };
    expect(validateModeratorRulingDraft(valid)).toEqual({});
    expect(isModeratorRulingDraftValid(valid)).toBe(true);
  });

  it('mapModeratorDisputeApiError recognizes missing order open', () => {
    expect(
      mapModeratorDisputeApiError('failed to get order open message: message not saved in order')
    ).toBe('order.moderatorRuling.errors.orderDataUnavailable');
  });

  it('mapModeratorDisputeApiError recognizes missing vendor contract', () => {
    expect(
      mapModeratorDisputeApiError(
        'vendor must provide his copy of the contract before you can release funds to the vendor'
      )
    ).toBe('order.moderatorRuling.errors.vendorContractRequired');
  });

  it('isVendorOrderUnconfirmedFromCase when vendor contract lacks confirmation', () => {
    expect(isVendorOrderUnconfirmedFromCase(null)).toBe(false);
    expect(isVendorOrderUnconfirmedFromCase({})).toBe(false);
    expect(isVendorOrderUnconfirmedFromCase({ vendorContract: { orderOpen: {} } })).toBe(true);
    expect(
      isVendorOrderUnconfirmedFromCase({
        vendorContract: { orderConfirmation: { timestamp: '2020-01-01' } },
      })
    ).toBe(false);
  });

  it('locks vendor share to 0 when seller never confirmed', () => {
    const constraints = { lockVendorShareAboveZero: true };
    expect(createRulingDraftForConstraints(constraints)).toEqual({
      buyerPercentage: 100,
      vendorPercentage: 0,
      resolution: '',
    });
    expect(createRulingDraftFromPresetWithConstraints('split', constraints)).toEqual({
      buyerPercentage: 100,
      vendorPercentage: 0,
      resolution: '',
    });
    expect(
      rulingDraftWithVendorPercentage(createRulingDraftFromPreset('split'), 50, constraints)
    ).toEqual({ buyerPercentage: 100, vendorPercentage: 0, resolution: '' });

    const invalid = validateModeratorRulingDraft(
      {
        buyerPercentage: 50,
        vendorPercentage: 50,
        resolution: 'Buyer receives half due to partial delivery.',
      },
      constraints
    );
    expect(invalid.vendorPercentage).toBe('vendorUnconfirmed');
    expect(
      isModeratorRulingDraftValid(
        {
          buyerPercentage: 100,
          vendorPercentage: 0,
          resolution: 'Seller never confirmed; buyer receives full refund.',
        },
        constraints
      )
    ).toBe(true);
  });
});
