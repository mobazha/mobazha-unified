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

// Token 和 Chain 配置
export {
  TOKENS,
  CHAINS,
  UTXO_CHAINS,
  toCanonicalPaymentCoin,
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
  formatTokenAmount,
  parseTokenAmount,
  // 链类型判断工具
  getChainFromCoin,
  isUTXOChain,
  isEVMChain,
  isSolanaChain,
  requiresWalletSignature,
  type CanonicalPaymentCoinParts,
  type TokenConfig,
  type PaymentChainConfig,
} from './tokens';

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
