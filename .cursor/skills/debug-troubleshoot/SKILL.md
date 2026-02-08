---
name: debug-troubleshoot
description: Troubleshooting handbook for common issues in Mobazha development including build errors, Matrix connection issues, wallet problems, and performance debugging. Use when debugging, fixing errors, or troubleshooting issues, "调试", "排障", "排查", "报错", "修复", "debug", "为什么不工作".
---

# 调试与排障手册

Mobazha 项目常见问题的排查流程和解决方案。

## 一、构建与开发环境

### Next.js 缓存问题

**症状**：模块导出错误，但文件确实存在

```bash
# 解决方案：清除 .next 缓存
cd apps/web && rm -rf .next && pnpm dev
```

### Core 包修改后 Web 不生效

**症状**：修改了 `packages/core` 的代码，但 web 没有反映

```bash
# 解决方案：重新构建 core 包
pnpm --filter @mobazha/core build
# 然后重启 web 开发服务器
```

### TypeScript 类型错误

**排查步骤**：

```bash
# 1. 全局类型检查
pnpm typecheck

# 2. 单包检查
cd packages/core && pnpm exec tsc --noEmit

# 3. 如果是依赖类型问题
rm -rf node_modules/.cache
pnpm install
```

### Turbo 缓存问题

```bash
# 清除 turbo 缓存
rm -rf .turbo/cache
pnpm build
```

### pnpm 依赖问题

```bash
# 完全重装
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

## 二、Matrix 聊天问题

### 连接失败

**排查步骤**：

1. 检查用户是否已登录（Matrix 初始化依赖 peerID）
2. 检查浏览器控制台的 `[MatrixChat]` 标签日志
3. 检查 `_getServerConfig()` 返回值

```typescript
// 手动检查 Matrix 状态
const matrixService = getMatrixService();
console.log('Connected:', matrixService.isConnected());
console.log('Sync state:', matrixService.getSyncState());
```

### 消息解密失败

**症状**：消息显示为"无法解密"

```
排查步骤：
1. 检查 IndexedDB 中的加密数据
   DevTools → Application → IndexedDB → matrix-crypto-*

2. 如果数据损坏，清除并重新初始化
   MatrixService 会自动检测 WASM panic 并恢复
   手动清除：DevTools → Application → IndexedDB → 删除 matrix-crypto-* 数据库
```

### Token 过期

**症状**：突然断线，日志中出现 `M_UNKNOWN_TOKEN`

**原因**：Access token 已过期
**自动恢复**：`useMatrixInit` 监听 `AUTH_REQUIRED` 事件，自动触发 token 刷新
**手动排查**：检查 localStorage 中的 Matrix 凭证

## 三、钱包与交易问题

### 钱包连接失败

**排查步骤**：

```typescript
// 1. 检查是否安装了钱包扩展
if (!window.ethereum) {
  console.error('未检测到钱包扩展');
}

// 2. 检查 AppKit 状态
// DevTools → Console
console.log('AppKit connected:', appKit?.getIsConnected());
console.log('Chain ID:', appKit?.getCaipNetwork()?.id);

// 3. 检查网络是否在支持列表中
// 不支持的网络会自动断开（AppKitProvider 中的逻辑）
```

### 交易失败

| 错误代码                  | 含义             | 解决方案               |
| ------------------------- | ---------------- | ---------------------- |
| `ACTION_REJECTED`         | 用户在钱包中拒绝 | 提示用户重新确认       |
| `INSUFFICIENT_FUNDS`      | 余额不足         | 提示充值，显示所需金额 |
| `UNPREDICTABLE_GAS_LIMIT` | Gas 估算失败     | 检查合约参数是否正确   |
| `NETWORK_ERROR`           | 网络问题         | 重试或切换 RPC         |
| `NONCE_EXPIRED`           | Nonce 冲突       | 等待之前的交易确认     |

### Escrow 问题

```typescript
// 检查 Escrow 状态
const escrowInfo = await escrowService.getEscrowInfo(orderId);
console.log('Escrow state:', escrowInfo);

