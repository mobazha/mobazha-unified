/**
 * Token 唯一标识工具函数
 *
 * 用于生成和解析 ERC721/ERC1155/ERC3525 代币的唯一标识符
 */

import type { TokenStandard } from '../types/rwa';

/**
 * Token 标识符接口
 */
export interface TokenIdentifier {
  /** 区块链网络 (sepolia, ethereum, bsc 等) */
  blockchain: string;
  /** 合约地址 */
  tokenAddress: string;
  /** Token 标准 */
  tokenStandard: TokenStandard | 'ERC20';
  /** Token ID (ERC721/ERC1155 必填) */
  tokenId?: string;
  /** Slot ID (ERC3525 必填) */
  slotId?: string;
}

/**
 * 生成代币唯一标识符字符串
 *
 * 格式:
 * - ERC721:  CHAIN:ADDRESS:ERC721:tokenId
 * - ERC1155: CHAIN:ADDRESS:ERC1155:tokenId
 * - ERC3525: CHAIN:ADDRESS:ERC3525:slotId
 * - ERC20:   CHAIN:ADDRESS
 *
 * @param token Token 标识信息
 * @returns 唯一标识符字符串
 */
export function getTokenUniqueId(token: TokenIdentifier): string {
  const { blockchain, tokenAddress, tokenStandard, tokenId, slotId } = token;
  const chain = blockchain.toUpperCase();
  const addr = tokenAddress.toLowerCase();

  switch (tokenStandard) {
    case 'ERC721':
      if (!tokenId) throw new Error('ERC721 requires tokenId');
      return `${chain}:${addr}:ERC721:${tokenId}`;
    case 'ERC1155':
      if (!tokenId) throw new Error('ERC1155 requires tokenId');
      return `${chain}:${addr}:ERC1155:${tokenId}`;
    case 'ERC3525':
      if (!slotId) throw new Error('ERC3525 requires slotId');
      return `${chain}:${addr}:ERC3525:${slotId}`;
    default:
      return `${chain}:${addr}`;
  }
}

/**
 * 解析代币唯一标识符字符串
 *
 * @param uniqueId 唯一标识符字符串
 * @returns Token 标识信息，解析失败返回 null
 */
export function parseTokenUniqueId(uniqueId: string): TokenIdentifier | null {
  if (!uniqueId) return null;

  const parts = uniqueId.split(':');

  if (parts.length < 2) return null;

  const [blockchain, tokenAddress] = parts;

  if (parts.length === 2) {
    // 旧格式: CHAIN:ADDRESS
    return {
      blockchain: blockchain.toLowerCase(),
      tokenAddress,
      tokenStandard: 'ERC20',
    };
  }

  if (parts.length === 4) {
    const [, , standard, id] = parts;
    const tokenStandard = standard as TokenStandard;

    return {
      blockchain: blockchain.toLowerCase(),
      tokenAddress,
      tokenStandard,
      tokenId: tokenStandard === 'ERC721' || tokenStandard === 'ERC1155' ? id : undefined,
      slotId: tokenStandard === 'ERC3525' ? id : undefined,
    };
  }

  return null;
}

/**
 * 生成 cryptoListingCurrencyCode (用于后端存储)
 *
 * 格式使用下划线分隔:
 * - ERC721:  CHAIN_ADDRESS_ERC721_tokenId
 * - ERC1155: CHAIN_ADDRESS_ERC1155_tokenId
 * - ERC3525: CHAIN_ADDRESS_ERC3525_slotId
 *
 * @param token Token 标识信息
 * @returns cryptoListingCurrencyCode 字符串
 */
