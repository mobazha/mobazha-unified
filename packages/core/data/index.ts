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
