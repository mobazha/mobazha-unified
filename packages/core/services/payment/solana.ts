/**
 * Solana Wallet Service
 * Solana 钱包连接服务
 */

// Solana 网络类型
export type SolanaNetwork = 'mainnet-beta' | 'testnet' | 'devnet';

// Solana 钱包信息
export interface SolanaWalletInfo {
  address: string;
  network: SolanaNetwork;
  balance: string; // SOL 余额
  provider: string; // Phantom, Solflare, etc.
}

// Solana 连接状态
export enum SolanaConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// Solana 钱包事件
export enum SolanaWalletEvent {
  CONNECTED = 'solana:connected',
  DISCONNECTED = 'solana:disconnected',
  ACCOUNT_CHANGED = 'solana:accountChanged',
  ERROR = 'solana:error',
}

// Solana 交易参数
export interface SolanaTransactionParams {
  to: string;
  amount: string; // lamports
  mint?: string; // SPL Token mint address
}

// Solana 交易结果
export interface SolanaTransactionResult {
  signature: string;
  from: string;
  to: string;
  amount: string;
  network: SolanaNetwork;
  status: 'pending' | 'confirmed' | 'failed';
  slot?: number;
}

// Solana 钱包服务配置
export interface SolanaWalletServiceConfig {
  network: SolanaNetwork;
  autoConnect: boolean;
  rpcEndpoint?: string;
}

// Solana 事件回调类型
export type SolanaEventCallback = (data: unknown) => void;

// Solana RPC 端点
export const SOLANA_RPC_ENDPOINTS: Record<SolanaNetwork, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  testnet: 'https://api.testnet.solana.com',
  devnet: 'https://api.devnet.solana.com',
};

// 默认配置
const DEFAULT_CONFIG: SolanaWalletServiceConfig = {
  network: 'mainnet-beta',
  autoConnect: true,
};

// Solana 钱包服务类
class SolanaWalletService {
  private config: SolanaWalletServiceConfig;
  private state: SolanaConnectionState = SolanaConnectionState.DISCONNECTED;
  private walletInfo: SolanaWalletInfo | null = null;
  private eventListeners: Map<SolanaWalletEvent, Set<SolanaEventCallback>> = new Map();
  private publicKey: string | null = null;

  constructor(config: Partial<SolanaWalletServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initEventListeners();
  }

  // 初始化事件监听
  private initEventListeners(): void {
    Object.values(SolanaWalletEvent).forEach(event => {
      this.eventListeners.set(event, new Set());
    });
  }

