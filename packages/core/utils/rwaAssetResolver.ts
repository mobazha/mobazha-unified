/**
 * RWA 资产解析工具
 * 
 * 从商品数据解析并匹配 RWA 资产信息
 * 用于商品详情页展示 RWA 资产特有的会员/收益/权益等信息
 */

import type { Product } from '../types/product';
import type {
  TokenStandard,
  PredefinedAsset,
  MembershipInfo,
  PerformanceInfo,
  NftMetadata,
  AssetTypeCode,
} from '../types/rwa';
import { parseCryptoListingCurrencyCode, type TokenIdentifier } from './tokenIdentifier';
import { findPredefinedAsset, getAssetType } from '../data/rwaAssetTemplates';

/**
 * 解析后的 RWA 资产信息
 */
export interface ResolvedRwaAsset {
  // 基本信息
  id: string;
  name: string;
  description: string;
  emoji: string;
  typeName: string;
  
  // Token 标识
  tokenStandard: TokenStandard;
  blockchain: string;
  contractAddress: string;
  tokenId?: string;
  slotId?: string;
  
  // 数据来源
  source: 'predefined' | 'custom';
  assetTypeCode?: AssetTypeCode;
  
  // ERC721 特有
  nftMetadata?: NftMetadata;
  
  // ERC1155 特有
  membership?: MembershipInfo;
  
  // ERC3525 特有
  performance?: PerformanceInfo;
  
  // 权益列表
  rights?: string[];
}

// 从 rwaBalanceService 重新导出常用工具
export { etherscanUrls, formatBalance, shortenAddress } from '../services/rwa/rwaBalanceService';

/**
 * 检查商品是否为 RWA Token 类型
 * 
 * @param product 商品数据
 * @returns 是否为 RWA Token
 */
export function isRwaTokenProduct(product: Product | null | undefined): boolean {
  if (!product) return false;
  return product.metadata?.contractType === 'RWA_TOKEN';
}

/**
 * 从商品数据解析 Token 标识信息
 * 
 * @param product 商品数据
 * @returns Token 标识信息，解析失败返回 null
 */
export function parseProductTokenIdentifier(product: Product): TokenIdentifier | null {
  const { item } = product;
  
  // 优先从 cryptoListingCurrencyCode 解析 (新格式)
  if (item.cryptoListingCurrencyCode) {
    const parsed = parseCryptoListingCurrencyCode(item.cryptoListingCurrencyCode);
    if (parsed && parsed.tokenStandard !== 'ERC20') {
      return parsed;
    }
  }
  
  // 回退到 tokenAddress + tokenStandard 字段
  if (item.tokenAddress && item.tokenStandard) {
    const tokenStandard = item.tokenStandard as TokenStandard;
    if (['ERC721', 'ERC1155', 'ERC3525'].includes(tokenStandard)) {
      return {
        blockchain: item.blockchain?.toLowerCase() || 'sepolia',
        tokenAddress: item.tokenAddress.toLowerCase(),
        tokenStandard,
        // 注意: 这里无法获取 tokenId/slotId，需要从其他地方获取
      };
    }
  }
  
  return null;
}

/**
 * 从商品数据解析并匹配 RWA 资产
 * 
 * @param product 商品数据
 * @returns 解析后的 RWA 资产信息，非 RWA 商品或解析失败返回 null
 */
export function resolveRwaAsset(product: Product | null | undefined): ResolvedRwaAsset | null {
  if (!product || !isRwaTokenProduct(product)) {
    return null;
  }
  
  const tokenIdentifier = parseProductTokenIdentifier(product);
  
  // 如果无法解析 Token 标识，尝试从商品标题和描述构建基本信息
  if (!tokenIdentifier) {
    // 无法确定具体的 RWA 资产，返回基本信息
    return createBasicRwaAsset(product);
  }
  
  // 尝试匹配预定义资产
  const predefinedAsset = findPredefinedAsset({
    tokenAddress: tokenIdentifier.tokenAddress,
    tokenStandard: tokenIdentifier.tokenStandard as TokenStandard,
    tokenId: tokenIdentifier.tokenId,
    slotId: tokenIdentifier.slotId,
  });
  
  if (predefinedAsset) {
    return createFromPredefinedAsset(predefinedAsset, tokenIdentifier);
  }
  
  // 未匹配到预定义资产，构建自定义资产信息
  return createCustomRwaAsset(product, tokenIdentifier);
}

