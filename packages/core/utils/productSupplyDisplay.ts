import type { ProductListItem } from '../types/product';
import type { ListingSupplySummaryItem, ListingSupplyMode } from '../types/supplyAvailability';

/** Seller-visible supply mode (no internal SupplyKind). Priority: external > license > instant > tracked. */
export type ProductSupplyMode =
  | 'external'
  | 'license_codes'
  | 'instant_download'
  | 'tracked_stock'
  | 'none';

export type ProductAvailabilityTone = 'default' | 'warning' | 'destructive' | 'success' | 'muted';

export interface LicensePoolListHint {
  /** Listing has at least one license_key digital asset configured. */
  hasPool: boolean;
  available?: number;
  total?: number;
  dispensed?: number;
  loading?: boolean;
}

export interface ProductSupplyContext {
  product: ProductListItem;
  syncedProvider?: string;
  licenseHint?: LicensePoolListHint | null;
  summary?: ListingSupplySummaryItem;
  summaryLoading?: boolean;
}

const LOW_STOCK_THRESHOLD = 5;

export function resolveProductSupplyMode(ctx: ProductSupplyContext): ProductSupplyMode {
  const summaryMode = productSupplyModeFromSummary(ctx.summary?.supplyMode);
  if (summaryMode) return summaryMode;
  if (ctx.syncedProvider) return 'external';
  if (ctx.product.contractType === 'DIGITAL_GOOD') {
    if (ctx.licenseHint?.hasPool) return 'license_codes';
    return 'instant_download';
  }
  if (ctx.product.contractType === 'PHYSICAL_GOOD') return 'tracked_stock';
  return 'none';
}

function productSupplyModeFromSummary(mode?: ListingSupplyMode): ProductSupplyMode | null {
  switch (mode) {
    case 'supplier_fulfilled':
      return 'external';
    case 'license_codes':
      return 'license_codes';
    case 'instant_download':
      return 'instant_download';
    case 'tracked_stock':
      return 'tracked_stock';
    default:
      return null;
  }
}

export type AvailabilityMessageKey =
  | 'admin.products.availabilityInstant'
  | 'admin.products.availabilityBySupplier'
  | 'admin.products.availabilitySupplierGeneric'
  | 'admin.products.availabilityKeysLeft'
  | 'admin.products.availabilityImportKeys'
  | 'admin.products.availabilityAvailable'
  | 'admin.products.availabilityLowStock'
  | 'admin.products.availabilityStockDetailed'
  | 'admin.products.availabilityStockDetailedLow'
  | 'admin.products.outOfStock'
  | 'admin.products.availabilityManualAction'
  | 'admin.products.availabilitySupplierUnavailable'
  | 'admin.products.availabilityDash'
  | 'admin.products.availabilityLoading';

export interface ProductAvailabilityView {
  messageKey: AvailabilityMessageKey;
  messageParams?: Record<string, string | number>;
  tone: ProductAvailabilityTone;
}

function primaryActionForMode(mode: ProductSupplyMode): SupplySummaryAction | undefined {
  switch (mode) {
    case 'tracked_stock':
      return 'variants';
    case 'external':
      return 'sourcing';
    case 'license_codes':
    case 'instant_download':
      return 'digital';
    default:
      return undefined;
  }
}

function primaryActionKeyForMode(mode: ProductSupplyMode): string | undefined {
  switch (mode) {
    case 'tracked_stock':
      return 'admin.products.ctaManageVariants';
    case 'external':
      return 'admin.products.ctaViewSourcing';
    case 'license_codes':
      return 'admin.products.ctaImportKeys';
    case 'instant_download':
      return 'admin.products.ctaConfigureDigital';
    default:
      return undefined;
  }
}

function summaryNeedsManualAction(summary: ListingSupplySummaryItem): boolean {
  return summary.manualActionRequired === true || summary.status === 'manual_action_required';
}

function summaryNeedsSupplierAttention(summary: ListingSupplySummaryItem): boolean {
  return summary.status === 'supplier_unavailable';
}

function summaryHasOnHandQuantity(summary: ListingSupplySummaryItem): boolean {
  return summary.onHandQuantity !== undefined && summary.onHandQuantity !== null;
}

