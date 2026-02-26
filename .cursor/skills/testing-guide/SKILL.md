---
name: testing-guide
description: Guide for writing unit tests (Vitest), integration tests, and E2E tests (Playwright) following Mobazha project conventions. Use when writing tests, setting up test files, or asking about testing strategies, "写测试", "测试", "单元测试", "E2E测试", "集成测试", "测试覆盖率".
---

# 测试编写指南

Mobazha 项目的测试策略、模式和最佳实践。

## 测试金字塔

```
         ┌─────────┐
         │  E2E    │  少量关键路径 (Playwright)
        ┌┴─────────┴┐
        │ 集成测试   │  API + Store 联动 (Vitest)
       ┌┴───────────┴┐
       │  单元测试    │  hooks/utils/transforms (Vitest)
       └─────────────┘
```

**覆盖率目标**：核心逻辑（hooks、utils、transforms）> 80%

## 技术栈

| 层级     | 工具           | 目录                                   |
| -------- | -------------- | -------------------------------------- |
| 单元测试 | Vitest + jsdom | `packages/core/__tests__/`             |
| 集成测试 | Vitest         | `packages/core/__tests__/integration/` |
| E2E 测试 | Playwright     | `apps/web/e2e/`                        |

## 单元测试模式

### 文件组织

```
packages/core/__tests__/
├── setup.ts                    # 全局 setup（localStorage mock 等）
├── utils/
│   └── performance.test.ts     # 工具函数测试
├── services/
│   └── api/
│       └── orders.test.ts      # API 服务测试
└── i18n/
    └── i18n.test.ts            # i18n 测试
```

### Hook 测试模板

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

describe('useOrderDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应返回订单详情数据', async () => {
    const { result } = renderHook(() => useOrderDetail('order-123'));

    await waitFor(() => {
      expect(result.current.displayOrder).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('应正确处理错误状态', async () => {
    vi.mocked(ordersApi.getOrder).mockRejectedValue(new Error('网络错误'));

    const { result } = renderHook(() => useOrderDetail('invalid'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});
```

### Transform 函数测试模板

```typescript
describe('transformCoreOrder', () => {
  it('应将买家角色正确映射', () => {
    const result = transformCoreOrder({
      coreOrder: mockOrder,
      currentUserPeerID: 'buyer-peer-id',
    });

    expect(result.userRole).toBe('buyer');
    expect(result.canDispute).toBe(true);
  });
});
```

### Store 测试模板

```typescript
import { act } from '@testing-library/react';

describe('useCartStore', () => {
  beforeEach(() => {
    // 重置 store
    useCartStore.setState({ items: [], error: null });
  });

  it('应正确添加商品', () => {
    act(() => {
      useCartStore.getState().addItem(mockItem);
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().getItemCount()).toBe(1);
  });
});
```

## 集成测试模式

项目使用 `skipIfNoIntegration()` 辅助函数，需要后端运行时才执行：

```typescript
import { skipIfNoIntegration } from '../setup';

describe('Orders Integration', () => {
  skipIfNoIntegration();

  it('应完成完整的购买流程', async () => {
    // 创建订单
    const order = await ordersApi.createOrder(mockPurchase);
    expect(order.id).toBeDefined();

    // 确认订单
    await ordersApi.confirmOrder(order.id);
    // ...
  });
});
```

## E2E 测试模式 (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('首页', () => {
  test('应正确显示导航栏', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('navigation')).toBeVisible();
    await expect(page.getByTestId('search-input')).toBeVisible();
  });

  test('响应式：移动端应显示汉堡菜单', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
  });
});
```

### E2E 关键规则

- **必须使用 `data-testid`** 定位元素，禁止 CSS 选择器
- 使用 `getByRole`、`getByText` 作为辅助定位
- 每个测试必须独立，不依赖其他测试的状态

### 视觉回归测试

项目维护桌面端和移动端的视觉快照测试，分为 Public（公开页面）和 Authenticated（已登录页面）两组：

| 测试文件                  | 设备                    | 用途                   |
| ------------------------- | ----------------------- | ---------------------- |
| `desktop-visual.spec.ts`  | Chromium 1280×720       | 桌面端视觉快照         |
| `mobile-visual.spec.ts`   | Mobile Chrome (Pixel 5) | 移动端视觉快照         |
| `ux-audit.spec.ts`        | Chromium 1280×720       | 桌面端 UX 审计（深度） |
| `mobile-ux-audit.spec.ts` | iPhone 12 390×844       | 移动端 UX 审计         |

### E2E Fixtures（`e2e/fixtures/`）

| 文件                  | 职责                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `auth.ts`             | Casdoor 登录 + Onboarding 自动完成 + `loginAndSetup()`                  |
| `mock-api-routes.ts`  | Mock API 响应（订单/通知/搜索/商品详情/地址），确保已登录页面有数据显示 |
| `seed-visual-data.ts` | 通过 API 创建测试商品 + 注入购物车到 localStorage                       |

**已登录页面测试模式**：

```typescript
import { loginAndSetup } from './fixtures/auth';
import { mockOrdersAPI, mockNotificationsAPI } from './fixtures/mock-api-routes';

test.describe('Authenticated Pages', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAndSetup(page);
    // 保存认证状态...
  });

  test('orders page', async ({ page }) => {
    await mockOrdersAPI(page); // 拦截 API 返回 mock 数据
    await page.goto('/orders/purchases');
    await expect(page).toHaveScreenshot('orders-purchases.png');
  });
});
```

**Mock 最佳实践**：

- Mock 函数仅拦截 GET 请求，非 GET 通过 `route.fallback()`
- 认证状态通过 `storageState` 在测试间共享，避免重复登录

### 运行视觉测试

```bash
# 桌面端
pnpm --filter @mobazha/web exec playwright test desktop-visual --project=chromium

# 移动端
pnpm --filter @mobazha/web exec playwright test mobile-visual --project="Mobile Chrome"

# 更新快照
pnpm --filter @mobazha/web exec playwright test desktop-visual --update-snapshots
```

## 运行命令

```bash
# 单元测试
pnpm --filter @mobazha/core test

# 带覆盖率
pnpm --filter @mobazha/core test -- --coverage

# E2E 测试
pnpm --filter @mobazha/web test:e2e

# 单个文件
pnpm --filter @mobazha/core test -- orderTransform.test.ts
```

## Mock 策略

| 场景          | 方式                                    |
| ------------- | --------------------------------------- |
| API 调用      | `vi.mock('@mobazha/core/services/api')` |
| Zustand Store | `useStore.setState({...})` 直接设置状态 |
| localStorage  | 全局 setup 中已 mock                    |
| 网络请求      | 优先用 vi.mock，复杂场景用 MSW          |
| 时间相关      | `vi.useFakeTimers()`                    |

## 快速检查清单

- [ ] 新增 hook/util 是否有对应测试文件？
- [ ] 测试描述是否清晰（`describe('when X') → it('should Y')`）？
- [ ] 是否测试了错误路径和边界情况？
- [ ] Mock 是否在 `beforeEach` 中重置？
- [ ] 是否避免了 `test.skip` 不带注释？
