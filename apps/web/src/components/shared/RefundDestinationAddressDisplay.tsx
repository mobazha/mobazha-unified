'use client';

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useI18n } from '@mobazha/core';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

export interface RefundDestinationAddressDisplayProps {
  address: string;
  /** Show title + description above the address. Default true. */
  showHeader?: boolean;
  titleAs?: 'h2' | 'h3';
  titleClassName?: string;
  copyTestId?: string;
  addressTestId?: string;
}

export function RefundDestinationAddressDisplay({
  address,
  showHeader = true,
  titleAs = 'h3',
  titleClassName,
  copyTestId,
  addressTestId,
}: RefundDestinationAddressDisplayProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const trimmed = address.trim();

  const handleCopy = useCallback(async () => {
    if (!trimmed) return;
    const ok = await copyToClipboard(trimmed);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }, [trimmed]);

  if (!trimmed) return null;

  const TitleTag = titleAs;

  return (
    <div className="space-y-2">
      {showHeader ? (
        <div className="flex items-center justify-between gap-2">
          <TitleTag
            className={cn(
              'font-semibold text-foreground',
              titleAs === 'h2' ? 'text-base' : 'text-sm',
              titleClassName
            )}
          >
            {t('payment.refundDestination.title')}
          </TitleTag>
          <CopyButton copied={copied} onCopy={handleCopy} testId={copyTestId} />
        </div>
      ) : (
        <div className="flex justify-end">
          <CopyButton copied={copied} onCopy={handleCopy} testId={copyTestId} />
        </div>
      )}
      {showHeader ? (
        <p className="text-xs text-muted-foreground">{t('payment.refundDestination.desc')}</p>
      ) : null}
      <p
        className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-sm text-foreground break-all"
        data-testid={addressTestId}
      >
        {trimmed}
      </p>
    </div>
  );
}

function CopyButton({
  copied,
  onCopy,
  testId,
}: {
  copied: boolean;
  onCopy: () => void;
  testId?: string;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={t('order.actions.copyToClipboard')}
      data-testid={testId}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-primary" />
          <span className="text-primary">{t('common.copied')}</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>{t('common.copy')}</span>
        </>
      )}
    </button>
  );
}
