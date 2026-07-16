// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * SharePreviewDialog — PG-203
 *
 * Gives the seller a tokenized link to the *draft* storefront, so a partner
 * or friend can review it (or the seller can open it on a phone) before
 * anything is published. The token is minted once per editor session and
 * reused across dialog opens — minting on every open would silently revoke
 * the link the seller shared five minutes ago.
 */

import { useEffect, useState } from 'react';
import { useI18n, storefrontApi, type StorefrontPreviewToken } from '@mobazha/core';
import { Check, Copy, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SharePreviewDialogProps {
  open: boolean;
  peerID: string | null;
  onClose: () => void;
}

export function SharePreviewDialog({ open, peerID, onClose }: SharePreviewDialogProps) {
  const { t, formatDate } = useI18n();
  const [tokenInfo, setTokenInfo] = useState<StorefrontPreviewToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  const mintToken = async () => {
    setLoading(true);
    setFailed(false);
    try {
      setTokenInfo(await storefrontApi.createStorefrontPreviewToken());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !tokenInfo && !loading && !failed) {
      void mintToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mint once per open, not per state change
  }, [open]);

  const shareUrl =
    tokenInfo && peerID
      ? `${window.location.origin}/store/${peerID}?preview=${tokenInfo.token}`
      : '';

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (permissions, http); the URL stays
      // visible and selectable either way.
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="share-preview-dialog">
        <DialogHeader>
          <DialogTitle>{t('admin.storeBranding.sharePreviewTitle')}</DialogTitle>
          <DialogDescription>{t('admin.storeBranding.sharePreviewDesc')}</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {failed && !loading && (
          <div className="py-4 text-sm text-destructive">
            {t('admin.storeBranding.sharePreviewFailed')}
            <Button variant="outline" size="sm" className="ml-2" onClick={() => void mintToken()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {tokenInfo && !loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={e => e.target.select()}
                className="flex-1 min-w-0 text-xs px-2.5 py-2 rounded-md border border-border bg-muted/50 font-mono"
                data-testid="share-preview-url"
              />
              <Button size="sm" onClick={() => void handleCopy()} data-testid="share-preview-copy">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1">
                  {copied ? t('admin.storeBranding.linkCopied') : t('admin.storeBranding.copyLink')}
                </span>
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t('admin.storeBranding.sharePreviewExpires', {
                  date: formatDate(tokenInfo.expiresAt),
                })}
              </span>
              <button
                type="button"
                onClick={() => void mintToken()}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                title={t('admin.storeBranding.sharePreviewRotateHint')}
              >
                <RefreshCw className="w-3 h-3" />
                {t('admin.storeBranding.sharePreviewRotate')}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