export function generateCryptoListingCurrencyCode(token: TokenIdentifier): string {
  const { blockchain, tokenAddress, tokenStandard, tokenId, slotId } = token;
  const chain = blockchain.toUpperCase();
  const addr = tokenAddress.toLowerCase();

  switch (tokenStandard) {
    case 'ERC721':
      return `${chain}_${addr}_ERC721_${tokenId}`;
    case 'ERC1155':
      return `${chain}_${addr}_ERC1155_${tokenId}`;
    case 'ERC3525':
      return `${chain}_${addr}_ERC3525_${slotId}`;
    default:
      return `${chain}_${addr}`;
  }
}

/**
 * 从资产对象和区块链生成 cryptoListingCurrencyCode
 *
 * @param asset 预定义资产对象
 * @param blockchain 区块链网络
 * @returns cryptoListingCurrencyCode 字符串
 */
export function generateCryptoListingCurrencyCodeFromAsset(
  asset: {
    contractAddress: string;
    tokenStandard: TokenStandard;
    tokenId?: string;
    slotId?: string;
  },
  blockchain: string
): string {
  return generateCryptoListingCurrencyCode({
    blockchain,
    tokenAddress: asset.contractAddress,
    tokenStandard: asset.tokenStandard,
    tokenId: asset.tokenId,
    slotId: asset.slotId,
  });
}

/**
 * 解析 cryptoListingCurrencyCode
 *
 * @param code cryptoListingCurrencyCode 字符串
 * @returns Token 标识信息，解析失败返回 null
 */
export function parseCryptoListingCurrencyCode(code: string): TokenIdentifier | null {
  if (!code) return null;

  // 新格式: CHAIN_ADDRESS_STANDARD_ID (ERC721/ERC1155/ERC3525)
  const newFormatMatch = code.match(/^([A-Z]+)_(0x[a-fA-F0-9]+)_(ERC\d+)_(.+)$/i);
  if (newFormatMatch) {
    const [, blockchain, tokenAddress, standard, id] = newFormatMatch;
    const tokenStandard = standard.toUpperCase() as TokenStandard;

    return {
      blockchain: blockchain.toLowerCase(),
      tokenAddress: tokenAddress.toLowerCase(),
      tokenStandard,
      tokenId: tokenStandard === 'ERC721' || tokenStandard === 'ERC1155' ? id : undefined,
      slotId: tokenStandard === 'ERC3525' ? id : undefined,
    };
  }

  // 旧格式: CHAIN_ADDRESS (ERC20 或通用)
  const oldFormatMatch = code.match(/^([A-Z]+)_(0x[a-fA-F0-9]+)$/i);
  if (oldFormatMatch) {
    const [, blockchain, tokenAddress] = oldFormatMatch;
    return {
      blockchain: blockchain.toLowerCase(),
      tokenAddress: tokenAddress.toLowerCase(),
      tokenStandard: 'ERC20',
    };
  }

  // 尝试解析 CHAIN_SYMBOL 格式 (向后兼容)
  // 例如: ETH_FCC, BSC_USDT
  // 注意: 此格式无法直接获取地址，需要从配置中查找
  const symbolFormatMatch = code.match(/^([A-Z]+)_([A-Z0-9]+)$/i);
  if (symbolFormatMatch) {
    const [, blockchain] = symbolFormatMatch;
    return {
      blockchain: blockchain.toLowerCase(),
      tokenAddress: '', // 符号格式无法直接确定地址，需要从配置中查找
      tokenStandard: 'ERC20',
    };
  }

  return null;
}

/**
 * 检查两个 Token 标识是否相同
 */
export function isSameToken(a: TokenIdentifier, b: TokenIdentifier): boolean {
  if (a.blockchain.toLowerCase() !== b.blockchain.toLowerCase()) return false;
  if (a.tokenAddress.toLowerCase() !== b.tokenAddress.toLowerCase()) return false;
  if (a.tokenStandard !== b.tokenStandard) return false;

  switch (a.tokenStandard) {
    case 'ERC721':
    case 'ERC1155':
      return a.tokenId === b.tokenId;
    case 'ERC3525':
      return a.slotId === b.slotId;
    default:
      return true;
  }
}
