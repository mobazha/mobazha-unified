'use client';

import React, { useState, useCallback } from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { TokenConfig, ChainConfig } from './types';
import { getChainById } from './config';
import { TokenIcon } from './TokenIcon';

export interface MultiChainTokenCardProps {
  symbol: string;
  tokens: TokenConfig[];
  selectedTokenId?: string;
  onSelect: (tokenId: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Multi-chain token card with inline network picker.
 * When the symbol has only one chain, click selects directly.
 * When the symbol has multiple chains, first click expands the chain list.
 */
export const MultiChainTokenCard: React.FC<MultiChainTokenCardProps> = ({
  symbol,
  tokens,
  selectedTokenId,
  onSelect,
  disabled = false,
  className,
}) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  const isMultiChain = tokens.length > 1;
  const hasSelection = tokens.some(tok => tok.id === selectedTokenId);
  const selectedToken = tokens.find(tok => tok.id === selectedTokenId);
  const representativeToken = tokens[0];

  const handleCardClick = useCallback(() => {
    if (disabled) return;
    if (isMultiChain) {
      setExpanded(prev => !prev);
    } else {
      onSelect(tokens[0].id);
    }
  }, [disabled, isMultiChain, onSelect, tokens]);

  const handleChainSelect = useCallback(
    (tokenId: string) => {
      if (disabled) return;
      onSelect(tokenId);
      setExpanded(false);
    },
    [disabled, onSelect]
  );

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Primary card — shows the currency symbol */}
      <button
        type="button"
        onClick={handleCardClick}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2.5 w-full min-h-[52px] px-3.5 py-2.5 rounded-xl',
          'border transition-all duration-200',
          'hover:bg-muted/50 active:scale-[0.98]',
          hasSelection
            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
            : 'border-border bg-surface hover:border-muted-foreground/30',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <TokenIcon token={representativeToken.id} size={28} showChainBadge={false} />

        <div className="flex flex-col items-start flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{symbol}</span>
          {isMultiChain ? (
            <span className="text-xs text-muted-foreground">
              {hasSelection && selectedToken
                ? (getChainById(selectedToken.chain)?.name ?? selectedToken.chain)
                : t('fiat.chainsAvailable', { count: tokens.length })}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              {getChainById(representativeToken.chain)?.name ?? representativeToken.chain}
            </span>
          )}
        </div>

        {hasSelection && <Check className="w-4 h-4 text-primary shrink-0" />}

        {isMultiChain &&
          (expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ))}
      </button>

      {/* Expanded chain list */}
      {isMultiChain && expanded && (
        <div className="mt-1 ml-4 flex flex-col gap-0.5 animate-in slide-in-from-top-2 duration-200">
          {tokens.map(token => {
            const chain: ChainConfig | undefined = getChainById(token.chain);
            const isSelected = token.id === selectedTokenId;
            return (
              <button
                key={token.id}
                type="button"
                onClick={() => handleChainSelect(token.id)}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg',
                  'transition-all duration-150',
                  'hover:bg-muted/60 active:scale-[0.98]',
                  isSelected
                    ? 'bg-primary/8 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <TokenIcon token={token.chain} size={18} />
                <span className="text-sm font-medium flex-1 text-left">
                  {chain?.name ?? token.chain}
                </span>
                {token.type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {token.type}
                  </span>
                )}
                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiChainTokenCard;
