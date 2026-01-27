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
} from './currencies';

// Token 和 Chain 配置
export {
  TOKENS,
  CHAINS,
  getTokenById,
  getTokensByChain,
  getTokenDecimals,
  getChainById,
  getBlockchainChains,
  getSupportedChains,
  isUTXOChain,
  isEVMChain,
  getEVMChainId,
  getChainByEVMId,
  formatTokenAmount,
  parseTokenAmount,
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
