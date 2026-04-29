'use client';

import React, { useState, useMemo } from 'react';
import { Loader2, Package, CheckCircle, ExternalLink } from 'lucide-react';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type { CatalogProduct } from '@mobazha/core';

interface ProductImportPanelProps {
  providerID: string;
  product: CatalogProduct;
  onSuccess: (slug: string) => void;
  onCancel: () => void;
}

export function ProductImportPanel({
  providerID,
  product,
  onSuccess,
  onCancel,
}: ProductImportPanelProps) {
  const { t } = useI18n();

  const [markup, setMarkup] = useState(50);
  const [customTitle, setCustomTitle] = useState('');
  const [tags, setTags] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(
    new Set(product.variants.map(v => v.id))
  );
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; variantsCount: number } | null>(null);

  const lowestCost = useMemo(() => {
    const selected = product.variants.filter(v => selectedVariantIds.has(v.id));
    if (selected.length === 0) return 0;
    return Math.min(...selected.map(v => parseFloat(v.price) || 0));
  }, [product.variants, selectedVariantIds]);

  const currency = product.currency ?? product.variants[0]?.currency ?? 'USD';
  const retailPrice = lowestCost * (1 + markup / 100);
  const profit = retailPrice - lowestCost;

  const toggleVariant = (id: string) => {
    setSelectedVariantIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVariantIds.size === product.variants.length) {
      setSelectedVariantIds(new Set([product.variants[0].id]));
    } else {
      setSelectedVariantIds(new Set(product.variants.map(v => v.id)));
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      const res = await fulfillmentApi.importFulfillmentProduct(providerID, {
        productId: product.id,
        variantIds: [...selectedVariantIds],
        retailMarkup: 1 + markup / 100,
        title: customTitle.trim() || undefined,
        tags: tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      });
      setResult({ slug: res.listingSlug, variantsCount: res.variantsCount });
      onSuccess(product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.fulfillment.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  if (result) {
    return (
      <div className="flex flex-col items-center py-8 space-y-4">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <div className="text-center">
          <p className="font-medium text-lg">{t('admin.fulfillment.importSuccess')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.fulfillment.importedCount', { count: String(result.variantsCount) })}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/admin/products?listing=${result.slug}`}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
          >
            {t('admin.fulfillment.importViewListing')}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            {t('admin.fulfillment.backToCatalog')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Product preview */}
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-lg bg-muted overflow-hidden flex-shrink-0">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-medium">{product.title}</h4>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
          )}
          <p className="text-sm mt-1">
            {t('admin.fulfillment.variantsAvailable', { count: String(product.variants.length) })}
          </p>
        </div>
      </div>

      {/* Markup + pricing */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('admin.fulfillment.importMarkup')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={markup}
              onChange={e => setMarkup(Math.max(0, Number(e.target.value)))}
              min={0}
              max={500}
              className="w-24 px-3 py-2 rounded-md border bg-background text-sm text-right"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('admin.fulfillment.importMarkupHint')}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('admin.fulfillment.importSupplierCost')}
            </span>
            <span>
              {lowestCost.toFixed(2)} {currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('admin.fulfillment.importRetailPrice')}
            </span>
            <span className="font-medium">
              {retailPrice.toFixed(2)} {currency}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground">{t('admin.fulfillment.importProfit')}</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              +{profit.toFixed(2)} {currency}
            </span>
          </div>
        </div>
      </div>

      {/* Variants selection */}
      {product.variants.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              {t('admin.fulfillment.importVariants')} ({selectedVariantIds.size}/
              {product.variants.length})
            </label>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selectedVariantIds.size === product.variants.length
                ? t('admin.fulfillment.importSelectVariants')
                : t('admin.fulfillment.importAllVariants')}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
            {product.variants.map(variant => (
              <label
                key={variant.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedVariantIds.has(variant.id)}
                  onChange={() => toggleVariant(variant.id)}
                  className="rounded border-gray-300"
                />
                <span className="flex-1 truncate">{variant.title}</span>
                <span className="text-muted-foreground text-xs">
                  {parseFloat(variant.price).toFixed(2)} {variant.currency}
                </span>
                {variant.inStock ? (
                  <span className="text-xs text-green-600">{t('admin.fulfillment.inStock')}</span>
                ) : (
                  <span className="text-xs text-yellow-600">
                    {t('admin.fulfillment.outOfStock')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Optional fields */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('admin.fulfillment.importCustomTitle')}
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            placeholder={product.title}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            {t('admin.fulfillment.importTags')}
          </label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder={t('admin.fulfillment.tagsPlaceholder')}
            className="w-full px-3 py-2 rounded-md border bg-background text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <button
          onClick={handleImport}
          disabled={importing || selectedVariantIds.size === 0}
          className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {importing && <Loader2 className="w-4 h-4 animate-spin" />}
          {importing ? t('admin.fulfillment.importing') : t('admin.fulfillment.importProduct')}
        </button>
        <button
          onClick={onCancel}
          disabled={importing}
          className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          {t('admin.fulfillment.cancel')}
        </button>
      </div>
    </div>
  );
}
