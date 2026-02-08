---
name: error-handling
description: Guide for error handling patterns in Mobazha including ErrorBoundary hierarchy, API error handling, logging strategy, and graceful degradation. Use when adding error handling, working with ErrorBoundary, or implementing fallback UI, "错误处理", "ErrorBoundary", "异常处理", "日志", "错误追踪", "降级".
---

# 错误处理指南

Mobazha 项目的错误处理策略和已有基础设施。

## 已有基础设施

```
packages/core/services/monitoring/
├── errorTracker.ts        # ErrorTrackerService — 错误上报
├── logger.ts              # LoggerService — 日志系统
├── performanceMonitor.ts  # 性能监控
└── index.ts

apps/web/src/components/ErrorBoundary/
├── ErrorBoundary.tsx       # 通用错误边界
├── PageErrorBoundary.tsx   # 页面级错误边界
└── index.ts
```

## 一、ErrorBoundary 层级

### 层级策略

```
App Layout
  └── PageErrorBoundary（页面级）    ← 捕获整个页面的错误
        └── ErrorBoundary（组件级）  ← 捕获特定组件的错误
              └── 业务组件
```

### 页面级 ErrorBoundary

```tsx
import { PageErrorBoundary } from '@/components/ErrorBoundary';

// 每个页面自动包裹（layout.tsx 中）
function OrdersPage() {
  return (
    <PageErrorBoundary pageName="订单列表">
      <OrderList />
    </PageErrorBoundary>
  );
}
```

**特性**：

- 显示页面名称
- 提供"重试"、"刷新"、"返回首页"操作
- 开发模式显示错误详情

### 组件级 ErrorBoundary

```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

// 隔离风险组件，避免影响整个页面
function OrderDetail() {
  return (
    <div>
      <OrderInfo />
      <ErrorBoundary fallback={<p>图表加载失败</p>}>
        <PriceChart /> {/* 第三方图表可能崩溃 */}
      </ErrorBoundary>
    </div>
  );
}
```

### 适合添加 ErrorBoundary 的场景

| 场景                         | 推荐级别 |
| ---------------------------- | -------- |
| 第三方库组件（图表、编辑器） | 组件级   |
| 复杂数据转换和渲染           | 组件级   |
| 每个路由页面                 | 页面级   |
| 钱包/交易相关 UI             | 组件级   |

## 二、API 错误处理

### 标准模式

```typescript
// 在 hook 中统一处理
function useOrderDetail(orderId: string) {
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        setIsLoading(true);
        setError(null);
        const order = await ordersApi.getOrder(orderId);
        setData(order);
      } catch (err) {
        const message = err instanceof Error ? err.message : '加载失败';
        setError(message);

        // 上报到 ErrorTracker
        errorTracker.captureException(err instanceof Error ? err : new Error(message), {
          tags: { feature: 'orders', orderId },
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetch();
  }, [orderId]);

  return { data, error, isLoading };
}
```

### 用户友好的错误提示

```typescript
// 使用 i18n 翻译错误消息
const { t } = useI18n();

// 根据错误类型显示不同提示
function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return t('common.error.network'); // "网络连接失败"
  }
  if (error instanceof Error && error.message.includes('401')) {
    return t('common.error.unauthorized'); // "请重新登录"
  }
  return t('common.error.unknown'); // "出了点问题，请稍后重试"
}
```

## 三、日志系统

### LoggerService 使用

```typescript
import { logger } from '@mobazha/core';

// 基本使用
logger.info('订单创建成功', { orderId: '123' });
logger.warn('余额接近零', { balance: 0.001 });
logger.error('支付失败', error, { orderId: '123' });

// 子 Logger（带来源标签）
const chatLogger = logger.child('MatrixChat', { component: 'chat' });
chatLogger.info('消息发送成功', { roomId: 'room-123' });
// 输出: [MatrixChat] 消息发送成功 { roomId: 'room-123' }
```

### 日志级别选择

| 级别    | 使用场景       | 示例                   |
| ------- | -------------- | ---------------------- |
| `debug` | 开发调试       | 函数入参、中间状态     |
| `info`  | 关键操作成功   | 订单创建、钱包连接     |
| `warn`  | 可恢复的异常   | 余额不足、网络超时重试 |
| `error` | 不可恢复的错误 | API 500、合约调用失败  |

### 禁止日志中包含的内容

```typescript
// ❌ 绝对禁止
logger.info('Token', { token: accessToken });
logger.debug('Mnemonic', { mnemonic: seedPhrase });
console.log('Private key:', privateKey);

// ✅ 安全的日志
logger.info('用户认证成功', { userId: user.id });
logger.error('交易失败', { txHash: tx.hash, errorCode: err.code });
```

## 四、ErrorTracker 使用

```typescript
import { errorTracker } from '@mobazha/core';

// 捕获异常
errorTracker.captureException(error, {
  tags: { feature: 'payment', chain: 'ethereum' },
  extra: { orderId: '123', amount: '0.1 ETH' },
});

// 捕获消息（非异常的异常情况）
errorTracker.captureMessage('用户余额为负数', {
  level: 'warning',
  tags: { feature: 'wallet' },
});

// 面包屑（帮助重现问题路径）
errorTracker.addBreadcrumb({
  category: 'navigation',
  message: '进入订单详情',
  data: { orderId: '123' },
});
```

### 自动忽略的错误

ErrorTracker 已配置忽略以下常见噪音：

- `ResizeObserver loop limit exceeded`
- `Loading chunk .* failed`（代码分割加载失败）
- `Network request failed`（网络断线）

## 五、网络断线处理

### 去中心化应用的特殊需求

Mobazha 作为去中心化应用，网络可靠性尤为重要：

```typescript
// 1. 检测在线状态
if (!navigator.onLine) {
  // 显示离线提示（项目有 /offline 页面）
}

// 2. API 调用重试
import { retry } from '@mobazha/core';

const data = await retry(
  () => api.fetchData(),
  3, // 3 次重试
  1000, // 1s 初始延迟
  2 // 指数退避
);

// 3. WebSocket 重连（Matrix 已内置）
// useMatrixInit 自动处理断线重连

// 4. 交易状态恢复
// 交易发送后保存 txHash，页面刷新后可查询状态
```

## 六、优雅降级模式

```typescript
// 功能不可用时的降级策略
function WalletBalance() {
  const { balances, error } = useWalletStore();

  if (error) {
    return (
      <div className="text-muted-foreground">
        <p>余额暂时无法加载</p>
        <button onClick={() => fetchBalances()}>重试</button>
      </div>
    );
  }

  return <BalanceDisplay balances={balances} />;
}
```

## 快速检查清单

- [ ] 页面是否有 PageErrorBoundary 包裹？
- [ ] 第三方组件是否有组件级 ErrorBoundary？
- [ ] API 调用是否有 try/catch 和用户友好的错误提示？
- [ ] 关键错误是否上报到 ErrorTracker？
- [ ] 日志是否使用正确的级别？
- [ ] 日志中是否不包含敏感信息？
- [ ] 网络相关操作是否有重试机制？
