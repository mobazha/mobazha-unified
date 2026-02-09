---
name: security-guide
description: Comprehensive security development guide for Mobazha decentralized marketplace covering XSS prevention, Web3 transaction safety, key management, and input validation. Use when working with user input, wallet operations, transactions, or security-sensitive features, "安全", "XSS", "注入", "钱包安全", "合约安全", "密钥管理".
---

# 安全开发指南

Mobazha 去中心化市场的安全开发规范和最佳实践。

## 项目安全现状

项目已有的安全基础设施：

- `packages/core/utils/htmlUtils.ts` — DOMPurify HTML 清理
- `packages/core/services/api/wallet.ts` — 地址验证 API
- `bignumber.js` — 精确金额计算
- ethers.js v6 — 地址规范化和签名
- 外部钱包 Provider — 私钥永不暴露给前端

## 一、XSS 防护

### 1.1 HTML 内容处理

**唯一允许的方式**：使用项目已有的 `sanitizeHtml()`：

```typescript
import { sanitizeHtml, stripHtmlTags } from '@mobazha/core';

// 需要渲染 HTML 时（商品描述、店铺介绍）
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }} />

// 只需要纯文本时
const plainText = stripHtmlTags(htmlContent);
```

**配置说明**（`htmlUtils.ts`）：

- 允许的标签：`h1-h6, p, a, img, ul, ol, li, blockquote, code, pre, br, hr, strong, em, span, div, table, tr, td, th`
- 自动为 `<a>` 添加 `target="_blank" rel="noopener noreferrer nofollow"`
- 移除所有 `<script>`, `<iframe>`, `<object>`, `<embed>`, `on*` 事件属性

### 1.2 URL 处理

```typescript
// ❌ 危险
window.location.href = userInput;
<a href={userInput}>链接</a>

// ✅ 安全
const safeUrl = new URL(userInput, window.location.origin);
if (safeUrl.protocol === 'https:' || safeUrl.protocol === 'http:') {
  // 允许导航
}
```

## 二、Web3 交易安全

### 2.1 交易发送检查清单

每次发送链上交易前，必须验证：

```typescript
// 1. 钱包已连接
if (!walletProvider) throw new Error('钱包未连接');

// 2. 链正确
const currentChainId = await provider.getNetwork().then(n => n.chainId);
if (currentChainId !== expectedChainId) {
  await switchNetwork(expectedChain);
}

// 3. 余额充足（含 gas）
const balance = await provider.getBalance(address);
const gasEstimate = await contract.method.estimateGas(...args);
const gasPrice = await provider.getFeeData();
const totalCost = amount + gasEstimate * gasPrice.maxFeePerGas;
if (balance < totalCost) throw new Error('余额不足');

// 4. 参数验证
const validAddress = ethers.getAddress(recipientAddress); // 会抛异常如果无效
```

### 2.2 Escrow 安全模式

项目的 Escrow 服务（`packages/core/services/payment/escrow.ts`）遵循：

```typescript
// 创建 Escrow — 必须验证
async createNativeEscrow(params: EscrowParams) {
  // ✅ 地址规范化
  const seller = ethers.getAddress(params.sellerAddress);
  const moderator = ethers.getAddress(params.moderatorAddress);

  // ✅ Gas 预估
  const gasEstimate = await contract.createEscrow.estimateGas(...);

  // ✅ 交易确认（UI 层面必须二次确认）
  const tx = await contract.createEscrow(...);
  const receipt = await tx.wait(); // 等待链上确认

  return receipt;
}
```

### 2.3 签名安全

```typescript
// ✅ 使用 EIP-712 结构化签名（用户可以看到签名内容）
const signature = await signer.signTypedData(domain, types, value);

// ⚠️ 避免盲签（用户无法理解签名内容）
// 仅在无法使用 EIP-712 时才使用 personal_sign
const signature = await signer.signMessage(message);
```

## 三、金额安全

### 3.1 必须使用 BigNumber

```typescript
import BigNumber from 'bignumber.js';

// ✅ 所有金额计算使用 BigNumber
const total = new BigNumber(price).times(quantity);
const fee = total.times(0.01).decimalPlaces(8, BigNumber.ROUND_HALF_UP);

// ✅ 链上金额转换
import { toMinimalUnit, fromMinimalUnit } from '@mobazha/core';
const wei = toMinimalUnit(amount, decimals); // 用户金额 → 链上最小单位
const display = fromMinimalUnit(wei, decimals); // 链上最小单位 → 显示金额
```

### 3.2 精度陷阱

```typescript
// ❌ 浮点运算精度丢失
0.1 + 0.2; // 0.30000000000000004

// ❌ toFixed 用于计算
parseFloat((0.1 + 0.2).toFixed(2)); // 可能不精确

// ✅ BigNumber 全程处理
new BigNumber('0.1').plus('0.2').toString(); // "0.3"
```

