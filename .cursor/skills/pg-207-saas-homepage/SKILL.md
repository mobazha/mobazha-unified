---
name: pg-207-saas-homepage
description: 'PG-207 SaaS 首页重设计（Stores First）执行指南。将 SaaS 首页从商品市场转型为店铺托管平台展示页。触发词："执行 PG-207", "SaaS 首页", "Stores First", "首页重设计", "saas homepage".'
---

# PG-207: SaaS 首页重设计 — Stores First

> **设计文档**：`docs/SAAS_HOMEPAGE_DESIGN.md`（权威来源，实施前必须先读）
> **触发词**："执行 PG-207"、"SaaS 首页"、"Stores First"
> **前置条件**：PG-201（店铺品牌化）✅、PG-202（AI Store Builder）✅

## 执行前检查

1. 读取 `docs/SAAS_HOMEPAGE_DESIGN.md` — 完整设计方案
2. 读取 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 4.7 — Tier 2 进度
3. 确认当前分支状态（建议新建 `feature/pg-207-saas-homepage`）
4. 告知用户将要执行的 Step 和预估工作量

## 核心设计决策（速查）

- **主受众**：潜在卖家（非买家），首页是平台能力展示页
- **信息漏斗**：Why（Hero + Value Props）→ What（Featured Stores）→ Proof（Activity + Stats）
- **Hero 三态**：匿名 / 已登录卖家 / 已登录买家
- **精选店铺**：品牌化案例展示（利用 PG-201 品牌色/header image），非购物发现
- **Network Activity**：最新商品带店铺归属（`from {storeName}`），无数据时隐藏
- **仅影响 SaaS 分支**：独立站首页（`isStandalone()`）不受影响

## Step 1: 数据层准备

### 1.1 新增 API 函数

在 `packages/core/services/api/products.ts` 中新增：

```typescript
export async function getFeaturedStores(): Promise<SearchedUser[]> {
  const result = await searchProfiles({ query: '*', pageSize: 20 });
  return result.results
    .map(user => ({ ...user, score: computeStoreScore(user) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export async function getLatestProducts(limit = 12) {
  // 调用 SEARCH_API.LISTINGS_FRESH(limit)
}
```

排序公式（设计文档 Section 4.2）：

```typescript
function computeStoreScore(user: SearchedUser): number {
  const activityScore = user.listingCount * 0.3 + user.reviewCount * 0.2;
  const qualityScore = user.rating * 0.2;
  const brandScore =
    (user.avatar ? 1 : 0) * 0.1 +
    (user.shortDescription ? 1 : 0) * 0.1 +
    (user.listingCount > 0 ? 1 : 0) * 0.1;
  return activityScore + qualityScore + brandScore;
}
```

### 1.2 新增 dataService 方法

在 `packages/core/services/dataService.ts` 中新增对应方法。

### 1.3 新增 i18n keys

在 `packages/core/i18n/locales/en.ts` 和 `zh.ts` 中新增 `saasHome` 命名空间。
完整 key 列表见设计文档 Section 4.3。关键命名空间：

- `saasHome.hero.*` — 三态标题/副标题/CTA
- `saasHome.valueProps.*` — 4 个差异化卖点
- `saasHome.featuredStores.*` — 精选店铺标题/空态/少量态
- `saasHome.networkActivity.*` — 网络活跃度标题 + `fromStore`
- `saasHome.stats.*` — 平台统计

### 验收

- [ ] `getFeaturedStores()` 返回按 score 排序的店铺列表
- [ ] `getLatestProducts()` 调用正确的 SEARCH_API
- [ ] i18n keys 在 en.ts 和 zh.ts 中完整
- [ ] `pnpm build` 无类型错误

## Step 2: 新建 SaaSHome 组件

统一目录：`apps/web/src/components/SaaSHome/`

### 2.1 StoreCard.tsx — 品牌化橱窗卡片

关键设计（利用 PG-201 品牌化能力）：

- 卡片顶部：`headerHashes` 展示 header image，无则用 `--store-primary` 渐变
- Avatar 叠在 header 底部
- 店铺名 + shortDescription（截断 2 行）+ 评分 + 商品数
- "Visit Store →" 按钮使用店铺品牌色
- 暗色模式下品牌色对比度检查

### 2.2 FeaturedStoresSection.tsx — 精选店铺

按店铺数量的展示策略（设计文档 Section 3.2）：

- 0 个：隐藏或 "Be the first" + CTA
- 1-2 个：单行横排 + "Join the growing network"
- 3-5 个：自适应 Grid（移动端横向滚动 snap）
- 6+ 个：3 列 Grid + "View All Stores →"

