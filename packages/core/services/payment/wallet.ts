/**
 * External Wallet Service
 * 外部钱包连接服务
 */

import { BrowserProvider, JsonRpcSigner, formatEther } from 'ethers';
import {
  ChainId,
  WalletConnectionState,
  WalletInfo,
  WalletEvent,
  WalletServiceConfig,
  WalletEventCallback,
} from './types';
import { CHAIN_CONFIG, chainIdToHex, hexToChainId, isValidChainId } from './chains';

// ethereum 对象类型 (本地使用，避免全局类型冲突)
interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isTokenPocket?: boolean;
  isBraveWallet?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

// 默认配置
const DEFAULT_CONFIG: WalletServiceConfig = {
  projectId: '', // Optional external connector project ID.
  supportedChains: [ChainId.ETHEREUM, ChainId.BSC, ChainId.POLYGON, ChainId.ARBITRUM],
  defaultChain: ChainId.ETHEREUM,
  autoConnect: true,
};

// 钱包服务类
class WalletService {
  private config: WalletServiceConfig;
  private provider: BrowserProvider | null = null;
  private signer: JsonRpcSigner | null = null;
  private state: WalletConnectionState = WalletConnectionState.DISCONNECTED;
  private walletInfo: WalletInfo | null = null;
  private eventListeners: Map<WalletEvent, Set<WalletEventCallback>> = new Map();

  constructor(config: Partial<WalletServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initEventListeners();
  }

  // 初始化事件监听
  private initEventListeners(): void {
    Object.values(WalletEvent).forEach(event => {
      this.eventListeners.set(event, new Set());
    });
  }

  // 检查是否有以太坊提供者
  private hasEthereumProvider(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  // 获取以太坊提供者
  private getEthereumProvider(): BrowserProvider | null {
    if (!this.hasEthereumProvider() || !window.ethereum) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new BrowserProvider(window.ethereum as any);
  }

  // 连接钱包
  async connect(): Promise<WalletInfo | null> {
    if (!this.hasEthereumProvider()) {
      this.emit(WalletEvent.ERROR, {
        code: 'NO_PROVIDER',
        message: '未检测到以太坊钱包，请安装 MetaMask 或其他钱包',
      });
      return null;
    }

    try {
      this.state = WalletConnectionState.CONNECTING;
      this.provider = this.getEthereumProvider();

      if (!this.provider) {
        throw new Error('无法创建 Provider');
      }

      // 请求账户访问
      const accounts = await this.provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('用户拒绝连接');
      }

      // 获取 signer
      this.signer = await this.provider.getSigner();
      const address = await this.signer.getAddress();

      // 获取链 ID
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);

      // 获取余额
      const balance = await this.provider.getBalance(address);

      // 更新钱包信息
      this.walletInfo = {
        address,
        chainId: chainId as ChainId,
        balance: formatEther(balance),
        provider: this.detectProviderName(),
      };

      this.state = WalletConnectionState.CONNECTED;
      this.emit(WalletEvent.CONNECTED, this.walletInfo);

      // 设置事件监听
      this.setupProviderListeners();

      return this.walletInfo;
    } catch (error) {
      this.state = WalletConnectionState.ERROR;
      this.emit(WalletEvent.ERROR, error);
      return null;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.walletInfo = null;
    this.state = WalletConnectionState.DISCONNECTED;
    this.removeProviderListeners();
    this.emit(WalletEvent.DISCONNECTED, null);
  }