## 四、密钥与认证

### 4.1 绝对禁止

```typescript
// ❌ 绝对禁止
localStorage.setItem('privateKey', key);
localStorage.setItem('mnemonic', phrase);
console.log('Token:', accessToken);
const API_KEY = 'sk-xxxxx'; // 硬编码密钥

// ✅ 敏感操作通过后端 API
const mnemonic = await walletApi.getMnemonic(); // 需要认证
await walletApi.restoreWallet(mnemonic); // 立即使用，不存储
```

### 4.2 允许存储的数据

| 数据类型     | 存储位置                       | 示例                    |
| ------------ | ------------------------------ | ----------------------- |
| 主题偏好     | localStorage                   | `mobazha-theme`         |
| 购物车       | localStorage (Zustand persist) | `mobazha-cart-storage`  |
| UI 状态      | localStorage/sessionStorage    | `pwa-install-dismissed` |
| 用户 session | Cookie (httpOnly, 后端设置)    | —                       |
| 私钥/助记词  | ❌ 禁止前端存储                | —                       |

## 五、输入验证速查

| 输入类型  | 验证方式                                                  |
| --------- | --------------------------------------------------------- |
| 链上地址  | `ethers.getAddress(addr)` + `walletApi.validateAddress()` |
| 金额      | `!isNaN()` + `> 0` + `<= balance` + BigNumber 精度        |
| 商品价格  | `parseFloat(price) > 0` + BigNumber                       |
| HTML 内容 | `sanitizeHtml()`                                          |
| URL       | `new URL()` + 协议白名单                                  |
| 搜索输入  | 长度限制 + 特殊字符转义                                   |

## 六、后端安全（Go / Solidity）

### 6.1 Go 后端安全（mobazha_hosting / mobazha3.0 / mobazha.info）

```go
// ❌ SQL 注入风险
query := fmt.Sprintf("SELECT * FROM users WHERE name = '%s'", userInput)

// ✅ 参数化查询
query := "SELECT * FROM users WHERE name = $1"
db.Query(query, userInput)
```

```go
// ❌ 日志泄露敏感数据
log.Printf("User mnemonic: %s, token: %s", mnemonic, token)

// ✅ 日志脱敏
log.Printf("User authenticated: peerID=%s", peerID)
```

**Go 后端安全要点**：

- 使用参数化查询或 SQLC（mobazha.info）防止 SQL 注入
- JWT 中间件验证所有认证路由（mobazha_hosting `api/gateway.go`）
- 日志禁止输出：私钥、助记词、JWT token、用户密码
- 文件路径操作使用 `filepath.Clean()` 防止路径遍历
- HTTP handler 必须设置合理的 `MaxBytesReader` 限制请求体大小

### 6.2 智能合约安全（bsc-smart-contracts）

```solidity
// ❌ 重入攻击风险
function withdraw(uint amount) external {
    payable(msg.sender).transfer(amount);  // 外部调用在状态变更前
    balances[msg.sender] -= amount;
}

// ✅ Checks-Effects-Interactions 模式
function withdraw(uint amount) external nonReentrant {
    require(balances[msg.sender] >= amount, "Insufficient");
    balances[msg.sender] -= amount;  // 先变更状态
    payable(msg.sender).transfer(amount);  // 后外部调用
}
```

**合约安全要点**：

- 使用 OpenZeppelin `ReentrancyGuard` 防止重入攻击
- 所有数学运算使用 Solidity 0.8+ 内置溢出检查
- Escrow 合约安全规范见 `bsc-smart-contracts/contracts/escrow/EscrowSpec.md`
- 部署前必须通过完整测试套件：`npx hardhat test`

## 安全审查清单

### 前端

- [ ] 用户输入的 HTML 是否经过 `sanitizeHtml()` ？
- [ ] 金额计算是否使用 BigNumber？
- [ ] 链上交易是否先做 gas 估算？
- [ ] 敏感数据是否只在内存中处理，不持久化？
- [ ] 合约调用是否有 try/catch？
- [ ] 钱包操作前是否检查了连接状态和链 ID？

### 后端 (Go)

- [ ] 数据库查询是否使用参数化查询？
- [ ] 认证路由是否经过 JWT 中间件？
- [ ] 日志是否已脱敏（无密钥、token 泄露）？
- [ ] 文件路径是否使用 `filepath.Clean()` 处理？

### 智能合约

- [ ] 是否使用 Checks-Effects-Interactions 模式？
- [ ] 是否继承 ReentrancyGuard？
- [ ] 状态变更函数是否 emit 事件？

## 相关功能文档

- **[钱包集成](../../docs/features/wallet-integration.md)** — useWallet 安全注意事项、合约交互模式
- **[账号绑定](../../docs/features/account-binding.md)** — OAuth 多账号绑定、Casdoor 认证流程
- **各后端项目有独立的安全 rules**（`.cursor/rules/` 目录下）
