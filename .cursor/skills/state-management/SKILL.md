---
name: state-management
description: Guide for Zustand state management patterns in Mobazha including store design, middleware usage, selectors, persistence, and integration with React Query. Use when creating or modifying stores, or working with state management, "状态管理", "Zustand", "Store", "全局状态", "持久化".
---

# 状态管理指南

Mobazha 项目基于 Zustand 的状态管理模式和最佳实践。

## 现有 Store 一览

| Store                  | 文件                   | 持久化  | 用途              |
| ---------------------- | ---------------------- | ------- | ----------------- |
| `useUserStore`         | `userStore.ts`         | ✅ 部分 | 用户认证、profile |
| `useCartStore`         | `cartStore.ts`         | ✅ 全部 | 购物车            |
| `useWalletStore`       | `walletStore.ts`       | ❌      | 钱包余额、交易    |
| `useCurrencyStore`     | `currencyStore.ts`     | ✅      | 汇率、货币转换    |
| `useChatStore`         | `chatStore.ts`         | ❌      | Matrix 聊天状态   |
| `useNotificationStore` | `notificationStore.ts` | ❌      | 通知              |
| `useRoleStore`         | `roleStore.ts`         | ❌      | 用户角色          |

## Store 设计原则

### 1. 按领域划分

每个 Store 对应一个业务领域，保持单一职责：

```typescript
// ✅ 好：职责清晰
useCartStore; // 只管购物车
useWalletStore; // 只管钱包

// ❌ 差：职责混乱
useAppStore; // 什么都放
```

### 2. Server State vs Client State

| 类型                      | 管理方式                   | 示例                      |
| ------------------------- | -------------------------- | ------------------------- |
| Server State（后端数据）  | React Query / API 请求     | 订单列表、商品详情        |
| Client State（本地状态）  | Zustand Store              | 购物车、UI 偏好、聊天状态 |
| Derived State（派生数据） | `useMemo` / Store 计算属性 | 购物车总价、筛选后的列表  |

```typescript
// ✅ Server state 用 hook（内部可能用 React Query 或直接 API）
const { orders, isLoading } = useOrders();

// ✅ Client state 用 Store
const cartItems = useCartStore(state => state.items);
```

## 标准 Store 模板

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// 1. 定义接口
interface ExampleState {
  // 状态
  items: Item[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;

  // 动作
  fetchItems: () => Promise<void>;
  addItem: (item: Item) => void;
  removeItem: (id: string) => void;
  selectItem: (id: string | null) => void;
  clearError: () => void;

  // 计算属性
  getItemCount: () => number;
  getItemById: (id: string) => Item | undefined;
}

// 2. 创建 Store
export const useExampleStore = create<ExampleState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        items: [],
        selectedId: null,
        isLoading: false,
        error: null,

        // 异步动作
        fetchItems: async () => {
          try {
            set({ isLoading: true, error: null });
            const items = await exampleApi.getItems();
            set({ items, isLoading: false });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : '加载失败',
              isLoading: false,
            });
          }
        },

        // 同步动作
        addItem: item =>
          set(state => ({
            items: [...state.items, item],
          })),

        removeItem: id =>
          set(state => ({
            items: state.items.filter(i => i.id !== id),
          })),

        selectItem: id => set({ selectedId: id }),

        clearError: () => set({ error: null }),

        // 计算属性
        getItemCount: () => get().items.length,
        getItemById: id => get().items.find(i => i.id === id),
      }),
      {
        name: 'mobazha-example-storage', // localStorage key
        partialize: state => ({
          items: state.items, // 只持久化必要的字段
          // 不持久化 isLoading, error 等临时状态
        }),
      }
    ),
    { name: 'ExampleStore' } // DevTools 中显示的名称
  )
);

// 3. 导出选择器
export const selectItems = (state: ExampleState) => state.items;
export const selectLoading = (state: ExampleState) => state.isLoading;
export const selectError = (state: ExampleState) => state.error;
```

## Middleware 使用

### devtools（所有 Store 必须使用）

```typescript
// 在 Redux DevTools 中可视化状态变化
devtools(storeCreator, { name: 'StoreName' });
```

### persist（需要持久化的 Store）

```typescript
persist(storeCreator, {
  name: 'mobazha-xxx-storage', // localStorage key，统一 mobazha- 前缀
  partialize: state => ({
    // 只持久化必要字段
    items: state.items,
    preferences: state.preferences,
    // ❌ 不要持久化：isLoading, error, 临时 UI 状态
  }),
});
```

### Middleware 组合顺序

```typescript
// 标准顺序：devtools 在最外层
create<State>()(
  devtools(         // 最外层
    persist(        // 内层（可选）
      (set, get) => ({ ... })
    )
  )
);
```

## 选择器优化

### 避免不必要的重渲染

```typescript
// ❌ 差：每次 store 任何变化都会重渲染
const { items, isLoading, error } = useCartStore();

// ✅ 好：只订阅需要的字段
const items = useCartStore(state => state.items);
const isLoading = useCartStore(state => state.isLoading);

// ✅ 更好：使用导出的选择器
const items = useCartStore(selectCartItems);

// ✅ 组合选择器（需要 shallow 比较）
import { useShallow } from 'zustand/react/shallow';

const { items, total } = useCartStore(
  useShallow(state => ({
    items: state.items,
    total: state.getTotal(),
  }))
);
```

### 选择器命名规范

```typescript
// 前缀 select + 描述
export const selectCartItems = (state: CartState) => state.items;
export const selectCartTotal = (state: CartState) => state.getTotal();
export const selectIsCartEmpty = (state: CartState) => state.items.length === 0;
```

## 错误处理模式

项目统一的异步动作错误处理：

```typescript
fetchData: async () => {
  try {
    set({ isLoading: true, error: null });
    const data = await apiCall();
    set({ data, isLoading: false });
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : '未知错误',
      isLoading: false,
    });
  }
},
```

## 何时创建新 Store

| 场景                          | 建议                           |
| ----------------------------- | ------------------------------ |
| 多个页面/组件共享的客户端状态 | ✅ 创建新 Store                |
| 单个页面内的临时状态          | ❌ 用 `useState`               |
| 从后端获取的数据              | ❌ 用 API hook（useOrders 等） |
| 全局 UI 状态（主题、语言）    | ✅ Store + persist             |
| 表单状态                      | ❌ 用 `useState` 或表单库      |

## 测试模式

```typescript
import { act } from '@testing-library/react';

describe('useCartStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useCartStore.setState({
      items: [],
      isLoading: false,
      error: null,
    });
  });

  it('应正确添加商品', () => {
    act(() => {
      useCartStore.getState().addItem(mockItem);
    });

    expect(useCartStore.getState().items).toHaveLength(1);
  });
});
```

## 快速检查清单

- [ ] 新 Store 是否只包含客户端状态？
- [ ] 是否使用 `devtools` middleware？
- [ ] 持久化时是否用 `partialize` 排除临时状态？
- [ ] 选择器是否精确订阅（避免整个 store 订阅）？
- [ ] localStorage key 是否使用 `mobazha-` 前缀？
- [ ] 异步动作是否有统一的 error/loading 处理？