  // 切换链
  async switchChain(chainId: ChainId): Promise<boolean> {
    if (!this.hasEthereumProvider() || !window.ethereum) {
      return false;
    }

    const chainConfig = CHAIN_CONFIG[chainId];
    if (!chainConfig) {
      this.emit(WalletEvent.ERROR, {
        code: 'INVALID_CHAIN',
        message: `不支持的链: ${chainId}`,
      });
      return false;
    }

    const ethereum = window.ethereum as unknown as EthereumProvider;

    try {
      // 尝试切换链
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdToHex(chainId) }],
      });
      return true;
    } catch (switchError: unknown) {
      // 如果链不存在，尝试添加
      const error = switchError as { code?: number };
      if (error.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdToHex(chainId),
                chainName: chainConfig.name,
                nativeCurrency: chainConfig.nativeCurrency,
                rpcUrls: chainConfig.rpcUrls,
                blockExplorerUrls: chainConfig.blockExplorerUrls,
              },
            ],
          });
          return true;
        } catch {
          this.emit(WalletEvent.ERROR, {
            code: 'ADD_CHAIN_FAILED',
            message: `添加链失败: ${chainConfig.name}`,
          });
          return false;
        }
      }
      this.emit(WalletEvent.ERROR, switchError);
      return false;
    }
  }

  // 检测钱包提供者名称
  private detectProviderName(): string {
    if (!this.hasEthereumProvider() || !window.ethereum) return 'Unknown';

    const ethereum = window.ethereum as unknown as EthereumProvider;
    if (ethereum.isMetaMask) return 'MetaMask';
    if (ethereum.isCoinbaseWallet) return 'Coinbase Wallet';
    if (ethereum.isTrust) return 'Trust Wallet';
    if (ethereum.isTokenPocket) return 'TokenPocket';
    if (ethereum.isBraveWallet) return 'Brave Wallet';
    return 'Unknown';
  }

  // 设置提供者事件监听
  private setupProviderListeners(): void {
    const ethereum = this.hasEthereumProvider()
      ? (window.ethereum as unknown as EthereumProvider)
      : null;
    if (!ethereum) return;

    ethereum.on('accountsChanged', this.handleAccountsChanged as (...args: unknown[]) => void);
    ethereum.on('chainChanged', this.handleChainChanged as (...args: unknown[]) => void);
    ethereum.on('disconnect', this.handleDisconnect as (...args: unknown[]) => void);
  }

  // 移除提供者事件监听
  private removeProviderListeners(): void {
    const ethereum = this.hasEthereumProvider()
      ? (window.ethereum as unknown as EthereumProvider)
      : null;
    if (!ethereum) return;

    ethereum.removeListener(
      'accountsChanged',
      this.handleAccountsChanged as (...args: unknown[]) => void
    );
    ethereum.removeListener(
      'chainChanged',
      this.handleChainChanged as (...args: unknown[]) => void
    );
    ethereum.removeListener('disconnect', this.handleDisconnect as (...args: unknown[]) => void);
  }

  // 处理账户变更
  private handleAccountsChanged = async (accounts: string[]): Promise<void> => {
    if (accounts.length === 0) {
      await this.disconnect();
      return;
    }

    if (this.walletInfo && accounts[0] !== this.walletInfo.address) {
      // 更新钱包信息
      const balance = this.provider ? await this.provider.getBalance(accounts[0]) : BigInt(0);

      this.walletInfo = {
        ...this.walletInfo,
        address: accounts[0],
        balance: formatEther(balance),
      };

      this.emit(WalletEvent.ACCOUNT_CHANGED, this.walletInfo);
    }
  };

  // 处理链变更
  private handleChainChanged = async (chainIdHex: string): Promise<void> => {
    const chainId = hexToChainId(chainIdHex);

    if (this.walletInfo) {
      // 获取新余额
      const balance = this.provider
        ? await this.provider.getBalance(this.walletInfo.address)
        : BigInt(0);

      this.walletInfo = {
        ...this.walletInfo,
        chainId: isValidChainId(chainId) ? chainId : this.walletInfo.chainId,
        balance: formatEther(balance),
      };

      this.emit(WalletEvent.CHAIN_CHANGED, this.walletInfo);
    }
  };

  // 处理断开连接
  private handleDisconnect = (): void => {
    this.disconnect();
  };

  // 发送事件
  private emit(event: WalletEvent, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // 添加事件监听器
  on(event: WalletEvent, callback: WalletEventCallback): () => void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
    return () => this.off(event, callback);
  }

  // 移除事件监听器
  off(event: WalletEvent, callback: WalletEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // 获取当前状态
  getState(): WalletConnectionState {
    return this.state;
  }

  // 获取钱包信息
  getWalletInfo(): WalletInfo | null {
    return this.walletInfo;
  }

  // 获取 Provider
  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  // 获取 Signer
  getSigner(): JsonRpcSigner | null {
    return this.signer;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.state === WalletConnectionState.CONNECTED;
  }

  // 获取当前链 ID
  getCurrentChainId(): ChainId | null {
    return this.walletInfo?.chainId || null;
  }

  // 获取当前地址
  getCurrentAddress(): string | null {
    return this.walletInfo?.address || null;
  }

  // 刷新余额
  async refreshBalance(): Promise<string | null> {
    if (!this.provider || !this.walletInfo) return null;

    try {
      const balance = await this.provider.getBalance(this.walletInfo.address);
      this.walletInfo.balance = formatEther(balance);
      return this.walletInfo.balance;
    } catch {
      return null;
    }
  }

  // 获取支持的链
  getSupportedChains(): ChainId[] {
    return this.config.supportedChains;
  }

  // 签名消息
  async signMessage(message: string): Promise<string | null> {
    if (!this.signer) return null;

    try {
      return await this.signer.signMessage(message);
    } catch {
      this.emit(WalletEvent.ERROR, {
        code: 'SIGN_FAILED',
        message: '签名失败',
      });
      return null;
    }
  }

  // 签名类型化数据 (EIP-712)
  async signTypedData(
    domain: object,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: object
  ): Promise<string | null> {
    if (!this.signer) return null;

    try {
      return await this.signer.signTypedData(domain, types, value);
    } catch {
      this.emit(WalletEvent.ERROR, {
        code: 'SIGN_TYPED_DATA_FAILED',
        message: '签名类型化数据失败',
      });
      return null;
    }
  }
}

// 创建单例实例
let walletServiceInstance: WalletService | null = null;

export function getWalletService(config?: Partial<WalletServiceConfig>): WalletService {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService(config);
  }
  return walletServiceInstance;
}

export function resetWalletService(): void {
  if (walletServiceInstance) {
    walletServiceInstance.disconnect();
    walletServiceInstance = null;
  }
}

// 获取 ethereum provider (类型安全)
function getEthereumProvider(): EthereumProvider | null {
  if (typeof window !== 'undefined' && window.ethereum) {
    return window.ethereum as unknown as EthereumProvider;
  }
  return null;
}

export { WalletService, getEthereumProvider, type EthereumProvider };
