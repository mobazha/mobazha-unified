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
];

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
 * 判断是否为 UTXO 链（BTC, LTC, BCH, ZEC）
 * UTXO 链不需要前端钱包签名，后端自动处理
 */
export function isUTXOChain(chainOrCoin: string): boolean {
  const UTXO_CHAINS = ['BTC', 'LTC', 'BCH', 'ZEC'];
  const upper = chainOrCoin.toUpperCase();
  return UTXO_CHAINS.includes(upper);
}

/**
 * 判断是否为 EVM 链
 */
export function isEVMChain(chainId: string): boolean {
  const chain = getChainById(chainId);
  return chain?.evmChainId !== undefined;
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
 * 格式化金额（从最小单位转换为显示单位）
 * @param amount 最小单位金额
 * @param tokenId 代币 ID
 * @param displayDecimals 显示的小数位数（默认根据代币类型自动判断）
 */
export function formatTokenAmount(
  amount: number | string,
  tokenId: string,
  displayDecimals?: number
): string {
  const decimals = getTokenDecimals(tokenId);
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const normalizedAmount = numAmount / Math.pow(10, decimals);

  // 确定显示小数位数
  const display = displayDecimals ?? (decimals >= 6 ? 2 : Math.min(decimals, 8));

  return normalizedAmount.toFixed(display);
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
