'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@mobazha/core';
import { PaymentCryptoSelectorProps, TokenConfig } from './types';
import { TOKENS, CHAINS, FIAT_METHODS } from './config';
import { CryptoTokenCard } from './CryptoTokenCard';
import { Badge } from '@/components/ui/badge';

// 链标签颜色
const CHAIN_COLORS: Record<string, string> = {
  all: 'bg-muted text-muted-foreground',
  BTC: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  LTC: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ETH: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  SOL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  BSC: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  BASE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  MATIC: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export const PaymentCryptoSelector: React.FC<PaymentCryptoSelectorProps> = ({
  selectedTokenId,
  onSelect,
  disabled = false,
  className,
  isRwaTokenPurchase = false,
  rwaBlockchain,
  showFiatMethods = true,
}) => {
  const { t } = useI18n();
  const [activeChain, setActiveChain] = useState<string>('all');
  const [showAllTokens, setShowAllTokens] = useState(false);
  const maxVisibleTokens = 8;

  // 获取可用的链列表（排除 comingSoon）
  const availableChains = useMemo(() => {
    return CHAINS.filter(chain => chain.type === 'filter' || !chain.comingSoon);
  }, []);

  // 根据 RWA Token 购买模式筛选代币
  const availableTokens = useMemo(() => {
    if (isRwaTokenPurchase && rwaBlockchain) {
      return TOKENS.filter(
        token => token.chain === rwaBlockchain && !token.isNative && !token.disabled
      );
    }
    // 过滤掉 comingSoon 链和 disabled 的代币
    const comingSoonChains = CHAINS.filter(c => c.comingSoon).map(c => c.id);
    return TOKENS.filter(t => !comingSoonChains.includes(t.chain) && !t.disabled);
  }, [isRwaTokenPurchase, rwaBlockchain]);

  // 根据选中的链筛选代币
  const filteredTokens = useMemo(() => {
    if (activeChain === 'all') {
      return availableTokens;
    }
    return availableTokens.filter(token => token.chain === activeChain);
  }, [activeChain, availableTokens]);

  // 显示的代币（考虑展开/收起状态）
  const visibleTokens = useMemo(() => {
    if (showAllTokens) {
      return filteredTokens;
    }
    return filteredTokens.slice(0, maxVisibleTokens);
  }, [filteredTokens, showAllTokens]);

  // 是否显示"更多"按钮
  const hasMoreTokens = filteredTokens.length > maxVisibleTokens;

  // 处理链切换
  const handleChainClick = useCallback((chainId: string) => {
    setActiveChain(chainId);
    setShowAllTokens(false);
  }, []);

  // 处理代币选择
  const handleTokenSelect = useCallback(
    (token: TokenConfig) => {
      if (disabled) return;
      onSelect(token.id);
    },
    [disabled, onSelect]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* 链标签栏 */}
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

      {/* 代币网格 */}
      <div className="flex flex-wrap gap-2">
        {visibleTokens.length > 0 ? (
          <>
            {visibleTokens.map(token => (
              <CryptoTokenCard
                key={token.id}
                token={token}
                selected={selectedTokenId === token.id}
                onClick={() => handleTokenSelect(token)}
                disabled={disabled}
              />
            ))}

            {/* 更多按钮 */}
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
                    <span>{t('payment.showLess', 'Less')}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>
                      {t('payment.showMore', 'More')} ({filteredTokens.length - maxVisibleTokens})
                    </span>
                  </>
                )}
              </button>
            )}
          </>
        ) : (
          <div className="w-full py-4 text-center text-muted-foreground text-sm">
            {t('payment.noTokensAvailable', 'No payment methods available')}
          </div>
        )}
      </div>

      {/* 其他支付方式 */}
      {showFiatMethods && FIAT_METHODS.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground font-medium">
            {t('payment.otherMethods', 'Other Payment Methods')}
          </span>
          <div className="flex flex-wrap gap-2">
            {FIAT_METHODS.map(method => (
              <button
                key={method.id}
                type="button"
                disabled={method.disabled}
                className={cn(
                  'flex items-center gap-2 min-w-[100px] h-11 px-3 rounded-lg',
                  'border border-border bg-surface',
                  'transition-colors',
                  method.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-muted/50 hover:border-muted-foreground/30'
                )}
              >
                <CreditCard className="w-5 h-5" style={{ color: method.color }} />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{method.name}</span>
                  {method.comingSoon && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {t('common.comingSoon', 'Coming Soon')}
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentCryptoSelector;
