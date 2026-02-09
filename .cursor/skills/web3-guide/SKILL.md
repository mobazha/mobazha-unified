---
name: web3-guide
description: Guide for Web3/blockchain development in Mobazha including wallet connection (Reown AppKit), ethers.js v6 patterns, Escrow smart contracts, multi-chain support, and RWA tokenization. Use when working with wallets, transactions, smart contracts, or blockchain features, "Web3", "钱包", "合约", "Escrow", "区块链", "交易", "RWA".
---

# Web3 开发指南

Mobazha 去中心化市场的区块链开发规范。

## 技术栈

| 组件     | 技术                                        | 文件位置                                     |
| -------- | ------------------------------------------- | -------------------------------------------- |
| 钱包连接 | Reown AppKit + EthersAdapter                | `packages/core/providers/AppKitProvider.tsx` |
| EVM 交互 | ethers.js v6                                | `packages/core/services/payment/`            |
| Solana   | 原生 Provider                               | `packages/core/services/payment/solana.ts`   |
| 状态管理 | `walletStore`                               | `packages/core/stores/walletStore.ts`        |
| Hooks    | `useWallet`, `useEscrow`, `useSolanaWallet` | `packages/core/hooks/`                       |

## 支持的网络

**EVM 主网**：Ethereum, BSC, Polygon, Arbitrum, Optimism, Avalanche
**EVM 测试网**：Sepolia, BSC Testnet, Mumbai, Arbitrum Sepolia, Optimism Sepolia, Fuji
**Solana**：Mainnet, Devnet

## 钱包连接模式

### AppKit 初始化

```typescript
// packages/core/providers/AppKitProvider.tsx
// 已封装为 React Provider，使用时只需包裹：
<AppKitProvider>
  <App />
</AppKitProvider>
```

### 获取 Provider 和 Signer

```typescript
import { useWallet } from '@mobazha/core';

function PaymentComponent() {
  const {
    address, // 当前钱包地址
    isConnected, // 连接状态
    chainId, // 当前链 ID
    connect, // 连接钱包
    disconnect, // 断开连接
    switchNetwork, // 切换网络
    signMessage, // 签名消息
  } = useWallet();

  // 获取 ethers Provider/Signer
  const provider = new BrowserProvider(walletProvider);
  const signer = await provider.getSigner();
}
```

### 网络切换

```typescript
// AppKit 自动处理网络切换 UI
// 代码层面验证当前网络：
if (chainId !== expectedChainId) {
  await switchNetwork(expectedChain);
  // AppKit 会弹出网络切换提示
}

// 不支持的网络会自动断开连接（AppKitProvider 中已处理）
```

## Escrow 智能合约

### 工作流程

```
买家付款 → Escrow 创建 → 卖家发货 → 买家确认 → Release
                                    ↓
                              买家发起争议 → 仲裁员裁决 → Resolve
```

### 创建 Escrow

```typescript
import { useEscrow } from '@mobazha/core';

const { createEscrow, releaseEscrow, getEscrowInfo } = useEscrow();

// 原生代币 Escrow
await createEscrow({
  orderId: 'order-123',
  sellerAddress: '0x...',
  moderatorAddress: '0x...',
  amount: parseEther('0.1'),
  tokenAddress: null, // null = 原生代币
});

// ERC20 代币 Escrow
await createEscrow({
  orderId: 'order-123',
  sellerAddress: '0x...',
  moderatorAddress: '0x...',
  amount: parseUnits('100', 6), // USDT 6 位精度
  tokenAddress: '0x...USDT',
});
```

### 监听 Escrow 事件

```typescript
// packages/core/services/payment/escrow.ts
const unsubscribe = escrowService.listenToEscrowEvents(orderId, {
  onCreated: event => {
    /* 创建成功 */
  },
  onReleased: event => {
    /* 资金释放 */
  },
  onRefunded: event => {
    /* 退款完成 */
  },
  onDisputeResolved: event => {
    /* 争议解决 */
  },
});

// 清理
return () => unsubscribe();
```

## 交易状态管理

### walletStore 模式

```typescript
// packages/core/stores/walletStore.ts
// 已封装的状态管理：
const {
  balances, // 各币种余额
  isLoading, // 加载状态
  fetchBalances, // 刷新余额
  sendTransaction, // 发送交易
  selectedCoin, // 当前选中币种
} = useWalletStore();
```

### 交易生命周期

