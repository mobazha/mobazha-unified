'use client';

import React, { memo } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import {
  buildSellerDealLinkBrowseHref,
  useCurrency,
  useI18n,
  type SellerDealLink,
} from '@mobazha/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface DealLinkRowProps {
  link: SellerDealLink;
  highlighted?: boolean;
  manualCopyToken: string;
  onCopy: (publicToken: string) => void;
}

export const DealLinkRow = memo(function DealLinkRow({
  link,
  highlighted,
  manualCopyToken,
  onCopy,
}: DealLinkRowProps) {
  const { t } = useI18n();
  const { formatPrice } = useCurrency();
  const href = buildSellerDealLinkBrowseHref(link);
  const absoluteHref = typeof window === 'undefined' ? href : `${window.location.origin}${href}`;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between',
        highlighted ? 'border-primary/40 bg-primary/5' : 'border-border'
      )}
      data-testid={`deal-link-row-${link.id}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{link.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatPrice(link.priceAmount, link.priceCurrency)}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
          onClick={() => onCopy(link.publicToken)}
        >
          <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {t('admin.dealLinks.copyDealCta')}
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
        >
          <a href={href} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {t('admin.dealLinks.openDealCta')}
          </a>
        </Button>
      </div>
      {manualCopyToken === link.publicToken ? (
        <div className="w-full basis-full space-y-1.5 border-t border-border pt-3">
          <Label htmlFor={`manual-copy-${link.id}`} className="text-xs">
            {t('admin.dealLinks.manualCopyLabel')}
          </Label>
          <Input
            id={`manual-copy-${link.id}`}
            value={absoluteHref}
            readOnly
            className="min-h-11 font-mono text-xs"
            onFocus={event => event.currentTarget.select()}
          />
        </div>
      ) : null}
    </div>
  );
});