function summaryHasHeldQuantity(summary: ListingSupplySummaryItem): boolean {
  return (summary.heldQuantity ?? 0) > 0;
}

function trackedStockDetailParams(summary: ListingSupplySummaryItem): Record<string, number> {
  const available = summary.availableQuantity ?? 0;
  return {
    available,
    onHand: summary.onHandQuantity ?? available,
    held: summary.heldQuantity ?? 0,
  };
}

function trackedStockDetailKey(
  summary: ListingSupplySummaryItem,
  lowStock: boolean
): SupplySummaryDetailKey {
  if (summaryHasHeldQuantity(summary)) {
    return lowStock
      ? 'admin.products.summaryStockDetailedLow'
      : 'admin.products.summaryStockDetailed';
  }
  if (summaryHasOnHandQuantity(summary)) {
    return lowStock ? 'admin.products.summaryStockOnHandLow' : 'admin.products.summaryStockOnHand';
  }
  return lowStock ? 'admin.products.summaryStockLow' : 'admin.products.summaryStock';
}

function trackedStockAvailabilityKey(
  summary: ListingSupplySummaryItem,
  lowStock: boolean
): AvailabilityMessageKey {
  if (summaryHasHeldQuantity(summary) || summaryHasOnHandQuantity(summary)) {
    return lowStock
      ? 'admin.products.availabilityStockDetailedLow'
      : 'admin.products.availabilityStockDetailed';
  }
  return lowStock ? 'admin.products.availabilityLowStock' : 'admin.products.availabilityAvailable';
}

function licenseKeysDetailKey(summary: ListingSupplySummaryItem): SupplySummaryDetailKey {
  if (summaryHasHeldQuantity(summary)) {
    return 'admin.products.summaryKeysHeld';
  }
  return 'admin.products.summaryKeys';
}

function licenseKeysDetailParams(
  summary: ListingSupplySummaryItem,
  ctx: SupplySummaryContext
): Record<string, number> {
  const available = summary.availableQuantity ?? 0;
  if (summaryHasHeldQuantity(summary)) {
    return { available, held: summary.heldQuantity ?? 0 };
  }
  return { available, dispensed: ctx.licenseHint?.dispensed ?? 0 };
}

function availabilityViewForExternal(ctx: ProductSupplyContext): ProductAvailabilityView {
  if (ctx.syncedProvider) {
    return {
      messageKey: 'admin.products.availabilityBySupplier',
      messageParams: { provider: ctx.syncedProvider },
      tone: 'muted',
    };
  }
  return {
    messageKey: 'admin.products.availabilitySupplierGeneric',
    tone: 'muted',
  };
}

function buildAvailabilityViewFromSummary(
  ctx: ProductSupplyContext
): ProductAvailabilityView | null {
  const summary = ctx.summary;
  if (!summary || summary.status === 'unknown') return null;

  const mode = resolveProductSupplyMode(ctx);

  if (summaryNeedsManualAction(summary)) {
    return {
      messageKey: 'admin.products.availabilityManualAction',
      tone: 'warning',
    };
  }
  if (summaryNeedsSupplierAttention(summary)) {
    return {
      messageKey: 'admin.products.availabilitySupplierUnavailable',
      tone: 'muted',
    };
  }

  if (summary.status === 'unlimited' || mode === 'instant_download') {
    return {
      messageKey: 'admin.products.availabilityInstant',
      tone: 'success',
    };
  }

  if (mode === 'external') {
    return availabilityViewForExternal(ctx);
  }

  const available = summary.availableQuantity ?? 0;
  if (mode === 'license_codes') {
    if (available <= 0) {
      return { messageKey: 'admin.products.availabilityImportKeys', tone: 'warning' };
    }
    return {
      messageKey: 'admin.products.availabilityKeysLeft',
      messageParams: { count: available },
      tone: available <= LOW_STOCK_THRESHOLD ? 'warning' : 'default',
    };
  }

  if (mode === 'tracked_stock') {
    if (summary.status === 'out_of_stock' || available <= 0) {
      return { messageKey: 'admin.products.outOfStock', tone: 'destructive' };
    }
    const lowStock = summary.status === 'low_stock' || available <= LOW_STOCK_THRESHOLD;
    const messageKey = trackedStockAvailabilityKey(summary, lowStock);
    const messageParams =
      messageKey === 'admin.products.availabilityAvailable' ||
      messageKey === 'admin.products.availabilityLowStock'
        ? { count: available }
        : trackedStockDetailParams(summary);
    return {
      messageKey,
      messageParams,
      tone: lowStock ? 'warning' : 'default',
    };
  }

  return null;
}

