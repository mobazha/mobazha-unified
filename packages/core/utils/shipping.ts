/**
 * Shipping carrier configuration and tracking URL utilities
 */

export type CarrierRegion = 'global' | 'north_america' | 'europe' | 'asia_pacific' | 'cross_border';

export interface CarrierConfig {
  /** Carrier identifier (stored in backend) */
  id: string;
  /** Display name */
  name: string;
  /** Tracking URL template — {{trackingNumber}} is replaced at runtime */
  trackingUrlTemplate?: string;
  /** Region for dropdown grouping */
  region: CarrierRegion;
}

export interface CarrierGroup {
  region: CarrierRegion;
  label: string;
  carriers: CarrierConfig[];
}

const REGION_ORDER: CarrierRegion[] = ['global', 'north_america', 'europe', 'asia_pacific', 'cross_border'];

const REGION_LABELS: Record<CarrierRegion, string> = {
  global: 'Global',
  north_america: 'North America',
  europe: 'Europe',
  asia_pacific: 'Asia Pacific',
  cross_border: 'Cross-border',
};

/**
 * Common shipping carriers with tracking URL templates.
 */
export const CARRIERS: CarrierConfig[] = [
  // --- Global ---
  {
    id: 'DHL',
    name: 'DHL',
    trackingUrlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB={{trackingNumber}}',
    region: 'global',
  },
  {
    id: 'DHL eCommerce',
    name: 'DHL eCommerce',
    trackingUrlTemplate: 'https://webtrack.dhlglobalmail.com/?trackingnumber={{trackingNumber}}',
    region: 'global',
  },
  {
    id: 'TNT',
    name: 'TNT',
    trackingUrlTemplate: 'https://www.tnt.com/express/en_gc/site/shipping-tools/track.html?searchType=con&cons={{trackingNumber}}',
    region: 'global',
  },
  {
    id: 'Aramex',
    name: 'Aramex',
    trackingUrlTemplate: 'https://www.aramex.com/track/results?ShipmentNumber={{trackingNumber}}',
    region: 'global',
  },
  // --- North America ---
  {
    id: 'UPS',
    name: 'UPS',
    trackingUrlTemplate: 'https://www.ups.com/track?tracknum={{trackingNumber}}',
    region: 'north_america',
  },
  {
    id: 'FedEx',
    name: 'FedEx',
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={{trackingNumber}}',
    region: 'north_america',
  },
  {
    id: 'USPS',
    name: 'USPS',
    trackingUrlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels={{trackingNumber}}',
    region: 'north_america',
  },
  {
    id: 'Canada Post',
    name: 'Canada Post',
    trackingUrlTemplate: 'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor={{trackingNumber}}',
    region: 'north_america',
  },
  // --- Europe ---
  {
    id: 'Royal Mail',
    name: 'Royal Mail',
    trackingUrlTemplate: 'https://www.royalmail.com/track-your-item#/tracking-results/{{trackingNumber}}',
    region: 'europe',
  },
  {
    id: 'Deutsche Post',
    name: 'Deutsche Post',
    trackingUrlTemplate: 'https://www.deutschepost.de/sendung/simpleQuery.html?form.sendungsnummer={{trackingNumber}}',
    region: 'europe',
  },
  {
    id: 'La Poste',
    name: 'La Poste',
    trackingUrlTemplate: 'https://www.laposte.fr/outils/suivre-vos-envois?code={{trackingNumber}}',
    region: 'europe',
  },
  // --- Asia Pacific ---
  {
    id: 'Japan Post',
    name: 'Japan Post',
    trackingUrlTemplate: 'https://trackings.post.japanpost.jp/services/srv/search/?requestNo1={{trackingNumber}}&locale=en',
    region: 'asia_pacific',
  },
  {
    id: 'China Post',
    name: 'China Post',
    trackingUrlTemplate: 'https://t.17track.net/en#nums={{trackingNumber}}',
    region: 'asia_pacific',
  },
  {
    id: 'Australia Post',
    name: 'Australia Post',
    trackingUrlTemplate: 'https://auspost.com.au/mypost/track/#/details/{{trackingNumber}}',
    region: 'asia_pacific',
  },
  {
    id: 'SF Express',
    name: 'SF Express (顺丰)',
    trackingUrlTemplate: 'https://www.sf-express.com/we/ow/chn/en/dynamic_function/waybill/#search/bill-number/{{trackingNumber}}',
    region: 'asia_pacific',
  },
  {
    id: 'YTO Express',
    name: 'YTO Express (圆通)',
    trackingUrlTemplate: 'https://www.yto.net.cn/tracking/tracking.html?waybillNo={{trackingNumber}}',
    region: 'asia_pacific',
  },
  {
    id: 'ZTO Express',
    name: 'ZTO Express (中通)',
    trackingUrlTemplate: 'https://www.zto.com/express/expressSearch.html?billCode={{trackingNumber}}',
    region: 'asia_pacific',
  },
  // --- Cross-border ---
  {
    id: '4PX',
    name: '4PX',
    trackingUrlTemplate: 'https://track.4px.com/#/result/0/{{trackingNumber}}',
    region: 'cross_border',
  },
  {
    id: 'Yanwen',
    name: 'Yanwen',
    trackingUrlTemplate: 'https://track.yw56.com.cn/en/querydel?nums={{trackingNumber}}',
    region: 'cross_border',
  },
];

