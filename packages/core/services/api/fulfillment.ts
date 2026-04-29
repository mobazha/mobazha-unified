/**
 * Fulfillment Provider API Service (Supply Chain FF-1d)
 *
 * Connect / disconnect POD providers (Printful etc.),
 * browse catalogs, import products, list synced products.
 *
 * NOTE: client.ts request() auto-unwraps {"data": ...} envelopes,
 * so callers receive the inner payload directly.
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authDel } from './helpers';
import type {
  ProviderConnection,
  ConnectProviderRequest,
  CatalogPage,
  CatalogProduct,
  ImportProductRequest,
  ImportResult,
  SyncedProduct,
  SyncStatus,
  FulfillmentOrder,
} from '../../types/fulfillment';

export async function getFulfillmentProviders(): Promise<ProviderConnection[]> {
  const res = await authGet<ProviderConnection[]>(NODE_API.FULFILLMENT_PROVIDERS);
  return Array.isArray(res) ? res : [];
}

export async function connectFulfillmentProvider(
  providerID: string,
  params: ConnectProviderRequest
): Promise<ProviderConnection> {
  return authPost<ProviderConnection>(NODE_API.FULFILLMENT_CONNECT(providerID), params);
}

export async function disconnectFulfillmentProvider(providerID: string): Promise<void> {
  await authDel(NODE_API.FULFILLMENT_DISCONNECT(providerID));
}

export async function getFulfillmentProviderStatus(
  providerID: string
): Promise<ProviderConnection> {
  return authGet<ProviderConnection>(NODE_API.FULFILLMENT_STATUS(providerID));
}

export async function getFulfillmentCatalog(
  providerID: string,
  opts?: { search?: string; offset?: number; limit?: number }
): Promise<CatalogPage> {
  const params = new URLSearchParams();
  if (opts?.search) params.set('search', opts.search);
  if (opts?.offset != null) params.set('offset', String(opts.offset));
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const path = `${NODE_API.FULFILLMENT_CATALOG(providerID)}${qs ? `?${qs}` : ''}`;
  return authGet<CatalogPage>(path);
}

export async function getFulfillmentCatalogProduct(
  providerID: string,
  productID: string
): Promise<CatalogProduct> {
  return authGet<CatalogProduct>(NODE_API.FULFILLMENT_CATALOG_PRODUCT(providerID, productID));
}

export async function importFulfillmentProduct(
  providerID: string,
  params: ImportProductRequest
): Promise<ImportResult> {
  return authPost<ImportResult>(NODE_API.FULFILLMENT_IMPORT(providerID), params);
}

export async function getSyncedProducts(providerID: string): Promise<SyncedProduct[]> {
  const res = await authGet<SyncedProduct[]>(NODE_API.FULFILLMENT_SYNCED_PRODUCTS(providerID));
  return Array.isArray(res) ? res : [];
}

export async function syncProduct(slug: string): Promise<SyncStatus> {
  return authPost<SyncStatus>(NODE_API.FULFILLMENT_SYNC_PRODUCT(slug));
}

export async function getFulfillmentOrderStatus(orderID: string): Promise<FulfillmentOrder | null> {
  try {
    return await authGet<FulfillmentOrder>(NODE_API.FULFILLMENT_ORDER_STATUS(orderID));
  } catch {
    return null;
  }
}
