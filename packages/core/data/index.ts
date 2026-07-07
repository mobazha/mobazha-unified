/**
 * 数据模块导出
 */

export {
  CRYPTO_CURRENCIES,
  FIAT_CURRENCIES,
  ALL_CURRENCIES,
  getCurrencyByCode,
  getCurrencySymbol,
  getCurrencyDecimals,
  isCryptoCurrency,
  isFiatCurrency,
  getBaseRateSymbol,
  getPopularCurrencies,
  getCurrencyDisplayName,
  getCurrencyFlag,
} from './currencies';

// Chain metadata shared by payment parsing, account matching, and display helpers
export {
  EVM_CHAIN_IDS,
  getChainTypeAliases,
  getEvmChainMetadata,
  getEvmChainFamily,
  getEvmNativeSymbol,
  isEvmTestnetChain,
  type ChainFamily,
  type EvmChainMetadata,
} from './chainMetadata';

// Token 和 Chain 配置
export {
  TOKENS,
  CHAINS,
  UTXO_CHAINS,
  isCanonicalPaymentCoin,
  isPaymentCoinEnabled,
  mustCanonicalCoin,
  tryNormalizePaymentCoinToAssetId,
  assetIdFromTokenId,
  mustAssetIdFromTokenId,
  parseCanonicalPaymentCoin,
  getTokenIdFromPaymentCoin,
  getTokenById,
  getTokenByPaymentCoin,
  getTokensByChain,
  getTokenDecimals,
  getChainById,
  getBlockchainChains,
  getSupportedChains,
  getEVMTokenAddressFromPaymentCoin,
  getEVMChainId,
  getChainByEVMId,
  getPaymentCoinDisplayLabel,
  resolveTokenIdForDisplay,
  formatTokenAmount,
  formatStandardCryptoAmount,
  getSmartDecimals,
  parseTokenAmount,
  // 链类型判断工具
  getChainFromCoin,
  getCompatibleChainTypes,
  isUTXOChain,
  isEVMChain,
  isSolanaChain,
  isTRONChain,
  isRetiredPaymentChain,
  isFiatPaymentCoin,
  supportsBackendSettlementActionSurface,
  requiresWalletSignature,
  type CanonicalPaymentCoinParts,
  type TokenConfig,
  type PaymentChainConfig,
} from './tokens';

export { PRIVACY_COIN_CODE } from './commercial/privacyPayment';

// DG-1.12: digital-goods cost-comparison pricing data + calculator
export {
  PROCESSORS,
  PLATFORMS,
  calculateNetPerSale,
  calculateAll,
  comparisonHighlight,
  type ProcessorKey,
  type ProcessorFee,
  type PlatformKey,
  type PlatformFee,
  type CalcInput,
  type PlatformResult,
} from './digitalGoodsPricing';

// RWA 预定义资产数据
export {
  assetTypes,
  predefinedAssets,
  getAssetsByType,
  getAssetById,
  getAssetByContract,
  getAssetType,
  getAllAssetTypes,
  findPredefinedAsset,
  getAssetUniqueId,
} from './rwaAssetTemplates';
