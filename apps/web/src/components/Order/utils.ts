/**
 * Order 组件共享工具函数
 */

/**
 * 格式化日期为本地化字符串
 * @param dateString - ISO 日期字符串
 * @param options - 额外的格式选项
 */
export function formatOrderDate(
  dateString: string,
  options: {
    includeTime?: boolean;
    short?: boolean;
  } = {}
): string {
  const { includeTime = true, short = false } = options;

  if (short) {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (includeTime) {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化时间
 * @param dateString - ISO 日期字符串
 */
export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 复制文本到剪贴板
 * @param text - 要复制的文本
 * @returns 是否成功
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * 获取区块链浏览器 URL
 * @param txid - 交易哈希
 * @param coin - 币种或链
 * @param chainId - 链 ID
 */
export function getBlockExplorerUrl(txid: string, coin?: string, chainId?: number): string | null {
  const coinUpper = coin?.toUpperCase();

  if (coinUpper === 'BTC') {
    return `https://blockstream.info/tx/${txid}`;
  }
  if (coinUpper === 'LTC') {
    return `https://blockchair.com/litecoin/transaction/${txid}`;
  }
  if (coinUpper === 'ETH' || chainId === 1) {
    return `https://etherscan.io/tx/${txid}`;
  }
  if (coinUpper === 'BSC' || chainId === 56) {
    return `https://bscscan.com/tx/${txid}`;
  }
  if (chainId === 137) {
    return `https://polygonscan.com/tx/${txid}`;
  }

  return null;
}

/**
 * 角色颜色映射
 */
export function getRoleColor(role: string): string {
  switch (role) {
    case 'seller':
    case 'vendor':
      return 'text-emerald-600';
    case 'buyer':
      return 'text-blue-600';
    case 'moderator':
      return 'text-purple-600';
    default:
      return 'text-muted-foreground';
  }
}
