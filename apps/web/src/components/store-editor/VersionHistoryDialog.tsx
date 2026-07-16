// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

/**
 * VersionHistoryDialog — PG-203
 *
 * Lists previously-published storefront configs (the node archives the
 * superseded live config on every publish). "Restore" does NOT publish:
 * it loads the old config into the editor as a draft, so recovery goes
 * through the same review-then-publish path as any other edit.
 */

import { useI18n, useStorefrontHistory, type StoreConfig } from '@mobazha/core';
import { History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface VersionHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  /** Loads the config into the editor draft; caller owns toast + close. */
  onRestore: (config: StoreConfig) => void;
}

export function VersionHistoryDialog({ open, onClose, onRestore }: VersionHistoryDialogProps) {
  const { t, formatDate } = useI18n();
  const { history, isLoading, error } = useStorefrontHistory(open);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" data-testid="version-history-dialog">
        <DialogHeader>
          <DialogTitle>{t('admin.storeBranding.versionHistory')}</DialogTitle>
          <DialogDescription>{t('admin.storeBranding.versionHistoryDesc')}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !isLoading && <p className="py-4 text-sm text-destructive">{error}</p>}

        {!isLoading && !error && history.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <History className="w-8 h-8" />
            <p className="text-sm">{t('admin.storeBranding.versionHistoryEmpty')}</p>
          </div>
        )}

        {!isLoading && history.length > 0 && (
          <ul className="space-y-2 max-h-80 overflow-y-auto" data-testid="version-history-list">
            {history.map((entry, i) => (
              <li
                key={entry.publishedAt + i}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {formatDate(entry.publishedAt, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.storeBranding.versionHistoryMeta', {
                      count: entry.config.sections?.length ?? 0,
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestore(entry.config)}
                  data-testid={`version-restore-${i}`}
                >
                  {t('admin.storeBranding.versionRestore')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
