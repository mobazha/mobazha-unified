/**
 * UniversalSwap 服务
 * 处理与 UniversalSwap 合约的所有交互 (RWA 原子交换)
 */

import { ethers } from 'ethers';
import type {
  CreateOrderData,
  OrderInfo,
  RwaTransactionResult,
  RwaCreateOrderResult,
  OrderValidationResult,
  PlatformFeeInfo,
  TokenStandard,
  OrderStatus,
} from '../../types/rwa';
import { TokenStandardEnum, getChainConfig } from '../../types/rwa';

// UniversalSwap 合约 ABI
const UniversalSwapABI = [
  // 创建订单
  'function createOrder(uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, address buyer, bytes32 externalOrderId) external returns (uint256 orderId)',

  // 执行原子交换
  'function executeSwap(uint256 orderId) external',
  'function executeSwapByExternalId(bytes32 externalOrderId) external',

  // 取消订单
  'function cancelOrder(uint256 orderId) external',
  'function cancelOrderByExternalId(bytes32 externalOrderId) external',

  // 查询函数
  'function getOrder(uint256 orderId) external view returns (tuple(address seller, address buyer, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, uint8 status, uint256 createdAt, uint256 completedAt, bytes32 externalOrderId))',
  'function getOrderByExternalId(bytes32 externalOrderId) external view returns (tuple(address seller, address buyer, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, uint8 status, uint256 createdAt, uint256 completedAt, bytes32 externalOrderId))',
  'function getSellerOrders(address seller) external view returns (uint256[])',
  'function getActiveSellerOrders(address seller) external view returns (uint256[])',
  'function isOrderValid(uint256 orderId) external view returns (bool isValid, string reason)',
  'function totalOrders() external view returns (uint256)',
  'function externalOrderMap(bytes32) external view returns (uint256)',

  // 管理函数
  'function platformFee() external view returns (uint256)',
  'function feeRecipient() external view returns (address)',

  // 事件
  'event OrderCreated(uint256 indexed orderId, address indexed seller, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, bytes32 externalOrderId)',
  'event SwapExecuted(uint256 indexed orderId, address indexed seller, address indexed buyer, uint256 amount, uint256 price, uint256 platformFeeAmount)',
  'event OrderCancelled(uint256 indexed orderId, address indexed seller)',
];

// ERC20 ABI
const ERC20ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

// ERC721 ABI
const ERC721ABI = [
  'function approve(address to, uint256 tokenId) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

// ERC1155 ABI
const ERC1155ABI = [
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address account, address operator) external view returns (bool)',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
];

// ERC3525 ABI (继承 ERC721)
const ERC3525ABI = [
  'function approve(address to, uint256 tokenId) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
  'function isApprovedForAll(address owner, address operator) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function balanceOf(uint256 tokenId) external view returns (uint256)',
  'function slotOf(uint256 tokenId) external view returns (uint256)',
];

/**
 * UniversalSwap 服务类
 * 处理与 UniversalSwap 合约的所有交互
 */
