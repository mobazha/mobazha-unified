/**
 * Token 配置
 * 统一的代币和链配置，与移动端和桌面端保持一致
 */

/**
 * Token 配置接口
 */
export interface TokenConfig {
  /** 唯一标识 (如 'ETHUSDT', 'BTC') */
  id: string;
  /** 代币符号 (如 'USDT', 'BTC') */
  token: string;
  /** 所属链 (如 'ETH', 'BSC', 'BTC') */
  chain: string;
  /** 代币类型 (如 'ERC20', 'BEP20', 'SPL') */
  type?: string;
  /** 是否为原生代币 */
  isNative: boolean;
  /** 小数位数 */
  decimals: number;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 支付链配置接口
 * 注意：与 types/rwa.ts 中的 ChainConfig 不同，这里是支付相关的链配置
 */
export interface PaymentChainConfig {
  /** 链 ID (如 'ETH', 'BSC') */
  id: string;
  /** 链名称 */
  name: string;
  /** 图标代码 */
  iconCode?: string;
  /** 主题颜色 */
  color?: string;
  /** 地址前缀 */
  addressPrefix?: string;
  /** 链类型 */
  type: 'blockchain' | 'payment' | 'filter';
  /** 是否为外部钱包（非 Web3，如 BTC/LTC） */
  isExternalWallet?: boolean;
  /** 是否即将推出 */
  comingSoon?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** EVM chainId (如有) */
  evmChainId?: number;
}

/**
 * 代币配置列表
 * 与移动端/桌面端保持一致
 */
export const TOKENS: TokenConfig[] = [
  // Bitcoin
  { id: 'BTC', token: 'BTC', chain: 'BTC', isNative: true, decimals: 8 },

  // Litecoin
  { id: 'LTC', token: 'LTC', chain: 'LTC', isNative: true, decimals: 8 },

  // Ethereum 代币
  { id: 'ETH', token: 'ETH', chain: 'ETH', isNative: true, decimals: 18 },
  { id: 'ETHUSDT', token: 'USDT', chain: 'ETH', type: 'ERC20', isNative: false, decimals: 6 },
  { id: 'ETHUSDC', token: 'USDC', chain: 'ETH', type: 'ERC20', isNative: false, decimals: 6 },
  { id: 'DAI', token: 'DAI', chain: 'ETH', type: 'ERC20', isNative: false, decimals: 18 },

  // Solana 代币
  { id: 'SOL', token: 'SOL', chain: 'SOL', isNative: true, decimals: 9 },
  { id: 'SOLUSDT', token: 'USDT', chain: 'SOL', type: 'SPL', isNative: false, decimals: 6 },
  { id: 'SOLUSDC', token: 'USDC', chain: 'SOL', type: 'SPL', isNative: false, decimals: 6 },

  // BSC 代币
  { id: 'BNB', token: 'BNB', chain: 'BSC', isNative: true, decimals: 18 },
  { id: 'BUSD', token: 'BUSD', chain: 'BSC', type: 'BEP20', isNative: false, decimals: 18 },
  { id: 'BSCUSDT', token: 'USDT', chain: 'BSC', type: 'BEP20', isNative: false, decimals: 18 },
  { id: 'BSCUSDC', token: 'USDC', chain: 'BSC', type: 'BEP20', isNative: false, decimals: 18 },

  // Base 代币
  { id: 'BASEETH', token: 'ETH', chain: 'BASE', isNative: true, decimals: 18 },
  { id: 'BASEUSDT', token: 'USDT', chain: 'BASE', type: 'Base', isNative: false, decimals: 6 },
  { id: 'BASEUSDC', token: 'USDC', chain: 'BASE', type: 'Base', isNative: false, decimals: 6 },

  // Polygon 代币
  { id: 'MATIC', token: 'MATIC', chain: 'MATIC', isNative: true, decimals: 18 },
  { id: 'MATICUSDT', token: 'USDT', chain: 'MATIC', type: 'Polygon', isNative: false, decimals: 6 },
  { id: 'MATICUSDC', token: 'USDC', chain: 'MATIC', type: 'Polygon', isNative: false, decimals: 6 },

  // TRON 代币
  { id: 'TRX', token: 'TRX', chain: 'TRON', isNative: true, decimals: 6 },
  { id: 'TRONUSDT', token: 'USDT', chain: 'TRON', type: 'TRC20', isNative: false, decimals: 6 },
];

// Legacy coin code -> canonical payment coin (assetID / fiat:*)
const LEGACY_TO_CANONICAL_PAYMENT_COIN: Record<string, string> = {
  BTC: 'crypto:bip122:000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f:native',
  LTC: 'crypto:bip122:12a765e31ffd4059bada1e25190f6e98c99d9714d334efa41a195a7e7e04bfe2:native',
  ETH: 'crypto:eip155:1:native',
  ETHUSDT: 'crypto:eip155:1:erc20:0xF36BFeE8fd7F1950c0129714Faf6d1e1F94a66AA',
  ETHUSDC: 'crypto:eip155:1:erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  BNB: 'crypto:eip155:56:native',
  BSCUSDT: 'crypto:eip155:56:erc20:0x55d398326f99059fF775485246999027B3197955',
  BSCUSDC: 'crypto:eip155:56:erc20:0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  BASEETH: 'crypto:eip155:8453:native',
  BASEUSDT: 'crypto:eip155:8453:erc20:0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  BASEUSDC: 'crypto:eip155:8453:erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  MATIC: 'crypto:eip155:137:native',
  MATICUSDT: 'crypto:eip155:137:erc20:0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  MATICUSDC: 'crypto:eip155:137:erc20:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  SOL: 'crypto:solana:mainnet:native',
  SOLUSDT: 'crypto:solana:mainnet:spl:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  SOLUSDC: 'crypto:solana:mainnet:spl:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  TRX: 'crypto:tron:mainnet:native',
  TRXUSDT: 'crypto:tron:mainnet:trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
  TRONUSDT: 'crypto:tron:mainnet:trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
};

/**
 * Converts legacy CHAIN+TOKEN coin IDs to canonical payment coin IDs.
 * For canonical values (crypto:* / fiat:*), it returns input as-is.
 */
export function toCanonicalPaymentCoin(coin: string): string {
  const trimmed = (coin || '').trim();
  if (!trimmed) return trimmed;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('crypto:') || lower.startsWith('fiat:')) {
    return trimmed;
  }

