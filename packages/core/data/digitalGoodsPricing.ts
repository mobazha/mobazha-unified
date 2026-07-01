/**
 * DG-1.12: Digital-goods cost-comparison pricing data and calculator.
 *
 * Source rates are pulled from each platform's public pricing page.
 * The `asOf` and `sourceUrl` fields exist so the UI can disclose data
 * freshness — DIGITAL_DELIVERY_DESIGN.md §1.3 explicitly calls out that
 * external rates change and must be presented as "assumptions + date +
 * source URL", never as marketing fact.
 *
 * Notes
 * -----
 * - Some platforms (Gumroad / Lemon Squeezy / Payhip) bundle the payment
 *   processor fee into their commission. The seller does not pay processor
 *   fees on top, so `processorFeeIncluded = true`.
 * - Mobazha exposes the processor fee separately (Stripe / PayPal / crypto)
 *   because the seller, not the platform, is the merchant of record.
 * - We deliberately model Payhip Free (5%) and Payhip Pro (2%) as separate
 *   rows so sellers can see the upgrade trade-off.
 *
 * All numbers are in USD per single sale unless noted otherwise.
 */

export type ProcessorKey = 'stripe' | 'paypal' | 'crypto';

export interface ProcessorFee {
  key: ProcessorKey;
  label: string;
  /** Variable rate, e.g. 0.029 for 2.9 %. */
  rate: number;
  /** Per-transaction flat fee in USD. */
  flat: number;
  /** Optional human-readable note shown next to the picker. */
  note?: string;
}

export const PROCESSORS: Record<ProcessorKey, ProcessorFee> = {
  stripe: {
    key: 'stripe',
    label: 'Stripe',
    rate: 0.029,
    flat: 0.3,
    note: '2.9% + $0.30 per US transaction',
  },
  paypal: {
    key: 'paypal',
    label: 'PayPal',
    rate: 0.0349,
    flat: 0.49,
    note: '3.49% + $0.49 per US transaction',
  },
  crypto: {
    key: 'crypto',
    label: 'Crypto (L2 stablecoin)',
    rate: 0,
    flat: 0.1,
    note: 'Roughly $0.10 network fee on USDC over Base / Arbitrum',
  },
};

export type PlatformKey =
  | 'gumroad'
  | 'lemon-squeezy'
  | 'payhip-free'
  | 'payhip-pro'
  | 'mobazha-saas'
  | 'mobazha-self-host';

export interface PlatformFee {
  key: PlatformKey;
  label: string;
  /** Commission rate as decimal, e.g. 0.10 for 10 %. */
  commissionRate: number;
  /** Flat per-sale fee charged by the platform on top of the rate. */
  flatFee: number;
  /**
   * Whether the platform bundles processor fees into its commission.
   * `true` → seller pays only the platform's commission.
   * `false` → seller pays platform commission + processor fee.
   */
  processorFeeIncluded: boolean;
  /** Whether the platform acts as Merchant of Record for taxes. */
  isMor: boolean | 'partial';
  /** Highlight the row as one of Mobazha's tiers. */
  isMobazha: boolean;
  /** YYYY-MM the rate was verified. */
  asOf: string;
  /** Public pricing page used for verification. */
  sourceUrl: string;
}

