# SaaS 首页重设计 — Stores First

> **Implementation-local:** This file is a Unified feature design, not a public
> delivery commitment. Canonical public outcomes live at
> <https://docs.mobazha.org/project/roadmap>.

> **任务 ID**: PG-207
>
> **定位**：将 SaaS 首页从"假装繁荣的商品市场"转型为"Web3 店铺托管平台展示页"。
>
> **来源**：[店铺外观与Collections设计](19a3dba7-1bdf-4ca3-afe5-047b48bfea8a) 会话中的产品设计讨论。
>
> **前置条件**：PG-201（店铺品牌化）✅、PG-202（AI Store Builder）✅ 已完成，店铺可展示品牌化效果。

---

## 1. 问题诊断

### 1.1 当前 SaaS 首页的问题

当前首页 (`apps/web/src/app/page.tsx`) 在 SaaS 模式下展示：

| 区域                | 现状                                                                   | 问题                                   |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| Hero                | "Decentralized Marketplace" + 硬编码统计（10K+ stores, 50K+ products） | 与实际数据脱节，用户感知不到真实活跃度 |
| Trending Products   | 从 `productDataService.getTrendingProducts()` 获取                     | 商品稀疏时显示 placeholder 假数据      |
| Featured & Services | 从 `productDataService.getFeaturedProducts()` 获取                     | 数据不足时显示 "No products found"     |
| Categories          | 硬编码 4 个分类（电子、数字、服务、数字资产）                          | 每个分类可能只有个位数商品，点进去更空 |

**核心矛盾**：首页是为**成熟市场**设计的，但当前平台处于**早期建设阶段**。

### 1.2 当前定位 vs 正确定位

```
当前定位：商品市场（Products first）→ 模仿 Amazon/Etsy，但商品不够，显得空
正确定位：店铺展示平台（Stores first）→ 类似 Gumroad / Big Cartel 的首页
```

Mobazha SaaS 的核心价值不是"做另一个 Amazon/Etsy"，而是 **Web3 原生的店铺托管平台**。独立站方向已验证——卖家需要的是自己的品牌店铺，而不是在一个新市场里做第 N 个卖家。

### 1.3 首页的主受众

根据路线图 Section 1.2 的战略定位：

> V1 的典型用户路径不是"来到市场逛逛"，而是"点开一个链接，到达某个卖家的店"。

买家通过 TG/社交链接直达独立站店铺页，**不经过 SaaS 首页**。SaaS 首页的有机访客主要是：

| 访客类型               | 到达方式                            | 期望                    |
| ---------------------- | ----------------------------------- | ----------------------- |
| **潜在卖家**（主受众） | 搜索 "Web3 store builder"、社区推荐 | 了解平台能力 → 注册开店 |
| 潜在买家（次要）       | 偶然发现 SaaS 域名                  | 发现有趣的店铺/商品     |
| 已登录卖家             | 回到 SaaS 首页                      | 快速进入自己的 Admin    |
| 已登录买家             | 浏览 SaaS                           | 发现更多店铺            |

**设计结论**：首页是一个**平台能力展示页**（类似 Shopify.com），不是购物市场。精选店铺是"案例展示"（展示平台品牌化效果），不是"买家发现"。

---

## 2. 产品设计：三阶段演进

```
阶段 1（当前）         阶段 2（有量后）           阶段 3（成熟期）
Store Builder          Store Builder + Discovery   Marketplace Network
首页: 平台能力展示      首页: 能力展示 + 店铺发现    首页: 完整市场
分类: 不需要            分类: 数据驱动的热门标签     分类: 结构化分类 + 搜索
```

**阶段转换触发**：不依赖硬阈值，而是数据驱动——当搜索使用量月增 30%+ 或用户反馈中出现 "can't find stores" 类信号时，评估是否进入阶段 2。参考指标：活跃店铺 >50 且商品 >500。

### 阶段 1（本次实施）：Store Builder 首页

| 区域            | 内容                                                    | 作用                       |
| --------------- | ------------------------------------------------------- | -------------------------- |
| **Hero**        | "Launch your Web3 store in 60 seconds" — 强调建站能力   | 获客转化（卖家导向）       |
| **Value Props** | Buyer Protection、Self-Hosted、Zero Fees、Crypto Native | 回答"为什么选择我们"       |
| **精选店铺**    | 展示 3-6 个品牌化效果好的真实店铺                       | 案例展示"用我们能做出什么" |
| **网络活跃度**  | 最新上架商品（带店铺归属）                              | 证明"网络是活的"           |
| **平台统计**    | 真实的总店铺数、总商品数、支持的链                      | 底部社会证明               |

