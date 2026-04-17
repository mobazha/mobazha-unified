'use client';

import React, { useCallback, useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SaveOrderLinkCardProps {
  orderUrl: string;
  title: string;
  description: string;
  copyLabel: string;
  copiedLabel: string;
  className?: string;
  testId?: string;
}

export function SaveOrderLinkCard({
  orderUrl,
  title,
  description,
  copyLabel,
  copiedLabel,
  className,
  testId,
}: SaveOrderLinkCardProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-lg border border-border bg-muted/30 p-4 space-y-3',
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Link2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={orderUrl}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          aria-label={title}
          className="flex-1 min-w-0 rounded-md border border-border bg-background px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="shrink-0"
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
      </div>
    </div>
  );
}
