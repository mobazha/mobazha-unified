'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { Search, Plus, X, CheckCircle } from 'lucide-react';
import type { BlockchainNetwork, RwaTokenInfo } from '@mobazha/core';
import { useI18n } from '@mobazha/core';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RwaTokenFieldsProps {
  blockchain: BlockchainNetwork;
  tokenAddress?: string;
  cryptoListingCurrencyCode?: string;
  price: string;
  pricingCurrency: string;
  minQuantity: number;
  maxQuantity: number;
  acceptedCurrencies: string[];
  onBlockchainChange: (value: BlockchainNetwork) => void;
  onTokenAddressChange: (value: string) => void;
  onCryptoListingCurrencyCodeChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onPricingCurrencyChange: (value: string) => void;
  onMinQuantityChange: (value: number) => void;
  onMaxQuantityChange: (value: number) => void;
  onAcceptedCurrenciesChange: (value: string[]) => void;
  errors?: {
    blockchain?: string;
    tokenAddress?: string;
    cryptoListingCurrencyCode?: string;
    price?: string;
    minQuantity?: string;
    maxQuantity?: string;
    acceptedCurrencies?: string;
  };
  className?: string;
}

// 区块链网络列表
const blockchains: { code: BlockchainNetwork; name: string }[] = [
  { code: 'ETH', name: 'Ethereum (ETH)' },
  { code: 'BSC', name: 'Binance Smart Chain (BSC)' },
  { code: 'BASE', name: 'Base (BASE)' },
  { code: 'POLYGON', name: 'Polygon (MATIC)' },
  { code: 'ARBITRUM', name: 'Arbitrum (ARB)' },
  { code: 'OPTIMISM', name: 'Optimism (OP)' },
  { code: 'AVALANCHE', name: 'Avalanche (AVAX)' },
  { code: 'SOL', name: 'Solana (SOL)' },
];

// 按区块链获取支付币种
const getPaymentCurrencies = (blockchain: BlockchainNetwork) => {
  const currencies: Record<BlockchainNetwork, { code: string; name: string }[]> = {
    ETH: [
      { code: 'ETHUSDT', name: 'USDT (Ethereum)' },
      { code: 'ETHUSDC', name: 'USDC (Ethereum)' },
      { code: 'ETHDAI', name: 'DAI (Ethereum)' },
    ],
    BSC: [
      { code: 'BSCUSDT', name: 'USDT (BSC)' },
      { code: 'BSCBUSD', name: 'BUSD (BSC)' },
    ],
    BASE: [
      { code: 'BASEUSDC', name: 'USDC (Base)' },
      { code: 'BASEUSDT', name: 'USDT (Base)' },
    ],
    POLYGON: [
      { code: 'POLYGONUSDT', name: 'USDT (Polygon)' },
      { code: 'POLYGONUSDC', name: 'USDC (Polygon)' },
    ],
    ARBITRUM: [
      { code: 'ARBITRUMUSDC', name: 'USDC (Arbitrum)' },
      { code: 'ARBITRUMUSDT', name: 'USDT (Arbitrum)' },
    ],
    OPTIMISM: [
      { code: 'OPTIMISMUSDC', name: 'USDC (Optimism)' },
      { code: 'OPTIMISMUSDT', name: 'USDT (Optimism)' },
    ],
    AVALANCHE: [
      { code: 'AVALANCHEUSDT', name: 'USDT (Avalanche)' },
      { code: 'AVALANCHEUSDC', name: 'USDC (Avalanche)' },
    ],
    SOL: [
      { code: 'SOLANAUSDC', name: 'USDC (Solana)' },
      { code: 'SOLANAUSDT', name: 'USDT (Solana)' },
    ],
  };
  return currencies[blockchain] || currencies.ETH;
};

