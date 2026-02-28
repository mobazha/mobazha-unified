'use client';

import React, { useState, useEffect } from 'react';
import { useI18n, collectionsApi } from '@mobazha/core';
import type { Collection } from '@mobazha/core';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionForm } from '@/components/admin/CollectionForm';

export default function AdminCollectionEditPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const collectionId = params?.id as string;

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!collectionId) return;
    let cancelled = false;
    collectionsApi
      .getCollection(collectionId)
      .then(data => {
        if (!cancelled) setCollection(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('admin.collections.fetchError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive">{error || t('admin.collections.fetchError')}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/admin/collections')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-collection-edit-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/collections')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.collections.editTitle')}</h1>
      </div>

      <CollectionForm initial={collection} onSaved={updated => setCollection(updated)} />
    </div>
  );
}
