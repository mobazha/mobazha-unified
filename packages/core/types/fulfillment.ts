/** Supply chain fulfillment provider types (FF-1d) */

export type FulfillmentProviderStatus = 'connected' | 'disconnected' | 'error';

export interface ProviderConnection {
  providerId: string;
  providerType: string;
  providerName: string;
  status: FulfillmentProviderStatus;
  storeName?: string;
  webhookUrl?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  errorMessage?: string;
}

export interface ConnectProviderCredentials {
  apiKey: string;
  apiSecret?: string;
  storeId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface ConnectProviderRequest {
  credentials: ConnectProviderCredentials;
}

export interface CatalogVariant {
  id: string;
  title: string;
  sku?: string;
  price: string;
  currency: string;
  inStock: boolean;
  attributes?: Record<string, string>;
  imageUrl?: string;
}

export interface CatalogProduct {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  variants: CatalogVariant[];
  minPrice?: string;
  maxPrice?: string;
  currency?: string;
  printAreas?: unknown[];
}

export interface CatalogPage {
  products: CatalogProduct[];
  total: number;
  offset: number;
  limit: number;
  searchSupported: boolean;
}

/** A file (design / mockup) attached to a store sync variant. */
export interface SyncVariantFile {
  type: string;
  url: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  filename?: string;
}

/** A variant within a StoreSyncProduct (with designs already applied). */
export interface StoreSyncVariant {
  id: string;
  syncProductId: string;
  name: string;
  catalogVariantId: string;
  retailPrice: string;
  currency: string;
  sku?: string;
  size?: string;
  color?: string;
  imageUrl?: string;
  previewUrl?: string;
  files?: SyncVariantFile[];
  inStock: boolean;
}

/**
 * A product created in the supplier dashboard with custom designs.
 * Unlike CatalogProduct (generic template), this already has mockups.
 */
export interface StoreSyncProduct {
  id: string;
  externalId?: string;
  name: string;
  thumbnailUrl: string;
  variantCount: number;
  syncedCount: number;
  variants?: StoreSyncVariant[];
  /** Set when this sync product has been imported into a Mobazha listing. */
  importedListingSlug?: string;
}

/** Paginated list of store sync products. */
export interface StoreSyncPage {
  products: StoreSyncProduct[];
  total: number;
  offset: number;
  limit: number;
}

export interface ImportProductRequest {
  productId: string;
  syncProductId?: string;
  variantIds?: string[];
  retailMarkup?: number;
  designFiles?: unknown[];
  title?: string;
  description?: string;
  tags?: string[];
}

export interface ImportResult {
  listingSlug: string;
  syncProductId: string;
  variantsCount: number;
  retailPrice: string;
  supplierCost: string;
}

export interface SyncedProduct {
  id: string;
  providerId: string;
  listingSlug: string;
  title?: string;
  thumbnailUrl?: string;
  externalId: string;
  syncProductId: string;
  status: string;
  lastSyncAt?: string;
  supplierCost: string;
  retailPrice: string;
}

export interface SyncStatus {
  syncProductId: string;
  status: string;
  lastSyncAt?: string;
  errorMessage?: string;
}

export type FulfillmentStatus =
  | 'draft'
  | 'pending'
  | 'in_process'
  | 'shipped'
  | 'delivered'
  | 'canceled'
  | 'failed'
  | 'supplier_loss';

/**
 * Why a fulfillment order is in a non-terminal failed state.
 * Mirrors backend `contracts.FailureReason` (mobazha3.0).
 *
 * - retryable_provider_error  → automatic retry will be attempted
 * - validation_failed         → bad request to provider, will not retry
 * - margin_protection_failed  → blocked by margin gate (cost/discount/currency)
 * - manual_action_required    → ambiguous data; needs operator review
 * - permanently_failed        → exhausted retries or hard supplier rejection
 */
export type FulfillmentFailureReason =
  | 'retryable_provider_error'
  | 'validation_failed'
  | 'margin_protection_failed'
  | 'manual_action_required'
  | 'permanently_failed';

export interface FulfillmentShipment {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  shipDate?: string;
  items?: number[];
}

export interface FulfillmentCosts {
  subtotal?: string;
  shipping?: string;
  tax?: string;
  total: string;
  currency?: string;
}

export interface FulfillmentOrder {
  id: string;
  externalId: string;
  status: FulfillmentStatus;
  shipments?: FulfillmentShipment[];
  costs?: FulfillmentCosts;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
  /** Classified failure reason. Empty/undefined when not in a failed state. */
  failureReason?: FulfillmentFailureReason;
  /** Number of retry attempts already made (only set when failureReason present). */
  retryCount?: number;
  /** Maximum retry attempts allowed by the retry worker. */
  maxRetries?: number;
}

// ---------------------------------------------------------------------------
// Supply Chain Alerts & AutoAction Rules (FF-4)
// ---------------------------------------------------------------------------
// Keep these unions in sync with backend pkg/models/supply_chain.go.

export type AlertType =
  | 'stock_out'
  | 'stock_back'
  | 'price_drift'
  | 'rule_action'
  | 'product_changed'
  | 'product_discontinued';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface SupplyChainAlert {
  id: string;
  providerId: string;
  listingSlug: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  dismissed: boolean;
  actionTaken?: string;
  createdAt: string;
}

export type RuleTrigger =
  | 'stock_out'
  | 'stock_back'
  | 'price_drift'
  | 'product_cost_changed'
  | 'product_discontinued';
export type RuleAction =
  | 'hide_listing'
  | 'show_listing'
  | 'pause_listing'
  | 'notify_only'
  | 'auto_delist';

export interface AutoActionRule {
  id: string;
  providerId?: string;
  trigger: RuleTrigger;
  action: RuleAction;
  threshold?: number;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRuleRequest {
  providerId?: string;
  trigger: RuleTrigger;
  action: RuleAction;
  threshold?: number;
  enabled?: boolean;
}

export type FulfillmentProviderID = 'printful' | 'printify';

export const FULFILLMENT_PROVIDERS: {
  id: FulfillmentProviderID;
  name: string;
  descKey: string;
  iconPath: string;
  docsUrl: string;
}[] = [
  {
    id: 'printful',
    name: 'Printful',
    descKey: 'admin.fulfillment.printfulDesc',
    iconPath: '/icons/brands/printful.svg',
    docsUrl: 'https://www.printful.com/dashboard/settings/api',
  },
  {
    id: 'printify',
    name: 'Printify',
    descKey: 'admin.fulfillment.printifyDesc',
    iconPath: '/icons/brands/printify.svg',
    docsUrl: 'https://printify.com/app/account/api',
  },
];