function buildSupplySummaryViewFromSummary(ctx: SupplySummaryContext): SupplySummaryView | null {
  const summary = ctx.summary;
  if (!summary || summary.status === 'unknown') return null;

  const mode = resolveProductSupplyMode(ctx);
  const primaryAction = primaryActionForMode(mode);
  const primaryActionKey = primaryActionKeyForMode(mode);

  if (summaryNeedsManualAction(summary)) {
    return {
      detailKey: 'admin.products.summaryManualAction',
      tone: 'warning',
      warning: true,
      primaryAction,
      primaryActionKey,
    };
  }
  if (summaryNeedsSupplierAttention(summary)) {
    return {
      detailKey: 'admin.products.summarySupplierUnavailable',
      tone: 'muted',
      warning: true,
      primaryAction: 'sourcing',
      primaryActionKey: 'admin.products.ctaViewSourcing',
    };
  }

  if (summary.status === 'unlimited' || mode === 'instant_download') {
    return {
      detailKey: 'admin.products.summaryInstantReady',
      tone: 'success',
      warning: false,
      primaryAction: 'digital',
      primaryActionKey: 'admin.products.ctaConfigureDigital',
    };
  }

  if (mode === 'external') {
    const provider = ctx.syncedProvider;
    return {
      detailKey: provider
        ? 'admin.products.summaryExternal'
        : 'admin.products.summarySupplierGeneric',
      detailParams: provider ? { provider } : undefined,
      tone: 'muted',
      warning: false,
      primaryAction: 'sourcing',
      primaryActionKey: 'admin.products.ctaViewSourcing',
    };
  }

  const available = summary.availableQuantity ?? 0;
  if (mode === 'license_codes') {
    if (available <= 0) {
      return {
        detailKey: 'admin.products.summaryKeysEmpty',
        tone: 'warning',
        warning: true,
        primaryAction: 'digital',
        primaryActionKey: 'admin.products.ctaImportKeys',
      };
    }
    const lowKeys = available <= LOW_STOCK_THRESHOLD;
    return {
      detailKey: licenseKeysDetailKey(summary),
      detailParams: licenseKeysDetailParams(summary, ctx),
      tone: lowKeys ? 'warning' : 'default',
      warning: lowKeys,
      primaryAction: 'digital',
      primaryActionKey: 'admin.products.ctaImportKeys',
    };
  }

  if (mode === 'tracked_stock') {
    if (summary.status === 'out_of_stock' || available <= 0) {
      return {
        detailKey: 'admin.products.summaryStock',
        detailParams: { count: 0 },
        tone: 'destructive',
        warning: true,
        primaryAction: 'variants',
        primaryActionKey: 'admin.products.ctaManageVariants',
      };
    }
    const lowStock = summary.status === 'low_stock' || available <= LOW_STOCK_THRESHOLD;
    const detailKey = trackedStockDetailKey(summary, lowStock);
    const detailParams =
      detailKey === 'admin.products.summaryStock' || detailKey === 'admin.products.summaryStockLow'
        ? { count: available }
        : trackedStockDetailParams(summary);
    return {
      detailKey,
      detailParams,
      tone: lowStock ? 'warning' : 'default',
      warning: lowStock,
      primaryAction: 'variants',
      primaryActionKey: 'admin.products.ctaManageVariants',
    };
  }

  return null;
}

