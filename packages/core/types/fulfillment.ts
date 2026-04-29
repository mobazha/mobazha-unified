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
  retailPrice: number;
  supplierCost: number;
}

export interface SyncedProduct {
  id: string;
  providerId: string;
  listingSlug: string;
  externalId: string;
  syncProductId: string;
  status: string;
  lastSyncAt?: string;
  supplierCost: number;
  retailPrice: number;
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
  | 'failed';

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
