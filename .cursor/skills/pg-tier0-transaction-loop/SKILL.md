---
name: pg-tier0-transaction-loop
description: 'Tier 0 交易闭环修复执行指南（PG-001~PG-007）。购物车→结账、SEO、评价、搜索、Footer/政策页。触发词："修复交易闭环", "Tier 0", "PG-001"~"PG-005", "PG-006", "PG-007".'
---

# Tier 0: 交易闭环修复执行指南

> **目标**：修复核心交易流程断裂点，让买家能在独立站上（手机/TG/桌面）完成一笔完整交易。
> **主场景**：买家通过社交链接到达卖家独立站 → 浏览 → 购买 → 评价 → 分享。
> **兼容要求**：SaaS 模式同步可走通。
> **触发词**："修复交易闭环"、"Tier 0"、"PG-001"~"PG-005"

## 执行前检查

1. 读取 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 9 → Tier 0 进度
2. 找到第一个 ⏳ 的任务
3. 告知用户将要执行的任务和预估工作量

### V1 前置能力确认（首次执行时完成）

在开始第一个 PG 任务前，先验证以下现有能力在独立站模式下可用：

| 能力             | 确认方法                                                      | 如不可用则                     |
| ---------------- | ------------------------------------------------------------- | ------------------------------ |
| **买家订单列表** | 检查 `/account/orders` 路由和页面是否存在且接入真实 API       | 纳入 PG-001 范围               |
| **买家订单详情** | 检查 `/account/orders/:id` 页面是否展示订单状态和 Escrow 进度 | 纳入 PG-001 范围               |
| **买卖聊天**     | 检查商品详情页是否有"联系卖家"入口，Matrix 聊天是否可用       | 纳入 PG-005 范围               |
| **买家登录**     | 检查 Casdoor OAuth popup 在独立站域名下是否正常工作           | 记录为配置问题（非前端工作量） |

确认结果记录在 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 9 备注中。

## AI-First 原则

每个 Tier 0 任务在实现时需考虑 AI 增强层（参见 Roadmap Section 6）：

- PG-002：AI 自动生成 meta description（接入 AI 基础设施）
- PG-003：AI 评价摘要（聚合评价生成一句话总结）
- PG-004：AI 语义搜索（自然语言查询理解）
- 如果 AI 增强无法立即实现，先预留接口和 UI 占位

## 独立站优先原则

V1 主要场景是独立站。买家通过 TG/社交链接到达卖家的独立站购物，可能完全不感知 SaaS 平台的存在。

- 独立站首页 = 品牌着陆页（不是 marketplace），需有商品展示和店铺信息
- SEO + OG 标签是独立站被发现的生命线
- 买家登录体验要自然（Casdoor OAuth popup → "登录以完成购买"）
- 同一套前端通过 `isStandalone` 环境变量兼容 SaaS 和独立站

## 产品设计贯穿原则

以下设计维度不是独立任务，而是执行每个 PG 任务时需持续考虑的：

- **Crypto 支付 UX**：余额预检 → gas 透明 → 交易等待 UI → 失败恢复（PG-001）
- **法币等价显示**：所有价格旁标注法币等价（PG-001/PG-005）
- **术语抽象**：用"买家保障"代替 Escrow，"网络手续费"代替 Gas Fee（PG-005）
- **买卖沟通**：确保商品详情页和订单页有"联系卖家"入口（PG-005）
- **买家无需登录即可浏览**：结账时才要求登录（PG-001）

## Platform View 移动端策略

关键操作页面不使用纯响应式，而是设计独立的移动端视图。详见 Roadmap Section 4.7 第 7 条和 Section 5b。

**Tier 0 逐任务移动端策略**：

| PG 任务    | 需分视图的页面            | 策略                                                            |
| ---------- | ------------------------- | --------------------------------------------------------------- |
| **PG-001** | ✅ **Checkout**（最关键） | `CheckoutDesktop` + `CheckoutMobile`，共享 `useCheckout` hook   |
| **PG-001** | 🔄 Cart                   | Desktop: CartDrawer / Mobile: 全页购物车（组件级替换即可）      |
| **PG-004** | ✅ **Search**             | Desktop: `SearchInline` / Mobile: `SearchOverlay`（全屏覆盖层） |
| PG-001     | 📱 订单确认页             | 响应式即可                                                      |
| PG-003     | 📱 评价表单               | 响应式即可                                                      |
| PG-005     | 📱 Footer/政策页          | 响应式即可                                                      |