  const mapped = LEGACY_TO_CANONICAL_PAYMENT_COIN[trimmed.toUpperCase()];
  return mapped || trimmed;
}

/**
 * 链配置列表
 */
export const CHAINS: PaymentChainConfig[] = [
  {
    id: 'all',
    name: 'All',
    type: 'filter',
  },
  {
    id: 'BTC',
    name: 'Bitcoin',
    iconCode: 'BTC',
    color: '#f7931a',
    type: 'blockchain',
    isExternalWallet: true,
  },
  {
    id: 'LTC',
    name: 'Litecoin',
    iconCode: 'LTC',
    color: '#bfbbbb',
    type: 'blockchain',
    isExternalWallet: true,
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    iconCode: 'ETH',
    color: '#627eea',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 1,
  },
  {
    id: 'BSC',
    name: 'BNB Smart Chain',
    iconCode: 'BSC',
    color: '#f3ba2f',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 56,
  },
  {
    id: 'BASE',
    name: 'Base',
    iconCode: 'BASE',
    color: '#0052ff',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 8453,
  },
  {
    id: 'MATIC',
    name: 'Polygon',
    iconCode: 'MATIC',
    color: '#8247e5',
    addressPrefix: '0x',
    type: 'blockchain',
    evmChainId: 137,
  },
  {
    id: 'SOL',
    name: 'Solana',
    iconCode: 'SOL',
    color: '#9945ff',
    type: 'blockchain',
    comingSoon: true,
  },
  {
    id: 'TRON',
    name: 'TRON',
    iconCode: 'TRON',
    color: '#eb0029',
    addressPrefix: 'T',
    type: 'blockchain',
    isExternalWallet: true,
  },
];

// ============ 辅助函数 ============

/**
 * 根据 token ID 获取代币配置
 */
export function getTokenById(tokenId: string): TokenConfig | undefined {
  return TOKENS.find(t => t.id.toUpperCase() === tokenId.toUpperCase());
}

/**
 * 根据链 ID 获取该链上的所有代币
 */