// 模拟 RWA Token 数据（实际应从 API 获取）
const mockRwaTokens: RwaTokenInfo[] = [
  {
    code: 'FCC',
    name: 'Forest Carbon Credit',
    symbol: 'FCC',
    contractAddress: '0x91Da...f487',
    blockchain: 'ETH',
    tokenType: 'CARBON_CREDIT',
    currentPrice: 25.5,
    issuer: '绿色森林基金',
    verification: { verified: true, verifiedBy: '联合国气候变化框架公约' },
    metadata: { riskLevel: 'low', description: '碳信用代币' },
  },
  {
    code: 'RET',
    name: 'Real Estate Token',
    symbol: 'RET',
    contractAddress: '0x82Bc...e123',
    blockchain: 'ETH',
    tokenType: 'REAL_ESTATE',
    currentPrice: 150.0,
    issuer: '房产投资基金',
    verification: { verified: true, verifiedBy: 'SEC' },
    metadata: { riskLevel: 'medium', description: '房地产代币' },
  },
];

const pricingCurrencies = [
  { value: 'USD', label: 'USD' },
  { value: 'USDT', label: 'USDT' },
  { value: 'USDC', label: 'USDC' },
];

export function RwaTokenFields({
  blockchain,
  tokenAddress,
  cryptoListingCurrencyCode: _cryptoListingCurrencyCode,
  price,
  pricingCurrency,
  minQuantity,
  maxQuantity,
  acceptedCurrencies,
  onBlockchainChange,
  onTokenAddressChange,
  onCryptoListingCurrencyCodeChange,
  onPriceChange,
  onPricingCurrencyChange,
  onMinQuantityChange,
  onMaxQuantityChange,
  onAcceptedCurrenciesChange,
  errors = {},
  className = '',
}: RwaTokenFieldsProps) {
  const { t } = useI18n();
  const [tokenSearchMode, setTokenSearchMode] = useState<'search' | 'address'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToken, setSelectedToken] = useState<RwaTokenInfo | null>(null);

  // 当前区块链的支付币种
  const paymentCurrencies = useMemo(() => getPaymentCurrencies(blockchain), [blockchain]);

  // 搜索 Token
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) return mockRwaTokens;
    const query = searchQuery.toLowerCase();
    return mockRwaTokens.filter(
      token =>
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // 选择 Token
  const handleSelectToken = useCallback(
    (token: RwaTokenInfo) => {
      setSelectedToken(token);
      onCryptoListingCurrencyCodeChange(token.code);
      onTokenAddressChange(token.contractAddress);
      // 如果没有设置价格，使用 Token 的当前价格
      if (!price && token.currentPrice) {
        onPriceChange(token.currentPrice.toString());
      }
    },
    [onCryptoListingCurrencyCodeChange, onTokenAddressChange, onPriceChange, price]
  );

  // 通过地址查找 Token
  const handleAddressSearch = useCallback(() => {
    // 实际实现中应该调用 API 查询
    const token = mockRwaTokens.find(t =>
      t.contractAddress.toLowerCase().includes(tokenAddress?.toLowerCase() || '')
    );
    if (token) {
      handleSelectToken(token);
    }
  }, [tokenAddress, handleSelectToken]);

  // 添加支付币种
  const handleAddCurrency = useCallback(() => {
    if (acceptedCurrencies.length < 5) {
      const defaultCurrency = paymentCurrencies[0]?.code || 'ETHUSDT';
      onAcceptedCurrenciesChange([...acceptedCurrencies, defaultCurrency]);
    }
  }, [acceptedCurrencies, paymentCurrencies, onAcceptedCurrenciesChange]);

  // 移除支付币种
  const handleRemoveCurrency = useCallback(
    (index: number) => {
      if (acceptedCurrencies.length > 1) {
        onAcceptedCurrenciesChange(acceptedCurrencies.filter((_, i) => i !== index));
      }
    },
    [acceptedCurrencies, onAcceptedCurrenciesChange]
  );

  // 更新支付币种
  const handleCurrencyChange = useCallback(
    (index: number, value: string) => {
      const newCurrencies = [...acceptedCurrencies];
      newCurrencies[index] = value;
      onAcceptedCurrenciesChange(newCurrencies);
    },
    [acceptedCurrencies, onAcceptedCurrenciesChange]
  );

  // 获取 Token 类型名称
  const getTokenTypeName = (type: string) => {
    const names: Record<string, string> = {
      REAL_ESTATE: t('listing.rwa.realEstate') || '房地产代币',
      BOND: t('listing.rwa.bond') || '债券代币',
      COMMODITY: t('listing.rwa.commodity') || '商品代币',
      ART: t('listing.rwa.art') || '艺术品代币',
      CARBON_CREDIT: t('listing.rwa.carbonCredit') || '碳信用代币',
      CUSTOM: t('listing.rwa.custom') || '自定义代币',
    };
    return names[type] || type;
  };

  // 获取风险等级样式
  const getRiskLevelStyle = (level?: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Card className={`p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        {t('listing.rwaTokenDetails') || 'RWA Token Details'}
      </h2>

      <div className="space-y-5">
        {/* 区块链选择 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.blockchain') || 'Blockchain'} <span className="text-destructive">*</span>
          </label>
          <Select
            value={blockchain}
            onValueChange={v => onBlockchainChange(v as BlockchainNetwork)}
          >
            <SelectTrigger className={errors.blockchain ? 'border-destructive' : ''}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {blockchains.map(b => (
                <SelectItem key={b.code} value={b.code}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.blockchain && (
            <p className="text-destructive text-sm mt-1">{errors.blockchain}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {t('listing.blockchainHelper') ||
              'Select the blockchain network where the RWA token is deployed'}
          </p>
        </div>

        {/* Token 选择 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.selectRwaToken') || 'Select RWA Token'}{' '}
            <span className="text-destructive">*</span>
          </label>
          {errors.cryptoListingCurrencyCode && (
            <p className="text-destructive text-sm mb-2">{errors.cryptoListingCurrencyCode}</p>
          )}

          <Tabs
            value={tokenSearchMode}
            onValueChange={v => setTokenSearchMode(v as 'search' | 'address')}
          >
            <TabsList className="w-full mb-3">
              <TabsTrigger value="search" className="flex-1">
                {t('listing.searchTokens') || 'Search Tokens'}
              </TabsTrigger>
              <TabsTrigger value="address" className="flex-1">
                {t('listing.enterAddress') || 'Enter Address'}
              </TabsTrigger>
            </TabsList>

            {tokenSearchMode === 'search' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={
                      t('listing.searchTokenPlaceholder') ||
                      'Search by token name, code or symbol...'
                    }
                    className="pl-10"
                  />
                </div>

                {/* Token 列表 */}
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                  {filteredTokens.length === 0 ? (
                    <p className="p-4 text-center text-muted-foreground text-sm">
                      {t('listing.noTokensFound') || 'No tokens found'}
                    </p>
                  ) : (
                    filteredTokens.map(token => (
                      <button
                        key={token.code}
                        type="button"
                        onClick={() => handleSelectToken(token)}
                        className={`
                          w-full p-3 text-left border-b border-border last:border-b-0 transition-colors
                          ${selectedToken?.code === token.code ? 'bg-primary/5' : 'hover:bg-muted/50'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{token.name}</p>
                            <p className="text-sm text-muted-foreground">{token.symbol}</p>
                          </div>
                          {selectedToken?.code === token.code && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={tokenAddress || ''}
                    onChange={e => onTokenAddressChange(e.target.value)}
                    placeholder="0x..."
                    className="flex-1 font-mono text-sm"
                  />
                  <Button type="button" variant="outline" onClick={handleAddressSearch}>
                    {t('listing.search') || 'Search'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('listing.tokenAddressHelper') ||
                    'Search or enter address to find and confirm RWA token'}
                </p>
              </div>
            )}
          </Tabs>
        </div>

        {/* 已选择的 Token 信息 */}
        {selectedToken && (
          <div className="p-4 bg-green-50 dark:bg-green-950/30 border-2 border-green-500 rounded-lg">
            <h4 className="font-semibold text-green-700 dark:text-green-400 mb-3">
              {t('listing.selectedTokenInfo') || '已选择的RWA代币信息'}
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t('listing.tokenName') || '代币名称'}:
                </span>
                <span className="ml-2 font-medium">{selectedToken.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('listing.tokenSymbol') || '代币符号'}:
                </span>
                <span className="ml-2 font-medium">{selectedToken.symbol}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('listing.tokenType') || '代币类型'}:
                </span>
                <span className="ml-2 font-medium">
                  {getTokenTypeName(selectedToken.tokenType)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('listing.currentPrice') || '当前价格'}:
                </span>
                <span className="ml-2 font-medium">${selectedToken.currentPrice}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('listing.issuer') || '发行方'}:</span>
                <span className="ml-2 font-medium">{selectedToken.issuer}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t('listing.riskLevel') || '风险等级'}:
                </span>
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getRiskLevelStyle(selectedToken.metadata?.riskLevel)}`}
                >
                  {selectedToken.metadata?.riskLevel || 'N/A'}
                </span>
              </div>
              {selectedToken.verification?.verified && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">
                    {t('listing.verification') || '验证状态'}:
                  </span>
                  <span className="ml-2 text-green-600 flex items-center gap-1 inline-flex">
                    <CheckCircle className="w-4 h-4" />
                    {selectedToken.verification.verifiedBy}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 价格 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.price') || 'Price'} <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => onPriceChange(e.target.value)}
                placeholder="0.00"
                className={`flex-1 ${errors.price ? 'border-destructive' : ''}`}
              />
              <Select value={pricingCurrency} onValueChange={onPricingCurrencyChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pricingCurrencies.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {errors.price && <p className="text-destructive text-sm mt-1">{errors.price}</p>}
          </div>
        </div>

        {/* 支付币种 */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">
            {t('listing.acceptedCurrencies') || 'Receive'}{' '}
            <span className="text-destructive">*</span>
          </label>
          {errors.acceptedCurrencies && (
            <p className="text-destructive text-sm mb-2">{errors.acceptedCurrencies}</p>
          )}
          <div className="space-y-2">
            {acceptedCurrencies.map((currency, index) => (
              <div key={index} className="flex gap-2">
                <Select value={currency} onValueChange={v => handleCurrencyChange(index, v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentCurrencies.map(c => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {acceptedCurrencies.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCurrency(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {acceptedCurrencies.length < 5 && (
              <Button type="button" variant="outline" size="sm" onClick={handleAddCurrency}>
                <Plus className="w-4 h-4 mr-1" />
                {t('listing.addPaymentCurrency') || 'Add Payment Currency'}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t('listing.acceptedCurrenciesHelper') ||
              "The currency you'll receive for the trade (RWA Token supports multiple payment currencies)"}
          </p>
        </div>

        {/* 最小/最大购买数量 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.minQuantity') || 'Minimum Purchase Quantity'}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min="1"
              value={minQuantity}
              onChange={e => onMinQuantityChange(parseInt(e.target.value) || 1)}
              placeholder="1"
              className={errors.minQuantity ? 'border-destructive' : ''}
            />
            {errors.minQuantity && (
              <p className="text-destructive text-sm mt-1">{errors.minQuantity}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('listing.minQuantityHelper') ||
                'Minimum quantity a buyer can purchase in a single order'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              {t('listing.maxQuantity') || 'Maximum Purchase Quantity'}{' '}
              <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min="1"
              value={maxQuantity}
              onChange={e => onMaxQuantityChange(parseInt(e.target.value) || 100)}
              placeholder="100"
              className={errors.maxQuantity ? 'border-destructive' : ''}
            />
            {errors.maxQuantity && (
              <p className="text-destructive text-sm mt-1">{errors.maxQuantity}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {t('listing.maxQuantityHelper') ||
                'Maximum quantity a buyer can purchase in a single order'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default RwaTokenFields;