**设计原则**：

- 即使只有 20 个店铺，首页也不会显得空（精选 6 个就满了）
- 强调的是"建站平台"而非"购物市场"
- 信息层级遵循 Landing Page 转化漏斗：Why → What → Proof
- 随着店铺和商品增长，未来可以逐步加入分类和商品搜索

---

## 3. 页面布局设计

### 3.1 目标布局（从上到下）

信息层级：**Why（Hero + Value Props）→ What（Featured Stores）→ Proof（Activity + Stats）**

```
┌─────────────────────────────────────────────────┐
│                   Header                         │  ← 保持不变
├─────────────────────────────────────────────────┤
│                                                  │
│  Hero Section (Store Builder CTA)                │
│  "Launch Your Web3 Store"                        │
│  [Create Store] [Explore Stores ↓]               │
│  ─── 或已登录卖家态 ───                          │
│  "Welcome back, {name}"                          │
│  [Go to Dashboard] [View Your Store]             │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Value Props (为什么选择我们)                     │
│  🛡️ Buyer Protection  🌐 Own Your Data           │
│  💰 Zero Fees          ⚡ Crypto Native           │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Featured Stores (品牌化案例展示)                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ 🎨brand  │ │ 🎨brand  │ │ 🎨brand  │        │
│  │ header   │ │ header   │ │ header   │        │
│  │  (avatar)│ │  (avatar)│ │  (avatar)│        │
│  │ StoreName│ │ StoreName│ │ StoreName│        │
│  │ ⭐4.8·45品│ │ ⭐4.6·32品│ │ ⭐4.9·18品│        │
│  └──────────┘ └──────────┘ └──────────┘        │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Network Activity (最近上架，带店铺归属)         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
│  │img │ │img │ │img │ │img │ │img │            │
│  │name│ │name│ │name│ │name│ │name│            │
│  │from│ │from│ │from│ │from│ │from│            │
│  └────┘ └────┘ └────┘ └────┘ └────┘            │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Platform Stats (社会证明，底部)                  │
│  [ N Stores ] [ N Products ] [ N Chains ]        │
│                                                  │
├─────────────────────────────────────────────────┤
│                   Footer                         │
└─────────────────────────────────────────────────┘
```

### 3.2 各区域详细设计

#### Hero Section

**替换现有的** `<Hero />` 组件（`apps/web/src/components/Hero/Hero.tsx`）。

**匿名访客态（默认）**：

- **主标题**: "Launch Your Web3 Store" / "创建你的 Web3 店铺" (i18n)
- **副标题**: 突出零费用、数据自主权、加密货币原生
- **CTA 按钮**:
  - 主按钮: "Create Your Store" → 跳转到注册/onboarding
  - 次按钮: "Explore Stores ↓" → 锚点滚动到 `#featured-stores`
- **统计数据**: 从后端 API 获取真实数据（店铺总数、商品总数），不再硬编码
- **视觉**: 保持渐变背景风格，但文案和 CTA 完全重写

**已登录卖家态**：

- **主标题**: "Welcome back, {storeName}" / "欢迎回来, {storeName}"
- **CTA 按钮**:
  - 主按钮: "Go to Dashboard" → `/admin`
  - 次按钮: "View Your Store" → `/store/{peerID}`
- **视觉**: 同样的渐变背景，但高度缩减（不需要大段营销文案）

**已登录买家态**（无店铺的已登录用户）：

- 保持匿名态布局，但 "Create Your Store" 按钮变为 "Start Selling" + 增加 "Browse Stores ↓"

**移动端布局（375px）**：

- 标题缩短为 1 行
- 只保留 1 个主 CTA 按钮，次按钮改为文字链接
- 统计数据移到下方 Platform Stats Section，不在 Hero 内展示
- Hero 整体高度压缩（不超过 1 屏的 60%）

#### Value Props Section（新组件）

**紧跟 Hero，回答"为什么选择 Mobazha"**。