**基础设施（PG-001 首任务时搭建）**：

1. 新建 `hooks/usePlatform.ts` — 扩展现有 `useBreakpoint()`，增加 `isTGMiniApp` 检测
2. 新建 `providers/TGMiniAppProvider.tsx` — MainButton/BackButton/HapticFeedback 增强
3. 确立路由页面 thin shell 模式：`usePlatform()` → 分发 Desktop/Mobile 视图

**TG Mini App 增强**：移动端视图 + TG 特性叠加（不是第三套视图）

- `MainButton` 替代底部固定 CTA（"去结账"/"确认支付"）
- `BackButton` 替代自定义返回按钮
- `HapticFeedback` 在加购/支付确认时触发

> 完整设计指导见 Roadmap Section 4.7

## PG-001: 购物车 + 结账（Mobile-First）

### 问题

- `apps/web/src/app/cart/page.tsx` 使用 mock 数据（`mockCartItems`）
- checkout 页面仅支持单品直接购买（URL params: `?slug=&peerID=&quantity=`）
- 无法从购物车发起多商品结账
- 结账页无 MobilePageHeader，移动端无法返回
- MobileHeader 未全局注册，搜索入口不一致
- 部分按钮触摸目标小于 44px

### 设计原则（不照搬 Desktop）

Desktop 使用 Modal 弹窗做购物车和结账，这在 Web 应用中体验不佳：

- Modal 不可分享 URL、不可返回、SEO 不友好
- 复杂结账流在 Modal 内空间受限

**Unified 采用现代 Web 电商模式 + Platform View 分视图**：

| 组件     | Desktop 模式   | Unified Desktop                                  | Unified Mobile / TG                          |
| -------- | -------------- | ------------------------------------------------ | -------------------------------------------- |
| 快速预览 | Modal 购物车   | **Cart Drawer**（侧滑抽屉）                      | **全页购物车**（swipe-to-delete）            |
| 详细管理 | 同上 Modal     | **独立 `/cart` 页面**                            | **同路由，移动端优化布局**                   |
| 结账     | Modal 内多步骤 | **`CheckoutDesktop`** 多步 Wizard + sidebar 摘要 | **`CheckoutMobile`** 单屏滚动 + 底部固定 CTA |

> **结账是 V1 第一个采用 Platform View 分视图的页面**。路由页面 `/checkout/page.tsx` 是 thin shell，通过 `usePlatform()` 分发到桌面/移动端视图组件。两个视图共享 `useCheckout()` hook 的全部业务逻辑。

### 历史项目参考（看意图，重新设计）

**Desktop API**（逻辑复用）：

```
API: frontend/src/api/shoppingCart.js
  - getShoppingCarts()    → GET /carts
  - addToShoppingCart()   → POST /carts/{peerID}
  - removeCartItem()      → DELETE /carts/{peerID}/{listingID}
  - clearShoppingCarts()  → DELETE /carts
```

**Mobile App 移动端 UX 参考**（参考信息层级和流程编排，不照搬 RN 组件）：

```
结账流：checkout.js → paymentMethod.js → purchaseState.js → paymentSuccess.js
  → 参考：步骤拆分、支付状态过渡动画、成功页信息架构
  → 重新设计：单屏滚动 + 底部 CTA（非多页跳转）

购物车：shoppingCart.js + ShoppingCart template
  → 参考：按卖家分组展示、底部结算栏
  → 重新设计：全页购物车（非 Modal）

商品详情：listing.js + ItemDetail organism
  → 参考：图片浏览、信息分区、底部操作栏
  → 重新设计：全宽 Swiper + Accordion 折叠内容

参考路径：mobazha-mobile/screens/、mobazha-mobile/components/
完整映射：Roadmap Section 8.1a
```

### 实施步骤

