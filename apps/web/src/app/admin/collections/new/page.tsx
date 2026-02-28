'use client';

import React from 'react';
import { useI18n } from '@mobazha/core';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionForm } from '@/components/admin/CollectionForm';

export default function AdminCollectionNewPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="space-y-6" data-testid="admin-collection-new-page">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/collections')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{t('admin.collections.createTitle')}</h1>
      </div>

      <CollectionForm onSaved={() => router.push('/admin/collections')} />
    </div>
  );
}
