/**
 * RWA 预定义资产模板
 * 用于简化用户创建 RWA Token 商品的流程
 */

import type { AssetType, AssetTypeCode, PredefinedAsset, TokenStandard } from '../types/rwa';
import { generateCryptoListingCurrencyCode, type TokenIdentifier } from '../utils/tokenIdentifier';

/**
 * 资产类型定义
 */
export const assetTypes: AssetType[] = [
  {
    code: 'NFT',
    name: '收藏品 NFT',
    icon: '🖼️',
    description: '独一无二的数字收藏品、艺术品、明星纪念品等',
    tokenStandard: 'ERC721',
    color: '#f59e0b',
  },
  {
    code: 'CREATOR',
    name: '创作者权益',
    icon: '🎮',
    description: '游戏主播、科技博主等创作者社区权益份额',
    tokenStandard: 'ERC1155',
    color: '#6366f1',
  },
  {
    code: 'BROADWAY',
    name: '百老汇票房',
    icon: '🎭',
    description: '音乐剧、话剧等演出的票房收益份额',
    tokenStandard: 'ERC3525',
    color: '#ec4899',
  },
  {
    code: 'CUSTOM',
    name: '自定义资产',
    icon: '⚙️',
    description: '手动输入合约地址和 Token 参数',
    tokenStandard: null,
    color: '#64748b',
  },
];

/**
 * 预定义资产列表 (Sepolia 测试网)
 */
export const predefinedAssets: Record<AssetTypeCode, PredefinedAsset[]> = {
  NFT: [
    {
      id: 'nft-celebrity-card-001',
      name: '明星签名收藏卡 #001',
      description: '限量版明星签名数字收藏卡，独一无二的珍藏品',
      image: null,
      emoji: '🌟',
      balance: 1, // NFT 每个都是唯一的
      unit: '个',
      tokenStandard: 'ERC721',
      contractAddress: '0x1234567890123456789012345678901234567890', // 示例地址
      tokenId: '1',
      slotId: '',
      typeName: '数字收藏品',
      nftMetadata: {
        creator: '明星A',
        mintedAt: 1704067200,
        rarity: 'Legendary',
        collection: '明星签名系列',
      },
      rights: ['独家所有权', '线下见面优先权', '社区特殊标识'],
    },
    {
      id: 'nft-art-piece-001',
      name: '数字艺术品 "星空"',
      description: '著名数字艺术家创作的限量艺术品，具有独特的艺术价值',
      image: null,
      emoji: '🎨',
      balance: 1,
      unit: '个',
      tokenStandard: 'ERC721',
      contractAddress: '0x1234567890123456789012345678901234567890',
      tokenId: '2',
      slotId: '',
      typeName: '数字艺术品',
      nftMetadata: {
        creator: '艺术家B',
        mintedAt: 1704153600,
        rarity: 'Epic',
        collection: '数字艺术收藏',
      },
      rights: ['艺术品所有权', '展览优先权', '艺术家见面会'],
    },
  ],
  CREATOR: [
    {
      id: 'creator-gaming',
      name: '游戏主播权益',
      description: '知名游戏主播的粉丝俱乐部权益，持有者可享受专属直播、游戏陪玩等特权',
      image: null,
      emoji: '🎮',
      balance: 1000,
      unit: '份',
      tokenStandard: 'ERC1155',
      contractAddress: '0xC7345EA65FD12cC3CaD8F9991cFA46C13c0B1DF8',
      tokenId: '1',
      slotId: '',
      typeName: '创作者权益',
      membership: {
        level: '金牌会员',
        holderCount: 328,
        exclusivePerks: 4,
        validityType: '永久有效',
      },
      rights: ['专属直播间访问权', '游戏陪玩优先预约', '限量周边优先购买', '社区投票权'],
    },
    {
      id: 'creator-tech',
      name: '科技博主权益',
      description: '科技评测博主的社区会员权益，可提前获取评测内容、参与产品内测',
      image: null,
      emoji: '💻',
      balance: 500,
      unit: '份',
      tokenStandard: 'ERC1155',
      contractAddress: '0xC7345EA65FD12cC3CaD8F9991cFA46C13c0B1DF8',
      tokenId: '2',
      slotId: '',
      typeName: '创作者权益',
      membership: {
        level: '银牌会员',
        holderCount: 156,
        exclusivePerks: 4,
        validityType: '年度会员',
      },
      rights: ['评测内容提前看', '新品内测资格', '线下活动门票', '专属折扣码'],
    },
    {
      id: 'creator-music',
      name: '音乐创作者权益',
      description: '独立音乐人的粉丝专属权益，支持音乐创作并获得独家内容',
      image: null,
      emoji: '🎵',
      balance: 200,
      unit: '份',
      tokenStandard: 'ERC1155',
      contractAddress: '0xC7345EA65FD12cC3CaD8F9991cFA46C13c0B1DF8',
      tokenId: '3',
      slotId: '',
      typeName: '创作者权益',
      membership: {
        level: '钻石会员',
        holderCount: 89,
        exclusivePerks: 4,
        validityType: '永久有效',
      },
      rights: ['新歌抢先听', '演唱会门票优先购', '签名专辑抽奖', '创作幕后花絮'],
    },
  ],
  BROADWAY: [
    {
      id: 'broadway-lionking',
      name: '音乐剧《狮子王》票房份额',
      description: '百老汇经典音乐剧《狮子王》的票房收益分成，按持有份额获得票房分红',
      image: null,
      emoji: '🦁',
      balance: 10000,
      unit: '份',
      tokenStandard: 'ERC3525',
      contractAddress: '0xccf9C481A2DDaC0ad5a55c3a07C5Cd04cA3d343e',
      tokenId: '1',
      slotId: '1',
      typeName: '票房份额',
      performance: {
        totalShares: 10000,
        dividendRate: '8%',
        settlementPeriod: '季度',
      },
      rights: ['票房收益分红', 'VIP 座位优先选择', '幕后参观机会', '演员见面会'],
    },
    {
      id: 'broadway-leiyu',
      name: '话剧《雷雨》票房份额',
      description: '经典话剧《雷雨》的票房收益分成，支持国产戏剧发展',
      image: null,
      emoji: '⛈️',
      balance: 5000,
      unit: '份',
      tokenStandard: 'ERC3525',
      contractAddress: '0xccf9C481A2DDaC0ad5a55c3a07C5Cd04cA3d343e',
      tokenId: '2',
      slotId: '2',
      typeName: '票房份额',
      performance: {
        totalShares: 5000,
        dividendRate: '6%',
        settlementPeriod: '季度',
      },
      rights: ['票房收益分红', '首演门票优先购', '剧组探班资格', '收藏版节目册'],
    },
  ],
  CUSTOM: [],
};