/**
 * 从预定义资产创建解析结果
 */
function createFromPredefinedAsset(
  asset: PredefinedAsset,
  identifier: TokenIdentifier
): ResolvedRwaAsset {
  const assetType = getAssetTypeCodeFromStandard(asset.tokenStandard);
  
  return {
    id: asset.id,
    name: asset.name,
    description: asset.description,
    emoji: asset.emoji,
    typeName: asset.typeName,
    
    tokenStandard: asset.tokenStandard,
    blockchain: identifier.blockchain,
    contractAddress: asset.contractAddress,
    tokenId: asset.tokenId,
    slotId: asset.slotId,
    
    source: 'predefined',
    assetTypeCode: assetType,
    
    nftMetadata: asset.nftMetadata,
    membership: asset.membership,
    performance: asset.performance,
    rights: asset.rights,
  };
}

/**
 * 创建自定义 RWA 资产信息
 */
function createCustomRwaAsset(
  product: Product,
  identifier: TokenIdentifier
): ResolvedRwaAsset {
  const { tokenStandard, tokenAddress, blockchain, tokenId, slotId } = identifier;
  const assetType = getAssetTypeCodeFromStandard(tokenStandard as TokenStandard);
  const assetTypeInfo = getAssetType(assetType);
  
  return {
    id: `custom-${tokenAddress}-${tokenId || slotId || ''}`,
    name: product.item.title,
    description: product.item.description,
    emoji: assetTypeInfo?.icon || '🔗',
    typeName: getTokenStandardDisplayName(tokenStandard as TokenStandard),
    
    tokenStandard: tokenStandard as TokenStandard,
    blockchain,
    contractAddress: tokenAddress,
    tokenId,
    slotId,
    
    source: 'custom',
    assetTypeCode: assetType,
    
    // 自定义资产没有预定义的会员/收益信息
    rights: [],
  };
}

/**
 * 创建基本 RWA 资产信息 (无法解析具体 Token 时)
 */
function createBasicRwaAsset(product: Product): ResolvedRwaAsset {
  return {
    id: `basic-${product.slug}`,
    name: product.item.title,
    description: product.item.description,
    emoji: '🔗',
    typeName: 'RWA Token',
    
    tokenStandard: 'ERC1155', // 默认
    blockchain: product.item.blockchain?.toLowerCase() || 'sepolia',
    contractAddress: product.item.tokenAddress || '',
    
    source: 'custom',
    rights: [],
  };
}

/**
 * 根据 Token 标准获取资产类型代码
 */
function getAssetTypeCodeFromStandard(standard: TokenStandard): AssetTypeCode {
  switch (standard) {
    case 'ERC721':
      return 'NFT';
    case 'ERC1155':
      return 'CREATOR';
    case 'ERC3525':
      return 'BROADWAY';
    default:
      return 'CUSTOM';
  }
}

/**
 * 获取 Token 标准的显示名称
 */
export function getTokenStandardDisplayName(standard: TokenStandard): string {
  switch (standard) {
    case 'ERC721':
      return 'NFT 收藏品';
    case 'ERC1155':
      return '创作者权益';
    case 'ERC3525':
      return '票房份额';
    default:
      return 'RWA Token';
  }
}

/**
 * 获取 Token 标准的颜色
 */
export function getTokenStandardColor(standard: TokenStandard): string {
  switch (standard) {
    case 'ERC721':
      return '#f59e0b'; // 金色
    case 'ERC1155':
      return '#6366f1'; // 紫色
    case 'ERC3525':
      return '#ec4899'; // 粉色
    default:
      return '#64748b'; // 灰色
  }
}