1. **Cart Drawer 组件**（新增）
   - 从右侧滑入的购物车预览
   - 显示商品列表 + 小计 + "查看购物车" + "去结账" 按钮
   - 添加商品到购物车后自动打开（短暂显示，确认添加成功）

2. **Cart 页面重写**
   - 接入真实 API（`cartApi.getCarts()`）
   - 按卖家分组展示
   - 数量修改、删除、清空
   - 优惠码输入（如商品支持）
   - 每个卖家分组有独立的"去结账"按钮

3. **Checkout — Platform View 分视图**（V1 第一个分视图页面）

   **Step 0: 基础设施搭建**（首次执行，后续 PG 任务复用）
   - 新建 `hooks/usePlatform.ts`（扩展现有 `useBreakpoint`，增加 `isTGMiniApp`）
   - 新建 `providers/TGMiniAppProvider.tsx`（MainButton/BackButton/HapticFeedback）
   - 路由 thin shell 模式：`checkout/page.tsx` 只做 `usePlatform()` → 分发

   **共享业务逻辑 — `useCheckout()` hook**：
   - 购物车/单品数据获取
   - 地址管理（CRUD、默认地址）
   - 配送方式选择
   - 支付币种选择 + 余额预检 + gas 预估
   - 订单提交 + 支付签名 + 状态追踪
   - 表单验证、错误处理

   **`CheckoutDesktop`**（桌面端视图）：
   - 左侧主区：多步 Wizard（地址 → 配送 → 支付）
   - 右侧 sidebar：订单摘要（商品列表 + 价格 + 法币等价 + 买家保障提示）
   - 步骤间有明确的进度指示器

   **`CheckoutMobile`**（移动端视图）：
   - 单屏纵向滚动，各区块以 Accordion/Card 形式排列
   - 底部固定 CTA 栏（价格 + "确认支付"按钮），TG Mini App 中用 `MainButton` 替代
   - 表单输入优化：大触摸目标（≥48px）、适配移动端键盘、autofill 支持
   - 返回按钮：TG 中用 `BackButton`，普通移动端用 `MobilePageHeader`

   **Crypto 支付执行**（两端共用逻辑，UI 适配各自视图）：
   - **余额预检**：选择支付币种后立即显示钱包余额和预估 gas，余额不足时提前提示
   - **交易签名**：点击"确认支付"后唤起钱包签名，页面显示"等待钱包确认"
   - **交易等待**：签名完成后显示等待 UI（进度动画 + 预估确认时间 + "可安全关闭页面"提示）
   - **成功**：跳转订单确认页
   - **失败恢复**：明确错误原因 + 可操作下一步（重试/换币种/联系卖家）

   **入口和登录**：
   - 支持单品直购（Buy Now）和购物车结账两种入口
   - 买家无需登录即可浏览，结账时才要求登录（Casdoor OAuth popup → "登录以完成购买"）

4. **订单确认页**（新增 `/checkout/confirmation`）
   - 支付成功后跳转到此页面（不是直接回首页或订单列表）
   - 内容：感谢信息 + 订单编号 + Escrow 初始状态 + 预计流程时间线
   - CTA："查看订单详情" + "继续购物"
   - ShareButton 集成（"分享你购买的商品"）
   - 移动端：确保在 TG Mini App 内显示正常

5. **Header MiniCart Badge**
   - 购物车图标 badge 接入真实 count
   - 点击打开 Cart Drawer（非跳转页面）

6. **移动端全流程保障**（原 PG-006，现合并到 PG-001）
   - 结账页添加 `MobilePageHeader`（返回按钮 + "结账"标题）
   - root layout 中全局注册 MobileHeader（`md:hidden`），统一搜索行为
   - 所有内容页（checkout、cart、listing/new）都有 MobilePageHeader
   - 确认底部固定的 Place Order 栏在所有机型正常显示（iOS safe-area-bottom）
   - 所有可交互元素最小 44x44px
   - MobileNav 底栏在 checkout/payment 页面正确隐藏

7. **验收**
   - 在 375px iPhone SE 模拟器上跑完全流程：首页→搜索→商品→加购物车→Cart Drawer→Cart 页面→结账→订单确认页→下单
   - 桌面端 1440px 同步验证

### 关键文件

