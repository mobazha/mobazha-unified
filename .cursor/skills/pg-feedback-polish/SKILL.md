# Tier 0.5: 反馈驱动体验打磨执行指南

> **目标**：基于真实用户反馈，修复 Tier 0 完成后遗留的体验缺口，让截图能"说服人"。
> **主场景**：新买家/卖家首次看到产品时的第一印象优化。
> **前置条件**：Tier 0（PG-001~005）已全部完成。
> **触发词**："反馈打磨"、"体验打磨"、"PG-006"、"PG-007b"、"PG-008"、"PG-009"、"消灭 Unknown"、"身份人性化"、"登录品牌"、"独立站首页"

## 执行前检查

1. 读取 `docs/features/feedback-polish.md` — 完整任务规格
2. 读取 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 9 — 确认 Tier 0 已完成
3. 找到 Tier 0.5 中第一个 ⏳ 的任务
4. 告知用户将要执行的任务和预估工作量

## 执行顺序

```
PG-006（身份人性化 + 术语抽象）  ← 最高优先，3-4 天
  ↓
PG-007b（E2E 数据质量 + 图片 fallback）  ← 让截图好看，1-2 天
  ↓
PG-008（登录品牌化）  ← Casdoor 配置，1 天
  ↓
PG-009（独立站首页差异化）  ← 品牌着陆页，2-3 天
```

---

## PG-006: 身份人性化 + 术语抽象

### 核心原则

**任何面向用户的页面，禁止直接渲染裸 Peer ID 或区块链地址。**

身份展示优先级：

1. 可读名称（store name / username）— 有名字就显示名字
2. 截断 ID + tooltip — 无名字时显示 `Store QmY8...tRnC` 或 `User QmBu...eer1`
3. 完整 ID — 仅在用户主动点击"查看完整 ID"或"复制"时展示

### Step 1: 创建身份工具函数

创建 `packages/core/utils/identity.ts`：

```typescript
/**
 * 从 profile 或 peer 数据提取可读名称
 * 优先用 name，无名时截断 peerID
 */
export function formatUserName(
  data?: { name?: string; peerID?: string; handle?: string } | null,
  options?: { prefix?: string; fallback?: string }
): string;

/**
 * 截断长地址/ID（如 0x123456...abcdef）
 */
export function truncateAddress(address: string, startChars?: number, endChars?: number): string;

/**
 * 格式化通知消息，去掉 "Unknown" 前缀
 * 根据通知类型生成自然语言描述
 */
export function formatNotificationTitle(type: string, data: Record<string, any>): string;
```

添加单元测试 `packages/core/__tests__/utils/identity.test.ts`。

### Step 2: 全局搜索替换

搜索代码中所有直接渲染 peerID 的位置：

```bash
rg 'peerID|peer_id|vendorID' --type tsx --type ts -l apps/web/src/
```

逐个替换为 `formatUserName()` 调用。重点关注：

| 组件                                     | 搜索模式            | 替换方式                             |
| ---------------------------------------- | ------------------- | ------------------------------------ |
| `components/ProductCard/ProductCard.tsx` | 卖家名展示位        | `formatUserName(product.vendor)`     |
| `components/Order/OrderListCompact.tsx`  | Buyer/Seller 列     | `formatUserName(order.buyer/seller)` |
| `OrderDetail` 页面                       | Seller/Buyer 信息区 | 头像 + `formatUserName()`            |
| `notifications` 页面                     | 通知标题            | `formatNotificationTitle()`          |
| `ProductDetail.tsx`                      | 卖家信息区          | 店铺名 + View Store                  |

### Step 3: Header "Connect Wallet" 降级

在 `apps/web/src/components/Header/Header.tsx` 中：

- 将 "Connect Wallet" 从主色按钮改为 ghost/outline 样式
- 或移入头像下拉菜单中
- 已连接状态显示截断地址 + 状态圆点，而非完整显眼按钮

### Step 4: 术语替换

检查以下文件中的技术术语：

```bash
rg -i 'escrow|smart.?contract|peer.?id|ipfs|gas.?fee|block.?confirm' apps/web/src/ --type tsx --type ts
```

仅替换**面向用户可见的 UI 文案**（不替换代码变量名、注释、API 字段名）：

- 用 i18n key 封装所有替换文案
- 新增 i18n keys 到 `packages/core/i18n/locales/en.ts`

### Step 5: 验收

- grep 确认无裸 Peer ID 渲染到 UI
- 截图对比：搜索结果、订单列表、订单详情、通知、商品详情
- 移动端 375px 验证

---

## PG-007b: E2E 数据质量 + 图片 Fallback

### Step 1: 丰富 mock 数据

修改 `apps/web/e2e/fixtures/seed-visual-data.ts` 和 `mock-api-routes.ts`：

