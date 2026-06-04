import type { Product, ProductSku } from '../types/product';
import { digitalAssetsApi, productsApi } from '../services/api';
import type { ProductSupplyContext } from './productSupplyDisplay';
import { resolveProductSupplyMode } from './productSupplyDisplay';

export function parseLicenseKeyLines(text: string): string[] {
  return text
    .split(/[\r\n,]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function bumpSkuQuantityString(current: string | undefined, addQuantity: number): string {
  if (current === '-1') return '-1';
  const base = Math.max(0, parseInt(current ?? '0', 10) || 0);
  return String(base + addQuantity);
}

export function applyRestockToSkus(
  skus: ProductSku[] | undefined,
  addQuantity: number
): ProductSku[] {
  if (!skus || skus.length === 0) {
    return [{ quantity: String(Math.max(0, addQuantity)) }];
  }
  return skus.map(sku => ({
    ...sku,
    quantity: bumpSkuQuantityString(sku.quantity, addQuantity),
  }));
}

export function applyRestockToProduct(product: Product, addQuantity: number): Product {
  const item = product.item;
  const skus = applyRestockToSkus(item.skus, addQuantity);
  return {
    ...product,
    item: {
      ...item,
      skus,
    },
  };
}

export function hasRestockableSku(skus: ProductSku[] | undefined): boolean {
  if (!skus || skus.length === 0) return true;
  return skus.some(sku => sku.quantity !== '-1');
}

export function isBulkRestockEligible(ctx: ProductSupplyContext): boolean {
  return resolveProductSupplyMode(ctx) === 'tracked_stock';
}

export function isBulkImportKeysEligible(ctx: ProductSupplyContext): boolean {
  return resolveProductSupplyMode(ctx) === 'license_codes';
}

export interface BulkActionResult {
  slug: string;
  ok: boolean;
  error?: string;
  imported?: number;
}

export async function restockTrackedProduct(
  slug: string,
  addQuantity: number
): Promise<BulkActionResult> {
  if (addQuantity <= 0) {
    return { slug, ok: false, error: 'invalid_quantity' };
  }
  try {
    const product = await productsApi.getListing(slug);
    if (!product?.item) {
      return { slug, ok: false, error: 'not_found' };
    }
    if (product.metadata?.contractType !== 'PHYSICAL_GOOD') {
      return { slug, ok: false, error: 'not_physical' };
    }
    if (!hasRestockableSku(product.item.skus)) {
      return { slug, ok: false, error: 'untracked_stock' };
    }
    const updated = applyRestockToProduct(product, addQuantity);
    const result = await productsApi.updateListing({
      slug: updated.slug,
      item: updated.item,
      metadata: updated.metadata,
      status: updated.status,
      shippingProfile: updated.shippingProfile,
      taxes: updated.taxes,
      moderators: updated.moderators,
    });
    if ('error' in result) {
      return { slug, ok: false, error: result.error };
    }
    return { slug, ok: true };
  } catch (err) {
    return {
      slug,
      ok: false,
      error: err instanceof Error ? err.message : 'restock_failed',
    };
  }
}

export async function importLicenseKeysForProduct(
  slug: string,
  keys: string[]
): Promise<BulkActionResult> {
  if (keys.length === 0) {
    return { slug, ok: false, error: 'no_keys' };
  }
  try {
    const result = await digitalAssetsApi.importLicenseKeys({
      listingSlug: slug,
      keys,
    });
    return { slug, ok: true, imported: result.imported };
  } catch (err) {
    return {
      slug,
      ok: false,
      error: err instanceof Error ? err.message : 'import_failed',
    };
  }
}

const DEFAULT_CONCURRENCY = 3;

function normalizedConcurrency(concurrency: number): number {
  return Math.max(1, Math.floor(concurrency) || DEFAULT_CONCURRENCY);
}

export async function restockTrackedProducts(
  slugs: string[],
  addQuantity: number,
  concurrency = DEFAULT_CONCURRENCY
): Promise<BulkActionResult[]> {
  const batchSize = normalizedConcurrency(concurrency);
  const results: BulkActionResult[] = [];
  for (let i = 0; i < slugs.length; i += batchSize) {
    const batch = slugs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(slug => restockTrackedProduct(slug, addQuantity))
    );
    results.push(...batchResults);
  }
  return results;
}

export async function importLicenseKeysForProducts(
  assignments: Array<{ slug: string; keys: string[] }>,
  concurrency = DEFAULT_CONCURRENCY
): Promise<BulkActionResult[]> {
  const batchSize = normalizedConcurrency(concurrency);
  const pending = assignments.filter(a => a.keys.length > 0);
  const results: BulkActionResult[] = [];
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(({ slug, keys }) => importLicenseKeysForProduct(slug, keys))
    );
    results.push(...batchResults);
  }
  for (const assignment of assignments) {
    if (assignment.keys.length === 0) {
      results.push({ slug: assignment.slug, ok: false, error: 'no_keys' });
    }
  }
  return results;
}