| 文件                                                   | 修改内容                                      |
| ------------------------------------------------------ | --------------------------------------------- |
| `apps/web/src/hooks/usePlatform.ts`                    | **新建** — 平台检测 hook（Desktop/Mobile/TG） |
| `apps/web/src/providers/TGMiniAppProvider.tsx`         | **新建** — TG Mini App 增强层                 |
| `apps/web/src/app/checkout/page.tsx`                   | 改为 thin shell，`usePlatform()` 分发         |
| `apps/web/src/components/checkout/CheckoutDesktop.tsx` | **新建** — 桌面端结账视图                     |
| `apps/web/src/components/checkout/CheckoutMobile.tsx`  | **新建** — 移动端结账视图                     |
| `apps/web/src/components/checkout/useCheckout.ts`      | **新建** — 结账共享业务逻辑 hook              |
| `apps/web/src/app/checkout/confirmation/page.tsx`      | **新建** — 订单确认页（响应式）               |
| `apps/web/src/app/cart/page.tsx`                       | 全面重写，接入真实 API                        |
| `apps/web/src/components/cart/CartDrawer.tsx`          | **新建** — 桌面端侧滑购物车                   |
| `packages/core/services/api/cart.ts`                   | 确认 API 完整性                               |
| `apps/web/src/components/Header/Header.tsx`            | cart badge + Drawer 触发                      |

---

## PG-002: SEO + 社交分享

### 问题

1. 商品链接分享到社交媒体/聊天工具时没有预览卡片（无 Open Graph 标签）
2. 没有分享按钮，用户需手动复制 URL

> 合并原 PG-002（SEO）和原 PG-205（社交分享）— 两者强耦合：没有 OG 标签的链接分享出去也没有卡片预览。

### 实施步骤

1. **SEO 工具函数**
   - `packages/core/utils/seo.ts` — 生成 meta tags 的工具
   - 支持 title、description、image、url、type

2. **动态 Meta 标签**（使用 `react-helmet-async`）
   - `/product/:slug` — 商品标题、描述、首图、价格
   - `/store/:peerId` — 店铺名、简介、头像
   - `/marketplace` — 固定 meta

3. **ShareButton 组件**
   - 复制链接（带 toast 确认）
   - 分享到 Twitter/X（预填文案）
   - 分享到 Telegram
   - 生成二维码（Dialog 展示）
   - 集成位置：ProductDetail、Store 页面、订单完成页

4. **OG 标签预渲染**（关键：CSR 对社交爬虫无效）
   - 社交平台爬虫（Twitter/Telegram/Discord）不执行 JS，纯 CSR 的 meta 标签对它们不可见
   - **方案 A（推荐）**：后端为 `/product/:slug` 和 `/store/:peerId` 提供 HTML 预渲染端点，返回带 OG 标签的 HTML shell（仅 `<head>` 部分有效即可）
   - **方案 B**：使用 Cloudflare Workers / Vercel Edge 等边缘渲染，检测 User-Agent 为爬虫时返回预渲染 HTML
   - 非爬虫请求正常走 CSR SPA
   - V1 至少保证分享到 Telegram/Twitter 时有预览卡片

5. **技术 SEO 基础设施**（独立站被搜索引擎发现的基础）
   - **sitemap.xml**：动态生成，包含所有公开商品和店铺页面 URL
     - 独立站模式：后端提供 `/sitemap.xml` 端点，列出所有活跃商品的 canonical URL
     - 商品更新时自动更新 sitemap
   - **JSON-LD 结构化数据**：商品详情页输出 Product schema
     - 包含：name, description, image, price, currency, availability, seller
     - 使用 `<script type="application/ld+json">` 嵌入
     - 店铺页输出 Organization/Store schema
   - **robots.txt**：独立站根目录提供，允许搜索引擎爬取商品和店铺页
   - **Canonical URL**：每个商品和页面有唯一的 canonical URL（`<link rel="canonical">`）
     - 防止同一商品通过不同路径被索引为重复内容

---

## PG-003: 评价系统重设计

### 问题

买家完成订单后无法提交评分和评价。

### 设计决策：简化评分维度

Desktop 的 5 维评分（overall、quality、description、deliverySpeed、customerService）摩擦过大：

