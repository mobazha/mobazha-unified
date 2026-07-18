// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

'use client';

import React, { useCallback, useRef } from 'react';
import { Download, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useI18n } from '@mobazha/core';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AffiliateLinkQRDialogProps {
  /** Full URL the QR encodes (the short link when the backend mints one). */
  url: string;
  /** Download file stem; saved as `<fileStem>.png`. */
  fileStem: string;
  /** Store name shown above the code so the promoter knows what they printed. */
  storeName?: string | null;
}

/**
 * QR share surface for a promoter link (Phase B of the affiliate share
 * surface). The canvas keeps a white quiet zone even in dark mode — scanner
 * reliability beats theme fidelity for a code meant to be printed or
 * screenshotted.
 */
export function AffiliateLinkQRDialog({ url, fileStem, storeName }: AffiliateLinkQRDialogProps) {
  const { t } = useI18n();
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const anchor = document.createElement('a');
    anchor.href = canvas.toDataURL('image/png');
    anchor.download = `${fileStem}.png`;
    anchor.click();
  }, [fileStem]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11" data-testid="promote-qr-link">
          <QrCode className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('promote.qrCta')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm" data-testid="promote-qr-dialog">
        <DialogHeader>
          <DialogTitle>{storeName || t('promote.qrTitle')}</DialogTitle>
          <DialogDescription>{t('promote.qrDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div ref={canvasWrapRef} className="rounded-lg bg-white p-4">
            <QRCodeCanvas
              value={url}
              size={224}
              bgColor="#ffffff"
              fgColor="#000000"
              marginSize={2}
            />
          </div>
          <p className="break-all text-center text-xs text-muted-foreground">{url}</p>
          <Button
            type="button"
            className="min-h-11"
            onClick={handleDownload}
            data-testid="promote-qr-download"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('promote.qrDownload')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
