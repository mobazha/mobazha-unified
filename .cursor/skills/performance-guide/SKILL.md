---
name: performance-guide
description: Guide for performance optimization in Mobazha including React rendering optimization, code splitting, Web Vitals monitoring, and utility functions for debounce/throttle/memoize. Use when optimizing performance, fixing slow renders, or working with large lists, "性能优化", "渲染优化", "代码分割", "Web Vitals", "虚拟列表", "懒加载".
---

# 性能优化指南

Mobazha 项目的性能优化模式和已有工具。

## 已有基础设施

| 工具               | 文件                                                      | 用途                           |
| ------------------ | --------------------------------------------------------- | ------------------------------ |
| PerformanceMonitor | `packages/core/services/monitoring/performanceMonitor.ts` | Web Vitals + 自定义指标        |
| 工具函数           | `packages/core/utils/performance.ts`                      | debounce, throttle, memoize 等 |
| ErrorTracker       | `packages/core/services/monitoring/errorTracker.ts`       | 性能 Transaction 追踪          |

## 一、React 渲染优化

### 1.1 memo 使用时机

```typescript
// ✅ 适合 memo：接收复杂 props 的列表项
const OrderCard = memo(function OrderCard({ order }: OrderCardProps) {
  return <div>...</div>;
});

// ❌ 不需要 memo：props 简单或组件很轻
function LoadingSpinner({ size }: { size: number }) {
  return <div style={{ width: size }} />;
}
```

**原则**：

- 列表项组件 → 始终 memo
- 接收回调 props 的子组件 → memo + useCallback
- 纯展示组件 → 仅在父组件频繁重渲染时使用

### 1.2 useMemo 和 useCallback

```typescript
// ✅ useMemo：计算开销大或引用需要稳定
const filteredOrders = useMemo(
  () => orders.filter(o => o.status === selectedStatus),
  [orders, selectedStatus]
);

// ✅ useCallback：传递给 memo 子组件的回调
const handleSelect = useCallback((id: string) => {
  setSelectedId(id);
}, []);

// ❌ 过度使用：简单值不需要 memo
const label = useMemo(() => `共 ${count} 件`, [count]); // 不必要
```

### 1.3 Zustand 选择器（参见 state-management Skill）

```typescript
// ✅ 精确订阅，避免整个 store 订阅
const items = useCartStore(state => state.items);

// ❌ 订阅整个 store
const store = useCartStore();
```

## 二、代码分割

### 2.1 路由级别（Next.js 自动处理）

Next.js App Router 自动按路由分割。

### 2.2 组件级别懒加载

```typescript
import { lazy, Suspense } from 'react';

// 大型组件懒加载
const HeavyChart = lazy(() => import('@/components/charts/HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <HeavyChart data={data} />
    </Suspense>
  );
}
```

### 2.3 适合懒加载的组件

- 图表（Recharts）
- 富文本编辑器
- 地图组件
- 设置页面的高级面板
- 模态框/抽屉的复杂内容

## 三、列表性能

### 3.1 大列表优化

商品列表、订单列表等可能有大量数据：

```typescript
// 分页加载（推荐）
function ProductList() {
  const { products, hasMore, loadMore, isLoading } = useProducts();

  return (
    <div>
      {products.map(p => <ProductCard key={p.slug} product={p} />)}
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          加载更多
        </button>
      )}
    </div>
  );
}
```

### 3.2 图片优化

```typescript
// 使用 next/image（自动优化 + lazy loading）
import Image from 'next/image';

<Image
  src={product.thumbnail}
  alt={product.title}
  width={300}
  height={300}
  loading="lazy"        // 默认，视口外延迟加载
  placeholder="blur"    // 模糊占位
/>
```

## 四、已有工具函数

`packages/core/utils/performance.ts` 提供：

### debounce / throttle

```typescript
import { debounce, throttle } from '@mobazha/core';

// 搜索输入防抖（300ms）
const debouncedSearch = debounce((query: string) => {
  searchProducts(query);
}, 300);

// 滚动事件节流
const throttledScroll = throttle(() => {
  checkLoadMore();
}, 200);
```

### memoize

```typescript
import { memoize } from '@mobazha/core';

// 缓存计算结果
const getExpensiveResult = memoize((input: string) => {
  return heavyComputation(input);
});
```

### batchProcess

```typescript
import { batchProcess } from '@mobazha/core';

// 大批量操作分块处理，避免阻塞 UI
await batchProcess(
  largeArray,
  async item => processItem(item),
  50, // 每批 50 个
  10 // 批次间延迟 10ms
);
```

### retry / withTimeout

```typescript
import { retry, withTimeout } from '@mobazha/core';

// 带重试的 API 调用
const data = await retry(
  () => fetchData(),
  3, // 最多重试 3 次
  1000, // 初始延迟 1s
  2 // 指数退避因子
);

// 带超时的 Promise
const result = await withTimeout(longOperation(), 10000); // 10s 超时
```

### scheduleIdleTask

```typescript
import { scheduleIdleTask } from '@mobazha/core';

// 在浏览器空闲时执行非紧急任务
scheduleIdleTask(() => {
  preloadNextPageData();
}, 5000); // 5s 超时（确保最终执行）
```

## 五、Web Vitals 监控

项目已集成 Web Vitals 收集：

```typescript
// performanceMonitor.ts 自动收集：
// - LCP (Largest Contentful Paint) — 目标 < 2.5s
// - FID (First Input Delay) — 目标 < 100ms
// - CLS (Cumulative Layout Shift) — 目标 < 0.1
// - FCP (First Contentful Paint)
// - TTFB (Time to First Byte)
// - INP (Interaction to Next Paint)
```

### 自定义性能测量

```typescript
import { performanceMonitor } from '@mobazha/core';

// 同步测量
const result = performanceMonitor.measure('orderTransform', () => {
  return transformCoreOrder(data);
});

// 异步测量
const data = await performanceMonitor.measureAsync('fetchOrders', async () => {
  return await ordersApi.getOrders();
});

// 手动计时
const stopTimer = performanceMonitor.startTimer('chatInit');
await initializeChat();
stopTimer(); // 记录耗时
```

## 快速检查清单

- [ ] 列表项组件是否使用 `memo` ？
- [ ] 传递给子组件的回调是否用 `useCallback` 包裹？
- [ ] Zustand 选择器是否精确订阅？
- [ ] 大型组件是否做了懒加载（`lazy` + `Suspense`）？
- [ ] 图片是否使用 `next/image` 或添加 `loading="lazy"`？
- [ ] 搜索/输入是否做了 debounce？
- [ ] 大批量操作是否使用 `batchProcess` 避免 UI 阻塞？
