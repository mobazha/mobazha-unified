'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n, getGatewayUrl, NODE_API, type DisplayDispute } from '@mobazha/core';
import { ImageOff, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DisputeEvidencePanelProps {
  dispute: DisplayDispute;
  onOpenDiscussion?: () => void;
  className?: string;
}

export const DisputeEvidencePanel = memo(function DisputeEvidencePanel({
  dispute,
  onOpenDiscussion,
  className,
}: DisputeEvidencePanelProps) {
  const { t } = useI18n();
  const hashes = dispute.evidenceHashes ?? [];

  if (hashes.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <ImageOff className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-sm font-medium text-foreground">
          {t('order.disputeOverview.noEvidence')}
        </p>
        <p className="text-xs text-muted-foreground mt-2 max-w-md leading-relaxed">
          {t('order.disputeOverview.noEvidenceHint')}
        </p>
        {dispute.claim ? (
          <div className="mt-4 w-full max-w-lg text-left rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t('order.disputeOverview.claim')}
            </p>
            <p className="text-sm text-foreground leading-relaxed">{dispute.claim}</p>
          </div>
        ) : null}
        {onOpenDiscussion && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={onOpenDiscussion}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {t('order.actions.openDiscussion')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
        {t('order.disputeOverview.evidence')} ({hashes.length})
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {hashes.map((hash, idx) => {
          const url = `${getGatewayUrl()}${NODE_API.MEDIA_IMAGE(hash)}`;
          return (
            <a
              key={hash}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block aspect-square rounded-xl overflow-hidden border border-border/60 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <img
                src={url}
                alt={`${t('order.disputeOverview.evidence')} ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </a>
          );
        })}
      </div>

      {dispute.claim && (
        <div className="bg-muted/40 rounded-xl p-4 border border-border/60 mt-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">
            {t('order.disputeOverview.claim')}
          </p>
          <p className="text-sm text-foreground leading-relaxed">{dispute.claim}</p>
        </div>
      )}
    </div>
  );
});