```typescript
// 1. 准备阶段
const gasEstimate = await contract.method.estimateGas(...args);

// 2. 发送交易
const tx = await contract.method(...args); // 返回 TransactionResponse

// 3. 等待确认
const receipt = await tx.wait(); // 等待链上确认
if (receipt.status === 0) throw new Error('交易失败');

// 4. 更新 UI
await fetchBalances(); // 刷新余额
```

## RWA (Real World Asset) 相关

项目支持 RWA 代币化，涉及：

- **ERC1155** / **ERC3525** 标准
- `packages/core/services/rwa/` — RWA 服务
- `packages/core/hooks/useRwaAssets.ts` — RWA 资产 hook
- `packages/core/utils/rwaAssetResolver.ts` — 资产解析

### 合约交互模式

```typescript
// rwaBalanceService.ts 中的模式
const contract = new ethers.Contract(
  contractAddress,
  ERC1155_ABI,
  provider // 只读查询用 provider，写操作用 signer
);

const balance = await contract.balanceOf(ownerAddress, tokenId);
```

## 关键注意事项

1. **ethers v6 语法**：项目使用 v6，注意与 v5 的区别
   - `BrowserProvider` 替代 `Web3Provider`
   - `parseEther` / `formatEther` 从 `ethers` 直接导入
   - `BigInt` 替代 `BigNumber`（ethers 层面）

2. **Provider vs Signer**：
   - 只读操作（查询余额、读取合约）→ 使用 Provider
   - 写操作（发送交易、调用合约方法）→ 使用 Signer

3. **Gas 处理**：
   - 始终先 `estimateGas`
   - 考虑 EIP-1559 的 `maxFeePerGas` 和 `maxPriorityFeePerGas`

4. **错误处理**：
   - 用户拒绝交易：`ACTION_REJECTED`
   - 余额不足：`INSUFFICIENT_FUNDS`
   - Gas 不足：`UNPREDICTABLE_GAS_LIMIT`

## 快速检查清单

- [ ] 交易前是否检查钱包连接和正确的链？
- [ ] 是否使用 `estimateGas()` 预估 gas？
- [ ] 合约地址是否使用 `ethers.getAddress()` 规范化？
- [ ] 金额是否正确处理精度（`parseUnits` / `formatUnits`）？
- [ ] 是否有完善的错误处理（用户拒绝、余额不足等）？
- [ ] 事件监听是否在组件卸载时清理？

## 后端智能合约源码（bsc-smart-contracts）

### EVM 合约

| 合约              | 路径                                 | 说明             |
| ----------------- | ------------------------------------ | ---------------- |
| Escrow            | `contracts/escrow/MobazhaEscrow.sol` | 托管合约         |
| EscrowSpec        | `contracts/escrow/EscrowSpec.md`     | Escrow 功能规范  |
| RWA Marketplace   | `contracts/rwa-marketplace/`         | RWA 市场合约     |
| Broadway Token    | `contracts/broadway/`                | 演出票务 RWA     |
| Group Marketplace | `contracts/marketplace/`             | 群组集市验证合约 |
| Deploy Scripts    | `migrations/` + `scripts/`           | 部署脚本         |

### Solana 程序

| 程序   | 路径                             | 说明               |
| ------ | -------------------------------- | ------------------ |
| Escrow | `solana_anchor/programs/escrow/` | Solana Escrow 程序 |
| RWA    | `solana_anchor/programs/rwa/`    | Solana RWA 程序    |
| 测试   | `solana_anchor/tests/`           | Anchor 测试        |

### Go Binding 生成

mobazha3.0 通过 `abigen` 生成 Go binding 与合约交互：

```bash
# 从 ABI 生成 Go binding
abigen --abi=MobazhaEscrow.abi --pkg=escrow --out=escrow.go

# Go binding 位置: mobazha3.0/pkg/contracts/
```

### Go 后端合约交互

mobazha3.0 中的合约调用模式：

```go
// pkg/contracts/ — Go binding 文件
// internal/multiwallet/ — 多链钱包管理，负责签名和发送交易
// pkg/wallet/ — 钱包接口定义
```

## 相关功能文档

- **[钱包集成](../../docs/features/wallet-integration.md)** — useWallet Hook 完整 API、AppKit 配置、Escrow 合约、支持的链列表
- **bsc-smart-contracts** 各合约目录下的 README.md — 合约详细说明
