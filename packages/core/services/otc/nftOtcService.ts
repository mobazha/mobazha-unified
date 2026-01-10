/**
 * NFT OTC 交易服务
 *
 * 处理 ERC721 NFT 的私密 OTC 交易
 */

import { ethers, type BrowserProvider, type Signer } from 'ethers';
import type {
  NftOrder,
  NftMetadata,
  UserNft,
  CreateNftOrderParams,
  ShareLink,
  OtcTransactionResult,
} from '../../types/otc';
import { getContractAddress, getOtcConfig } from '../../config/otcConfig';

// ABI 片段 - NftOtcSwap
const NFT_OTC_SWAP_ABI = [
  'function createPrivateOrder(address nftContract, uint256 tokenId, address paymentToken, uint256 price, bytes32 privateId) external returns (bytes32 orderId)',
  'function cancelOrder(bytes32 orderId) external',
  'function executeSwap(bytes32 orderId) external',
  'function orders(bytes32 orderId) view returns (address seller, address nftContract, uint256 tokenId, address paymentToken, uint256 price, bytes32 privateId, uint8 status, uint256 createdAt, uint256 completedAt)',
  'function getSellerOrders(address seller) view returns (bytes32[])',
  'function platformFee() view returns (uint256)',
  'event OrderCreated(bytes32 indexed orderId, address indexed seller, address nftContract, uint256 tokenId, address paymentToken, uint256 price)',
  'event SwapExecuted(bytes32 indexed orderId, address indexed seller, address indexed buyer, uint256 tokenId, uint256 price)',
] as const;

// ABI 片段 - ERC721
const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function approve(address to, uint256 tokenId) external',
  'function setApprovalForAll(address operator, bool approved) external',
  'function tokenURI(uint256 tokenId) view returns (string)',
] as const;

// ABI 片段 - ExampleNFT (扩展)
const EXAMPLE_NFT_ABI = [
  ...ERC721_ABI,
  'function tokenMetadata(uint256 tokenId) view returns (string name, string description, string creator, uint256 mintedAt)',
  'function getMetadata(uint256 tokenId) view returns (tuple(string name, string description, string creator, uint256 mintedAt))',
  'function totalSupply() view returns (uint256)',
] as const;

// ABI 片段 - ERC20
const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
] as const;

export class NftOtcService {
  private provider: BrowserProvider;
  private signer: Signer;
  private chainId: number;
  private otcContract: ethers.Contract;

