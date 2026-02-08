# 外部钱包集成 (Wallet Integration)

## 功能 ID

`FEAT-WALLET-001`

> 版本: 2.0  
> 最后更新: 2026-02-08  
> 状态: 已实现

## 功能描述

Mobazha 支持通过 Reown AppKit（原 Web3Modal）连接外部钱包进行多链支付，不内置发送/接收功能，所有交易通过用户的外部钱包完成。

## 支持的区块链

| 链        | Chain ID | 原生代币 | 状态 |
| --------- | -------- | -------- | ---- |
| Ethereum  | 1        | ETH      | ✅   |
| BSC       | 56       | BNB      | ✅   |
| Polygon   | 137      | MATIC    | ✅   |
| Arbitrum  | 42161    | ETH      | ✅   |
| Optimism  | 10       | ETH      | ✅   |
| Avalanche | 43114    | AVAX     | ✅   |

## 技术实现

### 目录结构

```
packages/core/
├── hooks/
│   └── useWallet.ts            # 钱包 Hook（基于 AppKit）
├── providers/
│   └── AppKitProvider.tsx       # AppKit Context Provider
├── config/
│   └── appkit.ts                # AppKit 配置（链、项目ID）
├── services/
│   └── payment/
│       ├── chains.ts            # 链配置
│       ├── escrow.ts            # 托管合约交互
│       ├── explorers.ts         # 区块浏览器链接
│       ├── solana.ts            # Solana 链支持
│       ├── types.ts             # 钱包类型定义
│       ├── wallet.ts            # 底层钱包服务
│       └── index.ts             # 统一导出
```

### 使用方法

#### 1. 连接钱包

```tsx
import { useWallet } from '@mobazha/core';

function ConnectButton() {
  const { isConnected, connect, disconnect, walletInfo } = useWallet();

  if (isConnected) {
    return (
      <div>
        <p>已连接: {walletInfo?.address}</p>
        <p>链: {walletInfo?.chainName}</p>
        <button onClick={disconnect}>断开连接</button>
      </div>
    );
  }

  return <button onClick={connect}>连接钱包</button>;
}
```

#### 2. 切换链

```tsx
import { useWallet } from '@mobazha/core';

function ChainSwitcher() {
  const { switchChain, walletInfo, getSupportedChains } = useWallet();
  const chains = getSupportedChains();

  return (
    <select value={walletInfo?.chainId} onChange={e => switchChain(Number(e.target.value))}>
      {chains.map(chainId => (
        <option key={chainId} value={chainId}>
          Chain {chainId}
        </option>
      ))}
    </select>
  );
}
```

#### 3. 签名消息

```tsx
import { useWallet } from '@mobazha/core';

function SignButton() {
  const { signMessage, isConnected } = useWallet();

  const handleSign = async () => {
    const signature = await signMessage('Hello Mobazha');
    if (signature) {
      console.log('签名成功:', signature);
    }
  };

  return (
    <button onClick={handleSign} disabled={!isConnected}>
      签名消息
    </button>
  );
}
```

#### 4. 使用 AppKit Modal

```tsx
import { useWallet } from '@mobazha/core';

function WalletMenu() {
  const { openModal, isConnected } = useWallet();

  return (
    <>
      <button onClick={() => openModal({ view: 'Connect' })}>连接钱包</button>
      {isConnected && (
        <>
          <button onClick={() => openModal({ view: 'Account' })}>账户详情</button>
          <button onClick={() => openModal({ view: 'Networks' })}>切换网络</button>
        </>
      )}
    </>
  );
}
```

#### 5. 获取 Provider/Signer（高级用法）

```tsx
import { useWallet } from '@mobazha/core';

function ContractInteraction() {
  const { getSigner, isConnected } = useWallet();

  const callContract = async () => {
    const signer = await getSigner();
    if (!signer) return;
    // 使用 signer 进行合约交互...
  };

  return (
    <button onClick={callContract} disabled={!isConnected}>
      调用合约
    </button>
  );
}
```

### API 参考

#### useWallet Hook

