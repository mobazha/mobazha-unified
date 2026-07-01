'use client';

/**
 * Admin → Storefronts → Create page (MS-Phase-2a · MS2a.4).
 *
 * Thin shell around the shared StorefrontForm. Feature-flag gated just like
 * the list page; kicks the user back to /admin/storefronts when the flag is
 * off or the owner has not finished auth.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n, useUserStore, useFeatureFlags, storefrontsLiteApi } from '@mobazha/core';
import type { StorefrontCreateRequest } from '@mobazha/core';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { StorefrontForm } from '@/components/admin/storefronts/StorefrontForm';

export default function AdminStorefrontCreatePage() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { profile } = useUserStore();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();

  const peerID = profile?.peerID ?? '';
  const storefrontsEnabled = isEnabled('storefrontsEnabled', 'killStorefrontRoutingDisabled');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (flagsLoading) return;
    if (!storefrontsEnabled) {
      router.replace('/admin/storefronts');
    }
  }, [flagsLoading, storefrontsEnabled, router]);

  const handleCreate = useCallback(
    async (payload: StorefrontCreateRequest) => {
      if (!peerID) return;
      try {
        setSubmitting(true);
        const created = await storefrontsLiteApi.createStorefront(peerID, payload);
        toast({ title: t('admin.storefronts.created') });
        router.push(`/admin/storefronts/${encodeURIComponent(created.id)}`);
      } catch {
        toast({
          variant: 'destructive',
          title: t('admin.storefronts.createError'),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [peerID, router, t, toast]
  );

  if (flagsLoading || !storefrontsEnabled) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" data-testid="admin-storefront-new-page">
      <StorefrontForm
        mode="create"
        submitting={submitting}
        onCancel={() => router.push('/admin/storefronts')}
        onSubmitCreate={handleCreate}
      />
    </div>
  );
}
