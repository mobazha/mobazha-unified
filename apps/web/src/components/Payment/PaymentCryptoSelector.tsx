'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, CreditCard, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { useMiniAppPayment } from '@/hooks/useMiniAppPayment';
import { PaymentCryptoSelectorProps, TokenConfig, FiatMethodConfig } from './types';
import { TOKENS, CHAINS, FIAT_METHODS } from './config';
import { CryptoTokenCard } from './CryptoTokenCard';

const CHAIN_COLORS: Record<string, string> = {
  all: 'bg-muted text-muted-foreground',
  BTC: 'bg-warning/15 text-warning',
  LTC: 'bg-muted text-muted-foreground',
  ETH: 'bg-primary/15 text-primary',
  SOL: 'bg-primary/15 text-primary',
  BSC: 'bg-warning/15 text-warning',
  BASE: 'bg-info/15 text-info',
  MATIC: 'bg-primary/15 text-primary',
};

export const PaymentCryptoSelector: React.FC<PaymentCryptoSelectorProps> = ({
  selectedTokenId,
  onSelect,
  onSelectFiat,
  selectedFiatProvider,
  availableFiatProviders,
  acceptedCurrencies,
  disabled = false,
  className,
  isRwaTokenPurchase = false,
  rwaBlockchain,
  showFiatMethods = true,
}) => {
  const { t } = useI18n();
  const { isEmbedded } = useMiniAppPayment();
  const [activeChain, setActiveChain] = useState<string>('all');
  const [showAllTokens, setShowAllTokens] = useState(false);
  const maxVisibleTokens = 8;

  const hasFiat = useMemo(
    () => showFiatMethods && availableFiatProviders && availableFiatProviders.length > 0,
    [showFiatMethods, availableFiatProviders]
  );

  const activeFiatMethods = useMemo<FiatMethodConfig[]>(() => {
    if (!hasFiat || !availableFiatProviders) return [];
    return FIAT_METHODS.filter(m => availableFiatProviders.includes(m.providerID));
  }, [hasFiat, availableFiatProviders]);

  const availableChains = useMemo(() => {
    return CHAINS.filter(chain => chain.type === 'filter' || !chain.comingSoon);
  }, []);

  const availableTokens = useMemo(() => {
    if (isRwaTokenPurchase && rwaBlockchain) {
      return TOKENS.filter(
        token => token.chain === rwaBlockchain && !token.isNative && !token.disabled
      );
    }
    const comingSoonChains = CHAINS.filter(c => c.comingSoon).map(c => c.id);
    let tokens = TOKENS.filter(t => !comingSoonChains.includes(t.chain) && !t.disabled);
    if (acceptedCurrencies) {
      tokens = tokens.filter(t => acceptedCurrencies.includes(t.id));
    }
    return tokens;
  }, [isRwaTokenPurchase, rwaBlockchain, acceptedCurrencies]);

  const filteredTokens = useMemo(() => {
    if (activeChain === 'all') return availableTokens;
    return availableTokens.filter(token => token.chain === activeChain);
  }, [activeChain, availableTokens]);

  const visibleTokens = useMemo(() => {
    if (showAllTokens) return filteredTokens;
    return filteredTokens.slice(0, maxVisibleTokens);
  }, [filteredTokens, showAllTokens]);

  const hasMoreTokens = filteredTokens.length > maxVisibleTokens;

  const handleChainClick = useCallback((chainId: string) => {
    setActiveChain(chainId);
    setShowAllTokens(false);
  }, []);

  const handleTokenSelect = useCallback(
    (token: TokenConfig) => {
      if (disabled) return;
      onSelect(token.id);
    },
    [disabled, onSelect]
  );

  const handleFiatSelect = useCallback(
    (method: FiatMethodConfig) => {
      if (disabled || !onSelectFiat) return;
      onSelectFiat(method.providerID);
    },
    [disabled, onSelectFiat]
  );

  const isEmpty = availableTokens.length === 0 && activeFiatMethods.length === 0;

  if (isEmpty) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 px-6 text-center',
          className
        )}
      >
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <CreditCard className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {t('payment.noPaymentMethods')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          {t('payment.noPaymentMethodsDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Fiat methods — shown first when seller has providers */}
      {activeFiatMethods.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {t('fiat.sectionTitle', { defaultValue: 'Pay with card or wallet' })}
          </span>
          <div className="flex flex-col gap-2">
            {activeFiatMethods.map(method => {
              const isSelected = selectedFiatProvider === method.providerID;
              return (
                <button
                  key={method.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleFiatSelect(method)}
                  className={cn(
                    'flex items-center gap-3 w-full min-h-[52px] px-4 py-3 rounded-xl',
                    'border transition-all duration-200',
                    'active:scale-[0.98]',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-surface hover:bg-muted/50 hover:border-muted-foreground/30',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <CreditCard className="w-5 h-5 shrink-0" style={{ color: method.color }} />
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{method.name}</span>
                      {isEmbedded && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    {method.brandLabels && method.brandLabels.length > 0 && (
                      <span className="text-xs text-muted-foreground truncate w-full text-left">
                        {method.brandLabels.join(' · ')}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Crypto section — hidden entirely when seller accepts no crypto */}
      {availableTokens.length > 0 && (
        <div className="space-y-3">
          {activeFiatMethods.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {t('fiat.cryptoSection', { defaultValue: 'Pay with cryptocurrency' })}
              </span>
              {isEmbedded && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Recommended
                </span>
              )}
            </div>
          )}

          {/* Chain tabs */}
          {!isRwaTokenPurchase && (
            <div className="flex flex-wrap gap-2">
              {availableChains.map(chain => (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => handleChainClick(chain.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                    'hover:opacity-80 active:scale-95',
                    activeChain === chain.id
                      ? cn(
                          CHAIN_COLORS[chain.id] || CHAIN_COLORS['all'],
                          'ring-1 ring-inset ring-current/20'
                        )
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {chain.name}
                </button>
              ))}
            </div>
          )}

          {/* Token grid */}
          <div className="flex flex-wrap gap-2">
            {visibleTokens.map(token => (
              <CryptoTokenCard
                key={token.id}
                token={token}
                selected={selectedTokenId === token.id && !selectedFiatProvider}
                onClick={() => handleTokenSelect(token)}
                disabled={disabled}
              />
            ))}

            {hasMoreTokens && (
              <button
                type="button"
                onClick={() => setShowAllTokens(!showAllTokens)}
                className={cn(
                  'flex items-center gap-1 min-w-[100px] h-11 px-3 rounded-lg',
                  'border border-border bg-muted/30',
                  'text-sm text-muted-foreground',
                  'hover:bg-muted/50 transition-colors'
                )}
              >
                {showAllTokens ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>{t('payment.showLess')}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>
                      {t('payment.showMore')} ({filteredTokens.length - maxVisibleTokens})
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCryptoSelector;
