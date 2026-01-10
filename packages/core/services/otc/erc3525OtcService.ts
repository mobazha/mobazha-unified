/**
 * ERC3525 (RWA) OTC 交易服务
 *
 * 处理 ERC3525 半同质化代币的 OTC 交易
 * 适用于音乐剧份额、房地产收益等 RWA 资产
 */

import { ethers, type BrowserProvider, type Signer } from 'ethers';
import type {
  Erc3525Order,
  Erc3525Holding,
  CreateErc3525OrderParams,
  ExpectedRevenue,
  OtcTransactionResult,
  ShareLink,
} from '../../types/otc';
import { getContractAddress, getOtcConfig, DEMO_RWA_ASSETS } from '../../config/otcConfig';

// ABI 片段 - BroadwaySwap
const BROADWAY_SWAP_ABI = [
  'function createOrder(address rwaToken, uint256 tokenId, uint256 shares, address paymentToken, uint256 price) external returns (uint256 orderId)',
  'function cancelOrder(uint256 orderId) external',
  'function executeSwap(uint256 orderId) external',
  'function orders(uint256 orderId) view returns (address seller, address rwaToken, uint256 tokenId, uint256 shares, address paymentToken, uint256 price, uint8 status, uint256 createdAt, uint256 completedAt)',
  'function getSellerOrders(address seller) view returns (uint256[])',
  'function platformFee() view returns (uint256)',
  'function orderCount() view returns (uint256)',
  'event OrderCreated(uint256 indexed orderId, address indexed seller, address rwaToken, uint256 tokenId, uint256 shares, uint256 price)',
  'event SwapExecuted(uint256 indexed orderId, address indexed seller, address indexed buyer, uint256 tokenId, uint256 shares, uint256 price)',
] as const;

// ABI 片段 - ERC3525
const ERC3525_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function slotOf(uint256 tokenId) view returns (uint256)',
  'function balanceOf(uint256 tokenId) view returns (uint256)',
  'function approve(uint256 tokenId, address operator, uint256 value) external',
  'function allowance(uint256 tokenId, address operator) view returns (uint256)',
  'function setApprovalForAll(address operator, bool approved) external',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function transferFrom(uint256 fromTokenId, address to, uint256 value) external returns (uint256)',
  'function transferFrom(uint256 fromTokenId, uint256 toTokenId, uint256 value) external',
] as const;

// ABI 片段 - ERC20
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
] as const;

export class Erc3525OtcService {
  private provider: BrowserProvider;
  private signer: Signer;
  private chainId: number;
  private swapContract: ethers.Contract;