- 商品图片：使用 `https://picsum.photos/seed/{product-name}/400/400` 或类似稳定占位图
- 卖家名称：设置有意义的 store name（"TechStore"、"ArtAcademy"、"RetroFinds"），不留空
- 买家名称：mock 订单中的买家设置有意义的名字
- 通知消息：使用真实格式（不是 "Unknown Notification"）

### Step 2: 修复移动端数据问题

排查 `mobile-visual.spec.ts` 中：

- 商品详情 mock 路由在移动端视口下是否匹配
- 购物车 localStorage 注入是否在移动端页面导航前完成

### Step 3: 图片 Fallback 组件优化

检查 `ProductCard`、`CartItem`、checkout 商品摘要中的 `<img>` 标签：

- 添加 `onError` 处理 → 显示通用商品图标（非空白灰块）
- 加载中状态使用 Skeleton 动画
- 考虑提取为通用 `ProductImage` 组件

### Step 4: 更新全部快照

```bash
pnpm --filter @mobazha/web exec playwright test desktop-visual --update-snapshots
pnpm --filter @mobazha/web exec playwright test mobile-visual --update-snapshots
```

肉眼检查新截图，确认图片、名称、通知都正常。

---

## PG-008: 登录页品牌化

### Step 1: Casdoor 配置检查

检查 Casdoor application 配置（`dev/mobazha/casdoor`）：

- `logo` 字段是否指向正确的 Mobazha logo URL
- `displayName` 是否为 "Mobazha"（而非 "Mobazha E2E"）
- 如果是 E2E 测试环境配置问题，修改测试配置

### Step 2: 隐藏 "Powered by Casdoor"

Casdoor 支持自定义 CSS。在 application 配置中注入：

```css
.powered-by,
.login-footer {
  display: none !important;
}
```

或找到 Casdoor 版本对应的配置项。

### Step 3: E2E 登录截图更新

更新 Casdoor 配置后重新截取登录页截图。

---

## PG-009: 独立站首页差异化

### Step 1: 创建 StandaloneHomePage 组件

新建 `apps/web/src/components/Home/StandaloneHomePage.tsx`（注意：`app/page.tsx` 已有 `isStandalone()` 分支，提取为独立组件）：

```typescript
// 独立站首页 — 卖家品牌着陆页
export function StandaloneHomePage() {
  // 获取卖家 profile（使用现有 API）
  // 获取卖家商品列表（使用现有 store listings API）

  return (
    <>
      {/* 店铺 Hero: 封面图 + logo + 名称 + 简介 */}
      {/* 搜索框: 店内搜索 */}
      {/* 支付方式图标: 接受的加密货币 */}
      {/* 商品网格: 最新/所有商品 */}
      {/* Footer: 已有 Footer 组件 */}
    </>
  );
}
```

### Step 2: 首页路由分发

修改 `apps/web/src/app/page.tsx`（或对应首页文件）：

```typescript
export default function HomePage() {
  const standalone = isStandalone();
  return standalone ? <StandaloneHomePage /> : <MarketplaceHomePage />;
}
```

### Step 3: SaaS 首页数字诚实化

现有首页的 "10K+ Active Stores, 50K+ Products" 统计：

- 如果来自真实 API 数据，保留
- 如果是硬编码 mock 数据，改为从 API 获取，或新平台无数据时隐藏该区域

### Step 4: 移动端适配

StandaloneHomePage 使用响应式布局：

- 移动端：全宽商品网格（2 列），搜索框突出
- 桌面端：侧边分类 + 主区商品网格（3-4 列）

---

## 通用执行规范

### 每个任务完成后

1. 运行 `pnpm validate:quick` 确认无构建错误
2. 更新 E2E 截图（如涉及 UI 变更）
3. 更新 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 9 — 对应任务 ⏳ → ✅ + 日期
4. 更新 `mobazha_hosting/docs/PROGRESS.md` — 追加完成记录

### 代码规范

- 所有用户可见文案使用 `t()` i18n 函数
- 使用主题变量，不硬编码颜色
- 新增翻译 key 同步更新 `packages/core/i18n/locales/en.ts`
- 身份展示必须通过 `formatUserName()` / `truncateAddress()`，不直接渲染 ID

### 截图验证

每个视觉变更完成后，参考 `.cursor/rules/visual-check-rules.mdc` 进行截图检查：

- 桌面端 1440px + 移动端 375px 双端验证
- 重点关注：身份展示、图片加载、术语文案

## 全部完成后

1. 更新全部 E2E 截图（~80 张）
2. 收集新截图用于第二轮用户展示
3. 对比反馈改善情况，评估是否还需追加修复
4. 回到主线：执行 PG-110（AI 商品创建助手）
