import { describe, expect, it } from 'vitest';
import {
  PLATFORMS,
  PROCESSORS,
  calculateAll,
  calculateNetPerSale,
  comparisonHighlight,
} from '../../data/digitalGoodsPricing';

const CENTS = (n: number) => Math.round(n * 100) / 100;

describe('digitalGoodsPricing — calculateNetPerSale', () => {
  const stripe = PROCESSORS.stripe;

  it('matches the design-doc Gumroad example ($100 → $89.50)', () => {
    const gumroad = PLATFORMS.find(p => p.key === 'gumroad')!;
    const { netPerSale, totalFees } = calculateNetPerSale(gumroad, 100, stripe);
    // 100 - (100 * 0.10 + 0.50) = 89.50; processor included
    expect(CENTS(netPerSale)).toBe(89.5);
    expect(CENTS(totalFees)).toBe(10.5);
  });

  it('matches the design-doc Lemon Squeezy example ($100 → $94.50)', () => {
    const ls = PLATFORMS.find(p => p.key === 'lemon-squeezy')!;
    const { netPerSale } = calculateNetPerSale(ls, 100, stripe);
    expect(CENTS(netPerSale)).toBe(94.5);
  });

  it('matches the design-doc Mobazha SaaS example ($100 → ~$93.80 via Stripe)', () => {
    const saas = PLATFORMS.find(p => p.key === 'mobazha-saas')!;
    const { netPerSale } = calculateNetPerSale(saas, 100, stripe);
    // 100 - (100*0.03) - (100*0.029 + 0.30) = 100 - 3 - 3.20 = 93.80
    expect(CENTS(netPerSale)).toBe(93.8);
  });

  it('matches the design-doc Mobazha self-host example ($100 → ~$96.80 via Stripe)', () => {
    const sh = PLATFORMS.find(p => p.key === 'mobazha-self-host')!;
    const { netPerSale } = calculateNetPerSale(sh, 100, stripe);
    // 100 - 0 - 3.20 = 96.80
    expect(CENTS(netPerSale)).toBe(96.8);
  });

  it('clamps to zero when the flat fee exceeds the price (no negative net)', () => {
    const gumroad = PLATFORMS.find(p => p.key === 'gumroad')!;
    const { netPerSale } = calculateNetPerSale(gumroad, 0.1, stripe);
    expect(netPerSale).toBe(0);
  });

  it('does not double-charge processor fees on platforms that bundle them', () => {
    const ls = PLATFORMS.find(p => p.key === 'lemon-squeezy')!;
    const stripeNet = calculateNetPerSale(ls, 50, stripe).netPerSale;
    const paypalNet = calculateNetPerSale(ls, 50, PROCESSORS.paypal).netPerSale;
    // Both processors should yield the same net because LS bundles processor fee.
    expect(stripeNet).toBeCloseTo(paypalNet, 6);
  });

  it('reflects different processor fees on Mobazha tiers', () => {
    const saas = PLATFORMS.find(p => p.key === 'mobazha-saas')!;
    const stripeNet = calculateNetPerSale(saas, 50, stripe).netPerSale;
    const cryptoNet = calculateNetPerSale(saas, 50, PROCESSORS.crypto).netPerSale;
    // Crypto fee is much smaller → seller keeps more.
    expect(cryptoNet).toBeGreaterThan(stripeNet);
  });
});

describe('digitalGoodsPricing — calculateAll', () => {
  it('returns one result per platform with monthly multiplication applied', () => {
    const results = calculateAll({
      unitPriceUsd: 100,
      monthlySales: 10,
      processorKey: 'stripe',
    });
    expect(results).toHaveLength(PLATFORMS.length);
    for (const r of results) {
      expect(CENTS(r.netPerMonth)).toBe(CENTS(r.netPerSale * 10));
      expect(r.effectiveFeeRate).toBeGreaterThanOrEqual(0);
      expect(r.effectiveFeeRate).toBeLessThan(1);
    }
  });

  it('treats negative inputs as zero', () => {
    const results = calculateAll({
      unitPriceUsd: -50,
      monthlySales: -3,
      processorKey: 'stripe',
    });
    for (const r of results) {
      expect(r.netPerSale).toBe(0);
      expect(r.netPerMonth).toBe(0);
      expect(r.effectiveFeeRate).toBe(0);
    }
  });
});

describe('digitalGoodsPricing — comparisonHighlight', () => {
  it('points at Mobazha self-host vs the worst competitor', () => {
    const results = calculateAll({
      unitPriceUsd: 50,
      monthlySales: 100,
      processorKey: 'stripe',
    });
    const highlight = comparisonHighlight(results);
    expect(highlight).not.toBeNull();
    expect(highlight!.best.platform.key).toBe('mobazha-self-host');
    expect(highlight!.worstCompetitor.platform.isMobazha).toBe(false);
    // self-host should be the best deal at $50 / Stripe; diff > 0
    expect(highlight!.monthlyDiff).toBeGreaterThan(0);
  });
});
