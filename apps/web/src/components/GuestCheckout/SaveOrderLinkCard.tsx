'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, Send, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTGMiniApp } from '@/components/TGMiniAppProvider';
import { sendGuestOrderReceiptToTelegram } from '@/lib/telegramGuestReceipt';
import { cn } from '@/lib/utils';

export interface SaveOrderLinkCardProps {
  orderUrl: string;
  title: string;
  description: string;
  copyLabel: string;
  copiedLabel: string;
  shareLabel?: string;
  telegramSendLabel?: string;
  telegramSendingLabel?: string;
  telegramSentLabel?: string;
  telegramSendError?: string;
  telegramPrivacyNote?: string;
  className?: string;
  testId?: string;
}

export function SaveOrderLinkCard({
  orderUrl,
  title,
  description,
  copyLabel,
  copiedLabel,
  shareLabel,
  telegramSendLabel,
  telegramSendingLabel,
  telegramSentLabel,
  telegramSendError,
  telegramPrivacyNote,
  className,
  testId,
}: SaveOrderLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle'
  );
  const tg = useTGMiniApp();

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = orderUrl;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent: user can still copy manually from the input
    }
  }, [orderUrl]);

  const handleShare = useCallback(async () => {
    if (!navigator?.share) return;
    try {
      await navigator.share({ title, text: description, url: orderUrl });
    } catch {
      // Dismissal is expected; keep the private receipt on the current page.
    }
  }, [description, orderUrl, title]);

  const handleTelegramReceipt = useCallback(async () => {
    if (!tg.initData || telegramStatus === 'sending') return;
    setTelegramStatus('sending');
    try {
      await sendGuestOrderReceiptToTelegram(orderUrl, tg.initData);
      setTelegramStatus('sent');
    } catch {
      setTelegramStatus('error');
    }
  }, [orderUrl, telegramStatus, tg.initData]);

  const showTelegramReceipt = Boolean(
    tg.isAvailable &&
    tg.initData &&
    telegramSendLabel &&
    telegramSendingLabel &&
    telegramSentLabel &&
    telegramSendError &&
    telegramPrivacyNote
  );

  return (
    <div
      data-testid={testId}
      className={cn('rounded-lg border border-border bg-muted/30 p-4 space-y-3', className)}
    >
      <div className="flex items-start gap-2">
        <Link2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="space-y-2">
        <input
          type="text"
          value={orderUrl}
          readOnly
          onFocus={e => e.currentTarget.select()}
          aria-label={title}
          className="w-full min-w-0 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className={`grid gap-2 ${canShare && shareLabel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="w-full"
            aria-live="polite"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                {copiedLabel}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                {copyLabel}
              </>
            )}
          </Button>
          {canShare && shareLabel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="w-full"
            >
              <Share2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              {shareLabel}
            </Button>
          )}
        </div>
        {showTelegramReceipt && (
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTelegramReceipt}
              disabled={telegramStatus === 'sending' || telegramStatus === 'sent'}
              className="w-full"
              aria-live="polite"
            >
              {telegramStatus === 'sending' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden="true" />
              ) : telegramStatus === 'sent' ? (
                <Check className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              )}
              {telegramStatus === 'sending'
                ? telegramSendingLabel
                : telegramStatus === 'sent'
                  ? telegramSentLabel
                  : telegramStatus === 'error'
                    ? telegramSendError
                    : telegramSendLabel}
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {telegramPrivacyNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
