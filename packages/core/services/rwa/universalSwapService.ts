/**
 * UniversalSwap 服务
 * 处理与 UniversalSwap 合约的所有交互 (RWA 原子交换)
 *
 * 更新于 2026-01-17：适配新合约地址分离设计
 * 支持两种交易模式：
 * 1. Listing 模式（即时交易）：卖家挂单 -> 买家即时购买
 * 2. Order 模式（确认交易）：买家创建订单 -> 卖家确认
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

// 交易模式枚举
export const TradeMode = {
  Instant: 0, // 即时交易（Listing 模式）
  ConfirmRequired: 1, // 确认交易（Order 模式）
} as const;

export type TradeModeType = (typeof TradeMode)[keyof typeof TradeMode];

// 挂单状态枚举
export const ListingStatus = {
  Active: 0, // 可交易
  SoldOut: 1, // 售罄
  Cancelled: 2, // 已撤销
} as const;

export type ListingStatusType = (typeof ListingStatus)[keyof typeof ListingStatus];

// UniversalSwap 合约 ABI - 支持 Listing（即时交易）和 Order（确认交易）双模式
const UniversalSwapABI = [
  // ============ Listing 模式（即时交易）============
  // 卖家创建挂单（Token 锁定到合约）
  'function createListing(address sellerReceiveAddress, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount) external returns (uint256 listingId)',

  // 买家即时购买
  'function instantBuy(uint256 listingId, bytes32 externalOrderId, address buyerIdentity, address buyerReceiveAddress, uint256 tokenAmount, address paymentToken, uint256 paymentAmount) external returns (uint256 orderId)',

  // 卖家撤销挂单
  'function cancelListing(uint256 listingId) external',

  // ============ Order 模式（确认交易）============
  // 买家创建订单并锁定资金（仅确认交易模式）
  'function createOrderByBuyer(address seller, address buyerIdentity, address buyerReceiveAddress, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, bytes32 externalOrderId, uint256 escrowTimeoutSeconds) external returns (uint256 orderId)',

  // 卖家确认订单（需传入收款地址）
  'function confirmOrder(uint256 orderId, address sellerReceiveAddress) external',
  'function confirmOrderByExternalId(bytes32 externalOrderId, address sellerReceiveAddress) external',

  // 买家取消锁定订单
  'function cancelByBuyer(uint256 orderId) external',
  'function cancelByBuyerByExternalId(bytes32 externalOrderId) external',

  // 超时退款（任何人可调用）
  'function claimExpired(uint256 orderId) external',
  'function claimExpiredByExternalId(bytes32 externalOrderId) external',

  // ============ 查询函数 - Order ============
  'function getOrder(uint256 orderId) external view returns (tuple(address seller, address buyer, address buyerPaymentAddress, address buyerReceiveAddress, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, uint8 status, uint256 createdAt, uint256 completedAt, bytes32 externalOrderId, uint8 tradeMode, uint256 escrowTimeout, uint256 paymentLockedAt))',
  'function getOrderByExternalId(bytes32 externalOrderId) external view returns (tuple(address seller, address buyer, address buyerPaymentAddress, address buyerReceiveAddress, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, uint8 status, uint256 createdAt, uint256 completedAt, bytes32 externalOrderId, uint8 tradeMode, uint256 escrowTimeout, uint256 paymentLockedAt))',
  'function getSellerOrders(address seller) external view returns (uint256[])',
  'function getActiveSellerOrders(address seller) external view returns (uint256[])',
  'function isOrderValid(uint256 orderId) external view returns (bool isValid, string reason)',
  'function isOrderExpired(uint256 orderId) external view returns (bool)',
  'function getRemainingEscrowTime(uint256 orderId) external view returns (uint256)',
  'function getPendingConfirmOrders(address seller) external view returns (uint256[])',
  'function totalOrders() external view returns (uint256)',
  'function externalOrderMap(bytes32) external view returns (uint256)',

  // ============ 查询函数 - Listing ============
  'function getListing(uint256 listingId) external view returns (tuple(address seller, address sellerReceiveAddress, uint8 standard, address tokenContract, uint256 tokenId, uint256 totalAmount, uint256 availableAmount, uint8 status, uint256 createdAt))',
  'function getListingAvailable(uint256 listingId) external view returns (uint256)',
  'function getSellerListings(address seller) external view returns (uint256[])',
  'function getActiveSellerListings(address seller) external view returns (uint256[])',
  'function getListingOrders(uint256 listingId) external view returns (uint256[])',
  'function totalListings() external view returns (uint256)',

  // ============ 管理函数 ============
  'function platformFee() external view returns (uint256)',
  'function feeRecipient() external view returns (address)',

  // ============ 事件 ============
  // Listing 事件
  'event ListingCreated(uint256 indexed listingId, address indexed seller, address sellerReceiveAddress, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount)',
  'event ListingCancelled(uint256 indexed listingId, address indexed seller, uint256 refundAmount)',
  'event InstantBuyCompleted(uint256 indexed orderId, uint256 indexed listingId, address indexed buyer, address buyerPaymentAddress, address buyerReceiveAddress, uint256 tokenAmount, address paymentToken, uint256 paymentAmount, bytes32 externalOrderId)',

  // Order 事件
  'event OrderCreatedByBuyer(uint256 indexed orderId, address indexed seller, address indexed buyerIdentity, address buyerPaymentAddress, address buyerReceiveAddress, uint8 standard, address tokenContract, uint256 tokenId, uint256 amount, address paymentToken, uint256 price, bytes32 externalOrderId, uint8 tradeMode)',
  'event SwapExecuted(uint256 indexed orderId, address indexed seller, address indexed buyer, uint256 amount, uint256 price, uint256 platformFeeAmount)',
  'event PaymentLocked(uint256 indexed orderId, address indexed buyer, uint256 amount, uint256 expiresAt)',
  'event PaymentCancelled(uint256 indexed orderId, address indexed buyer, uint256 amount)',
  'event PaymentExpired(uint256 indexed orderId, address indexed buyer, uint256 amount)',
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

// 挂单信息接口
export interface ListingInfo {
  seller: string;
  sellerReceiveAddress: string;
  standard: TokenStandard;
  tokenContract: string;
  tokenId: string;
  totalAmount: string;
  availableAmount: string;
  status: 'Active' | 'SoldOut' | 'Cancelled';
  statusCode: number;
  createdAt: Date;
}

// 挂单创建数据
export interface CreateListingData {
  sellerReceiveAddress: string;
  tokenStandard: TokenStandard;
  tokenContract: string;
  tokenId: string;
  amount: string;
}

// 即时购买数据
export interface InstantBuyData {
  listingId: string;
  externalOrderId: string;
  buyerIdentity: string;
  buyerReceiveAddress: string;
  tokenAmount: string;
  paymentToken: string;
  paymentAmount: string;
}

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

  // ============ 通用方法 ============

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

  // ============ Listing 模式（即时交易）方法 ============

  /**
   * 卖家: 创建挂单（锁定 Token 到合约）
   */
  async createListing(
    listingData: CreateListingData
  ): Promise<RwaCreateOrderResult & { listingId?: string }> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const { sellerReceiveAddress, tokenStandard, tokenContract, tokenId, amount } = listingData;

      console.log('🏷️ 创建挂单...');
      console.log('📍 收款地址:', sellerReceiveAddress);
      console.log('📋 Token 标准:', tokenStandard);
      console.log('📍 Token 合约:', tokenContract);
      console.log('🔢 Token ID:', tokenId);
      console.log('📊 数量:', amount);

      const standard = this.parseTokenStandard(tokenStandard);

      const tx = await this.contract.createListing(
        sellerReceiveAddress,
        standard,
        tokenContract,
        tokenId,
        amount
      );

      const receipt = await tx.wait();

      // 从事件中获取 listingId
      let listingId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed?.name === 'ListingCreated') {
            listingId = parsed.args.listingId.toString();
            break;
          }
        } catch {
          // 忽略无法解析的日志
        }
      }

      console.log('✅ 挂单创建成功');
      console.log('🔢 Listing ID:', listingId);

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
        listingId,
      };
    } catch (error) {
      console.error('❌ 创建挂单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 买家: 即时购买（从挂单购买）
   */
  async instantBuy(
    buyData: InstantBuyData
  ): Promise<RwaCreateOrderResult & { tradeMode?: string }> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const {
        listingId,
        externalOrderId,
        buyerIdentity,
        buyerReceiveAddress,
        tokenAmount,
        paymentToken,
        paymentAmount,
      } = buyData;

      console.log('🛒 即时购买...');
      console.log('🔢 Listing ID:', listingId);
      console.log('📋 外部订单 ID:', externalOrderId);
      console.log('👤 买家身份:', buyerIdentity);
      console.log('📍 接收地址:', buyerReceiveAddress);
      console.log('📊 购买数量:', tokenAmount);
      console.log('💰 支付金额:', paymentAmount);

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);

      const tx = await this.contract.instantBuy(
        listingId,
        hashedExternalId,
        buyerIdentity,
        buyerReceiveAddress,
        tokenAmount,
        paymentToken,
        paymentAmount
      );

      const receipt = await tx.wait();

      // 从事件中获取 orderId
      let orderId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed?.name === 'InstantBuyCompleted') {
            orderId = parsed.args.orderId.toString();
            break;
          }
        } catch {
          // 忽略无法解析的日志
        }
      }

      console.log('✅ 即时购买成功');
      console.log('🔢 订单 ID:', orderId);

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
        orderId,
        externalOrderId,
        tradeMode: 'completed', // 即时交易直接完成
      };
    } catch (error) {
      console.error('❌ 即时购买失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 卖家: 撤销挂单
   */
  async cancelListing(listingId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 撤销挂单...');
      console.log('🔢 Listing ID:', listingId);

      const tx = await this.contract.cancelListing(listingId);
      const receipt = await tx.wait();

      console.log('✅ 挂单撤销成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 撤销挂单失败:', error);
      throw this.handleError(error);
    }
  }

  // ============ Order 模式（确认交易）方法 ============

  /**
   * 买家: 创建订单并锁定资金（确认交易模式）
   */
  async createOrderByBuyer(
    orderData: CreateOrderData & {
      seller: string;
      buyerIdentity?: string;
      buyerReceiveAddress?: string;
      escrowTimeoutSeconds?: number;
    }
  ): Promise<RwaCreateOrderResult & { tradeMode?: string }> {
    try {
      if (!this.contract || !this.userAddress) {
        throw new Error('服务未初始化');
      }

      const {
        seller,
        buyerIdentity,
        buyerReceiveAddress,
        tokenStandard,
        tokenContract,
        tokenId,
        amount,
        paymentToken,
        price,
        externalOrderId,
        escrowTimeoutSeconds = 86400,
      } = orderData;

      // 如果未提供 buyerIdentity，使用当前用户地址
      const actualBuyerIdentity = buyerIdentity || this.userAddress;
      // 如果未提供 buyerReceiveAddress，使用 buyerIdentity
      const actualBuyerReceiveAddress = buyerReceiveAddress || actualBuyerIdentity;

      console.log('🛒 买家创建订单并锁定资金...');
      console.log('📍 卖家地址:', seller);
      console.log('👤 买家身份:', actualBuyerIdentity);
      console.log('📍 买家接收地址:', actualBuyerReceiveAddress);
      console.log('📋 Mobazha 订单ID:', externalOrderId);
      console.log('💰 价格:', price);
      console.log('⏱️ 托管超时:', escrowTimeoutSeconds, '秒');

      const standard = this.parseTokenStandard(tokenStandard);
      const hashedExternalId = this.generateExternalOrderId(externalOrderId);

      const tx = await this.contract.createOrderByBuyer(
        seller,
        actualBuyerIdentity,
        actualBuyerReceiveAddress,
        standard,
        tokenContract,
        tokenId,
        amount,
        paymentToken,
        price,
        hashedExternalId,
        escrowTimeoutSeconds
      );

      const receipt = await tx.wait();

      // 从事件中获取订单ID
      let orderId: string | undefined;
      let resultTradeMode = 'locked'; // Order 模式默认为资金锁定

      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed?.name === 'OrderCreatedByBuyer') {
            orderId = parsed.args.orderId.toString();
          } else if (parsed?.name === 'PaymentLocked') {
            resultTradeMode = 'locked';
          }
        } catch {
          // 忽略无法解析的日志
        }
      }

      console.log('✅ 买家创建订单成功');
      console.log('🔢 合约订单ID:', orderId);
      console.log('📋 结果模式:', resultTradeMode);

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
        orderId,
        externalOrderId,
        tradeMode: resultTradeMode,
      };
    } catch (error) {
      console.error('❌ 买家创建订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 卖家: 确认订单（确认交易模式）
   */
  async confirmOrder(orderId: string, sellerReceiveAddress: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 卖家确认订单...');
      console.log('🔢 订单ID:', orderId);
      console.log('📍 收款地址:', sellerReceiveAddress);

      const tx = await this.contract.confirmOrder(orderId, sellerReceiveAddress);
      const receipt = await tx.wait();

      console.log('✅ 订单确认成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 确认订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 卖家: 通过外部订单ID确认订单
   */
  async confirmOrderByExternalId(
    externalOrderId: string,
    sellerReceiveAddress: string
  ): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 通过外部订单ID确认订单...');
      console.log('📋 外部订单ID:', externalOrderId);
      console.log('📍 收款地址:', sellerReceiveAddress);

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);
      const tx = await this.contract.confirmOrderByExternalId(
        hashedExternalId,
        sellerReceiveAddress
      );
      const receipt = await tx.wait();

      console.log('✅ 订单确认成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 确认订单失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 买家: 取消锁定订单 (确认交易模式)
   */
  async cancelByBuyer(orderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 买家取消订单...');
      console.log('🔢 订单ID:', orderId);

      const tx = await this.contract.cancelByBuyer(orderId);
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
   * 买家: 通过外部订单ID取消订单
   */
  async cancelByBuyerByExternalId(externalOrderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 通过外部订单ID取消订单...');
      console.log('📋 外部订单ID:', externalOrderId);

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);
      const tx = await this.contract.cancelByBuyerByExternalId(hashedExternalId);
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
   * 认领超时退款（任何人可调用）
   */
  async claimExpired(orderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 认领超时退款...');
      console.log('🔢 订单ID:', orderId);

      const tx = await this.contract.claimExpired(orderId);
      const receipt = await tx.wait();

      console.log('✅ 超时退款认领成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 认领超时退款失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 通过外部订单ID认领超时退款
   */
  async claimExpiredByExternalId(externalOrderId: string): Promise<RwaTransactionResult> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      console.log('🔧 通过外部订单ID认领超时退款...');
      console.log('📋 外部订单ID:', externalOrderId);

      const hashedExternalId = this.generateExternalOrderId(externalOrderId);
      const tx = await this.contract.claimExpiredByExternalId(hashedExternalId);
      const receipt = await tx.wait();

      console.log('✅ 超时退款认领成功');

      return {
        success: true,
        transactionHash: receipt.hash || receipt.transactionHash,
      };
    } catch (error) {
      console.error('❌ 认领超时退款失败:', error);
      throw this.handleError(error);
    }
  }

  // ============ 查询方法 ============

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
   * 查询挂单信息
   */
  async getListing(listingId: string): Promise<ListingInfo> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const listing = await this.contract.getListing(listingId);
      return this.formatListing(listing);
    } catch (error) {
      console.error('❌ 查询挂单失败:', error);
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
   * 检查订单是否已过期
   */
  async isOrderExpired(orderId: string): Promise<boolean> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      return await this.contract.isOrderExpired(orderId);
    } catch (error) {
      console.error('❌ 检查订单过期状态失败:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 获取订单剩余托管时间（秒）
   */
  async getRemainingEscrowTime(orderId: string): Promise<number> {
    try {
      if (!this.contract) {
        throw new Error('服务未初始化');
      }

      const time = await this.contract.getRemainingEscrowTime(orderId);
      return Number(time);
    } catch (error) {
      console.error('❌ 获取剩余托管时间失败:', error);
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

  // ============ 私有方法 ============

  /**
   * 格式化订单数据
   */
  private formatOrder(order: {
    seller: string;
    buyer: string;
    buyerPaymentAddress: string;
    buyerReceiveAddress: string;
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
    tradeMode: bigint;
    escrowTimeout: bigint;
    paymentLockedAt: bigint;
  }): OrderInfo {
    return {
      seller: order.seller,
      buyer: order.buyer,
      buyerPaymentAddress: order.buyerPaymentAddress,
      buyerReceiveAddress: order.buyerReceiveAddress,
      standard: this.getTokenStandardName(Number(order.standard)),
      tokenContract: order.tokenContract,
      tokenId: order.tokenId.toString(),
      amount: order.amount.toString(),
      paymentToken: order.paymentToken,
      price: order.price.toString(),
      status: this.getOrderStatusName(Number(order.status)),
      statusCode: Number(order.status),
      createdAt: new Date(Number(order.createdAt) * 1000),
      completedAt:
        Number(order.completedAt) > 0 ? new Date(Number(order.completedAt) * 1000) : null,
      externalOrderId: order.externalOrderId,
      tradeMode: this.getTradeModeDesc(Number(order.tradeMode)),
      tradeModeCode: Number(order.tradeMode),
      escrowTimeout: Number(order.escrowTimeout),
      paymentLockedAt:
        Number(order.paymentLockedAt) > 0 ? new Date(Number(order.paymentLockedAt) * 1000) : null,
    };
  }

  /**
   * 格式化挂单数据
   */
  private formatListing(listing: {
    seller: string;
    sellerReceiveAddress: string;
    standard: bigint;
    tokenContract: string;
    tokenId: bigint;
    totalAmount: bigint;
    availableAmount: bigint;
    status: bigint;
    createdAt: bigint;
  }): ListingInfo {
    return {
      seller: listing.seller,
      sellerReceiveAddress: listing.sellerReceiveAddress,
      standard: this.getTokenStandardName(Number(listing.standard)),
      tokenContract: listing.tokenContract,
      tokenId: listing.tokenId.toString(),
      totalAmount: listing.totalAmount.toString(),
      availableAmount: listing.availableAmount.toString(),
      status: this.getListingStatusName(Number(listing.status)),
      statusCode: Number(listing.status),
      createdAt: new Date(Number(listing.createdAt) * 1000),
    };
  }

  /**
   * 获取交易模式描述
   */
  private getTradeModeDesc(mode: number): string {
    const modes = ['即时交易', '确认交易'];
    return modes[mode] || '未知';
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
    const names: OrderStatus[] = ['Active', 'PaymentLocked', 'Completed', 'Cancelled', 'Expired'];
    return names[status] || 'Active';
  }

  /**
   * 获取挂单状态名称
   */
  private getListingStatusName(status: number): 'Active' | 'SoldOut' | 'Cancelled' {
    const names: ('Active' | 'SoldOut' | 'Cancelled')[] = ['Active', 'SoldOut', 'Cancelled'];
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
    } else if (err.message?.includes('Listing does not exist')) {
      message = '挂单不存在';
    } else if (err.message?.includes('Listing not active')) {
      message = '挂单不是活跃状态';
    } else if (err.message?.includes('Insufficient available')) {
      message = '可用数量不足';
    } else if (err.message?.includes('Cannot buy own listing')) {
      message = '不能购买自己的挂单';
    } else if (err.message?.includes('Not seller')) {
      message = '只有卖家可以执行此操作';
    } else if (err.message?.includes('Not buyer')) {
      message = '只有买家可以执行此操作';
    } else if (err.message?.includes('Cannot buy from self')) {
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
    } else if (err.message?.includes('Not locked')) {
      message = '订单未处于资金锁定状态';
    } else if (err.message?.includes('Not expired')) {
      message = '订单尚未过期';
    } else if (err.message?.includes('Order expired')) {
      message = '订单已过期';
    } else if (err.message?.includes('Escrow timeout too long')) {
      message = '托管超时时间过长（最长7天）';
    } else if (err.message?.includes('Invalid receive address')) {
      message = '无效的接收地址';
    } else if (err.message?.includes('Invalid seller receive address')) {
      message = '无效的卖家收款地址';
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
