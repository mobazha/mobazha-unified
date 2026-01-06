# 外部钱包集成 (Wallet Integration)

## 功能 ID

`FEAT-WALLET-001`

## 功能描述

Mobazha 支持通过 Web3Modal 连接外部钱包进行多链支付，不内置发送/接收功能，所有交易通过用户的外部钱包完成。

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
│   └── useWallet.ts        # 钱包 Hook
├── services/
│   └── wallet/
│       ├── chains.ts       # 链配置
│       ├── contracts.ts    # 智能合约交互
│       └── index.ts        # 导出
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
  const { switchChain, walletInfo, supportedChains } = useWallet();

  return (
    <select value={walletInfo?.chainId} onChange={e => switchChain(Number(e.target.value))}>
      {supportedChains.map(chain => (
        <option key={chain.id} value={chain.id}>
          {chain.name}
        </option>
      ))}
    </select>
  );
}
```

#### 3. 支付

```tsx
import { useWallet } from '@mobazha/core';

function PaymentButton({ amount, recipient }) {
  const { sendTransaction, isProcessing } = useWallet();

  const handlePay = async () => {
    try {
      const txHash = await sendTransaction({
        to: recipient,
        value: amount,
      });
      console.log('交易成功:', txHash);
    } catch (error) {
      console.error('交易失败:', error);
    }
  };

  return (
    <button onClick={handlePay} disabled={isProcessing}>
      {isProcessing ? '处理中...' : `支付 ${amount}`}
    </button>
  );
}
```

### API 参考

#### useWallet Hook

```typescript
interface UseWalletReturn {
  // 连接状态
  isConnected: boolean;
  isConnecting: boolean;
  isProcessing: boolean;

  // 钱包信息
  walletInfo: WalletInfo | null;

  // 操作
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;

  // 交易
  sendTransaction: (tx: TransactionRequest) => Promise<string>;
  signMessage: (message: string) => Promise<string>;

  // 合约交互
  createEscrow: (params: EscrowParams) => Promise<string>;
  releaseEscrow: (escrowId: string) => Promise<string>;
  refundEscrow: (escrowId: string) => Promise<string>;

  // 链信息
  supportedChains: ChainInfo[];
  currentChainInfo: ChainInfo | null;
}

interface WalletInfo {
  address: string;
  chainId: number;
  chainName: string;
  balance: string;
}
```

### 智能合约

#### 托管合约 (Escrow)

托管合约用于安全的买卖交易：

```typescript
// 创建托管
const escrowId = await createEscrow({
  seller: '0x...',
  amount: '1.0',
  token: 'ETH', // 或 ERC20 代币地址
  timeout: 86400 * 7, // 7 天超时
});

// 释放资金（买家确认收货）
await releaseEscrow(escrowId);

// 退款（争议解决）
await refundEscrow(escrowId);
```

## 支持的钱包

通过 Web3Modal 支持以下钱包：

- MetaMask
- WalletConnect (移动钱包)
- Coinbase Wallet
- Trust Wallet
- Rainbow
- 更多...

## 配置

### 环境变量

```env
# Web3Modal Project ID (从 walletconnect.com 获取)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

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
try {
  await sendTransaction({ ... });
} catch (error) {
  if (error.code === 'USER_REJECTED') {
    // 用户拒绝交易
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    // 余额不足
  } else if (error.code === 'CHAIN_NOT_SUPPORTED') {
    // 链不支持
  }
}
```

## 迁移检查清单

- [x] Web3Modal 集成
- [x] 多链支持 (6 条链)
- [x] useWallet Hook
- [x] 钱包连接/断开
- [x] 链切换
- [x] 交易发送
- [x] 消息签名
- [x] 托管合约交互
- [x] 错误处理

## 相关文档

- [结算流程](./checkout.md)
- [订单管理](./orders.md)
- [迁移状态](../migrations/status.md)
