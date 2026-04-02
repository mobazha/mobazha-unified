'use client';

import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

// Token ID 到标准符号的映射
const TOKEN_SYMBOL_MAP: Record<string, string> = {
  // UTXO Chains
  BTC: 'btc',
  BCH: 'bch',
  LTC: 'ltc',
  ZEC: 'zec',
  // Ethereum & ERC20
  ETH: 'eth',
  ETHUSDT: 'usdt',
  ETHUSDC: 'usdc',
  DAI: 'dai',
  // Solana & SPL
  SOL: 'sol',
  SOLUSDT: 'usdt',
  SOLUSDC: 'usdc',
  // BSC & BEP20
  BSC: 'bnb', // BSC 用 BNB 图标
  BNB: 'bnb',
  BUSD: 'busd',
  BSCUSDT: 'usdt',
  // Base
  BASE: 'base',
  BASEETH: 'eth',
  BASEUSDC: 'usdc',
  BASEUSDT: 'usdt',
  // Polygon
  MATIC: 'matic',
  MATICUSDT: 'usdt',
  MATICUSDC: 'usdc',
  POLYGON: 'matic',
  // TRON & TRC20
  TRON: 'trx',
  TRX: 'trx',
  TRXUSDT: 'usdt',
  // Conflux
  CFX: 'cfx',
  // MBZ
  MBZ: 'mbz',
};

// 法币映射 - 用于法币时显示默认图标
const FIAT_CURRENCIES = new Set([
  'USD',
  'EUR',
  'GBP',
  'CNY',
  'JPY',
  'KRW',
  'AUD',
  'CAD',
  'CHF',
  'HKD',
  'SGD',
  'INR',
  'RUB',
  'BRL',
  'MXN',
  'ZAR',
  'TRY',
  'NZD',
  'SEK',
  'NOK',
]);

// CDN 中不存在的 symbol，直接从 local 开始加载
const CDN_MISSING = new Set(['base', 'mbz']);

// 本地图标文件名映射（用于 fallback）
const LOCAL_ICON_MAP: Record<string, string> = {
  btc: 'BTC',
  bch: 'BCH',
  ltc: 'LTC',
  zec: 'ZEC',
  eth: 'ETH',
  sol: 'SOL',
  bnb: 'BNB',
  matic: 'Polygon',
  usdt: 'USDT',
  usdc: 'USDC',
  dai: 'DAI',
  busd: 'BUSD',
  cfx: 'CFX',
  base: 'BASE',
  bsc: 'BSC',
  trx: 'TRX',
  tron: 'TRX',
  mbz: 'MBZ',
};

export interface TokenIconProps {
  /** Token ID，如 "BTC", "ETHUSDT", "SOL" 等 */
  token: string;
  /** 图标大小，默认 24 */
  size?: number;
  /** 额外的 className */
  className?: string;
  /** 是否显示链图标（对于代币，显示其所在链的小图标） */
  showChainBadge?: boolean;
  /** 所在链的 ID（用于显示链图标） */
  chainId?: string;
}

/**
 * 获取 CDN 图标 URL
 * 使用 cryptocurrency-icons CDN (jsdelivr)
 */
const getCDNIconUrl = (symbol: string): string => {
  const s = symbol.toLowerCase();
  return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${s}.svg`;
};

/**
 * 获取本地图标 URL (fallback)
 */
const getLocalIconUrl = (symbol: string): string => {
  const s = symbol.toLowerCase();
  const fileName = LOCAL_ICON_MAP[s] || symbol.toUpperCase();
  return `/icons/crypto/${fileName}.svg`;
};

/**
 * 获取标准符号
 */
const getSymbol = (tokenId: string | undefined | null): string => {
  if (!tokenId) return '';
  if (TOKEN_SYMBOL_MAP[tokenId]) {
    return TOKEN_SYMBOL_MAP[tokenId];
  }
  const lowerToken = tokenId.toLowerCase();
  if (lowerToken.includes('usdt')) return 'usdt';
  if (lowerToken.includes('usdc')) return 'usdc';
  if (lowerToken.includes('dai')) return 'dai';
  if (lowerToken.includes('busd')) return 'busd';
  return lowerToken;
};

/**
 * TokenIcon 组件 - 显示加密货币图标
 *
 * 优先使用 CDN 图标 (cryptocurrency-icons)
 * CDN 失败时 fallback 到本地图标
 * 本地图标失败时显示默认图标
 * 法币（USD、EUR等）直接显示默认图标
 */
export const TokenIcon: React.FC<TokenIconProps> = ({
  token,
  size = 24,
  className,
  showChainBadge = false,
  chainId,
}) => {
  const symbol = getSymbol(token);
  const isFiat = FIAT_CURRENCIES.has(token?.toUpperCase() || '');
  const initialState = isFiat ? 'default' : CDN_MISSING.has(symbol) ? 'local' : 'cdn';
  const [iconState, setIconState] = useState<'cdn' | 'local' | 'default'>(initialState);

  const chainSymbol = chainId ? getSymbol(chainId) : null;

  // 根据当前状态获取图标 URL
  const getIconSrc = useCallback((sym: string, state: 'cdn' | 'local' | 'default'): string => {
    switch (state) {
      case 'cdn':
        return getCDNIconUrl(sym);
      case 'local':
        return getLocalIconUrl(sym);
      case 'default':
      default:
        return '/icons/crypto/default-coin-icon.png';
    }
  }, []);

  const handleError = useCallback(() => {
    if (iconState === 'cdn') {
      setIconState('local');
    } else if (iconState === 'local') {
      setIconState('default');
    }
  }, [iconState]);

  const iconSrc = getIconSrc(symbol, iconState);

  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      {/* 使用 img 标签以支持 CDN 的 SVG 和本地 PNG，并允许 onError fallback */}
      <img
        src={iconSrc}
        alt={token}
        width={size}
        height={size}
        className="rounded-full object-cover"
        onError={handleError}
        loading="lazy"
      />
      {/* 链图标徽章 - 增大比例以便看清 */}
      {showChainBadge && chainSymbol && (
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-background p-[1px] ring-1 ring-background"
          style={{ width: Math.max(size * 0.6, 12), height: Math.max(size * 0.6, 12) }}
        >
          <img
            src={getCDNIconUrl(chainSymbol)}
            alt={chainId || 'chain'}
            width={Math.max(Math.round(size * 0.55), 10)}
            height={Math.max(Math.round(size * 0.55), 10)}
            className="rounded-full object-cover w-full h-full"
            onError={e => {
              (e.target as HTMLImageElement).src = getLocalIconUrl(chainSymbol);
            }}
            loading="lazy"
          />
        </div>
      )}
    </div>
  );
};

export default TokenIcon;
