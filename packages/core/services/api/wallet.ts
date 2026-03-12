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
import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authSafeGet, authRequest, publicSafeGet } from './helpers';

/**
 * 获取钱包余额
 */
export async function getBalance(coin: CryptoType): Promise<WalletBalance | null> {
  try {
    return await authGet<WalletBalance>(NODE_API.WALLET_BALANCE(coin));
  } catch {
    return null;
  }
}

/**
 * 获取所有币种余额
 */
export async function getAllBalances(): Promise<Record<string, WalletBalance>> {
  return authSafeGet<Record<string, WalletBalance>>(NODE_API.WALLET_BALANCE_ALL, {});
}

/**
 * 获取交易历史
 */
export async function getTransactions(coin: CryptoType, limit = 20): Promise<Transaction[]> {
  return authSafeGet<Transaction[]>(`${NODE_API.WALLET_TRANSACTIONS(coin)}?limit=${limit}`, []);
}

/**
 * 获取钱包地址
 */
export async function getAddress(coin: CryptoType): Promise<string | null> {
  try {
    const response = await authGet<{ address: string }>(NODE_API.WALLET_ADDRESS(coin));
    return response.address;
  } catch {
    return null;
  }
}

/**
 * 获取交易费用估算
 */
export async function estimateFee(coin: CryptoType, amount: number): Promise<FeeEstimate | null> {
  try {
    return await authGet<FeeEstimate>(`${NODE_API.WALLET_ESTIMATE_FEE(coin)}?amount=${amount}`);
  } catch {
    return null;
  }
}

/**
 * 发送交易
 */
export async function sendTransaction(
  request: SendTransactionRequest
): Promise<SendTransactionResponse> {
  const body = {
    coinType: request.currency,
    address: request.address,
    amount: request.amount,
    feeLevel: request.feeLevel,
    memo: request.memo,
    spendAll: request.spendAll ?? false,
  };
  return authPost<SendTransactionResponse>(NODE_API.WALLET_SPEND, body);
}

/**
 * 获取汇率（公开 API，无需认证）
 */
export async function getExchangeRates(): Promise<Record<string, Record<string, number>>> {
  return publicSafeGet<Record<string, Record<string, number>>>(NODE_API.EXCHANGE_RATES, {});
}

/**
 * 检查钱包是否已创建
 */
export async function hasWallet(): Promise<boolean> {
  try {
    const response = await authGet<{ status: string }>(NODE_API.WALLET_STATUS);
    return response.status === 'ready';
  } catch {
    return false;
  }
}

/**
 * 获取助记词
 */
export async function getMnemonic(): Promise<string | null> {
  try {
    const response = await authGet<{ mnemonic: string }>(NODE_API.WALLET_MNEMONIC);
    return response.mnemonic;
  } catch {
    return null;
  }
}

/**
 * 从助记词恢复钱包
 */
export async function restoreWallet(
  mnemonic: string
): Promise<{ success: boolean; error?: string }> {
  return authPost(NODE_API.WALLET_RESTORE, { mnemonic });
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
export async function getReceivingAddresses(): Promise<ReceivingAddress[]> {
  return authSafeGet<ReceivingAddress[]>(NODE_API.RECEIVE_ADDRESSES, []);
}

/**
 * 设置收款地址（外部钱包）
 */
export async function setReceivingAddress(
  coin: CryptoType,
  address: string,
  label?: string
): Promise<{ success: boolean; error?: string }> {
  return authPost<{ success: boolean; error?: string }>(NODE_API.RECEIVE_ADDRESS, {
    coin,
    address,
    label,
  });
}

/**
 * 删除外部收款地址
 */
export async function removeReceivingAddress(
  coin: CryptoType
): Promise<{ success: boolean; error?: string }> {
  return authRequest<{ success: boolean; error?: string }>(NODE_API.RECEIVE_ADDRESS_COIN(coin), {
    method: 'DELETE',
  });
}

/**
 * 获取特定币种的收款地址
 */
export async function getReceivingAddress(coin: CryptoType): Promise<ReceivingAddress | null> {
  try {
    return await authGet<ReceivingAddress>(NODE_API.RECEIVE_ADDRESS_COIN(coin));
  } catch {
    return null;
  }
}

/**
 * 验证地址格式
 */
export async function validateAddress(
  coin: CryptoType,
  address: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    return await authPost<{ valid: boolean; error?: string }>(NODE_API.WALLET_VALIDATE(coin), {
      address,
    });
  } catch {
    return { valid: false, error: '验证失败' };
  }
}

// ========== 收款账户管理 ==========

export interface ReceivingAccount {
  id: number;
  name: string;
  chainType: string;
  address: string;
  activeTokens: string[];
  inactiveTokens: string[];
  source?: string;
  isActive: boolean;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceivingAccountInput {
  name: string;
  chainType: string;
  address: string;
  activeTokens: string[];
  inactiveTokens: string[];
  isActive: boolean;
}

export async function getReceivingAccounts(): Promise<ReceivingAccount[]> {
  const resp = await authSafeGet<{ receivingAccounts: ReceivingAccount[] } | ReceivingAccount[]>(
    NODE_API.WALLET_RECEIVING_ACCOUNTS,
    []
  );
  if (Array.isArray(resp)) return resp;
  return resp.receivingAccounts ?? [];
}

export async function addReceivingAccount(
  input: ReceivingAccountInput
): Promise<{ success: boolean; account: ReceivingAccount }> {
  return authPost(NODE_API.WALLET_RECEIVING_ACCOUNTS, input);
}

export async function updateReceivingAccount(
  id: number,
  input: ReceivingAccountInput
): Promise<{ success: boolean; account: ReceivingAccount }> {
  return authRequest(NODE_API.WALLET_RECEIVING_ACCOUNTS, {
    method: 'PUT',
    body: { id, ...input },
  });
}

export async function deleteReceivingAccount(id: number): Promise<{ success: boolean }> {
  return authRequest(`${NODE_API.WALLET_RECEIVING_ACCOUNTS}/${id}`, {
    method: 'DELETE',
  });
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
  addReceivingAccount,
  updateReceivingAccount,
  deleteReceivingAccount,

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