- **完成率低**：5 个滑块 + 文字 = 用户放弃
- **数据稀疏**：维度过多导致每个维度样本不足
- **展示复杂**：商品页要展示 5 个维度的聚合分数

**Unified 采用简化模式**（对标 Amazon/Etsy）：

| 维度     | 类型           | 必填 |
| -------- | -------------- | ---- |
| 总体评分 | 1-5 星         | 是   |
| 评价文字 | 最多 2000 字符 | 否   |
| 评价图片 | 最多 5 张      | 否   |

> 产品未上线，后端 API 可同步简化：`completeOrder()` 去掉多维评分字段，只保留 `rating`(1-5) + `review`(string) + `images`([]string)。不需要兼容旧数据模型。

### 实施步骤

1. **ReviewForm 组件**
   - 星级评分（可交互 StarRating）
   - 文字评价（Textarea，字数统计）
   - 图片上传（拖拽/点击，预览缩略图）
   - "提交评价"按钮

2. **订单完成流程集成**
   - 在订单详情页添加"确认收货 + 评价"操作
   - Dialog 形式打开 ReviewForm → 提交 → 标记完成
   - 支持"跳过评价，直接完成"（降低放弃率）

3. **ReviewList 组件**
   - 评价列表（头像 + 星级 + 文字 + 图片 + 时间）
   - 集成到商品详情页底部和店铺页
   - 评价统计摘要（平均分 + 分数分布柱状图）

4. **API 集成**
   - `ordersApi.completeOrder()` — 提交简化评分（`rating` 1-5 + `review` string + `images` []string）
   - 后端同步简化：去掉多维评分字段（quality/deliverySpeed/customerService 等），只保留 rating + review + images
   - 图片上传复用现有 image upload 基础设施

---

## PG-004: 店内搜索 + 商品发现

### 场景

V1 主场景是独立站。买家在某个卖家的店铺内浏览和搜索商品。全局跨店搜索是 SaaS 市场发现功能，留 V1.1。

### 问题

- 当前店内搜索基础能力有（40%），但缺少搜索建议、筛选、分类浏览
- 独立站首页商品展示需要优化（不是 marketplace 列表）
- Header 搜索框在独立站模式下应搜索当前店铺内的商品

### 实施步骤

1. **店内搜索增强**（Platform View 分组件）
   - **桌面端 `SearchInline`**：Header 内搜索框 + 下拉建议列表 + 不离开当前页
   - **移动端 `SearchOverlay`**：点击搜索图标 → 全屏搜索覆盖层（大输入框 + 即时建议 + 最近搜索）
   - 搜索结果页：ProductCard 网格 + 关键词高亮（响应式即可）
   - 支持：关键词、分类过滤、价格排序
   - 两端共享搜索逻辑（API 调用、防抖、建议获取）

2. **商品分类浏览**
   - 店铺首页展示商品分类导航（如果卖家有多个分类）
   - 分类页：按分类筛选的商品网格

3. **店铺首页优化**（独立站 `/` 首页）
   - 店铺信息区：名称 + logo + 封面 + 简介
   - 商品展示：最新/精选商品网格
   - 搜索框入口
   - 接受的支付方式标识

4. **零结果处理**
   - 搜索无结果时：推荐其他商品 / "联系卖家询问"
   - 不是空白页面

5. **404 页面**（`apps/web/src/app/not-found.tsx`）
   - 友好的视觉设计（插图 + 说明文字，不是默认浏览器 404）
   - 内容："页面未找到" + 搜索框 + "返回首页"按钮 + 推荐商品（如有）
   - 保持站点 Header 和 Footer 一致
   - 移动端适配

> **全局搜索（V1.1）**：跨店搜索使用 mobazha.info `/api/search` API，在 SaaS marketplace 模式下启用。

---

## PG-005: 信任与安全体验

### 问题

Web3 平台最大的用户障碍不是功能缺失，而是**信任缺失**。买家不了解 Escrow 保护机制，不确定卖家是否可靠，交易流程中缺乏安全感。

### 实施步骤

