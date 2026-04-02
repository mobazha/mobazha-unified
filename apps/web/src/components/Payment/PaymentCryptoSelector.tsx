'use client';

import React, { useMemo, useCallback } from 'react';
import { CreditCard, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { useMiniAppPayment } from '@/hooks/useMiniAppPayment';
import { PaymentCryptoSelectorProps, TokenConfig, FiatMethodConfig } from './types';
import { TOKENS, CHAINS, FIAT_METHODS, groupTokensByCurrency, getChainById } from './config';
import type { CurrencyGroup } from './config';
import { CryptoTokenCard } from './CryptoTokenCard';
import { MultiChainTokenCard } from './MultiChainTokenCard';
import { TokenIcon } from './TokenIcon';

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

  const hasFiat = useMemo(
    () => showFiatMethods && availableFiatProviders && availableFiatProviders.length > 0,
    [showFiatMethods, availableFiatProviders]
  );

  const activeFiatMethods = useMemo<FiatMethodConfig[]>(() => {
    if (!hasFiat || !availableFiatProviders) return [];
    return FIAT_METHODS.filter(m => availableFiatProviders.includes(m.providerID));
  }, [hasFiat, availableFiatProviders]);

  const availableTokens = useMemo(() => {
    if (isRwaTokenPurchase && rwaBlockchain) {
      return TOKENS.filter(
        token => token.chain === rwaBlockchain && !token.isNative && !token.disabled
      );
    }
    const comingSoonChains = CHAINS.filter(c => c.comingSoon).map(c => c.id);
    let tokens = TOKENS.filter(tok => !comingSoonChains.includes(tok.chain) && !tok.disabled);
    if (acceptedCurrencies) {
      const accepted = new Set(
        acceptedCurrencies
          .map(value => value?.trim().toLowerCase())
          .filter((value): value is string => Boolean(value))
      );
      tokens = tokens.filter(token => {
        const tokenID = token.id.trim().toLowerCase();
        const canonical = token.assetId?.trim().toLowerCase();
        return accepted.has(tokenID) || (canonical ? accepted.has(canonical) : false);
      });
    }
    return tokens;
  }, [isRwaTokenPurchase, rwaBlockchain, acceptedCurrencies]);

  const currencyGroups = useMemo(() => groupTokensByCurrency(availableTokens), [availableTokens]);

  const stablecoins = useMemo(
    () => currencyGroups.filter(g => g.category === 'stablecoin'),
    [currencyGroups]
  );
  const nativeCoins = useMemo(
    () => currencyGroups.filter(g => g.category === 'native'),
    [currencyGroups]
  );
  const otherTokens = useMemo(
    () => currencyGroups.filter(g => g.category === 'other'),
    [currencyGroups]
  );

  const handleTokenSelect = useCallback(
    (tokenId: string) => {
      if (disabled) return;
      onSelect(tokenId);
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
    <div className={cn('space-y-5', className)}>
      {/* Fiat methods */}
      {activeFiatMethods.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {t('fiat.sectionTitle')}
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

      {/* Crypto section */}
      {availableTokens.length > 0 && (
        <div className="space-y-4">
          {activeFiatMethods.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {t('fiat.cryptoSection')}
              </span>
              {isEmbedded && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {t('fiat.stablecoinsRecommended')}
                </span>
              )}
            </div>
          )}

          {/* RWA mode: flat grid, no grouping */}
          {isRwaTokenPurchase ? (
            <div className="flex flex-wrap gap-2">
              {availableTokens.map(token => (
                <CryptoTokenCard
                  key={token.id}
                  token={token}
                  selected={selectedTokenId === token.id && !selectedFiatProvider}
                  onClick={() => handleTokenSelect(token.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Stablecoins section */}
              {stablecoins.length > 0 && (
                <CurrencySection
                  label={t('fiat.stablecoins')}
                  badge={t('fiat.stablecoinsRecommended')}
                  groups={stablecoins}
                  selectedTokenId={selectedTokenId}
                  selectedFiatProvider={selectedFiatProvider}
                  onSelect={handleTokenSelect}
                  disabled={disabled}
                />
              )}

              {/* Native coins section */}
              {nativeCoins.length > 0 && (
                <CurrencySection
                  label={t('fiat.nativeCoins')}
                  groups={nativeCoins}
                  selectedTokenId={selectedTokenId}
                  selectedFiatProvider={selectedFiatProvider}
                  onSelect={handleTokenSelect}
                  disabled={disabled}
                />
              )}

              {/* Other tokens section */}
              {otherTokens.length > 0 && (
                <CurrencySection
                  label={t('fiat.otherTokens')}
                  groups={otherTokens}
                  selectedTokenId={selectedTokenId}
                  selectedFiatProvider={selectedFiatProvider}
                  onSelect={handleTokenSelect}
                  disabled={disabled}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Section renderer ─── */

interface CurrencySectionProps {
  label: string;
  badge?: string;
  groups: CurrencyGroup[];
  selectedTokenId?: string;
  selectedFiatProvider?: string;
  onSelect: (tokenId: string) => void;
  disabled: boolean;
}

const CurrencySection: React.FC<CurrencySectionProps> = ({
  label,
  badge,
  groups,
  selectedTokenId,
  selectedFiatProvider,
  onSelect,
  disabled,
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
        {label}
      </span>
      {badge && (
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {badge}
        </span>
      )}
    </div>

    <div className="flex flex-col gap-1.5">
      {groups.map(group =>
        group.tokens.length > 1 ? (
          <MultiChainTokenCard
            key={group.symbol}
            symbol={group.symbol}
            tokens={group.tokens}
            selectedTokenId={!selectedFiatProvider ? selectedTokenId : undefined}
            onSelect={onSelect}
            disabled={disabled}
          />
        ) : (
          <SingleTokenRow
            key={group.tokens[0].id}
            token={group.tokens[0]}
            selected={selectedTokenId === group.tokens[0].id && !selectedFiatProvider}
            onSelect={onSelect}
            disabled={disabled}
          />
        )
      )}
    </div>
  </div>
);

/* ─── Single-chain token row (same visual weight as MultiChainTokenCard) ─── */

interface SingleTokenRowProps {
  token: TokenConfig;
  selected: boolean;
  onSelect: (tokenId: string) => void;
  disabled: boolean;
}

const SingleTokenRow: React.FC<SingleTokenRowProps> = ({ token, selected, onSelect, disabled }) => {
  const chain = getChainById(token.chain);
  return (
    <button
      type="button"
      onClick={() => onSelect(token.id)}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2.5 w-full min-h-[52px] px-3.5 py-2.5 rounded-xl',
        'border transition-all duration-200',
        'hover:bg-muted/50 active:scale-[0.98]',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-surface hover:border-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <TokenIcon token={token.id} size={28} />

      <div className="flex flex-col items-start flex-1 min-w-0">
        <span className="text-sm font-semibold text-foreground">{token.token}</span>
        <span className="text-xs text-muted-foreground">{chain?.name ?? token.chain}</span>
      </div>

      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
};

export default PaymentCryptoSelector;
