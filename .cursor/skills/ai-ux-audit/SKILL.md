---
name: ai-ux-audit
description: AI 驱动的全系统 UX 体验审计。自动化 Demo 截图生成 + AI 角色评审管道。触发词："UX 审计", "AI 审查", "体验审计", "demo 截图", "buyer review", "seller review", "UX audit", "AI persona review", "截图捕获", "journey capture"。
---

# AI 驱动的全系统 UX 体验审计

## 概述

通过 Playwright 自动化截图 + AI 角色扮演评审，系统性审查 Mobazha 全平台 UX 质量。
覆盖 SaaS + 独立站、Desktop + Mobile、卖家 + 买家视角。

## 关键文件

### Plan 文件（执行蓝图）

| 文件                                              | 用途                                  |
| ------------------------------------------------- | ------------------------------------- |
| `~/.cursor/plans/ai_ux_体验审计_628e6106.plan.md` | 完整执行计划（4 Step、todo 状态追踪） |

### 现有基础设施

| 文件                                        | 用途                                                                                  | 行数 |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ---- |
| `apps/web/e2e/fixtures/mock-api-routes.ts`  | Mock API 路由（订单、通知、搜索、商品、店铺）                                         | ~778 |
| `apps/web/e2e/fixtures/seed-visual-data.ts` | 视觉测试数据种子（2 商品 + 1 shipping profile）                                       | ~295 |
| `apps/web/e2e/fixtures/auth.ts`             | Casdoor 认证 helper（login、getToken、getPeerID）                                     | ~280 |
| `apps/web/e2e/fixtures/standalone-auth.ts`  | 独立站认证 helper                                                                     | ~188 |
| `apps/web/e2e/fixtures/api-helpers.ts`      | API 调用 helper                                                                       | ~125 |
| `apps/web/e2e/ux-audit.spec.ts`             | 已有 UX 全量页面审核（70+ 页面截图到 test-results/）                                  | ~464 |
| `apps/web/e2e/mobile-ux-audit.spec.ts`      | 已有移动端公开页面审核                                                                | ~48  |
| `apps/web/e2e/desktop-visual.spec.ts`       | Desktop 视觉回归基线（44 tests）                                                      | ~412 |
| `apps/web/e2e/mobile-visual.spec.ts`        | Mobile 视觉回归基线（46 tests）                                                       | ~413 |
| `apps/web/playwright.config.ts`             | Playwright 配置（4 projects: chromium, Mobile Chrome, standalone, standalone-mobile） |

### 待创建文件（Demo Journey 管道）

| 文件                                            | 用途                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| `apps/web/e2e/fixtures/seed-demo-store.ts`      | 丰富 Demo 数据种子（6-8 商品、品牌、折扣、Collection）   |
| `apps/web/e2e/fixtures/mock-order-lifecycle.ts` | 订单全生命周期 Mock（7 状态 + 评价 + 聊天 + 钱包）       |
| `apps/web/e2e/demo-seller-journey.spec.ts`      | 卖家 20 步全流程截图                                     |
| `apps/web/e2e/demo-buyer-journey.spec.ts`       | 买家 19 步全流程截图                                     |
| `apps/web/e2e/demo-standalone-journey.spec.ts`  | 独立站 10 步全流程截图                                   |
| `apps/web/e2e/demo-output/manifest.json`        | 截图元数据（id, title, description, phase, reviewFocus） |

## 执行步骤

### Step 1: 收尾（Phase 5-6）

运行残余视觉基线和全量回归：

```bash
cd ~/dev/openbazaar/mobazha-unified/apps/web

# Feature 域基线（如有新 spec 未跑）
PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" E2E_TEST_PASSWORD=123 \
  bash -c 'npx playwright test shipping-settings.spec.ts wishlist.spec.ts \
  admin-collections.spec.ts admin-discounts.spec.ts ai-store-builder.spec.ts \
  --project=chromium --update-snapshots'

# 独立站基线
bash -c 'npx playwright test standalone-smoke.spec.ts standalone-deep.spec.ts \
  --project=standalone --update-snapshots'

# 全量回归
bash -c 'PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" \
  npx playwright test --project=chromium --project="Mobile Chrome"'

# Go 后端 E2E
cd ~/dev/mobazha/tests/e2e && bash -c 'go test -v -count=1 ./...'
```

### Step 2: 创建 Demo 环境种子 + Mock 升级

**seed-demo-store.ts** — 参考 `seed-visual-data.ts` 的 API 调用模式：

```typescript
import { getCasdoorToken, BACKEND_URL } from './auth';
import type { APIRequestContext } from '@playwright/test';

export async function seedDemoStore(request: APIRequestContext): Promise<void> {
  const token = await getCasdoorToken(request, 'testuser1', '123');
  const headers = { Authorization: `Bearer ${token}` };
  // 1. 设置 Profile（名称、头像、国家）
  // 2. 创建 6-8 个商品（物理+数字+服务+私有）
  // 3. 创建 2 个 Shipping Profile
  // 4. 创建 2 个 Collection + 关联商品
  // 5. 创建 3 个折扣
  // 6. 设置 Store Branding（Hero + ProductGrid + FAQ + TrustBadges）
}
```

**mock-order-lifecycle.ts** — 7 种订单状态 + 评价 + 聊天 + 钱包 Mock：

```typescript
export async function mockOrderLifecycle(page: Page): Promise<void> {
  // Mock 7 种订单状态: PENDING, AWAITING_FULFILLMENT, FULFILLED,
  //   COMPLETED, DISPUTED, REFUNDED, CANCELLED
  // Mock 商品评价列表
  // Mock 聊天消息
  // Mock 钱包交易记录
}
```

### Step 3: 全流程截图捕获

每个 journey spec 的核心模式：