  constructor(provider: BrowserProvider, signer: Signer, chainId: number = 84532) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    const contractAddress = getContractAddress('BroadwaySwap', chainId);
    this.swapContract = new ethers.Contract(contractAddress, BROADWAY_SWAP_ABI, signer);
  }

  // ============================================================
  // 持仓查询
  // ============================================================

  /**
   * 获取用户的 ERC3525 持仓
   *
   * 注意：标准 ERC3525 没有批量查询接口，实际项目中应使用 Subgraph
   * 这里返回 Demo 数据
   */
  async getHoldings(_userAddress: string, _rwaTokenAddress?: string): Promise<Erc3525Holding[]> {
    // 返回 Demo 数据
    return DEMO_RWA_ASSETS.map(asset => ({
      tokenId: asset.tokenId,
      slot: asset.slot,
      value: asset.userShares,
      name: asset.name,
      description: asset.description,
    }));
  }

  /**
   * 获取单个 Token 的详细信息
   */
  async getTokenInfo(rwaTokenAddress: string, tokenId: number): Promise<Erc3525Holding | null> {
    try {
      const rwaToken = new ethers.Contract(rwaTokenAddress, ERC3525_ABI, this.provider);

      const [slot, balance] = await Promise.all([
        rwaToken.slotOf(tokenId),
        rwaToken['balanceOf(uint256)'](tokenId),
      ]);

      // 查找对应的 Demo 数据获取名称
      const demoAsset = DEMO_RWA_ASSETS.find(a => a.tokenId === tokenId);

      return {
        tokenId,
        slot: Number(slot),
        value: Number(balance),
        name: demoAsset?.name || `Token #${tokenId}`,
        description: demoAsset?.description,
      };
    } catch (error) {
      console.error('Failed to fetch token info:', error);
      return null;
    }
  }

  // ============================================================
  // 订单创建
  // ============================================================

  /**
   * 检查并授权 ERC3525 代币
   */
  async ensureRwaApproval(rwaTokenAddress: string): Promise<boolean> {
    const rwaToken = new ethers.Contract(rwaTokenAddress, ERC3525_ABI, this.signer);
    const swapAddress = getContractAddress('BroadwaySwap', this.chainId);
    const signerAddress = await this.signer.getAddress();

    // 检查是否已授权
    const isApproved = await rwaToken.isApprovedForAll(signerAddress, swapAddress);
    if (isApproved) {
      return true;
    }

    // 执行授权
    const tx = await rwaToken.setApprovalForAll(swapAddress, true);
    await tx.wait();
    return true;
  }

  /**
   * 创建 ERC3525 份额订单
   */
  async createOrder(
    params: CreateErc3525OrderParams
  ): Promise<OtcTransactionResult & { orderId?: string }> {
    try {
      const { rwaToken, tokenId, shares, price, paymentToken } = params;

      // 确保 RWA Token 已授权
      await this.ensureRwaApproval(rwaToken);

      // 转换价格 (假设 6 位小数)
      const priceWei = ethers.parseUnits(price.toString(), 6);

      // 创建订单
      const tx = await this.swapContract.createOrder(
        rwaToken,
        tokenId,
        shares,
        paymentToken,
        priceWei
      );
      const receipt = await tx.wait();

      // 从事件中获取订单 ID
      let orderId: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = this.swapContract.interface.parseLog(log);
          if (parsed?.name === 'OrderCreated') {
            orderId = parsed.args.orderId.toString();
            break;
          }
        } catch {
          // 忽略解析错误
        }
      }

      return {
        success: true,
        txHash: receipt.hash,
        orderId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }

  // ============================================================
  // 订单查询
  // ============================================================

  /**
   * 获取订单详情
   */
  async getOrder(orderId: string): Promise<Erc3525Order | null> {
    try {
      const order = await this.swapContract.orders(orderId);

      // 检查订单是否存在
      if (order.createdAt === BigInt(0)) {
        return null;
      }

      return {
        orderId,
        seller: order.seller,
        rwaToken: order.rwaToken,
        tokenId: Number(order.tokenId),
        shares: Number(order.shares),
        paymentToken: order.paymentToken,
        price: ethers.formatUnits(order.price, 6),
        status: Number(order.status),
        createdAt: Number(order.createdAt),
        completedAt: Number(order.completedAt),
      };
    } catch (error) {
      console.error('Failed to fetch order:', error);
      return null;
    }
  }

  /**
   * 获取卖家的所有订单
   */
  async getSellerOrders(sellerAddress: string): Promise<Erc3525Order[]> {
    try {
      const orderIds = await this.swapContract.getSellerOrders(sellerAddress);
      const orders: Erc3525Order[] = [];

      for (const orderId of orderIds) {
        const order = await this.getOrder(orderId.toString());
        if (order) {
          orders.push(order);
        }
      }

      return orders;
    } catch (error) {
      console.error('Failed to fetch seller orders:', error);
      return [];
    }
  }

  // ============================================================
  // 订单执行
  // ============================================================

  /**
   * 检查并授权支付代币
   */
  async ensurePaymentApproval(paymentToken: string, amount: string): Promise<boolean> {
    const token = new ethers.Contract(paymentToken, ERC20_ABI, this.signer);
    const swapAddress = getContractAddress('BroadwaySwap', this.chainId);
    const signerAddress = await this.signer.getAddress();
    const amountWei = ethers.parseUnits(amount, 6);

    // 检查授权额度
    const allowance = await token.allowance(signerAddress, swapAddress);
    if (allowance >= amountWei) {
      return true;
    }

    // 执行授权
    const tx = await token.approve(swapAddress, amountWei);
    await tx.wait();
    return true;
  }

  /**
   * 执行交换 (买家调用)
   */
  async executeSwap(orderId: string): Promise<OtcTransactionResult> {
    try {
      // 获取订单信息
      const order = await this.getOrder(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // 确保支付代币已授权
      await this.ensurePaymentApproval(order.paymentToken, order.price);

      // 执行交换
      const tx = await this.swapContract.executeSwap(orderId);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * 取消订单 (卖家调用)
   */
  async cancelOrder(orderId: string): Promise<OtcTransactionResult> {
    try {
      const tx = await this.swapContract.cancelOrder(orderId);
      const receipt = await tx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: message,
      };
    }
  }

  // ============================================================
  // 收益查询 (Demo)
  // ============================================================

  /**
   * 获取预期收益
   *
   * 注意：实际项目中应从收益分配合约或预言机获取
   * 这里返回 Demo 数据
   */
  async getExpectedRevenue(tokenId: number): Promise<ExpectedRevenue> {
    const asset = DEMO_RWA_ASSETS.find(a => a.tokenId === tokenId);
    if (asset) {
      return asset.expectedRevenue;
    }
    return { weekly: 0, annualized: 0 };
  }

  /**
   * 计算按份额的预期收益
   */
  calculateRevenueForShares(
    expectedRevenue: ExpectedRevenue,
    shares: number,
    totalShares: number
  ): ExpectedRevenue {
    const ratio = shares / totalShares;
    return {
      weekly: expectedRevenue.weekly * ratio,
      annualized: expectedRevenue.annualized * ratio,
    };
  }

  // ============================================================
  // 链接生成
  // ============================================================

  /**
   * 生成分享链接
   */
  generateShareLinks(orderId: string): ShareLink {
    const config = getOtcConfig(this.chainId);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mobazha.com';

    return {
      webUrl: `${baseUrl}/rwa-otc/${orderId}`,
      telegramUrl: `https://t.me/${config.telegramBotUsername}/app?startapp=rwa_${orderId}`,
    };
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 格式化地址
   */
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * 获取区块浏览器链接
   */
  getExplorerLink(txHash: string): string {
    const config = getOtcConfig(this.chainId);
    return `${config.blockExplorerUrl}/tx/${txHash}`;
  }

  /**
   * 格式化货币金额
   */
  formatCurrency(amount: number, symbol: string = 'USDT'): string {
    return `${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${symbol}`;
  }
}
