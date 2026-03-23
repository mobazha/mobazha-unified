# 外部钱包集成 (Wallet Integration)

## 功能 ID

`FEAT-WALLET-001`

> 版本: 2.2  
> 最后更新: 2026-03-23  
> 状态: EVM 已实现 / Solana 代码就绪（待 E2E 测试）

## 功能描述

Mobazha 支持通过 Reown AppKit（原 Web3Modal）连接外部钱包进行多链支付，不内置发送/接收功能，所有交易通过用户的外部钱包完成。

## 支持的区块链

### EVM 链（已实现）

| 链        | Chain ID | 原生代币 | 状态 |
| --------- | -------- | -------- | ---- |
| Ethereum  | 1        | ETH      | ✅   |
| BSC       | 56       | BNB      | ✅   |
| Polygon   | 137      | MATIC    | ✅   |
| Arbitrum  | 42161    | ETH      | ✅   |
| Optimism  | 10       | ETH      | ✅   |
| Avalanche | 43114    | AVAX     | ✅   |

### Solana（移植中）

| 链            | 网络 ID      | 原生代币 | 状态 |
| ------------- | ------------ | -------- | ---- |
| Solana        | mainnet-beta | SOL      | 🔧   |
| Solana Devnet | devnet       | SOL      | 🔧   |

**Solana 当前状态**: `solanaExecutor.ts` 为 stub 实现，`solana.ts` 是手写的 `window.solana` 直连（未使用 `@solana/web3.js`）。正在从 mobazha-mobile 移植已验证的 Solana 支付通路。

**参考实现**: `mobazha-mobile` 中 Solana 支付通路已验证可工作，使用 Reown AppKit + `@reown/appkit-adapter-solana` + `@solana/web3.js`。

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

### EVM（已完成）

- [x] Reown AppKit 集成（替代 Web3Modal）
- [x] 多链支持 (6 条 EVM 链)
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

### Solana 移植（代码就绪，待端到端测试）

- [x] 添加 `@reown/appkit-adapter-solana` + `@solana/web3.js` 依赖
- [x] AppKitProvider 注册 SolanaAdapter + `connectSolana()` 方法
- [x] appkit.ts 添加 Solana 网络配置（solana / solanaDevnet）
- [x] 移植 `convertSolanaGoInstruction()` — Go 指令 → TransactionInstruction 转换 (`utils/solana.ts`)
- [x] 移植 `SolanaTransactionService` — 构建 Transaction + signAndSendTransaction (`solanaExecutor.ts`)
- [x] 替换 `solanaExecutor.ts` stub 为真实实现（模拟 → signAndSendTransaction + 确认轮询）
- [x] 清理 `solana.ts` 中的手写 window.solana 代码（已 deprecated）
- [x] 统一 RPC 端点配置 — `config/rpc.ts`（env 变量驱动，EVM + Solana 统一管理）
- [ ] 端到端支付测试（需要 devnet SOL + 后端 Solana 指令端点可用）
- [ ] 迁移 `useSolanaWallet` hook 到 AppKit（当前无消费者，低优先级）

### Solana 移植参考文件映射

| mobazha-mobile 源                                | mobazha-unified 目标                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| `utils/solana.js`                                | `packages/core/utils/solana.ts`                        |
| `services/solanaTransaction.js`                  | `packages/core/services/transaction/solanaExecutor.ts` |
| `context/AppKitContext.js` (SolanaAdapter)       | `packages/core/providers/AppKitProvider.tsx`           |
| `hooks/useAppKitWallet.js` (getSolanaConnection) | `packages/core/hooks/useWallet.ts`                     |
| `config/appkit.js` (solana networks)             | `packages/core/config/appkit.ts`                       |

### RPC 端点配置

统一 RPC 配置在 `packages/core/config/rpc.ts`，所有链的 RPC 端点集中管理。

**ENV 变量覆盖**（`.env.local` 中设置）：

| ENV 变量                          | 用途             | 默认回退                      |
| --------------------------------- | ---------------- | ----------------------------- |
| `NEXT_PUBLIC_ETH_RPC_URL`         | Ethereum mainnet | `eth.llamarpc.com`            |
| `NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL` | Sepolia testnet  | `publicnode.com`              |
| `NEXT_PUBLIC_BSC_RPC_URL`         | BSC mainnet      | `binance.org`                 |
| `NEXT_PUBLIC_SOL_RPC_URL`         | Solana mainnet   | `api.mainnet-beta.solana.com` |
| `NEXT_PUBLIC_SOL_DEVNET_RPC_URL`  | Solana devnet    | `api.devnet.solana.com`       |

**消费者**：`solanaExecutor.ts`、`rwaBalanceService.ts`、`universalSwapService.ts` 均通过 `config/rpc.ts` 获取 RPC URL。

### Reown AppKit 额度

**Starter 免费套餐**: 500 MAU + 2.5M RPC calls。当前 beta 阶段完全够用。
使用了 `autoInit={false}` 懒加载 + 关闭了 Swaps/Onramp/Email/Socials 等付费增值功能。
MAU 接近 400 时需评估是否升级 Pro 或迁移到 RainbowKit + @solana/wallet-adapter。

## 相关文档

- [结算流程](./checkout.md)
- [订单管理](./orders.md)
- [迁移状态](../migrations/status.md)