export function buildProductAvailabilityView(ctx: ProductSupplyContext): ProductAvailabilityView {
  const fromSummary = buildAvailabilityViewFromSummary(ctx);
  if (fromSummary) return fromSummary;

  const mode = resolveProductSupplyMode(ctx);

  if (mode === 'external') {
    return availabilityViewForExternal(ctx);
  }

  if (mode === 'license_codes') {
    if (ctx.licenseHint?.loading) {
      return { messageKey: 'admin.products.availabilityLoading', tone: 'muted' };
    }
    const available = ctx.licenseHint?.available ?? 0;
    if (available <= 0) {
      return {
        messageKey: 'admin.products.availabilityImportKeys',
        tone: 'warning',
      };
    }
    if (available <= LOW_STOCK_THRESHOLD) {
      return {
        messageKey: 'admin.products.availabilityKeysLeft',
        messageParams: { count: available },
        tone: 'warning',
      };
    }
    return {
      messageKey: 'admin.products.availabilityKeysLeft',
      messageParams: { count: available },
      tone: 'default',
    };
  }

  if (mode === 'instant_download') {
    return {
      messageKey: 'admin.products.availabilityInstant',
      tone: 'success',
    };
  }

  if (mode === 'tracked_stock') {
    const q = ctx.product.quantity;
    if (q === undefined || q === null) {
      if (ctx.summaryLoading) {
        return { messageKey: 'admin.products.availabilityLoading', tone: 'muted' };
      }
      return { messageKey: 'admin.products.availabilityDash', tone: 'muted' };
    }
    if (q === 0) {
      return { messageKey: 'admin.products.outOfStock', tone: 'destructive' };
    }
    if (q <= LOW_STOCK_THRESHOLD) {
      return {
        messageKey: 'admin.products.availabilityLowStock',
        messageParams: { count: q },
        tone: 'warning',
      };
    }
    return {
      messageKey: 'admin.products.availabilityAvailable',
      messageParams: { count: q },
      tone: 'default',
    };
  }

  return { messageKey: 'admin.products.availabilityDash', tone: 'muted' };
}

/** Phase A heuristic for "needs attention" filter. */
export function productNeedsSupplyAttention(ctx: ProductSupplyContext): boolean {
  if (ctx.summary && ctx.summary.status !== 'unknown') {
    return (
      ctx.summary.manualActionRequired === true ||
      ctx.summary.status === 'low_stock' ||
      ctx.summary.status === 'out_of_stock' ||
      ctx.summary.status === 'manual_action_required' ||
      ctx.summary.status === 'supplier_unavailable'
    );
  }
  const mode = resolveProductSupplyMode(ctx);
  if (mode === 'tracked_stock') {
    const q = ctx.product.quantity;
    return q !== undefined && q !== null && q <= LOW_STOCK_THRESHOLD;
  }
  if (mode === 'license_codes') {
    if (ctx.licenseHint?.loading) return false;
    return (ctx.licenseHint?.available ?? 0) <= LOW_STOCK_THRESHOLD;
  }
  return false;
}

export type SupplyModeLabelKey =
  | 'admin.products.supplyModeExternal'
  | 'admin.products.supplyModeLicense'
  | 'admin.products.supplyModeInstant'
  | 'admin.products.supplyModeTracked';

export function supplyModeLabelKey(mode: ProductSupplyMode): SupplyModeLabelKey | null {
  switch (mode) {
    case 'external':
      return 'admin.products.supplyModeExternal';
    case 'license_codes':
      return 'admin.products.supplyModeLicense';
    case 'instant_download':
      return 'admin.products.supplyModeInstant';
    case 'tracked_stock':
      return 'admin.products.supplyModeTracked';
    default:
      return null;
  }
}

export type SupplySummaryDetailKey =
  | 'admin.products.summaryInstantReady'
  | 'admin.products.summaryMissingDigital'
  | 'admin.products.summaryKeys'
  | 'admin.products.summaryKeysHeld'
  | 'admin.products.summaryKeysEmpty'
  | 'admin.products.summaryStock'
  | 'admin.products.summaryStockLow'
  | 'admin.products.summaryStockOnHand'
  | 'admin.products.summaryStockOnHandLow'
  | 'admin.products.summaryStockDetailed'
  | 'admin.products.summaryStockDetailedLow'
  | 'admin.products.summaryExternal'
  | 'admin.products.summarySupplierGeneric'
  | 'admin.products.summaryManualAction'
  | 'admin.products.summarySupplierUnavailable'
  | 'admin.products.availabilityLoading'
  | 'admin.products.availabilityDash';

export type SupplySummaryAction = 'variants' | 'digital' | 'sourcing';

export interface SupplySummaryView {
  detailKey: SupplySummaryDetailKey;
  detailParams?: Record<string, string | number>;
  tone: ProductAvailabilityTone;
  warning: boolean;
  primaryAction?: SupplySummaryAction;
  primaryActionKey?: string;
}