- **内容**: 4 个差异化卖点卡片
  - Buyer Protection (Escrow) — 买家保障
  - Own Your Data (Self-Hosted Option) — 数据自主
  - Zero Platform Fees — 零费用
  - Crypto Native — 加密货币原生支付
- **样式**: 图标 + 标题 + 简短描述的卡片 grid（2×2 或 4×1）
- **移动端**: 2×2 grid，每个卡片紧凑排列

#### Featured Stores Section（新组件）

**品牌化案例展示，而非买家购物发现。**

- **数据来源**: `searchProfiles({ query: '*' })` — 已有 API，返回 `SearchedUser[]`
- **排序**: 综合活跃度 + 品牌化完成度排序（详见 4.2 节排序公式）
- **Store Card 设计**（利用 PG-201 品牌化能力作为橱窗）:

```
┌─────────────────────────┐
│  ┌──────────────────┐   │
│  │   Header Image    │   │  ← profile.headerHashes 或用 --store-primary 渐变
│  │   / Brand Color   │   │  ← 卡片顶部条带使用店铺品牌色
│  │    ┌─────┐        │   │
│  │    │Avatar│        │   │
│  │    └─────┘        │   │
│  └──────────────────┘   │
│  Store Name              │  ← user.name
│  Short Description       │  ← user.shortDescription (截断 2 行)
│  ⭐ 4.8 (123) · 45 品   │  ← rating + listingCount
│  [Visit Store →]         │  ← /store/{peerID}
└─────────────────────────┘
```

**品牌化橱窗要点**：

- 卡片顶部 Header 区域使用店铺的 `--store-primary` 颜色作为渐变背景（如无 headerImage）
- 如果店铺配置了 header image，直接展示
- "Visit Store →" 按钮使用店铺品牌色，让每张卡片都传递店铺的品牌个性
- 这是 Mobazha 品牌化能力的核心展示——让潜在卖家看到"我的店也能这么有个性"

**按店铺数量的展示策略**：

| 店铺数     | 展示策略                                                       |
| ---------- | -------------------------------------------------------------- |
| **0 个**   | 隐藏整个区域，或显示 "Be the first to create a store" + CTA    |
| **1-2 个** | 单行横排（不用 Grid），搭配鼓励文案 "Join the growing network" |
| **3-5 个** | 自适应 Grid（移动端横向滚动 snap）                             |
| **6+ 个**  | 3 列 Grid，最多展示 6 个 + "View All Stores →" 链接            |

- **响应式**: 移动端横向滚动 snap，桌面端 2×3 或 3×2 grid
- **加载态**: 骨架屏（参考 PG-105 Dashboard 模式）

#### Network Activity Section（替代 Latest Products）

**保持 Stores First 叙事，商品是"发现店铺的入口"而非终点。**

- **替换现有的** Trending + Featured + Categories 三个区域
- **数据来源**: `SEARCH_API.LISTINGS_FRESH(limit)` — 已有 API
- **展示**: 复用现有 `ProductSection` 组件
- **标题**: "Network Activity" / "全网最新动态"
- **关键变化**:
  - 不分类，只展示一个"最新上架"列表
  - **每个商品卡片必须带有所属店铺的名称和链接**（"from {Store Name}"），让商品成为发现店铺的入口
  - 无数据时不显示该区域（而非显示 placeholder）
- **加载态**: 骨架屏

#### Platform Stats Section（底部社会证明）

- **位置**: 页面底部，作为社会证明收尾（不再夹在中间）
- **数据**: MVP 阶段用前端 `searchProfiles({ query: '*', pageSize: 1 })` 获取 `total` 字段作为店铺数
- **展示**: 3 列水平排列
  - `{N}` Active Stores
  - `{N}` Products Listed
  - `{N}` Chains Supported（可硬编码，目前 BNB/ETH/Solana）
- **样式**: 大字体数字 + 描述文字，暗色背景区域，与 Footer 衔接
- **加载态**: 数字使用骨架屏占位

---

## 4. 技术实施方案

### 4.1 涉及文件

