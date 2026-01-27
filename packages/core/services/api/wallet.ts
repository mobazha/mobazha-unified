/**
 * 钱包 API 服务
 */

import type {
  WalletBalance,
  Transaction,
  FeeEstimate,
  SendTransactionRequest,
  SendTransactionResponse,
  CryptoType,
} from '../../types';
import { get, post, safeRequest } from './client';
import { getGatewayUrl, getAuthHeaders } from './config';

/**
 * 获取钱包余额
 */
export async function getBalance(
  coin: CryptoType,
  username?: string,
  password?: string
): Promise<WalletBalance | null> {
  const url = `${getGatewayUrl()}/wallet/balance/${coin}`;
  try {
    return await get<WalletBalance>(url, getAuthHeaders(username, password));
  } catch {
    return null;
  }
}

/**
 * 获取所有币种余额
 */
export async function getAllBalances(
  username?: string,
  password?: string
): Promise<Record<string, WalletBalance>> {
  const url = `${getGatewayUrl()}/wallet/balance`;
  return safeRequest<Record<string, WalletBalance>>(
    url,
    { headers: getAuthHeaders(username, password) },
    {}
  );
}

/**
 * 获取交易历史
 */
export async function getTransactions(
  coin: CryptoType,
  limit = 20,
  username?: string,
  password?: string
): Promise<Transaction[]> {
  const url = `${getGatewayUrl()}/wallet/transactions/${coin}?limit=${limit}`;
  return safeRequest<Transaction[]>(url, { headers: getAuthHeaders(username, password) }, []);
}

/**
 * 获取钱包地址
 */
export async function getAddress(
  coin: CryptoType,
  username?: string,
  password?: string
): Promise<string | null> {
  const url = `${getGatewayUrl()}/wallet/address/${coin}`;
  try {
    const response = await get<{ address: string }>(url, getAuthHeaders(username, password));
    return response.address;
  } catch {
    return null;
  }
}

/**
 * 获取交易费用估算
 */
export async function estimateFee(
  coin: CryptoType,
  amount: number,
  username?: string,
  password?: string
): Promise<FeeEstimate | null> {
  const url = `${getGatewayUrl()}/wallet/estimatefee/${coin}?amount=${amount}`;
  try {
    return await get<FeeEstimate>(url, getAuthHeaders(username, password));
  } catch {
    return null;
  }
}

/**
 * 发送交易
 */
export async function sendTransaction(
  request: SendTransactionRequest,
  username?: string,
  password?: string
): Promise<SendTransactionResponse> {
  const url = `${getGatewayUrl()}/wallet/spend`;
  const body = {
    coinType: request.currency,
    address: request.address,
    amount: request.amount,
    feeLevel: request.feeLevel,
    memo: request.memo,
    spendAll: request.spendAll ?? false,
  };
  return post<SendTransactionResponse>(url, body, getAuthHeaders(username, password));
}

/**
 * 获取汇率
 * 注意：此 API 需要认证，未认证时会返回 401
 */
export async function getExchangeRates(): Promise<Record<string, Record<string, number>>> {
  const url = `${getGatewayUrl()}/ob/exchangerates`;
  return safeRequest<Record<string, Record<string, number>>>(
    url,
    { headers: getAuthHeaders() },
    {}
  );
}

/**
 * 检查钱包是否已创建
 */
export async function hasWallet(username?: string, password?: string): Promise<boolean> {
  const url = `${getGatewayUrl()}/wallet/status`;
  try {
    const response = await get<{ status: string }>(url, getAuthHeaders(username, password));
    return response.status === 'ready';
  } catch {
    return false;
  }
}

/**
 * 获取助记词
 */
export async function getMnemonic(username?: string, password?: string): Promise<string | null> {
  const url = `${getGatewayUrl()}/wallet/mnemonic`;
  try {
    const response = await get<{ mnemonic: string }>(url, getAuthHeaders(username, password));
    return response.mnemonic;
  } catch {
    return null;
  }
}

/**
 * 从助记词恢复钱包
 */
export async function restoreWallet(
  mnemonic: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/wallet/restore`;
  return post(url, { mnemonic }, getAuthHeaders(username, password));
}

// ========== 收款地址管理 ==========

/**
 * 收款地址信息
 */
export interface ReceivingAddress {
  coin: CryptoType;
  address: string;
  label?: string;
  isExternal: boolean;
  createdAt?: string;
}

/**
 * 获取所有收款地址
 */
export async function getReceivingAddresses(
  username?: string,
  password?: string
): Promise<ReceivingAddress[]> {
  const url = `${getGatewayUrl()}/ob/receiveaddresses`;
  return safeRequest<ReceivingAddress[]>(url, { headers: getAuthHeaders(username, password) }, []);
}

/**
 * 设置收款地址（外部钱包）
 */
export async function setReceivingAddress(
  coin: CryptoType,
  address: string,
  label?: string,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/receiveaddress`;
  return post<{ success: boolean; error?: string }>(
    url,
    { coin, address, label },
    getAuthHeaders(username, password)
  );
}

/**
 * 删除外部收款地址
 */
export async function removeReceivingAddress(
  coin: CryptoType,
  username?: string,
  password?: string
): Promise<{ success: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/ob/receiveaddress/${coin}`;
  // 使用 DELETE 方法
  return safeRequest<{ success: boolean; error?: string }>(
    url,
    { method: 'DELETE', headers: getAuthHeaders(username, password) },
    { success: false }
  );
}

/**
 * 获取特定币种的收款地址
 */
export async function getReceivingAddress(
  coin: CryptoType,
  username?: string,
  password?: string
): Promise<ReceivingAddress | null> {
  const url = `${getGatewayUrl()}/ob/receiveaddress/${coin}`;
  try {
    return await get<ReceivingAddress>(url, getAuthHeaders(username, password));
  } catch {
    return null;
  }
}

/**
 * 验证地址格式
 */
export async function validateAddress(
  coin: CryptoType,
  address: string,
  username?: string,
  password?: string
): Promise<{ valid: boolean; error?: string }> {
  const url = `${getGatewayUrl()}/wallet/validate/${coin}`;
  try {
    const response = await post<{ valid: boolean; error?: string }>(
      url,
      { address },
      getAuthHeaders(username, password)
    );
    return response;
  } catch {
    return { valid: false, error: '验证失败' };
  }
}

// ========== 收款账户管理 ==========

/**
 * 收款账户信息
 */
export interface ReceivingAccount {
  id: number;
  name: string;
  chainType: string; // ethereum, solana, stripe 等
  address: string;
  activeTokens: string[];
  inactiveTokens: string[];
  source?: string;
  isActive: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取所有收款账户列表
 */
export async function getReceivingAccounts(
  username?: string,
  password?: string
): Promise<ReceivingAccount[]> {
  const url = `${getGatewayUrl()}/wallet/receivingaccountlist`;
  return safeRequest<ReceivingAccount[]>(url, { headers: getAuthHeaders(username, password) }, []);
}

// ========== 导出 API 对象 ==========

/**
 * 钱包 API 导出对象
 */
export const walletApi = {
  // 余额
  getBalance,
  getAllBalances,

  // 地址
  getAddress,
  getReceivingAddresses,
  getReceivingAddress,
  setReceivingAddress,
  removeReceivingAddress,
  validateAddress,

  // 收款账户
  getReceivingAccounts,

  // 交易
  getTransactions,
  sendTransaction,
  estimateFee,

  // 汇率
  getExchangeRates,

  // 钱包管理
  hasWallet,
  getMnemonic,
  restoreWallet,
};