export interface SupplySummaryContext extends ProductSupplyContext {
  /** Edit-page only: whether digital assets are configured (null = unknown). */
  hasDigitalAssets?: boolean | null;
}

export function sumListingSkuQuantity(
  skus: Array<{ quantity: number; selections?: unknown[] }>
): number | undefined {
  if (!skus.length) return undefined;
  const hasVariants = skus.some(s => (s.selections?.length ?? 0) > 0);
  const rows = hasVariants ? skus : [skus[0]];
  if (rows.some(s => s.quantity === -1)) return undefined;
  return rows.reduce((sum, s) => sum + Math.max(0, s.quantity ?? 0), 0);
}

/** Seller edit-page summary (Phase A heuristics + Phase B API summary). */
export function buildSupplySummaryView(ctx: SupplySummaryContext): SupplySummaryView {
  const fromSummary = buildSupplySummaryViewFromSummary(ctx);
  if (fromSummary) return fromSummary;

  const mode = resolveProductSupplyMode(ctx);

  if (mode === 'external') {
    const provider = ctx.syncedProvider;
    return {
      detailKey: provider
        ? 'admin.products.summaryExternal'
        : 'admin.products.summarySupplierGeneric',
      detailParams: provider ? { provider } : undefined,
      tone: 'muted',
      warning: false,
      primaryAction: 'sourcing',
      primaryActionKey: 'admin.products.ctaViewSourcing',
    };
  }

  if (mode === 'license_codes') {
    if (ctx.licenseHint?.loading) {
      return { detailKey: 'admin.products.availabilityLoading', tone: 'muted', warning: false };
    }
    const available = ctx.licenseHint?.available ?? 0;
    if (available <= 0) {
      return {
        detailKey: 'admin.products.summaryKeysEmpty',
        tone: 'warning',
        warning: true,
        primaryAction: 'digital',
        primaryActionKey: 'admin.products.ctaImportKeys',
      };
    }
    return {
      detailKey: 'admin.products.summaryKeys',
      detailParams: {
        available,
        dispensed: ctx.licenseHint?.dispensed ?? 0,
      },
      tone: available <= LOW_STOCK_THRESHOLD ? 'warning' : 'default',
      warning: available <= LOW_STOCK_THRESHOLD,
      primaryAction: 'digital',
      primaryActionKey: 'admin.products.ctaImportKeys',
    };
  }

  if (mode === 'instant_download') {
    if (ctx.hasDigitalAssets === false) {
      return {
        detailKey: 'admin.products.summaryMissingDigital',
        tone: 'warning',
        warning: true,
        primaryAction: 'digital',
        primaryActionKey: 'admin.products.ctaConfigureDigital',
      };
    }
    return {
      detailKey: 'admin.products.summaryInstantReady',
      tone: 'success',
      warning: false,
      primaryAction: 'digital',
      primaryActionKey: 'admin.products.ctaConfigureDigital',
    };
  }

  if (mode === 'tracked_stock') {
    const q = ctx.product.quantity;
    if (q === undefined || q === null) {
      if (ctx.summaryLoading) {
        return { detailKey: 'admin.products.availabilityLoading', tone: 'muted', warning: false };
      }
      return { detailKey: 'admin.products.availabilityDash', tone: 'muted', warning: false };
    }
    if (q === 0) {
      return {
        detailKey: 'admin.products.summaryStock',
        detailParams: { count: 0 },
        tone: 'destructive',
        warning: true,
        primaryAction: 'variants',
        primaryActionKey: 'admin.products.ctaManageVariants',
      };
    }
    if (q <= LOW_STOCK_THRESHOLD) {
      return {
        detailKey: 'admin.products.summaryStockLow',
        detailParams: { count: q },
        tone: 'warning',
        warning: true,
        primaryAction: 'variants',
        primaryActionKey: 'admin.products.ctaManageVariants',
      };
    }
    return {
      detailKey: 'admin.products.summaryStock',
      detailParams: { count: q },
      tone: 'default',
      warning: false,
      primaryAction: 'variants',
      primaryActionKey: 'admin.products.ctaManageVariants',
    };
  }

  return { detailKey: 'admin.products.availabilityDash', tone: 'muted', warning: false };
}
