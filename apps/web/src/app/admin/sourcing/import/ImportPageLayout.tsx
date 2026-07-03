'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, CheckCircle, Pencil } from 'lucide-react';
import { useI18n, fulfillmentApi, aiService, AiServiceError } from '@mobazha/core';
import { AiAssistButton } from '@/components/Listing/AiAssistant';
import { SourcingFeatureGuard } from '../SourcingFeatureGuard';
import { PricingCalculator } from '../components/PricingCalculator';
import { VariantSelector } from '../components/VariantSelector';
import { type Variant, getVariantPrice } from '../components/variant-utils';

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
  const [aiLoadingField, setAiLoadingField] = useState<
    'title' | 'description' | 'tags' | 'pricing' | null
  >(null);
  const [suggestedMarkup, setSuggestedMarkup] = useState<number | undefined>();

  const handleAiTitle = useCallback(async () => {
    setAiLoadingField('title');
    try {
      const source = customTitle || title;
      const res = await aiService.improveTitle(source, {
        description: customDescription || description,
      });
      setCustomTitle(res.title);
    } catch (e) {
      if (e instanceof AiServiceError && e.isNotConfigured) return;
    } finally {
      setAiLoadingField(null);
    }
  }, [customTitle, title, customDescription, description]);

  const handleAiDescription = useCallback(async () => {
    setAiLoadingField('description');
    try {
      const res = await aiService.polishDescription(
        customTitle || title,
        customDescription || description || ''
      );
      setCustomDescription(res.description);
    } catch (e) {
      if (e instanceof AiServiceError && e.isNotConfigured) return;
    } finally {
      setAiLoadingField(null);
    }
  }, [customTitle, title, customDescription, description]);

  const handleAiTags = useCallback(async () => {
    setAiLoadingField('tags');
    try {
      const res = await aiService.suggestTags(customTitle || title, {
        description: customDescription || description,
      });
      if (res.tags.length > 0) {
        setTags(res.tags.join(', '));
      }
    } catch (e) {
      if (e instanceof AiServiceError && e.isNotConfigured) return;
    } finally {
      setAiLoadingField(null);
    }
  }, [customTitle, title, customDescription, description]);

  const handleCategoryPreset = useCallback(async () => {
    setAiLoadingField('pricing');
    try {
      const res = await aiService.suggestTags(customTitle || title, {
        description: customDescription || description,
      });
      const productType = res.productType?.toLowerCase() || '';
      let recommended = 50;
      if (productType.includes('apparel') || productType.includes('clothing')) recommended = 80;
      else if (productType.includes('accessori')) recommended = 100;
      else if (productType.includes('art') || productType.includes('poster')) recommended = 120;
      else if (productType.includes('mug') || productType.includes('home')) recommended = 60;
      else if (productType.includes('tech') || productType.includes('phone')) recommended = 70;
      setSuggestedMarkup(recommended);
    } catch (e) {
      if (e instanceof AiServiceError && e.isNotConfigured) return;
    } finally {
      setAiLoadingField(null);
    }
  }, [customTitle, title, customDescription, description]);

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
            .map(tag => tag.trim())
            .filter(Boolean),
        });
      } else if (mode === 'design' && syncProductId) {
        res = await fulfillmentApi.importStoreSyncProduct(providerID, syncProductId, {
          retailMarkup: 1 + markup / 100,
          title: customTitle.trim() || undefined,
          tags: tags
            .split(',')
            .map(tag => tag.trim())
            .filter(Boolean),
          variantIds: [...selectedVariantIds],
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
        <CheckCircle className="w-14 h-14 text-success" />
        <div className="text-center">
          <p className="font-semibold text-xl">{t('admin.sourcing.importSuccessDraft')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.sourcing.importedCount', { count: String(result.variantsCount) })}
          </p>
        </div>
        <div className="flex gap-3 mt-4">
          <Link
            href={`/listing/edit/${result.slug}`}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
          >
            {t('admin.sourcing.editListing')}
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={backHref}
            className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
          >
            {mode === 'design'
              ? t('admin.sourcing.backToDesigns')
              : t('admin.sourcing.backToCatalog')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-24 sm:pb-8 px-4 sm:px-0">
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
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-shrink-0 space-y-2">
            <div className="w-full sm:w-48 aspect-square sm:h-48 rounded-lg bg-muted overflow-hidden">
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
      <VariantSelector
        variants={variants}
        selectedIds={selectedVariantIds}
        onSelectionChange={setSelectedVariantIds}
        currency={currency}
      />

      {/* Pricing Strategy */}
      <PricingCalculator
        supplierCost={lowestCost}
        currency={currency}
        markup={markup}
        onMarkupChange={setMarkup}
        suggestedMarkup={suggestedMarkup}
        onRequestAiSuggestion={handleCategoryPreset}
        aiLoading={aiLoadingField === 'pricing'}
      />

      {/* Listing Details */}
      <section className="rounded-lg border p-5">
        <h3 className="font-medium mb-4">{t('admin.sourcing.listingDetails')}</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">{t('admin.sourcing.titleLabel')}</label>
              <AiAssistButton
                onClick={handleAiTitle}
                isLoading={aiLoadingField === 'title'}
                disabled={aiLoadingField !== null}
                label={t('admin.sourcing.aiImprove')}
              />
            </div>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder={title}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">{t('admin.sourcing.descriptionLabel')}</label>
              <AiAssistButton
                onClick={handleAiDescription}
                isLoading={aiLoadingField === 'description'}
                disabled={aiLoadingField !== null}
                label={t('admin.sourcing.aiGenerate')}
              />
            </div>
            <textarea
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
              placeholder={description || t('admin.sourcing.descriptionPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm resize-none"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-sm font-medium">{t('admin.sourcing.tagsLabel')}</label>
              <AiAssistButton
                onClick={handleAiTags}
                isLoading={aiLoadingField === 'tags'}
                disabled={aiLoadingField !== null}
                label={t('admin.sourcing.aiSuggest')}
              />
            </div>
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

      {/* Actions — sticky on mobile */}
      <div className="fixed bottom-0 left-0 right-0 sm:static bg-background border-t sm:border-t p-4 sm:p-0 sm:pt-4 flex items-center justify-between z-10">
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
          {importing ? t('admin.sourcing.importing') : t('admin.sourcing.importAsDraft')}
        </button>
      </div>
    </div>
  );
}

export function ImportPageWrapper({ children }: { children: React.ReactNode }) {
  return <SourcingFeatureGuard>{children}</SourcingFeatureGuard>;
}
