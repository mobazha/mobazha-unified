'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { buildSellerDealLinkBrowseHref, useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { CreateDealLinkForm } from '@/components/admin/deal-links/CreateDealLinkForm';

function NewDealLinkPageContent() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const initialProductSlug = searchParams.get('dealProduct') ?? '';

  const handleCreated = useCallback(
    async (link: { publicToken: string }) => {
      const href = `${window.location.origin}${buildSellerDealLinkBrowseHref({ publicToken: link.publicToken })}`;
      const copied = await copyToClipboard(href);
      if (copied) {
        toast({ title: t('admin.dealLinks.dealCopySuccess') });
      }
      router.push('/admin/deal-links');
    },
    [router, t, toast]
  );

  return (
    <div className="space-y-6" data-testid="admin-deal-links-new-page">
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
          {t('admin.dealLinks.dealCreateTitle')}
        </h1>
      </div>
      <CreateDealLinkForm
        initialProductSlug={initialProductSlug}
        onCreated={link => void handleCreated(link)}
        showHeader={false}
      />
    </div>
  );
}

export default function AdminNewDealLinkPage() {
  return <NewDealLinkPageContent />;
}
