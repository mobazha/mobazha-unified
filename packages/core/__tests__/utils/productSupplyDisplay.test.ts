import { describe, expect, it } from 'vitest';
import {
  buildProductAvailabilityView,
  buildSupplySummaryView,
  productNeedsSupplyAttention,
  resolveProductSupplyMode,
  sumListingSkuQuantity,
} from '../../utils/productSupplyDisplay';
import type { ProductListItem } from '../../types/product';

function product(overrides: Partial<ProductListItem> = {}): ProductListItem {
  return {
    slug: 'test-item',
    title: 'Test',
    price: { amount: 100, currencyCode: 'USD' },
    ...overrides,
  } as ProductListItem;
}

describe('resolveProductSupplyMode', () => {
  it('prefers external when synced mapping exists', () => {
    expect(
      resolveProductSupplyMode({
        product: product({ contractType: 'PHYSICAL_GOOD', quantity: 10 }),
        syncedProvider: 'Printful',
        licenseHint: { hasPool: true, available: 5 },
      })
    ).toBe('external');
  });

  it('uses license pool for digital when pool configured', () => {
    expect(
      resolveProductSupplyMode({
        product: product({ contractType: 'DIGITAL_GOOD' }),
        licenseHint: { hasPool: true, available: 3 },
      })
    ).toBe('license_codes');
  });

  it('uses instant download for digital without license pool', () => {
    expect(
      resolveProductSupplyMode({
        product: product({ contractType: 'DIGITAL_GOOD' }),
        licenseHint: { hasPool: false },
      })
    ).toBe('instant_download');
  });
});

describe('buildProductAvailabilityView', () => {
  it('shows instant available for unlimited digital', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'DIGITAL_GOOD' }),
      licenseHint: { hasPool: false },
    });
    expect(view.messageKey).toBe('admin.products.availabilityInstant');
    expect(view.tone).toBe('success');
  });

  it('does not show physical zero stock as instant', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 0 }),
    });
    expect(view.messageKey).toBe('admin.products.outOfStock');
  });

  it('prefers seller summary ATP over list quantity', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 99 }),
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'tracked_stock',
        status: 'low_stock',
        availableQuantity: 2,
      },
    });
    expect(view.messageKey).toBe('admin.products.availabilityLowStock');
    expect(view.messageParams).toEqual({ count: 2 });
  });

  it('uses seller summary out-of-stock when ATP is zero', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 99 }),
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'tracked_stock',
        status: 'out_of_stock',
        availableQuantity: 0,
      },
    });
    expect(view.messageKey).toBe('admin.products.outOfStock');
    expect(view.tone).toBe('destructive');
  });

  it('prioritizes manual action over instant download mode', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'DIGITAL_GOOD' }),
      licenseHint: { hasPool: false },
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'instant_download',
        status: 'manual_action_required',
        manualActionRequired: true,
      },
    });
    expect(view.messageKey).toBe('admin.products.availabilityManualAction');
    expect(view.tone).toBe('warning');
  });

  it('prioritizes manual action over zero ATP stock', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 99 }),
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'tracked_stock',
        status: 'manual_action_required',
        manualActionRequired: true,
        availableQuantity: 0,
      },
    });
    expect(view.messageKey).toBe('admin.products.availabilityManualAction');
  });

  it('shows supplier unavailable instead of out of stock', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 0 }),
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'supplier_fulfilled',
        status: 'supplier_unavailable',
        availableQuantity: 0,
      },
    });
    expect(view.messageKey).toBe('admin.products.availabilitySupplierUnavailable');
  });

  it('shows generic supplier text without synced provider name', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'PHYSICAL_GOOD' }),
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'supplier_fulfilled',
        status: 'available',
      },
    });
    expect(view.messageKey).toBe('admin.products.availabilitySupplierGeneric');
  });

  it('shows on-hand and held quantities for tracked stock summary', () => {
    const view = buildProductAvailabilityView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 99 }),
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'tracked_stock',
        status: 'available',
        availableQuantity: 12,
        onHandQuantity: 15,
        heldQuantity: 3,
      },
    });
    expect(view.messageKey).toBe('admin.products.availabilityStockDetailed');
    expect(view.messageParams).toEqual({ available: 12, onHand: 15, held: 3 });
  });
});

