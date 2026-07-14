'use client';

import React, { useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useI18n, useSellerDealLink } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { CreateDealLinkForm } from '@/components/admin/deal-links/CreateDealLinkForm';

function EditDealLinkPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const dealLinkId = String(params?.id ?? '');
  const { link, loading, error } = useSellerDealLink(dealLinkId);

  const handleSaved = useCallback(() => {
    router.push('/admin/deal-links');
  }, [router]);

  return (
    <div className="space-y-6" data-testid="admin-deal-links-edit-page">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          onClick={() => router.push('/admin/deal-links')}
          aria-label={t('admin.dealLinks.backToDealLinks')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t('admin.dealLinks.dealEditTitle')}
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : error || !link ? (
        <p className="text-sm text-destructive" role="alert">
          {t('admin.dealLinks.loadFailed')}
        </p>
      ) : (
        <CreateDealLinkForm editLink={link} onSaved={handleSaved} showHeader={false} />
      )}
    </div>
  );
}

export default function AdminEditDealLinkPage() {
  return <EditDealLinkPageContent />;
}