export const PLATFORMS: PlatformFee[] = [
  {
    key: 'gumroad',
    label: 'Gumroad',
    commissionRate: 0.1,
    flatFee: 0.5,
    processorFeeIncluded: true,
    isMor: true,
    isMobazha: false,
    asOf: '2026-05',
    sourceUrl: 'https://help.gumroad.com/article/277-fees',
  },
  {
    key: 'lemon-squeezy',
    label: 'Lemon Squeezy',
    commissionRate: 0.05,
    flatFee: 0.5,
    processorFeeIncluded: true,
    isMor: true,
    isMobazha: false,
    asOf: '2026-05',
    sourceUrl: 'https://www.lemonsqueezy.com/pricing',
  },
  {
    key: 'payhip-free',
    label: 'Payhip (Free)',
    commissionRate: 0.05,
    flatFee: 0,
    processorFeeIncluded: true,
    isMor: 'partial',
    isMobazha: false,
    asOf: '2026-05',
    sourceUrl: 'https://payhip.com/pricing',
  },
  {
    key: 'payhip-pro',
    label: 'Payhip (Pro)',
    commissionRate: 0.02,
    flatFee: 0,
    processorFeeIncluded: true,
    isMor: 'partial',
    isMobazha: false,
    asOf: '2026-05',
    sourceUrl: 'https://payhip.com/pricing',
  },
  {
    key: 'mobazha-saas',
    label: 'Mobazha (Hosted)',
    commissionRate: 0.03,
    flatFee: 0,
    processorFeeIncluded: false,
    isMor: false,
    isMobazha: true,
    asOf: '2026-05',
    sourceUrl: 'https://mobazha.org/pricing',
  },
  {
    key: 'mobazha-self-host',
    label: 'Mobazha (Self-hosted)',
    commissionRate: 0,
    flatFee: 0,
    processorFeeIncluded: false,
    isMor: false,
    isMobazha: true,
    asOf: '2026-05',
    sourceUrl: 'https://mobazha.org/pricing',
  },
];

export interface CalcInput {
  unitPriceUsd: number;
  monthlySales: number;
  processorKey: ProcessorKey;
}

export interface PlatformResult {
  platform: PlatformFee;
  /** Net to seller per single sale (never negative). */
  netPerSale: number;
  /** Net to seller for monthlySales × netPerSale. */
  netPerMonth: number;
  /** Total fees (commission + processor) per sale. */
  totalFeesPerSale: number;
  /** Effective fee rate as fraction of unit price (0 when price is 0). */
  effectiveFeeRate: number;
}

/**
 * Net to seller per single sale on a given platform with a given processor.
 *
 * - When the platform absorbs the processor fee, only the platform commission
 *   is deducted.
 * - Mobazha tiers always pay the processor fee on top — that's the honest
 *   trade-off the calculator surfaces.
 * - We clamp to zero so the UI never displays a negative net (a $1 sale on
 *   Gumroad is structurally underwater because of the $0.50 flat fee, which
 *   should land on the screen as $0 with a tooltip, not -$0.10).
 */
export function calculateNetPerSale(
  platform: PlatformFee,
  unitPriceUsd: number,
  processor: ProcessorFee
): { netPerSale: number; totalFees: number } {
  const safePrice = Math.max(0, unitPriceUsd);
  const commission = safePrice * platform.commissionRate + platform.flatFee;
  const processorFee = platform.processorFeeIncluded
    ? 0
    : safePrice * processor.rate + processor.flat;
  const totalFees = commission + processorFee;
  const netPerSale = Math.max(0, safePrice - totalFees);
  return { netPerSale, totalFees };
}

export function calculateAll(input: CalcInput): PlatformResult[] {
  const processor = PROCESSORS[input.processorKey];
  const safeMonthly = Math.max(0, input.monthlySales);
  return PLATFORMS.map(platform => {
    const { netPerSale, totalFees } = calculateNetPerSale(platform, input.unitPriceUsd, processor);
    const safePrice = Math.max(0, input.unitPriceUsd);
    return {
      platform,
      netPerSale,
      netPerMonth: netPerSale * safeMonthly,
      totalFeesPerSale: totalFees,
      effectiveFeeRate: safePrice > 0 ? totalFees / safePrice : 0,
    };
  });
}

/**
 * Convenience helper for the marketing line "vs {topCompetitor} you keep
 * ${diff} more per month". Compares Mobazha self-host (best-case) against
 * the lowest-net non-Mobazha row.
 */
export function comparisonHighlight(results: PlatformResult[]): {
  best: PlatformResult;
  worstCompetitor: PlatformResult;
  monthlyDiff: number;
} | null {
  const mobazha = results.find(r => r.platform.key === 'mobazha-self-host');
  const competitors = results.filter(r => !r.platform.isMobazha);
  if (!mobazha || competitors.length === 0) return null;
  const worst = competitors.reduce(
    (acc, r) => (r.netPerMonth < acc.netPerMonth ? r : acc),
    competitors[0]
  );
  return {
    best: mobazha,
    worstCompetitor: worst,
    monthlyDiff: mobazha.netPerMonth - worst.netPerMonth,
  };
}