1. **卖家信任徽章组件** — `SellerTrustBadge`
   - 星级评分（聚合）
   - 成交笔数
   - 注册时长
   - 集成到：商品详情页卖家信息区、店铺页头部、搜索结果卡片

2. **Escrow 状态可视化** — `EscrowStatusBar`
   - 水平进度条：已支付 → 卖家确认 → 已发货 → 买家确认 → Escrow 释放
   - 当前步骤高亮 + 说明文字
   - 集成到订单详情页

3. **买家保障提示** — `BuyerProtectionBanner`
   - 在结账页面显示："你的资金在确认收货前受到保护"（不用 Escrow/智能合约等技术术语）
   - 在商品详情页显示："买家保障 · 加密支付 · 争议仲裁"
   - 简洁、不打断购买流程
   - 术语抽象：遵循 Roadmap Section 4.7 第 4 条

4. **争议入口优化**
   - 订单详情页增加明确的"发起争议"入口
   - 争议流程引导说明

5. **页面 Footer**（`apps/web/src/components/layout/Footer.tsx`）
   - **桌面端**：所有 Storefront 页面底部展示（`hidden md:block`）
   - **移动端**：Footer 隐藏，底部导航由 MobileNav 提供
   - 内容分区：
     - **店铺信息**：店铺名、简介摘要
     - **快速链接**：首页、所有商品、联系卖家
     - **政策链接**：配送政策、退换货政策、隐私政策
     - **支付方式**：接受的加密货币图标
     - **社交链接**：卖家的社交媒体链接（如有）
   - 响应式：桌面多列展示，移动端隐藏（MobileNav 替代）
   - 通过 Storefront Layout 统一引入，无需各页面单独添加
   - 主内容区需要 `pb-24 lg:pb-8` 避免被 MobileNav 遮挡

6. **店铺政策页**（`apps/web/src/app/policies/[type]/page.tsx`）
   - 三个标准政策页：`/policies/shipping`、`/policies/returns`、`/policies/privacy`
   - 内容来源：卖家在 Admin 设置中自定义（富文本或 Markdown）
   - 如卖家未配置：显示默认模板（"此店铺暂未设置 XX 政策，如有疑问请联系卖家"）
   - 后端需提供政策内容的存取 API（可复用店铺设置 API 扩展字段）
   - SEO：每个政策页有独立的 meta title 和 description

### 关键文件

| 文件                                                      | 修改内容                       |
| --------------------------------------------------------- | ------------------------------ |
| `apps/web/src/components/trust/SellerTrustBadge.tsx`      | 新建                           |
| `apps/web/src/components/trust/EscrowStatusBar.tsx`       | 新建                           |
| `apps/web/src/components/trust/BuyerProtectionBanner.tsx` | 新建                           |
| `apps/web/src/components/layout/Footer.tsx`               | 新建页面 Footer                |
| `apps/web/src/app/policies/[type]/page.tsx`               | 新建政策页（配送/退换货/隐私） |
| `apps/web/src/components/Product/ProductDetail.tsx`       | 集成信任组件                   |
| `apps/web/src/app/checkout/page.tsx`                      | 集成保障提示                   |

---

## PG-007: 独立站 → OpenClaw 集成（V1.1 — 视工作量可提前）

> 此任务不在 Tier 0 V1 范围内，但基础设施已就绪，视 V1 进度可评估提前。

### 背景

独立站部署（Phase S1-S3）和 Webhook 引擎（F11/F11b）均已完成。
本任务补齐从"基础设施就绪"到"Agent 开箱即用"的最后一公里。

### 三个交付物

1. **Webhook → TG 通知配置引导**：install.sh 增加 webhook endpoint 配置步骤，前端 Admin 设置中增加 Webhook 配置入口
2. **Agent API 使用文档**：面向 AI Agent 的 API 文档（Product CRUD、Order lifecycle、认证、curl 示例）
3. **RPi ARM64 镜像优化**：确认 multi-arch 构建、RPi 4B 冒烟测试、install.sh RPi 检测

---

## 完成后更新

1. 更新 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 9 — 状态 ⏳ → ✅ + 日期
2. 更新 `docs/migrations/status.md` — 如有新组件/页面
3. 运行 `pnpm validate:quick` 确认无构建错误