包含骨架屏加载态。

### 2.3 ValuePropsSection.tsx — Web3 差异化卖点

4 个卡片 grid（2×2 或 4×1）：

- Buyer Protection / Own Your Data / Zero Platform Fees / Crypto Native
- 图标 + 标题 + 简短描述

### 2.4 PlatformStatsSection.tsx — 平台统计

- 3 列：Active Stores / Products Listed / Chains Supported
- 数据来源：`searchProfiles({ query: '*', pageSize: 1 })` 获取 `total` 字段
- 暗色背景区域，与 Footer 衔接
- 数字使用骨架屏加载态

### 2.5 index.ts — barrel export

### 验收

- [ ] 所有组件在 SaaS 模式下渲染正常
- [ ] StoreCard 展示品牌色/header image
- [ ] FeaturedStoresSection 正确处理 0/1-2/3-5/6+ 店铺态
- [ ] 骨架屏加载态可见
- [ ] 暗色模式下所有组件正常

## Step 3: 重构 Hero

修改 `apps/web/src/components/Hero/Hero.tsx`。

### 三态实现

判断逻辑：

```typescript
const { user } = useAuth(); // 或相应的认证 hook
const isAnonymous = !user;
const isSeller = user && user.hasSeller; // 根据实际字段判断
const isBuyer = user && !user.hasSeller;
```

- **匿名态**：营销文案 + "Create Your Store" + "Explore Stores ↓"
- **卖家态**：欢迎回来 + "Go to Dashboard" + "View Your Store"（高度缩减）
- **买家态**：同匿名布局 + "Start Selling" + "Browse Stores ↓"

### 移动端简化

- 标题 1 行，1 主 CTA + 文字链接次 CTA
- 统计数据移到 PlatformStatsSection，不在 Hero 内
- 高度不超过 1 屏 60%

### 验收

- [ ] 三态切换正确（可通过登录/退出测试）
- [ ] 移动端 Hero 紧凑，不超过视口 60%
- [ ] "Explore Stores ↓" 锚点滚动到 `#featured-stores`

## Step 4: 重构 page.tsx

修改 `apps/web/src/app/page.tsx` SaaS 分支。

### 目标结构

```tsx
{!standalone && (
  <>
    <Hero />
    <ValuePropsSection />
    <FeaturedStoresSection />
    <ProductSection
      title={t('saasHome.networkActivity.title')}
      showStoreName
      ...
    />
    <PlatformStatsSection />
  </>
)}
```

### 删除

- `placeholderProducts`（mock 数据）
- `categories` 硬编码数组
- SaaS 分支中的 Trending / Featured / Categories 区域

### 保留

- 独立站分支完全不变
- Header / Footer 不变

### 数据缓存

使用 React Query / SWR，staleTime 5 分钟：

```typescript
const { data: stores } = useQuery({
  queryKey: ['featured-stores'],
  queryFn: getFeaturedStores,
  staleTime: 5 * 60 * 1000,
});
```

### 验收

- [ ] SaaS 首页按 Why → What → Proof 顺序展示
- [ ] 无 mock 数据、无硬编码统计
- [ ] 独立站首页不受影响（`isStandalone()` 验证）
- [ ] `pnpm build` 通过

## Step 5: 测试 & 打磨

### 必测场景

| 场景            | 预期                                 |
| --------------- | ------------------------------------ |
| SaaS 匿名访客   | 营销 Hero + 全部 Section             |
| SaaS 已登录卖家 | 欢迎回来 + Dashboard CTA             |
| SaaS 已登录买家 | Start Selling CTA                    |
| 0 个店铺        | FeaturedStores 隐藏或 "Be the first" |
| 1-2 个店铺      | 单行 + 鼓励文案                      |
| 6+ 个店铺       | 3 列 Grid + View All                 |
| 0 个商品        | Network Activity 隐藏                |
| 移动端 375px    | Hero 紧凑 + 横向滚动                 |
| 暗色模式        | 所有组件正常                         |
| 独立站模式      | 完全不受影响                         |

### 运行

```bash
pnpm build          # 构建无错
pnpm lint           # lint 通过
pnpm test           # 现有测试不破坏
```

## 完成后更新

1. `docs/PROFESSIONAL_GRADE_ROADMAP.md` — PG-207 状态 ⏳ → ✅ + 日期
2. `docs/SAAS_HOMEPAGE_DESIGN.md` — 记录实施中的偏差（如有）
3. 提交：按 Step 拆分 commit，每个 Step 一个 commit
