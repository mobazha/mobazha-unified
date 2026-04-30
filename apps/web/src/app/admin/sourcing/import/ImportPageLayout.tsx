'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, CheckCircle, ExternalLink } from 'lucide-react';
import { useI18n, fulfillmentApi } from '@mobazha/core';
import type { CatalogVariant, StoreSyncVariant } from '@mobazha/core';
import { SourcingFeatureGuard } from '../SourcingFeatureGuard';

type Variant = CatalogVariant | StoreSyncVariant;

interface ImportPageLayoutProps {
  title: string;
  providerName: string;
  imageUrl?: string;
  images?: string[];
  description?: string;
  variants: Variant[];
  currency: string;
  providerID: string;
  productId?: string;
  syncProductId?: string;
  backHref: string;
  mode: 'catalog' | 'design';
}

function getVariantTitle(v: Variant): string {
  if ('title' in v) return v.title;
  if ('name' in v) return v.name;
  return v.id;
}

function getVariantPrice(v: Variant): number {
  if ('price' in v) return parseFloat(v.price) || 0;
  if ('retailPrice' in v) return parseFloat(v.retailPrice) || 0;
  return 0;
}

function getVariantInStock(v: Variant): boolean {
  return 'inStock' in v ? v.inStock : true;
}

export function ImportPageLayout({
  title,
  providerName,
  imageUrl,
  images,
  description,
  variants,
  currency,
  providerID,
  productId,
  syncProductId,
  backHref,
  mode,
}: ImportPageLayoutProps) {
  const { t } = useI18n();

  const [markup, setMarkup] = useState(50);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [tags, setTags] = useState('');
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(
    new Set(variants.map(v => v.id))
  );
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ slug: string; variantsCount: number } | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  const allImages = useMemo(() => {
    const list: string[] = [];
    if (imageUrl) list.push(imageUrl);
    if (images) list.push(...images.filter(img => img !== imageUrl));
    return list;
  }, [imageUrl, images]);

  const lowestCost = useMemo(() => {
    const selected = variants.filter(v => selectedVariantIds.has(v.id));
    if (selected.length === 0) return 0;
    return Math.min(...selected.map(getVariantPrice));
  }, [variants, selectedVariantIds]);

  const retailPrice = lowestCost * (1 + markup / 100);
  const profit = retailPrice - lowestCost;
  const margin = retailPrice > 0 ? (profit / retailPrice) * 100 : 0;

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
    if (selectedVariantIds.size === variants.length) {
      setSelectedVariantIds(new Set([variants[0].id]));
    } else {
      setSelectedVariantIds(new Set(variants.map(v => v.id)));
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);

      let res;
      if (mode === 'catalog' && productId) {
        res = await fulfillmentApi.importFulfillmentProduct(providerID, {
          productId,
          variantIds: [...selectedVariantIds],
          retailMarkup: 1 + markup / 100,
          title: customTitle.trim() || undefined,
          description: customDescription.trim() || undefined,
          tags: tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
        });
      } else if (mode === 'design' && syncProductId) {
        res = await fulfillmentApi.importStoreSyncProduct(providerID, syncProductId, {
          retailMarkup: 1 + markup / 100,
          title: customTitle.trim() || undefined,
          tags: tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean),
        });
      }

      if (res) {
        setResult({ slug: res.listingSlug, variantsCount: res.variantsCount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.sourcing.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  if (result) {
    return (
      <div className="flex flex-col items-center py-16 space-y-4">
        <CheckCircle className="w-14 h-14 text-green-500" />
        <div className="text-center">
          <p className="font-semibold text-xl">{t('admin.sourcing.importSuccess')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.sourcing.importedCount', { count: String(result.variantsCount) })}
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <Link
            href={`/product/${result.slug}`}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
          >
            {t('admin.sourcing.viewListing')}
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={backHref}
            className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            {t('admin.sourcing.backToCatalog')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={backHref} className="p-1.5 rounded-md hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{t('admin.sourcing.importPageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{providerName}</p>
        </div>
      </div>

      {/* Product Preview */}
      <section className="rounded-lg border p-5">
        <div className="flex gap-5">
          <div className="flex-shrink-0 space-y-2">
            <div className="w-48 h-48 rounded-lg bg-muted overflow-hidden">
              {allImages[selectedImage] ? (
                <img
                  src={allImages[selectedImage]}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground/50" />
                </div>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto">
                {allImages.slice(0, 5).map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-10 h-10 rounded border overflow-hidden flex-shrink-0 ${
                      i === selectedImage ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{providerName}</p>
            {description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{description}</p>
            )}
            <p className="text-sm mt-2">
              {variants.length} {t('admin.sourcing.variants')}
            </p>
          </div>
        </div>
      </section>

      {/* Variant Selection */}
      {variants.length > 1 && (
        <section className="rounded-lg border p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">
              {t('admin.sourcing.variantSelection')} ({selectedVariantIds.size}/{variants.length})
            </h3>
            <button onClick={toggleAll} className="text-sm text-primary hover:underline">
              {selectedVariantIds.size === variants.length
                ? t('admin.sourcing.deselectAll')
                : t('admin.sourcing.selectAll')}
            </button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-md border divide-y">
            {variants.map(variant => (
              <label
                key={variant.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedVariantIds.has(variant.id)}
                  onChange={() => toggleVariant(variant.id)}
                  className="rounded border-gray-300"
                />
                <span className="flex-1 truncate">{getVariantTitle(variant)}</span>
                <span className="text-muted-foreground">
                  {getVariantPrice(variant).toFixed(2)} {currency}
                </span>
                {getVariantInStock(variant) ? (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {t('admin.sourcing.inStock')}
                  </span>
                ) : (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    {t('admin.sourcing.outOfStock')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Pricing Strategy */}
      <section className="rounded-lg border p-5">
        <h3 className="font-medium mb-4">{t('admin.sourcing.pricingStrategy')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin.sourcing.markupLabel')}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={200}
                value={markup}
                onChange={e => setMarkup(Number(e.target.value))}
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={markup}
                  onChange={e => setMarkup(Math.max(0, Number(e.target.value)))}
                  min={0}
                  max={500}
                  className="w-16 px-2 py-1.5 rounded-md border bg-background text-sm text-right"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{t('admin.sourcing.markupHint')}</p>
          </div>

          <div className="space-y-2.5 p-4 rounded-lg bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('admin.sourcing.supplierCost')}</span>
              <span>
                {lowestCost.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('admin.sourcing.retailPriceLabel')}</span>
              <span className="font-medium">
                {retailPrice.toFixed(2)} {currency}
              </span>
            </div>
            <div className="border-t pt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">{t('admin.sourcing.yourProfit')}</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                +{profit.toFixed(2)} {currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('admin.sourcing.margin')}</span>
              <span className="text-muted-foreground">{margin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Listing Details */}
      <section className="rounded-lg border p-5">
        <h3 className="font-medium mb-4">{t('admin.sourcing.listingDetails')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('admin.sourcing.titleLabel')}
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder={title}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('admin.sourcing.descriptionLabel')}
            </label>
            <textarea
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
              placeholder={description || t('admin.sourcing.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('admin.sourcing.tagsLabel')}
            </label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder={t('admin.sourcing.tagsPlaceholder')}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            />
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Link
          href={backHref}
          className="px-4 py-2.5 text-sm rounded-md border hover:bg-muted transition-colors"
        >
          {t('admin.sourcing.cancelImport')}
        </Link>
        <button
          onClick={handleImport}
          disabled={importing || selectedVariantIds.size === 0}
          className="px-5 py-2.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {importing && <Loader2 className="w-4 h-4 animate-spin" />}
          {importing ? t('admin.sourcing.importing') : t('admin.sourcing.importAndPublish')}
        </button>
      </div>
    </div>
  );
}

export function ImportPageWrapper({ children }: { children: React.ReactNode }) {
  return <SourcingFeatureGuard>{children}</SourcingFeatureGuard>;
}
