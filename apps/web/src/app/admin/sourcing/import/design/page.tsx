'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { fulfillmentApi, FULFILLMENT_PROVIDERS } from '@mobazha/core';
import type { StoreSyncProduct } from '@mobazha/core';
import { ImportPageLayout, ImportPageWrapper } from '../ImportPageLayout';

function DesignImportContent() {
  const { providerID, syncProductID } = useParams<{
    providerID: string;
    syncProductID: string;
  }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<StoreSyncProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!providerID || !syncProductID) return;
    try {
      setLoading(true);
      const p = await fulfillmentApi.getStoreSyncProduct(providerID, syncProductID);
      setProduct(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [providerID, syncProductID]);

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
          onClick={() => navigate('/admin/sourcing/designs')}
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to designs
        </button>
      </div>
    );
  }

  const providerName = FULFILLMENT_PROVIDERS.find(p => p.id === providerID)?.name ?? providerID;

  const variants = product.variants ?? [];
  const currency = variants[0]?.currency ?? 'USD';

  return (
    <ImportPageLayout
      title={product.name}
      providerName={providerName}
      imageUrl={product.thumbnailUrl}
      description={undefined}
      variants={variants}
      currency={currency}
      providerID={providerID}
      syncProductId={product.id}
      backHref="/admin/sourcing/designs"
      mode="design"
    />
  );
}

export default function AdminSourcingImportDesignPage() {
  return (
    <ImportPageWrapper>
      <DesignImportContent />
    </ImportPageWrapper>
  );
}