| 文件                                     | 操作     | 说明                                                                                                                        |
| ---------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/page.tsx`              | **重构** | SaaS 分支完全重写                                                                                                           |
| `apps/web/src/components/Hero/Hero.tsx`  | **重构** | 匿名/已登录卖家/已登录买家三态 + 移动端简化布局                                                                             |
| `apps/web/src/components/SaaSHome/`      | **新建** | 统一目录：`FeaturedStoresSection.tsx` + `StoreCard.tsx` + `ValuePropsSection.tsx` + `PlatformStatsSection.tsx` + `index.ts` |
| `packages/core/services/api/products.ts` | **扩展** | 新增 `getFeaturedStores()` / `getLatestProducts()`                                                                          |
| `packages/core/services/dataService.ts`  | **扩展** | 新增 data service 方法                                                                                                      |
| `packages/core/config/apiPaths.ts`       | **扩展** | 可能新增 SEARCH_API 路径                                                                                                    |
| `packages/core/i18n/locales/en.ts`       | **扩展** | 新增 i18n key                                                                                                               |
| `packages/core/i18n/locales/zh.ts`       | **扩展** | 新增 i18n key                                                                                                               |

### 4.2 数据获取策略

#### 已有 API（可直接使用）

| 数据              | API                                                                      | 前端函数                                     |
| ----------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| 搜索店铺/profiles | `SEARCH_API.SEARCH_PROFILES` (`/search/v1/profiles?format=mobile`)       | `productsApi.searchProfiles({ query: '*' })` |
| 最新商品          | `SEARCH_API.LISTINGS_FRESH(limit)` (`/search/v1/listings/fresh?limit=N`) | 需新增前端函数                               |
| 热门商品          | `SEARCH_API.LISTINGS_HOT(hours, limit)`                                  | `productDataService.getTrendingProducts()`   |

#### SearchedUser 返回字段（已有）

```typescript
interface SearchedUser {
  peerID: string;
  name: string; // 店铺名
  handle?: string; // @handle
  avatar?: string; // 头像 URL
  shortDescription?: string; // 简短描述
  location?: string; // 位置
  listingCount: number; // 商品数
  rating: number; // 平均评分
  reviewCount: number; // 评价数
}
```

#### 精选店铺排序公式

MVP 阶段使用客户端排序，优先展示品牌化效果好的店铺：

```typescript
function computeStoreScore(user: SearchedUser): number {
  const activityScore = user.listingCount * 0.3 + user.reviewCount * 0.2;
  const qualityScore = user.rating * 0.2;
  // 品牌化完成度：有头像、有描述、有一定商品量
  const brandScore =
    (user.avatar ? 1 : 0) * 0.1 +
    (user.shortDescription ? 1 : 0) * 0.1 +
    (user.listingCount > 0 ? 1 : 0) * 0.1;
  return activityScore + qualityScore + brandScore;
}
```

#### 可能需要新增的后端 API

| 需求     | 建议端点                           | 说明                                                  |
| -------- | ---------------------------------- | ----------------------------------------------------- |
| 平台统计 | `GET /search/v1/stats`             | 返回 `{ storeCount, listingCount, transactionCount }` |
| 精选店铺 | `GET /search/v1/profiles/featured` | 按活跃度排序的 top N 店铺                             |

**MVP 阶段可以全部用现有 API**：`searchProfiles({ query: '*' })` 获取所有店铺（total 字段即店铺总数），客户端排序取 top 6。

#### 数据缓存策略

首页是高频访问页面，数据不需要实时性。使用 React Query / SWR：

```typescript
// staleTime: 5 分钟，首页数据可以容忍 5 分钟的延迟
const { data: stores } = useQuery({
  queryKey: ['featured-stores'],
  queryFn: getFeaturedStores,
  staleTime: 5 * 60 * 1000,
});

