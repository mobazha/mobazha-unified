'use client';

/**
 * Admin → Storefronts → Edit page (MS-Phase-2a · MS2a.4).
 *
 * Loads a single storefront by its immutable `sfID` and reuses the shared
 * StorefrontForm for updates. The default storefront (`_default`) is
 * editable but the Archive action is suppressed — the backend rejects
 * archiving it anyway, we just avoid the footgun in UI.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  useI18n,
  useUserStore,
  useFeatureFlags,
  storefrontsLiteApi,
  DEFAULT_STOREFRONT_ID,
} from '@mobazha/core';
import type { Storefront, StorefrontUpdateRequest } from '@mobazha/core';
import { ArrowLeft, Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { StorefrontForm } from '@/components/admin/storefronts/StorefrontForm';

export default function AdminStorefrontEditPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const { profile } = useUserStore();
  const { isEnabled, loading: flagsLoading } = useFeatureFlags();

  const peerID = profile?.peerID ?? '';
  const sfID = (params?.sfID as string | undefined) ?? '';
  const storefrontsEnabled = isEnabled('storefrontsEnabled', 'killStorefrontRoutingDisabled');

  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (flagsLoading) return;
    if (!storefrontsEnabled) {
      router.replace('/admin/storefronts');
    }
  }, [flagsLoading, storefrontsEnabled, router]);

  useEffect(() => {
    if (!peerID || !sfID || !storefrontsEnabled) return;
    let cancelled = false;
    setLoading(true);
    storefrontsLiteApi
      .getStorefront(peerID, sfID)
      .then(data => {
        if (!cancelled) setStorefront(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('admin.storefronts.fetchError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [peerID, sfID, storefrontsEnabled, t]);

  const isDefault =
    !!storefront && (storefront.is_default || storefront.id === DEFAULT_STOREFRONT_ID);

  const handleUpdate = useCallback(
    async (patch: StorefrontUpdateRequest) => {
      if (!peerID || !sfID) return;
      try {
        setSubmitting(true);
        const updated = await storefrontsLiteApi.updateStorefront(peerID, sfID, patch);
        setStorefront(updated);
        toast({ title: t('admin.storefronts.saved') });
      } catch {
        toast({
          variant: 'destructive',
          title: t('admin.storefronts.saveError'),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [peerID, sfID, t, toast]
  );

  const handleArchive = useCallback(async () => {
    if (!peerID || !sfID) return;
    if (isDefault) {
      toast({
        variant: 'destructive',
        title: t('admin.storefronts.defaultArchiveError'),
      });
      setArchiveOpen(false);
      return;
    }
    try {
      setArchiving(true);
      await storefrontsLiteApi.archiveStorefront(peerID, sfID);
      toast({ title: t('admin.storefronts.archived') });
      router.push('/admin/storefronts');
    } catch {
      toast({
        variant: 'destructive',
        title: t('admin.storefronts.archiveError'),
      });
    } finally {
      setArchiving(false);
      setArchiveOpen(false);
    }
  }, [peerID, sfID, isDefault, router, t, toast]);

  if (flagsLoading || !storefrontsEnabled || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !storefront) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-sm text-destructive mb-4">
          {error || t('admin.storefronts.fetchError')}
        </p>
        <Button variant="outline" onClick={() => router.push('/admin/storefronts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('admin.storefronts.backToList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" data-testid="admin-storefront-edit-page">
      <StorefrontForm
        mode="edit"
        initial={storefront}
        submitting={submitting}
        onCancel={() => router.push('/admin/storefronts')}
        onSubmitUpdate={handleUpdate}
        headerExtras={
          !isDefault && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setArchiveOpen(true)}
              data-testid="archive-storefront-btn"
            >
              <Archive className="w-4 h-4 mr-2" />
              {t('admin.storefronts.archive')}
            </Button>
          )
        }
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.storefronts.archiveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.storefronts.archiveDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('admin.storefronts.archiveConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