export function getTokensByChain(chainId: string): TokenConfig[] {
  if (chainId === 'all') {
    return TOKENS;
  }
  return TOKENS.filter(t => t.chain.toUpperCase() === chainId.toUpperCase());
}

/**
 * 获取代币的小数位数
 * @param tokenId 代币 ID (如 'ETHUSDT', 'BTC')
 * @returns 小数位数，默认返回 8
 */
export function getTokenDecimals(tokenId: string): number {
  const token = getTokenById(tokenId);
  if (token) {
    return token.decimals;
  }

  // 根据代币名称推断
  const upperTokenId = tokenId.toUpperCase();
  if (upperTokenId.includes('USDT') || upperTokenId.includes('USDC')) {
    return 6;
  }
  if (
    upperTokenId.includes('ETH') ||
    upperTokenId.includes('BNB') ||
    upperTokenId.includes('MATIC')
  ) {
    return 18;
  }
  if (upperTokenId === 'DAI') {
    return 18;
  }
  if (upperTokenId === 'SOL') {
    return 9;
  }
  if (upperTokenId === 'TRX') {
    return 6;
  }

  // 默认 8 位小数（BTC 标准）
  return 8;
}

/**
 * 根据链 ID 获取链配置
 */
export function getChainById(chainId: string): PaymentChainConfig | undefined {
  return CHAINS.find(c => c.id.toUpperCase() === chainId.toUpperCase());
}

/**
 * 获取所有区块链类型的链（排除 filter 类型）
 */
export function getBlockchainChains(): PaymentChainConfig[] {
  return CHAINS.filter(c => c.type === 'blockchain');
}

/**
 * 获取所有支持的链（排除 disabled 和 comingSoon）
 */
export function getSupportedChains(): PaymentChainConfig[] {
  return CHAINS.filter(c => c.type === 'blockchain' && !c.disabled && !c.comingSoon);
}

/**
 * UTXO 链列表
 * 这些链不需要前端钱包签名，后端自动处理多签交易
 */
export const UTXO_CHAINS = ['BTC', 'LTC', 'BCH', 'ZEC'] as const;

/**
 * 根据代币 ID 或链 ID 获取链类型
 * 支持输入：
 * - 链 ID: 'ETH', 'BTC', 'SOL'
 * - 代币 ID: 'ETHUSDT', 'SOLUSDC', 'BTC'
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 链 ID（大写），如 'ETH', 'BTC'；无法识别时返回空字符串
 */
export function getChainFromCoin(coinOrChain?: string): string {
  if (!coinOrChain) return '';

  const upper = coinOrChain.toUpperCase();

  // 首先尝试从代币配置中获取
  const token = getTokenById(upper);
  if (token) {
    return token.chain.toUpperCase();
  }

  // 如果是直接的链 ID
  const chainConfig = CHAINS.find(c => c.id.toUpperCase() === upper);
  if (chainConfig) {
    return upper;
  }

  // 无法识别的代币/链，打印警告并返回空字符串
  console.warn(`[getChainFromCoin] Unknown coin/chain: ${coinOrChain}`);
  return '';
}

/**
 * 判断是否为 UTXO 链（BTC, LTC, BCH, ZEC）
 * UTXO 链不需要前端钱包签名，后端自动处理
 *
 * 支持输入：
 * - 链 ID: 'BTC', 'LTC'
 * - 代币 ID: 'BTC' (也是链 ID)
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 UTXO 链
 */
export function isUTXOChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  return UTXO_CHAINS.includes(chain as (typeof UTXO_CHAINS)[number]);
}

/**
 * 判断是否为 EVM 链
 * EVM 链需要前端钱包签名
 *
 * 支持输入：
 * - 链 ID: 'ETH', 'BSC'
 * - 代币 ID: 'ETHUSDT', 'BSCUSDT'
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 EVM 链
 */
export function isEVMChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  const chainConfig = CHAINS.find(c => c.id.toUpperCase() === chain);

  return chainConfig?.evmChainId !== undefined;
}

/**
 * 判断是否为 Solana 链
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 Solana 链
 */
export function isSolanaChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  return chain === 'SOL';
}

/**
 * 判断是否为 TRON 链
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否为 TRON 链
 */
export function isTRONChain(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  const chain = getChainFromCoin(coinOrChain);
  return chain === 'TRON';
}