/**
 * 根据资产类型获取资产列表
 */
export function getAssetsByType(typeCode: AssetTypeCode): PredefinedAsset[] {
  return predefinedAssets[typeCode] || [];
}

/**
 * 根据 ID 获取资产
 */
export function getAssetById(assetId: string): PredefinedAsset | null {
  for (const typeAssets of Object.values(predefinedAssets)) {
    const asset = typeAssets.find(a => a.id === assetId);
    if (asset) return asset;
  }
  return null;
}

/**
 * 根据合约地址和 Token ID 获取资产
 */
export function getAssetByContract(
  contractAddress: string,
  tokenId: string
): PredefinedAsset | null {
  const normalizedAddress = contractAddress?.toLowerCase();
  for (const typeAssets of Object.values(predefinedAssets)) {
    const asset = typeAssets.find(
      a => a.contractAddress?.toLowerCase() === normalizedAddress && a.tokenId === tokenId
    );
    if (asset) return asset;
  }
  return null;
}

/**
 * 获取资产类型信息
 */
export function getAssetType(code: AssetTypeCode): AssetType | null {
  return assetTypes.find(t => t.code === code) || null;
}

/**
 * 获取所有资产类型
 */
export function getAllAssetTypes(): AssetType[] {
  return assetTypes;
}

/**
 * 根据 Token 标识符查找预定义资产
 * 支持 ERC721/ERC1155/ERC3525
 *
 * @param identifier Token 标识信息
 * @returns 预定义资产，未找到返回 null
 */
export function findPredefinedAsset(identifier: {
  tokenAddress: string;
  tokenStandard: TokenStandard;
  tokenId?: string;
  slotId?: string;
}): PredefinedAsset | null {
  const { tokenAddress, tokenStandard, tokenId, slotId } = identifier;
  const normalizedAddress = tokenAddress?.toLowerCase();

  for (const assets of Object.values(predefinedAssets)) {
    for (const asset of assets) {
      if (asset.contractAddress?.toLowerCase() !== normalizedAddress) continue;
      if (asset.tokenStandard !== tokenStandard) continue;

      // ERC721/ERC1155: contractAddress + tokenId 唯一
      if (
        (tokenStandard === 'ERC721' || tokenStandard === 'ERC1155') &&
        asset.tokenId === tokenId
      ) {
        return asset;
      }
      // ERC3525: contractAddress + slotId 唯一
      if (tokenStandard === 'ERC3525' && asset.slotId === slotId) {
        return asset;
      }
    }
  }

  return null;
}

/**
 * 从预定义资产生成唯一标识符
 *
 * @param asset 预定义资产
 * @param blockchain 区块链网络
 * @returns 唯一标识符字符串
 */
export function getAssetUniqueId(asset: PredefinedAsset, blockchain: string): string {
  const identifier: TokenIdentifier = {
    blockchain,
    tokenAddress: asset.contractAddress,
    tokenStandard: asset.tokenStandard,
    tokenId: asset.tokenId,
    slotId: asset.slotId,
  };

  // 使用下划线格式（与 cryptoListingCurrencyCode 兼容）
  return generateCryptoListingCurrencyCode(identifier);
}

export default {
  assetTypes,
  predefinedAssets,
  getAssetsByType,
  getAssetById,
  getAssetByContract,
  getAssetType,
  getAllAssetTypes,
  findPredefinedAsset,
  getAssetUniqueId,
};
