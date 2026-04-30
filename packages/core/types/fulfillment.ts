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

export interface ImportProductRequest {
  productId: string;
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

export type FulfillmentProviderID = 'printful';

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
];