const carrierMap = new Map<string, CarrierConfig>(
  CARRIERS.map(c => [c.id.toLowerCase(), c])
);

/**
 * Find a carrier config by name (case-insensitive fuzzy match).
 * Returns the first carrier whose id or name contains the search string.
 */
export function findCarrier(shipper: string): CarrierConfig | undefined {
  if (!shipper) return undefined;
  const lower = shipper.toLowerCase().trim();

  // Exact match first
  const exact = carrierMap.get(lower);
  if (exact) return exact;

  // Partial match
  return CARRIERS.find(
    c => c.id.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower)
  );
}

/**
 * Build a tracking URL for the given carrier and tracking number.
 * Returns undefined if the carrier is unknown or has no tracking URL template.
 */
export function getTrackingUrl(
  shipper: string | undefined,
  trackingNumber: string | undefined
): string | undefined {
  if (!shipper || !trackingNumber) return undefined;
  const carrier = findCarrier(shipper);
  if (!carrier?.trackingUrlTemplate) return undefined;
  return carrier.trackingUrlTemplate.replace('{{trackingNumber}}', encodeURIComponent(trackingNumber.trim()));
}

/**
 * Filter carriers matching a search query (for autocomplete).
 */
export function filterCarriers(query: string): CarrierConfig[] {
  if (!query) return CARRIERS;
  const lower = query.toLowerCase().trim();
  return CARRIERS.filter(
    c => c.id.toLowerCase().includes(lower) || c.name.toLowerCase().includes(lower)
  );
}

/**
 * Filter carriers grouped by region. Empty groups are omitted.
 */
export function filterCarriersGrouped(query: string): CarrierGroup[] {
  const filtered = filterCarriers(query);
  const byRegion = new Map<CarrierRegion, CarrierConfig[]>();
  for (const c of filtered) {
    const list = byRegion.get(c.region) ?? [];
    list.push(c);
    byRegion.set(c.region, list);
  }
  return REGION_ORDER
    .filter(r => byRegion.has(r))
    .map(r => ({ region: r, label: REGION_LABELS[r], carriers: byRegion.get(r)! }));
}

/**
 * High-confidence detection rules mapping tracking number patterns to carrier IDs.
 * Only includes patterns with very low false-positive rates.
 */
const DETECTION_RULES: Array<{ pattern: RegExp; carrierId: string }> = [
  { pattern: /^1Z[A-Z0-9]{16}$/i, carrierId: 'UPS' },
  { pattern: /^(94|92|93|70|23|13)\d{18,22}$/, carrierId: 'USPS' },
  { pattern: /^\d{12}$/, carrierId: 'FedEx' },
  { pattern: /^\d{15}$/, carrierId: 'FedEx' },
  { pattern: /^\d{20}$/, carrierId: 'FedEx' },
  { pattern: /^\d{10}$/, carrierId: 'DHL' },
  { pattern: /^JD\d{16}$/, carrierId: 'DHL eCommerce' },
  { pattern: /^SF\d{12,15}$/i, carrierId: 'SF Express' },
  { pattern: /^YT\d{13}$/i, carrierId: 'YTO Express' },
  { pattern: /^ZT\d{12,15}$/i, carrierId: 'ZTO Express' },
];

/**
 * Detect carrier from tracking number format (high-confidence patterns only).
 * Returns undefined if the pattern is ambiguous or unrecognized.
 */
export function detectCarrier(trackingNumber: string): CarrierConfig | undefined {
  if (!trackingNumber) return undefined;
  const cleaned = trackingNumber.trim();
  if (cleaned.length < 8) return undefined;

  for (const rule of DETECTION_RULES) {
    if (rule.pattern.test(cleaned)) {
      return carrierMap.get(rule.carrierId.toLowerCase());
    }
  }
  return undefined;
}
