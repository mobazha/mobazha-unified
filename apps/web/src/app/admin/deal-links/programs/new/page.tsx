'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { CreateProgramForm } from '@/components/admin/deal-links/CreateProgramForm';

function NewProgramPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDealLinkId = searchParams.get('dealLinkId') ?? '';

  const handleCreated = useCallback(() => {
    router.push('/admin/deal-links?tab=programs');
  }, [router]);

  return (
    <div className="space-y-6" data-testid="admin-deal-links-new-program-page">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          onClick={() => router.push('/admin/deal-links?tab=programs')}
          aria-label={t('admin.dealLinks.backToDealLinks')}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {t('admin.dealLinks.createTitle')}
        </h1>
      </div>
      <CreateProgramForm
        initialDealLinkId={initialDealLinkId}
        onCreated={handleCreated}
        showHeader={false}
      />
    </div>
  );
}

export default function AdminNewDealProgramPage() {
  return <NewProgramPageContent />;
}