> **注意**: 必须在 `AppKitProvider` 内部使用此 Hook

```typescript
interface UseWalletReturn {
  // 状态
  isConnected: boolean;
  isConnecting: boolean;
  walletInfo: WalletInfo | null;
  connectionState: WalletConnectionState;
  error: Error | null;

  // 方法
  connect: () => Promise<WalletInfo | null>;
  connectWallet: () => Promise<WalletInfo | null>; // connect 的别名
  disconnect: () => Promise<void>;
  switchChain: (chainId: ChainId) => Promise<boolean>;
  refreshBalance: () => Promise<string | null>;
  signMessage: (message: string) => Promise<string | null>;

  // 工具
  getSupportedChains: () => ChainId[];
  getCurrentChainId: () => ChainId | null;
  getCurrentAddress: () => string | null;

  // AppKit 扩展
  openModal: (options?: { view?: 'Connect' | 'Account' | 'Networks' }) => Promise<void>;
  getProvider: () => BrowserProvider | null;
  getSigner: () => Promise<JsonRpcSigner | null>;
}

interface WalletInfo {
  address: string;
  chainId: ChainId;
  balance: string;
  provider: string; // 'AppKit'
}

enum WalletConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}
```

### 智能合约

#### 托管合约 (Escrow)

托管合约交互位于 `packages/core/services/payment/escrow.ts`，独立于 `useWallet` Hook。
使用时需通过 `useWallet` 获取 `getSigner()` 后传递给 escrow 服务：

```typescript
import { useWallet } from '@mobazha/core';
import { EscrowService } from '@mobazha/core/services/payment';

function EscrowButton() {
  const { getSigner } = useWallet();

  const handleCreateEscrow = async () => {
    const signer = await getSigner();
    if (!signer) return;
    // 使用 signer 调用 escrow 服务
    // EscrowService 的具体 API 参见 packages/core/services/payment/escrow.ts
  };
}
```

## 支持的钱包

通过 Reown AppKit（原 Web3Modal）支持以下钱包：

- MetaMask
- WalletConnect (移动钱包)
- Coinbase Wallet
- Trust Wallet
- Rainbow
- 更多...

## 配置

### 环境变量

```env
# Reown AppKit Project ID (从 cloud.reown.com 获取)
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id

# 合约地址
NEXT_PUBLIC_ESCROW_CONTRACT_ETH=0x...
NEXT_PUBLIC_ESCROW_CONTRACT_BSC=0x...
NEXT_PUBLIC_ESCROW_CONTRACT_POLYGON=0x...
```

## 安全注意事项

1. **私钥安全**: 不存储用户私钥，所有签名在用户钱包中完成
2. **交易确认**: 所有交易需要用户在钱包中确认
3. **链验证**: 交易前验证当前链是否正确
4. **金额验证**: 验证用户余额是否足够

## 错误处理

```typescript
const { connect, error, connectionState } = useWallet();

// 方式1：检查返回值
const result = await connect();
if (!result) {
  console.error('连接失败:', error);
}

// 方式2：检查 connectionState
if (connectionState === WalletConnectionState.ERROR) {
  console.error('钱包错误:', error?.message);
}

// 方式3：switchChain 返回布尔值
const success = await switchChain(56); // BSC
if (!success) {
  console.error('切换链失败');
}
```

> **注意**: `useWallet` 的方法不会抛出异常，而是通过返回值和 `error` 状态来报告错误。

## 迁移检查清单

- [x] Reown AppKit 集成（替代 Web3Modal）
- [x] 多链支持 (6 条链)
- [x] useWallet Hook（基于 AppKit）
- [x] AppKitProvider Context
- [x] 钱包连接/断开
- [x] 链切换
- [x] 消息签名
- [x] 余额刷新
- [x] Provider/Signer 获取
- [x] AppKit Modal 集成
- [x] 托管合约服务（escrow.ts）
- [x] 错误状态管理（通过 error + connectionState）
- [x] Solana 链支持

## 相关文档

- [结算流程](./checkout.md)
- [订单管理](./orders.md)
- [迁移状态](../migrations/status.md)
