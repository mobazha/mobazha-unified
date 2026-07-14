/**
 * Buyer-facing marketplace home state machine (WP-C).
 *
 * The single rule this encodes: a cold-start ("货盘筹备中") narrative may ONLY be
 * shown when the underlying requests SUCCEEDED and the renderable product set is
 * genuinely empty. A feed/enrichment FAILURE that yields zero products must be
 * surfaced as `degraded`, never disguised as an empty shelf. See
 * docs/marketplace-starter/REMEDIATION_OPENING_UX.md §7.2.
 */
export type MarketplaceHomeState =
  | 'loading'
  | 'error'
  | 'degraded'
  | 'coldStart'
  | 'sparse'
  | 'normal';

export interface MarketplaceHomeStateInput {
  /** Any key data (config or feeds) still loading — show skeletons, never judge empty. */
  loading: boolean;
  /** Fatal: config missing or config/public-detail load error (retriable error shell). */
  fatalError: boolean;
  /**
   * A data source that should have returned content actually FAILED
   * (open-catalog feed threw, or curated enrichment failed for every existing ref).
   * Only meaningful when there are no renderable products.
   */
  dataFailed: boolean;
  /** At least one product (or store) can be rendered from a successful response. */
  hasRenderableProducts: boolean;
  /** Explicit operator curation present (a banner or curated featured item). */
  hasExplicitCuration: boolean;
}

/**
 * Derive the buyer home state. Order matters:
 *  1. loading wins — never classify while data is in flight.
 *  2. fatalError — config itself could not load.
 *  3. products exist — show them (normal if operator-curated, else sparse).
 *     Partial failures are tolerated here: if anything is renderable, we render it.
 *  4. no products + a real failure — degraded (NOT cold start).
 *  5. no products + everything succeeded — genuine cold start.
 */
export function deriveMarketplaceHomeState(input: MarketplaceHomeStateInput): MarketplaceHomeState {
  if (input.loading) return 'loading';
  if (input.fatalError) return 'error';
  if (input.hasRenderableProducts) {
    return input.hasExplicitCuration ? 'normal' : 'sparse';
  }
  if (input.dataFailed) return 'degraded';
  return 'coldStart';
}
