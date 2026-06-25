'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { getSolanaExplorerTxUrl, truncateAddress, useI18n } from '@mobazha/core';

export interface CollectibleOnChainProofProps {
  mintTxSignature?: string;
  mintConfirmedSlot?: number;
  isDevnet?: boolean;
  className?: string;
}

export function CollectibleOnChainProof({
  mintTxSignature,
  mintConfirmedSlot,
  isDevnet,
  className,
}: CollectibleOnChainProofProps) {
  const { t } = useI18n();
  const signature = mintTxSignature?.trim() ?? '';
  if (!signature) return null;

  const explorerUrl = getSolanaExplorerTxUrl(signature, isDevnet);
  const slot = mintConfirmedSlot && mintConfirmedSlot > 0 ? mintConfirmedSlot : undefined;

  return (
    <dl className={className}>
      <div>
        <dt className="text-muted-foreground">{t('collectibles.onChain.mintTx')}</dt>
        <dd className="mt-0.5 font-medium text-foreground">
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline"
            >
              {truncateAddress(signature)}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="sr-only">{t('collectibles.onChain.viewOnExplorer')}</span>
            </a>
          ) : (
            <span className="font-mono text-sm">{truncateAddress(signature)}</span>
          )}
        </dd>
      </div>
      {slot ? (
        <div className="mt-2">
          <dt className="text-muted-foreground">{t('collectibles.onChain.mintConfirmedSlot')}</dt>
          <dd className="font-medium text-foreground">{slot.toLocaleString()}</dd>
        </div>
      ) : null}
    </dl>
  );
}