  // 检查是否有 Solana 钱包
  private hasSolanaProvider(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window.solana || window.phantom?.solana);
  }

  // 获取 Solana 提供者
  private getSolanaProvider(): SolanaProvider | null {
    if (!this.hasSolanaProvider()) return null;
    return window.phantom?.solana || window.solana || null;
  }

  // 检测钱包提供者名称
  private detectProviderName(): string {
    if (typeof window === 'undefined') return 'Unknown';

    if (window.phantom?.solana) return 'Phantom';
    if (window.solflare) return 'Solflare';
    if (window.solana?.isBackpack) return 'Backpack';
    if (window.solana?.isTrust) return 'Trust Wallet';
    if (window.solana) return 'Unknown Solana Wallet';
    return 'Unknown';
  }

  // 连接钱包
  async connect(): Promise<SolanaWalletInfo | null> {
    if (!this.hasSolanaProvider()) {
      this.emit(SolanaWalletEvent.ERROR, {
        code: 'NO_PROVIDER',
        message: '未检测到 Solana 钱包，请安装 Phantom 或其他 Solana 钱包',
      });
      return null;
    }

    try {
      this.state = SolanaConnectionState.CONNECTING;
      const provider = this.getSolanaProvider();

      if (!provider) {
        throw new Error('无法获取 Solana Provider');
      }

      // 请求连接
      const response = await provider.connect();
      this.publicKey = response.publicKey.toString();

      // 获取余额
      const balance = await this.fetchBalance(this.publicKey);

      // 更新钱包信息
      this.walletInfo = {
        address: this.publicKey,
        network: this.config.network,
        balance: balance,
        provider: this.detectProviderName(),
      };

      this.state = SolanaConnectionState.CONNECTED;
      this.emit(SolanaWalletEvent.CONNECTED, this.walletInfo);

      // 设置事件监听
      this.setupProviderListeners(provider);

      return this.walletInfo;
    } catch (error) {
      this.state = SolanaConnectionState.ERROR;
      this.emit(SolanaWalletEvent.ERROR, error);
      return null;
    }
  }

  // 获取余额
  private async fetchBalance(address: string): Promise<string> {
    try {
      const rpcEndpoint =
        this.config.rpcEndpoint || SOLANA_RPC_ENDPOINTS[this.config.network];

      const response = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address],
        }),
      });

      const data = (await response.json()) as { result?: { value: number } };
      const lamports = data.result?.value || 0;
      // 将 lamports 转换为 SOL (1 SOL = 1e9 lamports)
      return (lamports / 1e9).toFixed(9);
    } catch {
      return '0';
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    const provider = this.getSolanaProvider();
    if (provider && provider.disconnect) {
      try {
        await provider.disconnect();
      } catch {
        // 忽略断开连接错误
      }
    }

    this.publicKey = null;
    this.walletInfo = null;
    this.state = SolanaConnectionState.DISCONNECTED;
    this.removeProviderListeners();
    this.emit(SolanaWalletEvent.DISCONNECTED, null);
  }

  // 设置提供者事件监听
  private setupProviderListeners(provider: SolanaProvider): void {
    if (provider.on) {
      provider.on('accountChanged', this.handleAccountChanged as (...args: unknown[]) => void);
      provider.on('disconnect', this.handleDisconnect as (...args: unknown[]) => void);
    }
  }

  // 移除提供者事件监听
  private removeProviderListeners(): void {
    const provider = this.getSolanaProvider();
    if (provider && provider.off) {
      provider.off('accountChanged', this.handleAccountChanged as (...args: unknown[]) => void);
      provider.off('disconnect', this.handleDisconnect as (...args: unknown[]) => void);
    }
  }

  // 处理账户变更
  private handleAccountChanged = async (
    publicKeyArg: unknown
  ): Promise<void> => {
    const publicKey = publicKeyArg as { toString: () => string } | null;
    if (!publicKey) {
      await this.disconnect();
      return;
    }

    const newAddress = publicKey.toString();
    if (this.walletInfo && newAddress !== this.walletInfo.address) {
      const balance = await this.fetchBalance(newAddress);

      this.publicKey = newAddress;
      this.walletInfo = {
        ...this.walletInfo,
        address: newAddress,
        balance: balance,
      };

      this.emit(SolanaWalletEvent.ACCOUNT_CHANGED, this.walletInfo);
    }
  };

  // 处理断开连接
  private handleDisconnect = (): void => {
    this.disconnect();
  };

  // 发送事件
  private emit(event: SolanaWalletEvent, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // 添加事件监听器
  on(event: SolanaWalletEvent, callback: SolanaEventCallback): () => void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
    return () => this.off(event, callback);
  }

  // 移除事件监听器
  off(event: SolanaWalletEvent, callback: SolanaEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // 获取当前状态
  getState(): SolanaConnectionState {
    return this.state;
  }

  // 获取钱包信息
  getWalletInfo(): SolanaWalletInfo | null {
    return this.walletInfo;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.state === SolanaConnectionState.CONNECTED;
  }

  // 获取当前地址
  getCurrentAddress(): string | null {
    return this.publicKey;
  }

  // 刷新余额
  async refreshBalance(): Promise<string | null> {
    if (!this.publicKey) return null;

    try {
      const balance = await this.fetchBalance(this.publicKey);
      if (this.walletInfo) {
        this.walletInfo.balance = balance;
      }
      return balance;
    } catch {
      return null;
    }
  }

  // 获取当前网络
  getNetwork(): SolanaNetwork {
    return this.config.network;
  }

  // 切换网络
  setNetwork(network: SolanaNetwork): void {
    this.config.network = network;
    if (this.walletInfo) {
      this.walletInfo.network = network;
    }
  }

  // 发送 SOL 交易
  async sendTransaction(params: SolanaTransactionParams): Promise<SolanaTransactionResult | null> {
    if (!this.publicKey) {
      this.emit(SolanaWalletEvent.ERROR, {
        code: 'NOT_CONNECTED',
        message: '钱包未连接',
      });
      return null;
    }

    const provider = this.getSolanaProvider();
    if (!provider) {
      this.emit(SolanaWalletEvent.ERROR, {
        code: 'NO_PROVIDER',
        message: '无法获取 Solana Provider',
      });
      return null;
    }

    try {
      // 使用 RPC 创建交易
      const rpcEndpoint =
        this.config.rpcEndpoint || SOLANA_RPC_ENDPOINTS[this.config.network];

      // 获取最新 blockhash
      const blockhashResponse = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getLatestBlockhash',
          params: [],
        }),
      });

      const blockhashData = (await blockhashResponse.json()) as {
        result?: { value: { blockhash: string } };
      };
      const blockhash = blockhashData.result?.value?.blockhash;

      if (!blockhash) {
        throw new Error('无法获取 blockhash');
      }

      // 创建简单的 SOL 转账交易
      // 注意：这里是简化版本，实际使用需要完整的 @solana/web3.js
      const transaction = {
        feePayer: this.publicKey,
        recentBlockhash: blockhash,
        instructions: [
          {
            keys: [
              { pubkey: this.publicKey, isSigner: true, isWritable: true },
              { pubkey: params.to, isSigner: false, isWritable: true },
            ],
            programId: '11111111111111111111111111111111', // System Program
            data: Buffer.from([
              2, 0, 0, 0, // Transfer instruction
              ...this.amountToBytes(params.amount),
            ]),
          },
        ],
      };

      // 使用钱包签名并发送
      if (provider.signAndSendTransaction) {
        const result = await provider.signAndSendTransaction(transaction);
        const signatureStr = typeof result === 'string' ? result : result.signature;

        return {
          signature: signatureStr,
          from: this.publicKey,
          to: params.to,
          amount: params.amount,
          network: this.config.network,
          status: 'pending',
        };
      }

      throw new Error('钱包不支持 signAndSendTransaction');
    } catch (error) {
      this.emit(SolanaWalletEvent.ERROR, {
        code: 'TRANSACTION_FAILED',
        message: '交易失败',
        error,
      });
      return null;
    }
  }

  // 将金额转换为字节数组 (小端序)
  private amountToBytes(amount: string): number[] {
    const lamports = BigInt(amount);
    const bytes: number[] = [];
    let temp = lamports;
    for (let i = 0; i < 8; i++) {
      bytes.push(Number(temp & BigInt(0xff)));
      temp = temp >> BigInt(8);
    }
    return bytes;
  }

  // 签名消息
  async signMessage(message: string): Promise<string | null> {
    if (!this.publicKey) {
      this.emit(SolanaWalletEvent.ERROR, {
        code: 'NOT_CONNECTED',
        message: '钱包未连接',
      });
      return null;
    }

    const provider = this.getSolanaProvider();
    if (!provider || !provider.signMessage) {
      this.emit(SolanaWalletEvent.ERROR, {
        code: 'NOT_SUPPORTED',
        message: '钱包不支持消息签名',
      });
      return null;
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await provider.signMessage(encodedMessage, 'utf8');
      // 将 Uint8Array 转换为 base58 或 hex
      return Buffer.from(signature.signature).toString('base64');
    } catch (error) {
      this.emit(SolanaWalletEvent.ERROR, {
        code: 'SIGN_FAILED',
        message: '签名失败',
        error,
      });
      return null;
    }
  }

  // 获取 SPL Token 余额
  async getTokenBalance(mint: string): Promise<string> {
    if (!this.publicKey) return '0';

    try {
      const rpcEndpoint =
        this.config.rpcEndpoint || SOLANA_RPC_ENDPOINTS[this.config.network];

      const response = await fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            this.publicKey,
            { mint },
            { encoding: 'jsonParsed' },
          ],
        }),
      });

      interface TokenAccountData {
        result?: {
          value: Array<{
            account: {
              data: {
                parsed: {
                  info: {
                    tokenAmount: {
                      uiAmount: number;
                    };
                  };
                };
              };
            };
          }>;
        };
      }

      const data = (await response.json()) as TokenAccountData;
      const accounts = data.result?.value || [];

      if (accounts.length > 0) {
        const balance = accounts[0].account.data.parsed.info.tokenAmount.uiAmount;
        return balance.toString();
      }

      return '0';
    } catch {
      return '0';
    }
  }
}

// 创建单例实例
let solanaServiceInstance: SolanaWalletService | null = null;

export function getSolanaWalletService(
  config?: Partial<SolanaWalletServiceConfig>
): SolanaWalletService {
  if (!solanaServiceInstance) {
    solanaServiceInstance = new SolanaWalletService(config);
  }
  return solanaServiceInstance;
}

export function resetSolanaWalletService(): void {
  if (solanaServiceInstance) {
    solanaServiceInstance.disconnect();
    solanaServiceInstance = null;
  }
}

// Solana Provider 接口
interface SolanaProvider {
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => Promise<void>;
  signMessage?: (
    message: Uint8Array,
    encoding: string
  ) => Promise<{ signature: Uint8Array }>;
  signAndSendTransaction?: (
    transaction: unknown
  ) => Promise<{ signature: string } | string>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  off?: (event: string, handler: (...args: unknown[]) => void) => void;
  isBackpack?: boolean;
  isTrust?: boolean;
}

// 声明全局 Solana 对象
declare global {
  interface Window {
    solana?: SolanaProvider;
    phantom?: {
      solana?: SolanaProvider;
    };
    solflare?: SolanaProvider;
  }
}

export { SolanaWalletService };