/**
 * 判断订单操作是否需要前端钱包签名
 * - UTXO 链：不需要（后端处理）
 * - EVM/Solana 链：需要
 *
 * @param coinOrChain 代币 ID 或链 ID
 * @returns 是否需要钱包签名
 */
export function requiresWalletSignature(coinOrChain?: string): boolean {
  if (!coinOrChain) return false;

  // UTXO 链不需要前端签名
  if (isUTXOChain(coinOrChain)) {
    return false;
  }

  // EVM, Solana, TRON 链需要签名
  return isEVMChain(coinOrChain) || isSolanaChain(coinOrChain) || isTRONChain(coinOrChain);
}

/**
 * 获取链的 EVM chainId
 */
export function getEVMChainId(chainId: string): number | undefined {
  const chain = getChainById(chainId);
  return chain?.evmChainId;
}

/**
 * 根据 EVM chainId 获取链配置
 */
export function getChainByEVMId(evmChainId: number): PaymentChainConfig | undefined {
  return CHAINS.find(c => c.evmChainId === evmChainId);
}

/**
 * 获取智能小数位数（参考币安/OKX等主流交易所的显示规则）
 *
 * 规则：
 * 1. 对于 >= 1 的数字，使用 desiredDecimals（通常2位小数）
 * 2. 对于 < 1 的数字，显示 3-4 位有效数字
 *
 * 示例：
 * - 1234.5678 → 1234.57 (2位小数)
 * - 0.12345 → 0.1235 (4位有效数字)
 * - 0.00024567 → 0.0002457 (4位有效数字)
 * - 0.000001234 → 0.00000123 (3位有效数字，受 maxDecimals 限制)
 */
function getSmartDecimals(
  amount: number,
  desiredDecimals: number,
  maxDecimals = 8,
  significantDigits = 4 // 期望显示的有效数字位数
): number {
  if (amount === 0) return desiredDecimals;

  const absAmount = Math.abs(amount);

  // 对于 >= 1 的数字，使用期望的小数位数
  if (absAmount >= 1) {
    return desiredDecimals;
  }

  // 对于 < 1 的数字，计算需要多少小数位来显示 N 位有效数字
  // 使用 log10 找到第一个有效数字的位置
  // 例如：0.00024 → log10(0.00024) ≈ -3.62 → floor = -4 → 第一个有效数字在小数点后第4位
  const log = Math.log10(absAmount);
  const firstSignificantPosition = Math.floor(log); // 负数表示小数点后的位置

  // 计算需要的小数位数：第一个有效数字位置 + 额外的有效数字
  // 例如：0.00024 需要 4 + (4-1) = 7 位小数来显示 4 位有效数字
  const requiredDecimals = -firstSignificantPosition + (significantDigits - 1);

  // 限制在 [desiredDecimals, maxDecimals] 范围内
  return Math.min(Math.max(requiredDecimals, desiredDecimals), maxDecimals);
}

/**
 * 格式化金额（从最小单位转换为显示单位）
 * @param amount 最小单位金额
 * @param tokenId 代币 ID
 * @param displayDecimals 显示的小数位数（默认根据代币类型自动判断，会智能扩展以显示非零值）
 */
export function formatTokenAmount(
  amount: number | string,
  tokenId: string,
  displayDecimals?: number
): string {
  const decimals = getTokenDecimals(tokenId);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const normalizedAmount = numAmount / Math.pow(10, decimals);

  // 确定基础显示小数位数
  const baseDisplay = displayDecimals ?? (decimals >= 6 ? 2 : Math.min(decimals, 8));

  // 使用智能小数位数，确保不会显示 0.00 当实际有值时
  const smartDisplay = getSmartDecimals(normalizedAmount, baseDisplay, decimals);

  return normalizedAmount.toFixed(smartDisplay);
}

/**
 * 解析金额（从显示单位转换为最小单位）
 * @param displayAmount 显示金额
 * @param tokenId 代币 ID
 */
export function parseTokenAmount(displayAmount: number | string, tokenId: string): bigint {
  const decimals = getTokenDecimals(tokenId);
  const numAmount = typeof displayAmount === 'string' ? parseFloat(displayAmount) : displayAmount;
  return BigInt(Math.round(numAmount * Math.pow(10, decimals)));
}