describe('buildSupplySummaryView', () => {
  it('describes instant download when assets exist', () => {
    const view = buildSupplySummaryView({
      product: product({ contractType: 'DIGITAL_GOOD' }),
      licenseHint: { hasPool: false },
      hasDigitalAssets: true,
    });
    expect(view.detailKey).toBe('admin.products.summaryInstantReady');
  });

  it('flags missing digital setup', () => {
    const view = buildSupplySummaryView({
      product: product({ contractType: 'DIGITAL_GOOD' }),
      licenseHint: { hasPool: false },
      hasDigitalAssets: false,
    });
    expect(view.detailKey).toBe('admin.products.summaryMissingDigital');
    expect(view.warning).toBe(true);
  });

  it('shows low stock summary for physical', () => {
    const view = buildSupplySummaryView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 3 }),
    });
    expect(view.detailKey).toBe('admin.products.summaryStockLow');
    expect(view.primaryAction).toBe('variants');
  });

  it('uses API summary manual action on edit bar', () => {
    const view = buildSupplySummaryView({
      product: product({ contractType: 'DIGITAL_GOOD' }),
      licenseHint: { hasPool: false },
      hasDigitalAssets: true,
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'instant_download',
        status: 'manual_action_required',
        manualActionRequired: true,
      },
    });
    expect(view.detailKey).toBe('admin.products.summaryManualAction');
    expect(view.warning).toBe(true);
  });

  it('shows held keys in license summary bar', () => {
    const view = buildSupplySummaryView({
      product: product({ contractType: 'DIGITAL_GOOD' }),
      licenseHint: { hasPool: true, available: 8, dispensed: 4 },
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'license_codes',
        status: 'available',
        availableQuantity: 8,
        onHandQuantity: 10,
        heldQuantity: 2,
      },
    });
    expect(view.detailKey).toBe('admin.products.summaryKeysHeld');
    expect(view.detailParams).toEqual({ available: 8, held: 2 });
  });

  it('shows on-hand and held in physical summary bar', () => {
    const view = buildSupplySummaryView({
      product: product({ contractType: 'PHYSICAL_GOOD', quantity: 99 }),
      summary: {
        listingSlug: 'test-item',
        supplyMode: 'tracked_stock',
        status: 'available',
        availableQuantity: 12,
        onHandQuantity: 15,
        heldQuantity: 3,
      },
    });
    expect(view.detailKey).toBe('admin.products.summaryStockDetailed');
    expect(view.detailParams).toEqual({ available: 12, onHand: 15, held: 3 });
  });
});

describe('sumListingSkuQuantity', () => {
  it('sums variant sku quantities', () => {
    expect(
      sumListingSkuQuantity([
        { quantity: 2, selections: [{ name: 'Size', value: 'S' }] },
        { quantity: 3, selections: [{ name: 'Size', value: 'M' }] },
      ])
    ).toBe(5);
  });
});

describe('productNeedsSupplyAttention', () => {
  it('flags low physical stock', () => {
    expect(
      productNeedsSupplyAttention({
        product: product({ contractType: 'PHYSICAL_GOOD', quantity: 2 }),
      })
    ).toBe(true);
  });

  it('flags empty license pool', () => {
    expect(
      productNeedsSupplyAttention({
        product: product({ contractType: 'DIGITAL_GOOD' }),
        licenseHint: { hasPool: true, available: 0 },
      })
    ).toBe(true);
  });

  it('flags summary low stock even when list quantity is stale', () => {
    expect(
      productNeedsSupplyAttention({
        product: product({ contractType: 'PHYSICAL_GOOD', quantity: 99 }),
        summary: {
          listingSlug: 'test-item',
          supplyMode: 'tracked_stock',
          status: 'low_stock',
          availableQuantity: 1,
        },
      })
    ).toBe(true);
  });

  it('flags summary out-of-stock even when list quantity is stale', () => {
    expect(
      productNeedsSupplyAttention({
        product: product({ contractType: 'PHYSICAL_GOOD', quantity: 99 }),
        summary: {
          listingSlug: 'test-item',
          supplyMode: 'tracked_stock',
          status: 'out_of_stock',
          availableQuantity: 0,
        },
      })
    ).toBe(true);
  });
});
