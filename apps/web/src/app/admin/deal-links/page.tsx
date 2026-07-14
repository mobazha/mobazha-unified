// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  activateSellerDealLink,
  buildSellerDealLinkBrowseHref,
  closeSellerDealLink,
  isStoreCredentialDenial,
  pauseSellerDealLink,
  useI18n,
  useSellerDealLinks,
  useStoreCredentialRecovery,
  type SellerDealLink,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/use-toast';
import { copyToClipboard } from '@/lib/clipboard';
import { DealLinkRow } from '@/components/admin/deal-links/DealLinkRow';
import { StoreCredentialNotice } from '@/components/common/StoreCredentialNotice';

function DealLinksHomeContent() {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const { links, loading, error, errorCause, reload } = useSellerDealLinks();
  // Token whose manual-copy input is revealed after an automatic copy failed.
  const [manualCopyToken, setManualCopyToken] = useState('');
  // Id of the link whose pause/reactivate/close request is in flight.
  const [busyId, setBusyId] = useState('');
  // Link awaiting close confirmation; drives the confirm dialog.
  const [closeTarget, setCloseTarget] = useState<SellerDealLink | null>(null);
  // The raw cause behind a failed pause/reactivate/close, kept only when it is a
  // typed store-credential denial so its recovery notice can render. Non-denial
  // mutation failures keep the existing per-action toast.
  const [mutationErrorCause, setMutationErrorCause] = useState<unknown>(null);

  // Recovery for a typed denial. STORE_CREDENTIAL_INVALID re-registers the
  // store's OWN signed credential via the local node (never OAuth); an ACCOUNT_*
  // denial switches, disconnects, or connects the optional platform account. Any
  // action reloads only after it succeeds — clearing the mutation notice too.
  const clearRecoveryAndReload = useCallback(async (): Promise<void> => {
    setMutationErrorCause(null);
    await reload();
  }, [reload]);
  const recovery = useStoreCredentialRecovery(clearRecoveryAndReload);

  // Route a mutation failure: a typed store-credential denial gets the shared
  // recovery notice; anything else keeps its plain per-action failure toast.
  const handleMutationError = useCallback(
    (cause: unknown, failedTitleKey: string): void => {
      if (isStoreCredentialDenial(cause)) setMutationErrorCause(cause);
      else toast({ variant: 'destructive', title: t(failedTitleKey) });
    },
    [t, toast]
  );

  const handlePause = useCallback(
    async (link: SellerDealLink): Promise<void> => {
      setBusyId(link.id);
      setMutationErrorCause(null);
      try {
        await pauseSellerDealLink(link.id);
        toast({ title: t('admin.dealLinks.dealPauseSuccess') });
        await reload();
      } catch (cause) {
        handleMutationError(cause, 'admin.dealLinks.dealPauseFailed');
      } finally {
        setBusyId('');
      }
    },
    [handleMutationError, reload, t, toast]
  );

  const handleReactivate = useCallback(
    async (link: SellerDealLink): Promise<void> => {
      setBusyId(link.id);
      setMutationErrorCause(null);
      try {
        await activateSellerDealLink(link.id);
        toast({ title: t('admin.dealLinks.dealReactivateSuccess') });
        await reload();
      } catch (cause) {
        handleMutationError(cause, 'admin.dealLinks.dealReactivateFailed');
      } finally {
        setBusyId('');
      }
    },
    [handleMutationError, reload, t, toast]
  );

  const handleEdit = useCallback(
    (link: SellerDealLink): void => {
      router.push(`/admin/deal-links/${encodeURIComponent(link.id)}/edit`);
    },
    [router]
  );

  const handleViewOrders = useCallback(
    (link: SellerDealLink): void => {
      router.push(`/admin/deal-links/${encodeURIComponent(link.id)}/orders`);
    },
    [router]
  );

  const handleConfirmClose = useCallback(async (): Promise<void> => {
    const link = closeTarget;
    if (!link) return;
    setCloseTarget(null);
    setBusyId(link.id);
    setMutationErrorCause(null);
    try {
      await closeSellerDealLink(link.id);
      toast({ title: t('admin.dealLinks.dealCloseSuccess') });
      await reload();
    } catch (cause) {
      handleMutationError(cause, 'admin.dealLinks.dealCloseFailed');
    } finally {
      setBusyId('');
    }
  }, [closeTarget, handleMutationError, reload, t, toast]);

  const handleCopy = useCallback(
    async (publicToken: string): Promise<void> => {
      const link = links.find(item => item.publicToken === publicToken);
      if (!link) return;
      const href = `${window.location.origin}${buildSellerDealLinkBrowseHref(link)}`;
      const copied = await copyToClipboard(href);
      if (copied) {
        setManualCopyToken('');
        toast({ title: t('admin.dealLinks.dealCopySuccess') });
        return;
      }
      // Clipboard blocked: reveal the read-only input so the seller can copy by hand.
      setManualCopyToken(publicToken);
      toast({ variant: 'destructive', title: t('admin.dealLinks.dealCopyFailed') });
    },
    [links, t, toast]
  );

  return (
    <div className="space-y-6" data-testid="admin-deal-links-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t('admin.dealLinks.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('admin.dealLinks.subtitle')}</p>
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => router.push('/admin/deal-links/new')}
          data-testid="deal-links-create"
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('admin.dealLinks.createLink')}
        </Button>
      </div>

      <Card aria-busy={loading}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t('admin.dealLinks.allLinksTitle')}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11"
            onClick={() => void reload()}
            disabled={loading}
            aria-label={t('admin.dealLinks.refresh')}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? (
            <StoreCredentialNotice
              error={errorCause}
              onRefreshCredential={() => void recovery.refreshCredential()}
              onSwitchAccount={() => void recovery.switchAccount()}
              onDisconnect={() => void recovery.disconnect()}
              onConnect={() => void recovery.connect()}
              onRetry={() => void recovery.retry()}
              busyAction={recovery.busyAction}
              failedAction={recovery.failedAction}
              fallback={
                <p className="text-sm text-destructive" role="alert">
                  {t('admin.dealLinks.loadFailed')}
                </p>
              }
            />
          ) : null}
          {mutationErrorCause ? (
            <StoreCredentialNotice
              error={mutationErrorCause}
              onRefreshCredential={() => void recovery.refreshCredential()}
              onSwitchAccount={() => void recovery.switchAccount()}
              onDisconnect={() => void recovery.disconnect()}
              onConnect={() => void recovery.connect()}
              onRetry={() => void recovery.retry()}
              busyAction={recovery.busyAction}
              failedAction={recovery.failedAction}
            />
          ) : null}
          {!loading && !error && !links.length ? (
            <EmptyState
              icon={ShieldCheck}
              title={t('admin.dealLinks.linksEmptyTitle')}
              description={t('admin.dealLinks.linksEmptyDescription')}
              action={{
                label: t('admin.dealLinks.createLink'),
                onClick: () => router.push('/admin/deal-links/new'),
              }}
            />
          ) : null}
          {links.map(link => (
            <DealLinkRow
              key={link.id}
              link={link}
              manualCopyToken={manualCopyToken}
              busy={busyId === link.id}
              onCopy={publicToken => void handleCopy(publicToken)}
              onEdit={handleEdit}
              onPause={l => void handlePause(l)}
              onReactivate={l => void handleReactivate(l)}
              onViewOrders={handleViewOrders}
              onClose={setCloseTarget}
            />
          ))}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={closeTarget !== null}
        onOpenChange={open => {
          if (!open) setCloseTarget(null);
        }}
        title={t('admin.dealLinks.closeConfirmTitle')}
        description={t('admin.dealLinks.closeConfirmBody')}
        confirmLabel={t('admin.dealLinks.closeConfirmCta')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={() => void handleConfirmClose()}
      />
    </div>
  );
}

export default function AdminDealLinksPage() {
  return <DealLinksHomeContent />;
}