export class UniversalSwapService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;
  private userAddress: string | null = null;

  /**
   * 初始化服务
   */
  async initialize(
    walletProvider: ethers.Eip1193Provider,
    chain: string,
    userAddress: string,
    isTestnet = true
  ): Promise<boolean> {
    try {
      // 获取链配置
      const chainConfig = getChainConfig(chain, isTestnet);
      if (!chainConfig) {
        throw new Error(`不支持的链: ${chain}`);
      }

      this.contractAddress = chainConfig.universalSwapAddress;

      // 创建 provider 和 signer (ethers v6)
      this.provider = new ethers.BrowserProvider(walletProvider);
      this.signer = await this.provider.getSigner();
      this.userAddress = userAddress;

      // 创建合约实例
      this.contract = new ethers.Contract(this.contractAddress, UniversalSwapABI, this.signer);

      // 验证合约地址
      const code = await this.provider.getCode(this.contractAddress);
      if (code === '0x') {
        throw new Error('UniversalSwap 合约地址无效');
      }

      console.log('✅ UniversalSwap 服务初始化成功');
      console.log('📍 合约地址:', this.contractAddress);
      console.log('👤 用户地址:', this.userAddress);

      return true;
    } catch (error) {
      console.error('❌ UniversalSwap 服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 生成外部订单ID (keccak256 哈希)
   */
  generateExternalOrderId(mobazhOrderId: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(mobazhOrderId));
  }

  /**
   * 买家: 授权支付代币
   */
  async approvePaymentToken(paymentToken: string, amount: string): Promise<RwaTransactionResult> {
    try {
      if (!this.signer || !this.contractAddress || !this.userAddress) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 开始授权支付代币...');
      console.log('📍 代币地址:', paymentToken);
      console.log('💰 授权金额:', amount);

      const tokenContract = new ethers.Contract(paymentToken, ERC20ABI, this.signer);

      // 检查当前授权额度
      const allowance = await tokenContract.allowance(this.userAddress, this.contractAddress);
      const allowanceBigInt = BigInt(allowance.toString());
      const amountBigInt = BigInt(amount);

      console.log('📊 当前授权额度:', allowance.toString());

      if (allowanceBigInt < amountBigInt) {
        console.log('🔄 执行授权交易...');
        const tx = await tokenContract.approve(this.contractAddress, amount);
        const receipt = await tx.wait();
        console.log('✅ 支付代币授权成功');
        return {
          success: true,
          transactionHash: receipt.hash || receipt.transactionHash,
        };
      } else {
        console.log('✅ 已有足够授权额度');
        return {
          success: true,
          transactionHash: null,
          message: '已有足够授权额度',
        };
      }
    } catch (error) {
      console.error('❌ 支付代币授权失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 卖家: 授权 Token
   */
  async approveToken(
    tokenStandard: TokenStandard,
    tokenContract: string,
    tokenId: string
  ): Promise<RwaTransactionResult> {
    try {
      if (!this.signer || !this.contractAddress || !this.userAddress) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 开始授权 Token...');
      console.log('📋 Token 标准:', tokenStandard);
      console.log('📍 合约地址:', tokenContract);
      console.log('🔢 Token ID:', tokenId);

      const standard = this.parseTokenStandard(tokenStandard);
      let contract: ethers.Contract;
      let isApproved = false;

      if (standard === TokenStandardEnum.ERC721) {
        contract = new ethers.Contract(tokenContract, ERC721ABI, this.signer);
        const approved = await contract.getApproved(tokenId);
        const isApprovedForAll = await contract.isApprovedForAll(
          this.userAddress,
          this.contractAddress
        );
        isApproved = approved === this.contractAddress || isApprovedForAll;
      } else if (standard === TokenStandardEnum.ERC1155) {
        contract = new ethers.Contract(tokenContract, ERC1155ABI, this.signer);
        isApproved = await contract.isApprovedForAll(this.userAddress, this.contractAddress);
      } else if (standard === TokenStandardEnum.ERC3525) {
        contract = new ethers.Contract(tokenContract, ERC3525ABI, this.signer);
        const approved = await contract.getApproved(tokenId);
        const isApprovedForAll = await contract.isApprovedForAll(
          this.userAddress,
          this.contractAddress
        );
        isApproved = approved === this.contractAddress || isApprovedForAll;
      } else {
        throw new Error(`不支持的 Token 标准: ${tokenStandard}`);
      }

      if (!isApproved) {
        console.log('🔄 执行 setApprovalForAll...');
        const tx = await contract.setApprovalForAll(this.contractAddress, true);
        const receipt = await tx.wait();
        console.log('✅ Token 授权成功');
        return {
          success: true,
          transactionHash: receipt.hash || receipt.transactionHash,
        };
      } else {
        console.log('✅ Token 已授权');
        return {
          success: true,
          transactionHash: null,
          message: 'Token 已授权',
        };
      }
    } catch (error) {
      console.error('❌ Token 授权失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 卖家: 创建订单
   */
  async createOrder(orderData: CreateOrderData): Promise<RwaCreateOrderResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const {
        tokenStandard,
        tokenContract,
        tokenId,
        amount,
        paymentToken,
        price,
        buyer,
        externalOrderId,
      } = orderData;

      console.log('🔧 创建订单...');
      console.log('📋 订单数据:', orderData);

      const standard = this.parseTokenStandard(tokenStandard);
      const hashedExternalId = this.generateExternalOrderId(externalOrderId);

      const tx = await this.contract.createOrder(
        standard,
        tokenContract,
        tokenId,
        amount,
        paymentToken,
        price,
        buyer || ethers.ZeroAddress,
        hashedExternalId
      );

      const receipt = await tx.wait();
      console.log('✅ 订单创建成功');

      // 从事件中获取订单ID
      let orderId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed && parsed.name === 'OrderCreated') {
            orderId = parsed.args.orderId.toString();
            break;
          }
        } catch {
          // 忽略无法解析的日志
        }
      }

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
        orderId,
        externalOrderId,
      };
    } catch (error) {
      console.error('❌ 创建订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 买家/卖家: 创建订单并授权 (一站式操作)
   */
  async createOrderAndApprove(
    orderData: CreateOrderData,
    isSellerSide: boolean
  ): Promise<RwaCreateOrderResult> {
    try {
      if (isSellerSide) {
        // 卖家: 先授权 Token，再创建订单
        await this.approveToken(
          orderData.tokenStandard,
          orderData.tokenContract,
          orderData.tokenId
        );
      } else {
        // 买家: 授权支付代币
        await this.approvePaymentToken(orderData.paymentToken, orderData.price);
      }

      // 如果是卖家，创建订单
      if (isSellerSide) {
        return await this.createOrder(orderData);
      }

      // 买家只需要授权，返回成功
      return {
        success: true,
        transactionHash: null,
        message: '支付授权成功，等待卖家发货',
      };
    } catch (error) {
      console.error('❌ 创建订单并授权失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 执行原子交换
   */
  async executeSwap(orderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 执行原子交换...');
      console.log('🔢 订单ID:', orderId);

      const tx = await this.contract.executeSwap(orderId);
      const receipt = await tx.wait();

      console.log('✅ 原子交换执行成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 原子交换执行失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 通过外部订单ID执行原子交换
   */
  async executeSwapByExternalId(externalOrderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 通过外部订单ID执行原子交换...');
      console.log('📋 外部订单ID:', externalOrderId);

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);
      const tx = await this.contract.executeSwapByExternalId(hashedExternalId);
      const receipt = await tx.wait();

      console.log('✅ 原子交换执行成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 原子交换执行失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 取消订单...');
      console.log('🔢 订单ID:', orderId);

      const tx = await this.contract.cancelOrder(orderId);
      const receipt = await tx.wait();

      console.log('✅ 订单取消成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 取消订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 通过外部订单ID取消订单
   */
  async cancelOrderByExternalId(externalOrderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 通过外部订单ID取消订单...');
      console.log('📋 外部订单ID:', externalOrderId);

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);
      const tx = await this.contract.cancelOrderByExternalId(hashedExternalId);
      const receipt = await tx.wait();

      console.log('✅ 订单取消成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 取消订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 查询订单信息
   */
  async getOrder(orderId: string): Promise<OrderInfo> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const order = await this.contract.getOrder(orderId);
      return this.formatOrder(order);
    } catch (error) {
      console.error('❌ 查询订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 通过外部订单ID查询订单
   */
  async getOrderByExternalId(externalOrderId: string): Promise<OrderInfo> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);
      const order = await this.contract.getOrderByExternalId(hashedExternalId);
      return this.formatOrder(order);
    } catch (error) {
      console.error('❌ 查询订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 检查外部订单是否存在
   */
  async checkExternalOrderExists(externalOrderId: string): Promise<boolean> {
    try {
      if (!this.contract) {
        return false;
      }

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);
      const orderId = await this.contract.externalOrderMap(hashedExternalId);
      return orderId > BigInt(0);
    } catch {
      return false;
    }
  }

  /**
   * 验证订单是否有效
   */
  async isOrderValid(orderId: string): Promise<OrderValidationResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const [isValid, reason] = await this.contract.isOrderValid(orderId);
      return { isValid, reason };
    } catch (error) {
      console.error('❌ 验证订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取平台费用
   */
  async getPlatformFee(): Promise<PlatformFeeInfo> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const fee = await this.contract.platformFee();
      return {
        fee: fee.toString(),
        percentage: Number(fee) / 100, // 转换为百分比
      };
    } catch (error) {
      console.error('❌ 获取平台费用失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取合约地址
   */
  getContractAddress(): string | null {
    return this.contractAddress;
  }

  /**
   * 获取用户地址
   */
  getUserAddress(): string | null {
    return this.userAddress;
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.contract !== null;
  }

  /**
   * 格式化订单数据
   */
  private formatOrder(order: {
    seller: string;
    buyer: string;
    standard: bigint;
    tokenContract: string;
    tokenId: bigint;
    amount: bigint;
    paymentToken: string;
    price: bigint;
    status: bigint;
    createdAt: bigint;
    completedAt: bigint;
    externalOrderId: string;
  }): OrderInfo {
    return {
      seller: order.seller,
      buyer: order.buyer,
      standard: this.getTokenStandardName(Number(order.standard)),
      tokenContract: order.tokenContract,
      tokenId: order.tokenId.toString(),
      amount: order.amount.toString(),
      paymentToken: order.paymentToken,
      price: order.price.toString(),
      status: this.getOrderStatusName(Number(order.status)),
      createdAt: new Date(Number(order.createdAt) * 1000),
      completedAt:
        Number(order.completedAt) > 0 ? new Date(Number(order.completedAt) * 1000) : null,
      externalOrderId: order.externalOrderId,
    };
  }

  /**
   * 解析 Token 标准字符串为枚举值
   */
  private parseTokenStandard(standard: TokenStandard): number {
    const standardUpper = standard.toUpperCase();
    if (standardUpper === 'ERC721') return TokenStandardEnum.ERC721;
    if (standardUpper === 'ERC1155') return TokenStandardEnum.ERC1155;
    if (standardUpper === 'ERC3525') return TokenStandardEnum.ERC3525;
    throw new Error(`不支持的 Token 标准: ${standard}`);
  }

  /**
   * 获取 Token 标准名称
   */
  private getTokenStandardName(standard: number): TokenStandard {
    const names: TokenStandard[] = ['ERC721', 'ERC1155', 'ERC3525'];
    return names[standard] || 'ERC721';
  }

  /**
   * 获取订单状态名称
   */
  private getOrderStatusName(status: number): OrderStatus {
    const names: OrderStatus[] = ['Active', 'Completed', 'Cancelled'];
    return names[status] || 'Active';
  }

  /**
   * 处理错误
   */
  private handleError(error: unknown): Error {
    let message = '合约调用失败';

    const err = error as {
      code?: number | string;
      message?: string;
    };

    if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
      message = '用户拒绝交易';
    } else if (err.code === -32603) {
      message = '网络错误，请检查网络连接';
    } else if (err.message?.includes('insufficient funds')) {
      message = '余额不足';
    } else if (err.message?.includes('Order does not exist')) {
      message = '订单不存在';
    } else if (err.message?.includes('Order not active')) {
      message = '订单不是活跃状态';
    } else if (err.message?.includes('Not seller')) {
      message = '只有卖家可以执行此操作';
    } else if (err.message?.includes('Cannot buy own order')) {
      message = '不能购买自己的订单';
    } else if (err.message?.includes('External order ID exists')) {
      message = '外部订单ID已存在';
    } else if (err.message?.includes('Token not approved')) {
      message = 'Token 未授权';
    } else if (err.message?.includes('Insufficient balance')) {
      message = '余额不足';
    } else if (err.message?.includes('Insufficient shares')) {
      message = '份额不足';
    } else if (err.message?.includes('Seller not owner')) {
      message = '卖家不是 Token 所有者';
    } else {
      message = err.message || '未知错误';
    }

    const customError = new Error(message);
    (customError as Error & { originalError: unknown }).originalError = error;
    return customError;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = null;
    this.userAddress = null;
  }
}

// 创建单例实例
export const universalSwapService = new UniversalSwapService();