const { data: products } = useQuery({
  queryKey: ['latest-products'],
  queryFn: getLatestProducts,
  staleTime: 5 * 60 * 1000,
});
```

### 4.3 i18n Key 规划

```typescript
// packages/core/i18n/locales/en.ts
saasHome: {
  hero: {
    title: 'Launch Your Web3 Store',
    subtitle: 'Zero commissions. Own your data. Accept crypto payments with buyer protection.',
    ctaCreate: 'Create Your Store',
    ctaExplore: 'Explore Stores',
    // 已登录卖家态
    welcomeBack: 'Welcome back, {{storeName}}',
    ctaDashboard: 'Go to Dashboard',
    ctaViewStore: 'View Your Store',
    // 已登录买家态
    ctaStartSelling: 'Start Selling',
    ctaBrowse: 'Browse Stores',
  },
  valueProps: {
    buyerProtection: {
      title: 'Buyer Protection',
      description: 'Every transaction is secured by smart contract escrow',
    },
    selfHosted: {
      title: 'Own Your Data',
      description: 'Run your store on your own hardware or use our hosted service',
    },
    lowFees: {
      title: 'Zero Platform Fees',
      description: 'No monthly subscriptions, no transaction commissions',
    },
    cryptoNative: {
      title: 'Crypto Native',
      description: 'Accept BNB, ETH, SOL and more with instant settlement',
    },
  },
  featuredStores: {
    title: 'Featured Stores',
    subtitle: 'See what sellers are building on the Mobazha network',
    visitStore: 'Visit Store',
    products: '{{count}} products',
    viewAll: 'View All Stores',
    // 空/少量态
    emptyTitle: 'Be the First',
    emptySubtitle: 'Create your Web3 store and join the network',
    growingCta: 'Join the growing network',
  },
  networkActivity: {
    title: 'Network Activity',
    subtitle: 'Recently listed products from stores across the network',
    fromStore: 'from {{storeName}}',
  },
  stats: {
    activeStores: 'Active Stores',
    productsListed: 'Products Listed',
    chainsSupported: 'Chains Supported',
  },
},
```

### 4.4 组件结构

```
apps/web/src/components/
├── SaaSHome/                         ← SaaS 首页专属组件（统一目录）
│   ├── FeaturedStoresSection.tsx      ← 精选店铺区域
│   ├── StoreCard.tsx                  ← 单个店铺卡片（品牌色橱窗）
│   ├── ValuePropsSection.tsx          ← Web3 差异化卖点
│   ├── PlatformStatsSection.tsx       ← 平台统计（底部社会证明）
│   └── index.ts                       ← barrel export
└── Hero/
    └── Hero.tsx                       ← 重构：三态（匿名/卖家/买家）+ 移动端简化
```

### 4.5 page.tsx SaaS 分支重构

```tsx
// 当前 SaaS 分支（简化版）
{!standalone && (
  <>
    <Hero />                    // 商品市场 Hero
    <ProductSection ... />      // Trending Products
    <ProductSection ... />      // Featured & Services
    <CategoriesSection ... />   // 硬编码分类
  </>
)}

