/**
 * Unified Transaction Service
 * 统一交易服务 - 处理 EVM 链的交易执行
 *
 * 功能：
 * 1. ERC20 代币授权 (approve)
 * 2. 交易执行 (sendTransaction)
 * 3. 重试机制和 nonce 管理
 * 4. 多网络支持
 *
 * 参考移动端和桌面端的 unifiedTransactionService 实现
 */

import { ethers, Contract, BrowserProvider, JsonRpcSigner } from 'ethers';
import type {
  NetworkType,
  TransactionData,
  TxExecutionResult,
  ApprovalResult,
  ServiceStatus,
} from './types';

// ERC20 标准 ABI
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
];

// 需要使用 legacy 交易类型的链 (不完全支持 EIP-1559)
const LEGACY_CHAINS = [56, 97]; // BSC Mainnet, BSC Testnet

// 最大重试次数
const MAX_RETRIES = 3;

/**
 * 统一交易服务类
 */
export class UnifiedTransactionService {
  private currentNetworkType: NetworkType | null = null;
  private walletProvider: BrowserProvider | null = null;
  private walletAddress: string | null = null;
  private signer: JsonRpcSigner | null = null;

  /**
   * 初始化交易服务
   * @param networkType - 网络类型
   * @param provider - ethers BrowserProvider
   * @param walletAddress - 钱包地址
   */
  async initialize(
    networkType: NetworkType,
    provider: BrowserProvider,
    walletAddress: string
  ): Promise<boolean> {
    console.log(`🔧 初始化 ${networkType} 交易服务...`);

    if (!provider || !walletAddress) {
      console.warn('UnifiedTransactionService: 缺少必要参数，无法初始化');
      return false;
    }

    this.cleanup();

    try {
      this.currentNetworkType = networkType;
      this.walletProvider = provider;
      this.walletAddress = walletAddress;
      this.signer = await provider.getSigner();

      console.log(`✅ ${networkType} 交易服务初始化完成`);
      return true;
    } catch (error) {
      console.error('初始化交易服务失败:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * 使用 Signer 初始化（简化版本）
   * @param signer - ethers JsonRpcSigner
   * @param networkType - 网络类型（可选）
   */
  async initializeWithSigner(signer: JsonRpcSigner, networkType?: NetworkType): Promise<boolean> {
    try {
      this.cleanup();
      this.signer = signer;
      this.walletProvider = signer.provider as BrowserProvider;
      this.walletAddress = await signer.getAddress();
      this.currentNetworkType = networkType || 'ethereum';

      console.log(`✅ 交易服务初始化完成 (via signer)`);
      return true;
    } catch (error) {
      console.error('初始化交易服务失败:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * 检查并授权 ERC20 代币
   * @param tokenAddress - ERC20 代币合约地址
   * @param spenderAddress - 授权地址（通常是托管合约地址）
   * @param amount - 授权金额（最小单位）
   * @param tokenSymbol - 代币符号（用于日志）
   */
  async approveERC20Token(
    tokenAddress: string,
    spenderAddress: string,
    amount: string | bigint,
    tokenSymbol?: string
  ): Promise<ApprovalResult> {
    console.log('🔑 开始检查并授权 ERC20 代币...');
    console.log('   代币地址:', tokenAddress);
    console.log('   授权地址(托管合约):', spenderAddress);
    console.log('   授权金额:', amount.toString());
    if (tokenSymbol) console.log('   代币符号:', tokenSymbol);

    if (!this.isServiceReady()) {
      return { success: false, error: '交易服务未初始化' };
    }

    try {
      // 检查是否为原生币（零地址或空）
      if (this.isNativeToken(tokenAddress)) {
        console.log('✅ 原生币支付，无需授权');
        return { success: true, skipped: true, message: '原生币无需授权' };
      }

      const provider = this.walletProvider!;
      const signer = this.signer!;

      // 创建 ERC20 代币合约实例
      const tokenContract = new Contract(tokenAddress, ERC20_ABI, provider);

      // 检查当前授权额度
      console.log('   检查当前授权额度...');
      const currentAllowance = await tokenContract.allowance(this.walletAddress, spenderAddress);
      const requiredAmount = BigInt(amount);

      console.log('   当前授权额度:', currentAllowance.toString());
      console.log('   需要授权额度:', requiredAmount.toString());

      // 如果授权额度充足，跳过授权
      if (currentAllowance >= requiredAmount) {
        console.log('✅ 授权额度充足，无需重新授权');
        return { success: true, skipped: true, message: '授权额度充足' };
      }

      console.log('   授权额度不足，开始授权...');

      // 使用 signer 连接合约
      const tokenContractWithSigner = tokenContract.connect(signer) as Contract;

      // 带重试机制执行授权
      let txResponse;
      let retryCount = 0;

      while (retryCount < MAX_RETRIES) {
        try {
          // 获取最新的 nonce
          const nonce = await this.getLatestNonce();

          if (retryCount > 0) {
            console.log(`   重试第 ${retryCount} 次，nonce: ${nonce}`);
            await this.sleep(2000);
          }

          // 执行授权交易
          txResponse = await tokenContractWithSigner.approve(
            spenderAddress,
            requiredAmount,
            nonce !== null ? { nonce } : {}
          );
          break; // 成功发送，跳出循环
        } catch (sendError) {
          const errorMsg = (sendError as Error)?.message || '';

          if (
            errorMsg.includes('nonce too low') ||
            errorMsg.includes('replacement transaction underpriced')
          ) {
            retryCount++;
            console.warn(`   Nonce 错误，准备重试 (${retryCount}/${MAX_RETRIES}):`, errorMsg);

            if (retryCount >= MAX_RETRIES) {
              return {
                success: false,
                error: `授权交易发送失败，已重试 ${MAX_RETRIES} 次: ${errorMsg}`,
              };
            }
          } else {
            throw sendError;
          }
        }
      }

      if (!txResponse) {
        return { success: false, error: '授权交易发送失败' };
      }

      const txHash = txResponse.hash;
      console.log('📝 授权交易已发送:', txHash);
      console.log('   等待交易确认...');

      // 等待交易确认
      const receipt = await txResponse.wait();

      if (receipt && receipt.status === 1) {
        console.log('✅ ERC20 代币授权成功');
        return {
          success: true,
          transactionHash: txHash,
          message: 'ERC20 代币授权成功',
        };
      } else {
        return { success: false, error: '授权交易失败' };
      }
    } catch (error) {
      console.error('❌ ERC20 代币授权失败:', error);
      return {
        success: false,
        error: `ERC20 代币授权失败: ${(error as Error).message}`,
      };
    }
  }

  /**
   * 执行交易
   * @param txData - 交易数据 (to, data, value)
   */
  async executeTransaction(txData: TransactionData): Promise<TxExecutionResult> {
    console.log('🚀 准备执行交易...');

    if (!this.isServiceReady()) {
      return { success: false, error: '交易服务未初始化' };
    }

    try {
      const signer = this.signer!;
      const provider = this.walletProvider!;

      // 确保地址格式正确
      const toAddress = ethers.getAddress(txData.to);

      // 处理 value 字段
      let value = BigInt(0);
      if (txData.value && txData.value !== '0') {
        value = BigInt(txData.value);
        console.log('   value (wei):', value.toString());
      }

      // 获取最新的 nonce
      const nonce = await this.getLatestNonce();

      // 构建交易对象
      const transaction: ethers.TransactionRequest = {
        to: toAddress,
        data: txData.data,
        value: value,
        ...(nonce !== null ? { nonce } : {}),
      };

      // 获取当前网络的 chainId
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // 对于 BSC 等网络，使用 legacy 交易类型
      if (LEGACY_CHAINS.includes(chainId)) {
        const feeData = await provider.getFeeData();
        if (feeData.gasPrice) {
          transaction.gasPrice = feeData.gasPrice;
          transaction.type = 0; // legacy transaction
        }
      }

      console.log('   发送交易参数:', {
        to: transaction.to,
        value: transaction.value?.toString(),
        dataLength: transaction.data?.length,
        nonce: transaction.nonce,
        chainId,
      });

      // 带重试机制发送交易
      let txResponse;
      let retryCount = 0;

      while (retryCount < MAX_RETRIES) {
        try {
          if (retryCount > 0) {
            console.log(`   重试第 ${retryCount} 次，等待 2 秒后重新获取 nonce...`);
            await this.sleep(2000);
            const newNonce = await this.getLatestNonce();
            if (newNonce !== null) {
              transaction.nonce = newNonce;
              console.log(`   更新 nonce 为: ${newNonce}`);
            }
          }

          txResponse = await signer.sendTransaction(transaction);
          break; // 成功发送，跳出循环
        } catch (sendError) {
          const errorMsg = (sendError as Error)?.message || '';

          if (
            errorMsg.includes('nonce too low') ||
            errorMsg.includes('replacement transaction underpriced')
          ) {
            retryCount++;
            console.warn(`   Nonce 错误，准备重试 (${retryCount}/${MAX_RETRIES}):`, errorMsg);

            if (retryCount >= MAX_RETRIES) {
              return {
                success: false,
                error: `交易发送失败，已重试 ${MAX_RETRIES} 次: ${errorMsg}`,
              };
            }
          } else {
            throw sendError;
          }
        }
      }

      if (!txResponse) {
        return { success: false, error: '交易发送失败' };
      }

      const txHash = txResponse.hash;
      console.log('📝 交易已发送:', txHash);
      console.log('   等待交易确认...');

      // 等待交易确认
      const receipt = await txResponse.wait();

      // 检查交易状态 - ethers v6 返回 number (1 = success, 0 = failure)
      const isSuccess = receipt?.status === 1;

      if (receipt && isSuccess) {
        console.log('✅ 交易执行成功');
        return { success: true, transactionHash: txHash, blockNumber: receipt.blockNumber };
      } else {
        console.log('❌ 交易执行失败');
        return { success: false, error: '交易执行失败' };
      }
    } catch (error) {
      console.error('❌ 交易执行失败:', error);
      return {
        success: false,
        error: (error as Error).message || '交易执行失败',
      };
    }
  }

  /**
   * 执行合约支付（approve + deposit 组合）
   * @param tokenAddress - 支付代币地址
   * @param contractAddress - 托管合约地址
   * @param amount - 支付金额
   * @param instructions - 交易指令 (to, data, value)
   */
  async executeContractPayment(
    tokenAddress: string | undefined,
    contractAddress: string,
    amount: string | bigint,
    instructions: TransactionData
  ): Promise<TxExecutionResult> {
    console.log('💳 开始执行合约支付...');

    // 1. 如果是 ERC20 代币，先检查并授权
    if (tokenAddress && !this.isNativeToken(tokenAddress)) {
      const approvalResult = await this.approveERC20Token(tokenAddress, contractAddress, amount);

      if (!approvalResult.success) {
        return {
          success: false,
          error: approvalResult.error || '代币授权失败',
        };
      }

      if (!approvalResult.skipped) {
        console.log('✅ 代币授权完成，继续执行支付...');
      }
    }

    // 2. 执行支付交易
    return await this.executeTransaction(instructions);
  }

  /**
   * 获取账户最新 nonce（使用 pending 状态）
   */
  private async getLatestNonce(): Promise<number | null> {
    try {
      if (!this.walletProvider || !this.walletAddress) return null;

      // 使用 'pending' 获取包含待处理交易的 nonce
      const nonce = await this.walletProvider.getTransactionCount(this.walletAddress, 'pending');
      console.log('   获取到最新 nonce:', nonce);
      return nonce;
    } catch (error) {
      console.warn('   获取 nonce 失败:', error);
      return null;
    }
  }

  /**
   * 判断是否为原生代币
   */
  private isNativeToken(tokenAddress: string | undefined): boolean {
    if (!tokenAddress) return true;
    if (tokenAddress === '') return true;
    if (tokenAddress === '0x0000000000000000000000000000000000000000') return true;
    return false;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查服务是否就绪
   */
  isServiceReady(): boolean {
    return !!(this.signer && this.walletAddress);
  }

  /**
   * 获取当前网络类型
   */
  getCurrentNetworkType(): NetworkType | null {
    return this.currentNetworkType;
  }

  /**
   * 获取当前钱包地址
   */
  getCurrentAddress(): string | null {
    return this.walletAddress;
  }

  /**
   * 获取服务状态
   */
  getStatus(): ServiceStatus {
    return {
      currentNetworkType: this.currentNetworkType,
      walletAddress: this.walletAddress,
      isReady: this.isServiceReady(),
    };
  }

  /**
   * 获取支持的网络列表
   */
  getSupportedNetworks(): NetworkType[] {
    return [
      'ethereum',
      'polygon',
      'arbitrum',
      'base',
      'sepolia',
      'base-sepolia',
      'bsc',
      'bsc-testnet',
      'solana',
      'solana-devnet',
    ];
  }

  /**
   * 清理服务状态
   */
  cleanup(): void {
    this.currentNetworkType = null;
    this.walletProvider = null;
    this.walletAddress = null;
    this.signer = null;
    console.log('🧹 交易服务已清理');
  }
}

// 创建单例实例
let transactionServiceInstance: UnifiedTransactionService | null = null;

/**
 * 获取交易服务实例（单例）
 */
export function getTransactionService(): UnifiedTransactionService {
  if (!transactionServiceInstance) {
    transactionServiceInstance = new UnifiedTransactionService();
  }
  return transactionServiceInstance;
}

/**
 * 重置交易服务
 */
export function resetTransactionService(): void {
  if (transactionServiceInstance) {
    transactionServiceInstance.cleanup();
    transactionServiceInstance = null;
  }
}