```typescript
import { test } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';
import { seedDemoStore } from './fixtures/seed-demo-store';
import { mockOrderLifecycle } from './fixtures/mock-order-lifecycle';

const DEMO_DIR = 'demo-output/seller';

test.describe.configure({ mode: 'serial' });

test.describe('Seller Journey', () => {
  test.beforeAll(async ({ request }) => {
    await seedDemoStore(request);
  });

  test('S01 Empty Dashboard', async ({ page }) => {
    await performCasdoorLogin(page);
    await page.goto('/admin/dashboard');
    // screenshot to demo-output/seller/{mobile|desktop}/01-empty-dashboard.png
  });
  // ...20 steps
});
```

**视口规则**：每步同时截 mobile (390x844) + desktop (1280x800)。

**输出目录结构**：

```
demo-output/
  seller/mobile/   seller/desktop/     (20 步 x 2 = 40 张)
  buyer/mobile/    buyer/desktop/      (19 步 x 2 = 38 张)
  standalone/mobile/ standalone/desktop/ (10 步 x 2 = 20 张)
  manifest.json                         (元数据)
```

### Step 4: AI 三层角色评审

**Layer 1（每张截图）**：8 维度评分卡

- 信息层级、CTA 清晰度、视觉一致性、数据密度、错误预防、加载感知、信任信号、移动适配

**Layer 2（每个旅程阶段）**：竞品对标

- 卖家对标 Shopify/Etsy/微店
- 买家对标 Amazon/淘宝/Shopify Storefront

**Layer 3（仅移动端）**：6 项专项检查

- 拇指区、导航深度、滚动长度、底部导航、手势暗示、键盘适配

**执行方式**：分 3 批进行 AI 审查

1. 卖家 mobile (20) → desktop (20)
2. 买家 mobile (19) → desktop (19)
3. 独立站 mobile (10) → desktop (10)

## 运行 Journey Spec 的命令

```bash
cd ~/dev/openbazaar/mobazha-unified/apps/web

# 确保浏览器已安装
PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" npx playwright install chromium

# 运行全部 demo journey（需要后端运行）
PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright" E2E_TEST_PASSWORD=123 \
  bash -c 'npx playwright test demo-seller-journey.spec.ts \
  demo-buyer-journey.spec.ts demo-standalone-journey.spec.ts \
  --project=chromium --reporter=list'

# 截图输出在 demo-output/ 目录
```

## 已知 Mock 数据问题

| 问题                              | 位置                                    | 影响                           |
| --------------------------------- | --------------------------------------- | ------------------------------ |
| `avatarHashes` 为空字符串         | `mock-api-routes.ts` L413-414, L422-423 | Profile 头像显示为占位符或空白 |
| `storefront-config` sections 为空 | `mock-api-routes.ts` L637               | 店铺品牌页无内容               |
| 订单只覆盖 3/7 状态               | `mock-api-routes.ts` L38-87             | 无法展示完整订单生命周期       |
| 无评价数据 Mock                   | 缺失                                    | 商品详情页评价区为空           |
| 无聊天消息 Mock                   | 缺失                                    | 聊天页面为空                   |
| 无钱包交易 Mock                   | 缺失                                    | 钱包页面无交易记录             |

## Playwright 环境注意事项

1. **浏览器路径**：Cursor sandbox 会覆盖 `PLAYWRIGHT_BROWSERS_PATH`，必须显式设置：

   ```bash
   PLAYWRIGHT_BROWSERS_PATH="$HOME/Library/Caches/ms-playwright"
   ```

2. **认证密码**：E2E 测试用户密码通过环境变量传入：

   ```bash
   E2E_TEST_PASSWORD=123
   ```

3. **Casdoor 端口**：Docker 映射到 18000，`auth.ts` 默认读取 `E2E_CASDOOR_URL || 'http://localhost:18000'`

4. **前端端口**：`playwright.config.ts` 中 `baseURL` = `http://localhost:3000`

5. **独立站端口**：standalone projects 使用 `http://localhost:3002`

## 视觉基线现状（截至 2026-02-28）

| 基线集         | 数量       | 目录                                |
| -------------- | ---------- | ----------------------------------- |
| Desktop Visual | 44 PNG     | `desktop-visual.spec.ts-snapshots/` |
| Mobile Visual  | 46 PNG     | `mobile-visual.spec.ts-snapshots/`  |
| Store Branding | 6 PNG      | `store-branding.spec.ts-snapshots/` |
| **合计**       | **96 PNG** |                                     |

## 恢复会话检查清单

如果会话中断，AI 应执行以下步骤恢复上下文：

1. 读取 plan 文件：`~/.cursor/plans/ai_ux_体验审计_628e6106.plan.md`
2. 检查 todo 状态：确定哪些 Step 已完成
3. 检查 `demo-output/` 目录是否存在及内容
4. 检查 `demo-seller-journey.spec.ts` 等文件是否已创建
5. 检查 `seed-demo-store.ts` 和 `mock-order-lifecycle.ts` 是否已创建
6. 根据未完成的 Step 继续执行

## 设计文档

无独立设计文档。Plan 文件即为执行蓝图。详细的用户旅程定义、Mock 数据规格、AI 评审 prompt 均在 plan 文件中。

## 注意事项

1. Demo journey spec **不做** `toHaveScreenshot` 对比，纯截图保存到 `demo-output/`
2. 使用 `test.describe.configure({ mode: 'serial' })` 保证步骤顺序
3. 每步截图包含 `manifest.json` 元数据（供 AI 审查时读取上下文）
4. 空状态和有数据态需要分别截图（Dashboard、购物车、通知等）
5. Mock 数据遵循 Phase G 信封格式 `{ data: T }`
6. 独立站 spec 需要 port 3002 的前端服务运行