// 目标 SaaS 分支（Why → What → Proof 漏斗）
{!standalone && (
  <>
    <Hero />                        // Why: 三态 CTA
    <ValuePropsSection />           // Why: 差异化卖点
    <FeaturedStoresSection />       // What: 品牌化案例展示
    <ProductSection                 // Proof: 网络活跃度
      title={t('saasHome.networkActivity.title')}
      showStoreName                 // 每个商品带店铺归属
      ...
    />
    <PlatformStatsSection />        // Proof: 底部社会证明
  </>
)}
```

---

## 5. 删除/替换清单

| 移除                                | 替换为                        | 原因                       |
| ----------------------------------- | ----------------------------- | -------------------------- |
| `placeholderProducts`（假商品数据） | 真实 API 数据，无数据时不显示 | 不再"假装繁荣"             |
| `categories` 硬编码数组             | 删除，阶段 1 不需要分类       | 分类在商品稀疏时是负体验   |
| Featured & Services 区域            | `FeaturedStoresSection`       | 以店铺为核心               |
| Hero 中硬编码统计 (10K+, 50K+)      | 真实统计数据                  | 诚实展示                   |
| 单一 Hero 状态                      | 三态 Hero（匿名/卖家/买家）   | 不同用户看到不同的行动引导 |

---

## 6. 实施步骤

### Step 1: 数据层准备

1. 在 `packages/core/services/api/products.ts` 中新增：
   - `getFeaturedStores()`: 调用 `searchProfiles({ query: '*' })`，客户端排序取 top 6
   - `getLatestProducts()`: 调用 `SEARCH_API.LISTINGS_FRESH(12)`
2. 在 `packages/core/services/dataService.ts` 中新增对应方法
3. 新增 i18n keys（en.ts + zh.ts）

### Step 2: 新建 SaaSHome 组件

1. `StoreCard.tsx` — 品牌化橱窗卡片（品牌色 header / 封面图 + 头像 + 名称 + 描述 + 评分 + 商品数）
2. `FeaturedStoresSection.tsx` — 精选店铺区域（含 loading 骨架屏 / empty / 少量态策略）
3. `ValuePropsSection.tsx` — Web3 差异化卖点（4 卡片 grid）
4. `PlatformStatsSection.tsx` — 平台统计（真实数据 + 骨架屏加载态）

### Step 3: 重构 Hero

1. 修改 `Hero.tsx`：实现三态（匿名 / 已登录卖家 / 已登录买家）
2. 移动端简化布局（标题 1 行 + 1 主 CTA + 文字链接次 CTA）
3. 保持渐变背景视觉风格

### Step 4: 重构 page.tsx

1. 修改 SaaS 分支：按 Why → What → Proof 顺序组装新组件
2. 移除 `placeholderProducts`、`categories`、`featuredProducts` 相关代码
3. 独立站分支保持不变

### Step 5: 测试 & 打磨

1. 验证 SaaS 模式首页（localhost:3000）— 匿名态、已登录卖家态、已登录买家态
2. 验证独立站模式首页（localhost:3001）不受影响
3. 移动端响应式测试（375px iPhone SE）
4. 暗色模式测试（所有新组件在 dark theme 下正常）
5. 空数据状态测试（0 店铺、1-2 店铺、3-5 店铺、6+ 店铺、0 商品）
6. 骨架屏加载态验证

---

## 7. 不在本次范围

| 排除项                                       | 原因                   | 何时考虑                           |
| -------------------------------------------- | ---------------------- | ---------------------------------- |
| 后端新增 `/search/v1/stats` 端点             | MVP 用现有 API 可实现  | 阶段 2（有真实数据统计需求时）     |
| 后端新增 `/search/v1/profiles/featured` 端点 | 客户端排序 sufficient  | 阶段 2（店铺 >100 时需服务端排序） |
| 店铺分类/标签体系                            | 阶段 1 不需要          | 阶段 2                             |
| 个性化推荐                                   | 归属 PG-204            | PG-204 执行时                      |
| `/stores` 独立页面                           | 阶段 1 用锚点代替      | 阶段 2（需要独立的店铺发现入口时） |
| Marketplace 搜索页重构                       | 独立任务               | 有需求时                           |
| 独立站首页                                   | 已完成品牌化（PG-201） | 不受影响                           |

---

## 8. 前瞻性方向（Future，非本次范围）

以下方向记录为后续产品迭代的种子，不在 PG-207 阶段 1 实施。

### 8.1 AI Agent 标识

路线图强调 "AI Agent 原生" 是核心差异化（Section 1.1）。未来 Store Card 可以展示 "AI-Powered" 标签，表明该店铺由 AI Agent 运营——这是 Shopify 无法复制的独特视觉标识。当 AI Agent 经济成熟时，首页可以增加 "AI-Powered Stores" 专区。

### 8.2 网络脉动（Network Pulse）

实时展示匿名化的网络活动流（最近的交易、新开店铺、新上架商品），营造"这个网络是活的"的感觉。类似 Uniswap 首页的实时交易数据。需要 WebSocket 或 SSE 支持。

### 8.3 去中心化网络可视化

当独立站数量增长后，首页可以展示一个全球节点地图，展示分布在各处的独立站节点——这是去中心化平台独有的视觉叙事，极具差异化冲击力。

### 8.4 `/stores` 独立发现页

阶段 2 时新建独立的 `/stores` 页面，作为"Explore Stores" CTA 的目标。包含搜索、筛选、分类浏览店铺。此时 Hero 次按钮从锚点改为跳转到 `/stores`。

---

## 9. 参考

- **当前 SaaS 首页代码**: `apps/web/src/app/page.tsx`
- **当前 Hero 组件**: `apps/web/src/components/Hero/Hero.tsx`
- **搜索 API paths**: `packages/core/config/apiPaths.ts` → `SEARCH_API`
- **Profile 搜索实现**: `packages/core/services/api/products.ts` → `searchProfiles()`
- **店铺品牌化**: `apps/web/src/components/store-sections/` (PG-201 已完成)
- **产品设计讨论来源**: [店铺外观与Collections设计](19a3dba7-1bdf-4ca3-afe5-047b48bfea8a) 第 89 行
- **路线图战略定位**: `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 1.2 + 4.7