  constructor(provider: BrowserProvider, signer: Signer, chainId: number = 84532) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    const contractAddress = getContractAddress('NftOtcSwap', chainId);
    this.otcContract = new ethers.Contract(contractAddress, NFT_OTC_SWAP_ABI, signer);
  }

  // ============================================================
  // 订单创建
  // ============================================================

  /**
   * 生成私密订单 ID
   */
  generatePrivateId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString();
    return ethers.keccak256(ethers.toUtf8Bytes(timestamp + random));
  }

  /**
   * 检查并授权 NFT
   */
  async ensureNftApproval(nftContract: string, tokenId: number): Promise<boolean> {
    const nft = new ethers.Contract(nftContract, ERC721_ABI, this.signer);
    const otcAddress = getContractAddress('NftOtcSwap', this.chainId);
    const signerAddress = await this.signer.getAddress();

    // 检查是否已授权
    const approvedAddress = await nft.getApproved(tokenId);
    const isApprovedForAll = await nft.isApprovedForAll(signerAddress, otcAddress);

    if (approvedAddress.toLowerCase() === otcAddress.toLowerCase() || isApprovedForAll) {
      return true;
    }

    // 执行授权
    const tx = await nft.approve(otcAddress, tokenId);
    await tx.wait();
    return true;
  }

  /**
   * 创建私密订单
   */
  async createPrivateOrder(params: CreateNftOrderParams): Promise<OtcTransactionResult> {
    try {
      const { nftContract, tokenId, price, paymentToken } = params;

      // 确保 NFT 已授权
      await this.ensureNftApproval(nftContract, tokenId);

      // 生成私密 ID
      const privateId = this.generatePrivateId();

      // 转换价格 (假设 6 位小数)
      const priceWei = ethers.parseUnits(price.toString(), 6);

      // 创建订单
      const tx = await this.otcContract.createPrivateOrder(
        nftContract,
        tokenId,
        paymentToken,
        priceWei,
        privateId
      );
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
  // 订单查询
  // ============================================================

  /**
   * 通过私密 ID 获取订单
   */
  async getOrderByPrivateId(privateId: string): Promise<NftOrder | null> {
    try {
      const order = await this.otcContract.orders(privateId);

      // 检查订单是否存在 (createdAt > 0)
      if (order.createdAt === BigInt(0)) {
        return null;
      }

      return {
        orderId: privateId,
        seller: order.seller,
        nftContract: order.nftContract,
        tokenId: Number(order.tokenId),
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
  async getSellerOrders(sellerAddress: string): Promise<NftOrder[]> {
    try {
      const orderIds = await this.otcContract.getSellerOrders(sellerAddress);
      const orders: NftOrder[] = [];

      for (const orderId of orderIds) {
        const order = await this.getOrderByPrivateId(orderId);
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
    const otcAddress = getContractAddress('NftOtcSwap', this.chainId);
    const signerAddress = await this.signer.getAddress();
    const amountWei = ethers.parseUnits(amount, 6);

    // 检查授权额度
    const allowance = await token.allowance(signerAddress, otcAddress);
    if (allowance >= amountWei) {
      return true;
    }

    // 执行授权
    const tx = await token.approve(otcAddress, amountWei);
    await tx.wait();
    return true;
  }

  /**
   * 执行交换 (买家调用)
   */
  async executeSwap(orderId: string): Promise<OtcTransactionResult> {
    try {
      // 获取订单信息
      const order = await this.getOrderByPrivateId(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // 确保支付代币已授权
      await this.ensurePaymentApproval(order.paymentToken, order.price);

      // 执行交换
      const tx = await this.otcContract.executeSwap(orderId);
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
      const tx = await this.otcContract.cancelOrder(orderId);
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
  // NFT 信息查询
  // ============================================================

  /**
   * 获取 NFT 元数据
   */
  async getNftMetadata(nftContract: string, tokenId: number): Promise<NftMetadata | null> {
    try {
      const nft = new ethers.Contract(nftContract, EXAMPLE_NFT_ABI, this.provider);

      // 尝试获取自定义元数据
      try {
        const metadata = await nft.getMetadata(tokenId);
        return {
          name: metadata.name,
          description: metadata.description,
          creator: metadata.creator,
          mintedAt: Number(metadata.mintedAt),
        };
      } catch {
        // 回退到 tokenURI
        const tokenURI = await nft.tokenURI(tokenId);
        return {
          name: `Token #${tokenId}`,
          description: '',
          creator: '',
          mintedAt: 0,
          tokenURI,
        };
      }
    } catch (error) {
      console.error('Failed to fetch NFT metadata:', error);
      return null;
    }
  }

  /**
   * 获取用户持有的 NFT 列表
   */
  async getUserNfts(_userAddress: string, nftContract: string): Promise<UserNft[]> {
    // 注意：标准 ERC721 没有枚举接口，这里返回 Demo 数据
    // 实际项目中应使用 Subgraph 或 NFT API
    const { DEMO_NFTS } = await import('../../config/otcConfig');

    return DEMO_NFTS.filter(
      nft => nft.contractAddress.toLowerCase() === nftContract.toLowerCase()
    ).map(nft => ({
      tokenId: nft.tokenId,
      contractAddress: nft.contractAddress,
      metadata: {
        name: nft.name,
        description: nft.description,
        creator: nft.creator,
        mintedAt: 0,
        image: nft.image,
      },
    }));
  }

  // ============================================================
  // 链接生成
  // ============================================================

  /**
   * 生成分享链接
   */
  generateShareLinks(privateId: string): ShareLink {
    const config = getOtcConfig(this.chainId);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://mobazha.com';

    return {
      webUrl: `${baseUrl}/otc/${privateId}`,
      telegramUrl: `https://t.me/${config.telegramBotUsername}/app?startapp=otc_${privateId}`,
    };
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 格式化地址 (缩短显示)
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
   * 获取合约地址浏览器链接
   */
  getContractExplorerLink(contractAddress: string): string {
    const config = getOtcConfig(this.chainId);
    return `${config.blockExplorerUrl}/address/${contractAddress}`;
  }
}