// 常见问题：
// 1. 合约地址不匹配 → 检查网络是否正确
// 2. 权限不足 → 检查调用者地址是否是参与方
// 3. 状态不允许 → 检查 Escrow 当前状态（如已释放不能再退款）
```

## 四、性能问题

### 页面渲染慢

**排查步骤**：

```typescript
// 1. 使用 React DevTools Profiler
// 安装 React Developer Tools 扩展
// Components → Profiler → 录制

// 2. 检查不必要的重渲染
// React DevTools → Components → 勾选 "Highlight updates"

// 3. 使用项目内置的性能测量
import { performanceMonitor } from '@mobazha/core';

const result = performanceMonitor.measure('suspectedSlowOp', () => {
  return expensiveOperation();
});
```

### 内存泄漏

**常见原因**：

```typescript
// 1. 事件监听未清理
useEffect(() => {
  const handler = () => {
    /* ... */
  };
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler); // ← 必须清理
}, []);

// 2. 定时器未清理
useEffect(() => {
  const timer = setInterval(() => {
    /* ... */
  }, 1000);
  return () => clearInterval(timer); // ← 必须清理
}, []);

// 3. Matrix 事件订阅未清理
useEffect(() => {
  const unsub = events.on(MatrixEvent.MESSAGE, handler);
  return () => unsub(); // ← 必须清理
}, []);
```

### 资源加载慢

```
排查步骤：
1. 分析 Bundle 大小
   在 next.config.js 中启用 @next/bundle-analyzer

2. 检查网络请求
   DevTools → Network → 排序 by Size/Time

3. 检查 Web Vitals
   项目自动收集，查看 performanceMonitor 输出
```

## 五、i18n 问题

### 翻译 key 不显示

**排查步骤**：

```typescript
// 1. 检查 key 是否存在于当前语言包
import { getTranslation } from '@mobazha/core';
console.log(getTranslation('problematic.key')); // 如果返回 key 本身，说明缺失

// 2. 检查是否在 en.ts 中定义了
// rg "problematic" packages/core/i18n/locales/en.ts

// 3. 检查嵌套路径是否正确
// "order.status.completed" 需要 { order: { status: { completed: '...' } } }
```

### 硬编码文本检查

```bash
# 查找可能的硬编码中文
rg "[\u4e00-\u9fff]" apps/web/src/ --include "*.tsx" --include "*.ts"

# 查找可能的硬编码英文（在 JSX 中）
rg ">[A-Z][a-z]+" apps/web/src/ --include "*.tsx"
```

## 六、Vite / Next.js 双模式问题

### Vite 模式启动失败

```bash
# 使用 Vite 模式
pnpm dev:vite

# 常见问题：路由不匹配
# 检查 vite-routes-sync Rule 确保路由同步
```

### 环境变量不生效

```
Next.js: 客户端变量必须以 NEXT_PUBLIC_ 开头
  process.env.NEXT_PUBLIC_API_URL

Vite: 客户端变量必须以 VITE_ 开头
  import.meta.env.VITE_API_URL

项目兼容方案：检查 vite-nextjs-compat Rule
```

## 七、快速诊断命令

```bash
# 全面验证（lint + tsc + test + build）
pnpm validate

# 快速验证（lint + tsc）
pnpm validate:quick

# 查看最近的验证报告
pnpm report

# 检查 Git 状态
git status && git diff --stat

# 检查依赖问题
pnpm why <package-name>

# 清除所有缓存重新开始
rm -rf .next .turbo/cache node_modules/.cache && pnpm dev
```

## 排查流程图

```
问题出现
  ├── 构建/类型错误？
  │   → pnpm validate:quick
  │   → 清除缓存重试
  │
  ├── 运行时错误？
  │   → 检查浏览器 Console
  │   → 检查 ErrorBoundary 是否捕获
  │   → 检查 logger 输出
  │
  ├── 性能问题？
  │   → React Profiler
  │   → performanceMonitor.measure()
  │   → Network 面板
  │
  ├── 钱包/交易？
  │   → 检查钱包连接状态
  │   → 检查网络/链 ID
  │   → 检查 Gas 和余额
  │
  └── 聊天/消息？
      → 检查 Matrix 连接状态
      → 检查 [MatrixChat] 日志
      → 检查加密数据库
```
