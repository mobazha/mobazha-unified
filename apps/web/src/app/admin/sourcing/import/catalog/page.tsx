'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { fulfillmentApi, FULFILLMENT_PROVIDERS } from '@mobazha/core';
import type { CatalogProduct } from '@mobazha/core';
import { ImportPageLayout, ImportPageWrapper } from '../ImportPageLayout';

function CatalogImportContent() {
  const { providerID, productID } = useParams<{ providerID: string; productID: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!providerID || !productID) return;
    try {
      setLoading(true);
      const p = await fulfillmentApi.getFulfillmentCatalogProduct(providerID, productID);
      setProduct(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [providerID, productID]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !product || !providerID) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-destructive">{error || 'Product not found'}</p>
        <button
          onClick={() => navigate('/admin/sourcing/catalog')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to catalog
        </button>
      </div>
    );
  }

  const providerName = FULFILLMENT_PROVIDERS.find(p => p.id === providerID)?.name ?? providerID;

  return (
    <ImportPageLayout
      title={product.title}
      providerName={providerName}
      imageUrl={product.imageUrl}
      images={product.images}
      description={product.description}
      variants={product.variants}
      currency={product.currency ?? product.variants[0]?.currency ?? 'USD'}
      providerID={providerID}
      productId={product.id}
      backHref="/admin/sourcing/catalog"
      mode="catalog"
    />
  );
}

export default function AdminSourcingImportCatalogPage() {
  return (
    <ImportPageWrapper>
      <CatalogImportContent />
    </ImportPageWrapper>
  );
}
