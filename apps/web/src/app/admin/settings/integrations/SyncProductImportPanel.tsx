'use client';

import React, { useState, useMemo } from 'react';
import { Loader2, Palette, CheckCircle, ExternalLink } from 'lucide-react';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type { StoreSyncProduct } from '@mobazha/core';

interface SyncProductImportPanelProps {
  providerID: string;
  product: StoreSyncProduct;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SyncProductImportPanel({
  providerID,
  product,
  onSuccess,
  onCancel,
}: SyncProductImportPanelProps) {
  const { t } = useI18n();

  const [markup, setMarkup] = useState(50);
  const [customTitle, setCustomTitle] = useState('');
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; variantsCount: number } | null>(null);
  const [activePreview, setActivePreview] = useState<string | null>(null);

  const variants = product.variants ?? [];

  const pricing = useMemo(() => {
    const prices = variants.map(v => parseFloat(v.retailPrice) || 0);
    if (prices.length === 0) return { lowestCost: 0, currency: 'USD' };
    return {
      lowestCost: Math.min(...prices),
      currency: variants[0]?.currency ?? 'USD',
    };
  }, [variants]);

  const retailPrice = pricing.lowestCost * (1 + markup / 100);
  const profit = retailPrice - pricing.lowestCost;

  const defaultPreview =
    product.thumbnailUrl ||
    variants.find(v => v.previewUrl || v.imageUrl)?.previewUrl ||
    variants.find(v => v.imageUrl)?.imageUrl;
  const previewImage = activePreview || defaultPreview;

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      const res = await fulfillmentApi.importStoreSyncProduct(providerID, product.id, {
        retailMarkup: 1 + markup / 100,
        title: customTitle.trim() || undefined,
        tags: tags
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      });
      setResult({ slug: res.listingSlug, variantsCount: res.variantsCount });
      onSuccess();
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
            {t('admin.fulfillment.backToDesigns')}
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
          {previewImage ? (
            <img src={previewImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Palette className="w-8 h-8 text-muted-foreground/50" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="font-medium">{product.name}</h4>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.fulfillment.variantsAvailable', { count: String(variants.length) })}
          </p>
          {variants.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {variants.slice(0, 6).map(v => (
                <span
                  key={v.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground"
                >
                  {v.size || v.color || v.name}
                </span>
              ))}
              {variants.length > 6 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                  +{variants.length - 6}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mockup previews (deduplicated by URL) */}
      {variants.some(v => v.previewUrl) && (
        <div>
          <label className="text-sm font-medium mb-2 block">
            {t('admin.fulfillment.designPreviews')}
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(() => {
              const seen = new Set<string>();
              return variants
                .filter(v => {
                  if (!v.previewUrl || seen.has(v.previewUrl)) return false;
                  seen.add(v.previewUrl);
                  return true;
                })
                .slice(0, 8)
                .map(v => {
                  const isActive = activePreview === v.previewUrl;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setActivePreview(isActive ? null : v.previewUrl!)}
                      className={`w-20 h-20 rounded-md bg-muted overflow-hidden flex-shrink-0 border-2 transition-colors cursor-pointer ${
                        isActive
                          ? 'border-primary ring-1 ring-primary'
                          : 'border-muted hover:border-muted-foreground/30'
                      }`}
                    >
                      <img src={v.previewUrl} alt={v.name} className="w-full h-full object-cover" />
                    </button>
                  );
                });
            })()}
          </div>
        </div>
      )}

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
              {pricing.lowestCost.toFixed(2)} {pricing.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t('admin.fulfillment.importRetailPrice')}
            </span>
            <span className="font-medium">
              {retailPrice.toFixed(2)} {pricing.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2">
            <span className="text-muted-foreground">{t('admin.fulfillment.importProfit')}</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              +{profit.toFixed(2)} {pricing.currency}
            </span>
          </div>
        </div>
      </div>

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
            placeholder={product.name}
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
          disabled={importing || variants.length === 0}
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
