# Professional Grade Roadmap — Web3 Shopify 专业水准路线图

> **Implementation-local:** This file tracks Unified execution details, not a
> public delivery commitment. Canonical public outcomes live at
> <https://docs.mobazha.org/project/roadmap>.

> **定位**：Mobazha 的目标是成为 Web3 时代的 Shopify。本文档定义从"P2P 交易工具"进化到"专业电商平台"所需的全部工作。
>
> **设计自由度**：产品尚未上线，前后端均可根据最佳用户体验重新设计。**先定义理想 UX，再让 API 跟着走**，不受历史 API 约束。
>
> **与其他路线图的关系**：
>
> - `mobazha_hosting/docs/ARCHITECTURE_ROADMAP.md` — 后端架构演进（Phase A-E2，已完成）
> - `mobazha_hosting/docs/PRODUCTION_READINESS_ROADMAP.md` — SaaS 生产就绪（Phase F-H）
> - `mobazha_hosting/docs/STANDALONE_STORE_ROADMAP.md` — 独立站部署（Phase S）
> - `mobazha_hosting/docs/FIAT_PAYMENT_DESIGN.md` — 法币支付（Phase FP，FP1-FP2 ✅，FP3 待规划）
> - **本文档** — 前端产品体验专业化（Phase PG = Professional Grade）

---

## 1. 战略背景

### 1.1 竞争定位

Mobazha 不是要在 Shopify 的每个维度上追赶它，而是在同等专业度的基础上，提供 Shopify 做不到的差异化：

| 维度          | Shopify                 | Mobazha 优势                                  |
| ------------- | ----------------------- | --------------------------------------------- |
| 数据主权      | 平台控制，存在封店风险  | 卖家拥有数据，支持自托管                      |
| 支付          | 需接入第三方            | 多链加密货币 + Escrow + 法币（Stripe/PayPal） |
| 资产          | 仅传统商品              | RWA 代币化                                    |
| 费用          | 月费 + 交易抽成         | 零/低平台费                                   |
| 抗审查        | 无                      | IPFS + P2P                                    |
| AI Agent 原生 | Shopify Magic（后加的） | 架构天然适配 AI Agent 运营店铺                |
| 边缘部署      | 纯云端                  | RPi/Mac Mini/VPS 一键部署独立站               |

### 1.2 V1 主要场景：独立站

**V1 的典型用户路径不是"来到市场逛逛"，而是"点开一个链接，到达某个卖家的店"。**

买家在 TG 群或 Twitter 看到一个商品链接 → 点开 → 到达卖家的独立站 → 浏览这个店的商品 → 下单购买。在这个过程中，买家可能完全不知道 SaaS 平台的存在，也不会感知到其他卖家。每个独立站就是一个独立的品牌和购物体验。

| 形态             | 说明                                                 | V1 优先级          |
| ---------------- | ---------------------------------------------------- | ------------------ |
| **独立站**       | 卖家自托管（RPi/Mac Mini/VPS），买家直接访问卖家域名 | **主要场景**       |
| **SaaS（托管）** | 一键开店，共享基础设施，零运维                       | 兼容，但非 V1 主推 |

| 渠道                 | 买家如何到达                       | 对前端的要求              |
| -------------------- | ---------------------------------- | ------------------------- |
| **TG 链接/Mini App** | 卖家在 TG 群分享商品链接，买家点开 | Mobile-First，TG 预览卡片 |
| **社交分享**         | Twitter/Discord 等分享链接         | OG 标签预渲染             |
| **搜索引擎**         | 买家 Google 搜索找到独立站         | SEO 友好                  |
| **直接访问**         | 买家知道卖家域名                   | 独立站首页 = 品牌着陆页   |

**这意味着**：

- 独立站的**店铺首页**是买家的第一印象，不是 marketplace 首页
- **店内搜索**（搜索当前店铺的商品）比全局跨店搜索更重要
- **SEO 和社交分享**是独立站的生命线（流量全靠外部引入）
- 买家登录/注册通过 Casdoor OAuth popup，体验上就是"登录这个店"
- 每个独立站是一个**自成一体的购物体验**，不依赖市场发现

**近期机会**：OpenClaw（小龙虾）热度带动 RPi/Mac
Mini/VPS 大量出售，这些设备天然是独立站部署载体。独立站架构已就绪（Phase S1-S3
✅），Webhook 事件推送已内建（F11 ✅），后续可与 AI Agent（如 OpenClaw）通过 API + Webhook 集成。

> Agent 商业叙事参见：`mobazha_hosting/docs/MBZ_AGENT_INVESTMENT_THESIS.md`

### 1.3 核心原则

1. **AI-First** — 每个功能都先问"AI 能在这里做什么"，AI 不是后加的锦上添花，是产品核心体验
2. **Mobile-First 交易流** — TG Mini
   App 是移动端主入口。关键操作页面（结账、商品详情、搜索）采用独立的移动端视图设计，而非桌面端的响应式缩小（详见 Section
   4.7 第 7 条和 Section 5b）
3. **多形态兼容**
   — 同一套前端同时服务 SaaS 和独立站（`isStandalone`）、桌面和移动端（`usePlatform`），通过环境变量和平台检测控制差异
4. **信任优先** — Web3 平台最大的 UX 挑战是信任，每个交易环节都要有安全感
5. **差异化能力做到极致** — 加密支付、自主权、RWA、AI、Agent 经济网络
6. **UX 驱动 API** — 产品未上线，无历史包袱。先设计最优体验，后端 API/数据模型按需调整
7. **历史项目参考而非照搬** — Desktop（mobazha-desktop）和 Mobile
   App（mobazha-mobile）都是设计参考源。理解用户意图和信息层级，用现代 Web 的交互范式重新设计（详见 Section
   8.1a）

---

## 2. 能力基线审计（2026-02-25）

### 2.1 Shopify 对标评分

| 能力域         | Shopify 对标 | 说明                                                                                                                         |
| -------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 商品创建       | 90%          | 字段齐全、富文本编辑器、变体/SKU、数字商品、**AI 辅助创建**（PG-110 ✅）                                                     |
| 移动端响应式   | 85%          | 断点完善，区分布局，**移动端卖家体验**（PG-111 Tab Bar + 4 步向导 ✅）                                                       |
| 国际化         | 75%          | 10 种语言，UI 层完整                                                                                                         |
| 配送配置       | 85%          | 配送档案独立实体（CRUD API + DB 表 + 引用模式 + 快照版本）、区域、费率                                                       |
| 订单管理       | 85%          | 批量确认 + 高级筛选/搜索/日期范围 + CSV/JSON 导出（PG-106 ✅）                                                               |
| 数字商品       | 80%          | 上传、文件管理                                                                                                               |
| 通知系统       | 80%          | 多类型通知、已读/删除、**TG 通知集成**（PG-007 ✅）                                                                          |
| 购物车→结账    | 92%          | Cart→Checkout→Payment→Confirmation 全流程 + **折扣系统**（PG-109 ✅）+ E2E 测试                                              |
| 搜索           | 50%          | 店内搜索 ✅，全局跨店搜索缺失（V2.1）                                                                                        |
| 评价系统       | 75%          | RatingModal 提交 ✅ + 评价列表展示 ✅（PG-003 ✅）                                                                           |
| SEO/社交分享   | 75%          | Root OG/Twitter + robots.ts + sitemap.ts + Product/Store SSR metadata + JSON-LD ✅；缺：OG 图片动态生成、分享按钮            |
| 卖家 Dashboard | 85%          | 4 指标卡片 + 最近订单 + 热门商品 + 空状态引导 + 骨架屏（PG-105 ✅）                                                          |
| 店铺品牌化     | 97%          | 15 Section 组件 + Theme 系统 + Admin 编辑器 + 5 预设 + 拖拽排序 + **AI Store Builder**（PG-201/202 ✅）；缺：OG 图片动态生成 |
| 移动端交易流   | 88%          | CheckoutMobile + MobilePageHeader 全流程 + 触摸目标≥44px + Crypto TransactionOverlay；**移动端卖家 4 步向导**（PG-111 ✅）   |
| 折扣系统       | 85%          | Shopify 风格后端 + 前端结账集成 + 商品标签 + Admin 管理页（PG-109 ✅）                                                       |
| 收藏/愿望单    | 70%          | WishlistService + 页面 + ProductCard 集成（PG-203 ✅）；降价主动推送待通知基础设施                                           |
| AI 能力        | 80%          | AI 商品创建（4 action）+ AI Store Builder + AI 配置管理（PG-110/202/007 ✅）；缺：AI 客服、AI 推荐                           |

### 2.2 Desktop → Unified 迁移缺口

以下功能在 mobazha-desktop 中已实现，但 unified 尚未迁移：

| 功能            | Desktop 实现                           | Unified 状态                                    | 迁移参考文件                                                             |
| --------------- | -------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| **购物车→结账** | `ShoppingCart.vue` → `Purchase.vue`    | ✅ CartDrawer + CheckoutDesktop/Mobile + E2E    | `frontend/src/views/ShoppingCart.vue`                                    |
| **评价提交**    | `CompleteOrderForm.vue` + Rating model | ✅ RatingModal + 订单完成时提交                 | `frontend/src/views/modals/orderDetail/summaryTab/CompleteOrderForm.vue` |
| **评价展示**    | `Reviews.vue` + `Review.vue`           | ✅ 评价列表 + 统计摘要                          | `frontend/src/views/reviews/Reviews.vue`                                 |
| **结账折扣**    | `Purchase.vue` 中的 Coupons 组件       | ✅ DiscountInput + discountUtils + Admin 管理页 | `frontend/src/views/modals/purchase/Coupons.vue`                         |
| **全局搜索**    | `Search.vue` + mobazha.info API        | ⏳ 架构不同，V2.1 规划（全局跨店搜索）          | `frontend/src/views/search/Search.vue`                                   |
| **店铺头图**    | Settings 中的 header image cropper     | ✅ StoreBrandingEditor + Section-based hero     | `frontend/src/views/modals/settings/Page.vue`                            |

> Desktop 参考文档：`mobazha-desktop/frontend/docs/refactor/COMPLETE_FEATURE_MIGRATION.md`

### 2.3 Mobile App 设计参考

mobazha-mobile（React
Native，正在逐步退役）是移动端设计的重要参考源。它有约 90+ 个屏幕，包含完整的移动端购物流程。

**参考原则**：只看用户意图、信息层级和流程编排，不照搬 React Native 的组件和交互。用 React +
Tailwind + Platform View 模式重新设计。

**V1 最相关的参考屏幕**：

| V1 场景        | Mobile 参考屏幕                                          | 参考什么               | 重新设计什么                     |
| -------------- | -------------------------------------------------------- | ---------------------- | -------------------------------- |
| 结账移动端视图 | `checkout.js` → `purchaseState.js` → `paymentSuccess.js` | 步骤编排、支付状态过渡 | 交互范式（单屏滚动 vs 多页跳转） |
| 购物车移动端   | `shoppingCart.js`                                        | 按卖家分组、结算栏     | swipe 手势、底部栏设计           |
| 商品详情移动端 | `listing.js` + `ItemDetail` 组件                         | 信息分区、底部操作栏   | 图片浏览器、折叠式内容           |
| 搜索覆盖层     | `searchResult.js` + `searchFilter.js`                    | 筛选面板、分类导航     | 全屏搜索体验                     |
| 评价交互       | `ProductRatings.js` + `OrderRating`                      | 评分手势、评价列表     | 简化维度、图片上传               |

> Mobile 参考路径：`mobazha-mobile/screens/`、`mobazha-mobile/components/` 完整参考映射见 Section
> 8.1a

---

## 3. 分层优先级定义

### Tier 0 — 交易闭环修复（不修就丢用户）

直接影响用户能否完成一笔完整交易。同时确保 SaaS 和独立站两种模式、Web 桌面和 TG Mini
App（移动端）均可用。

| ID         | 任务                             | 说明                                                                                                                        | AI 增强 🤖                   | 预估      |
| ---------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------- |
| **PG-001** | ✅ 购物车 + 结账（Mobile-First） | Cart Drawer + 全页结账流（Desktop/Mobile）+ E2E 测试 ✅                                                                     | —                            | ✅ 已完成 |
| **PG-002** | ✅ SEO + 社交分享 + 技术 SEO     | per-page metadata ✅ + sitemap.xml ✅ + robots.txt ✅ + OG tags ✅。V2 增强：OG 图片动态生成、分享按钮组件、TG 预览卡片优化 | AI 自动生成 meta description | ✅ 已完成 |
| **PG-003** | ✅ 评价系统                      | RatingModal + 订单完成时提交评价 ✅                                                                                         | AI 评价摘要（V2 增强）       | ✅ 已完成 |
| **PG-004** | ✅ 店内搜索 + 商品发现           | 404 页面 ✅ + StoreHero 搜索 ✅ + 商品展示 ✅。V2 增强：搜索建议、高级筛选、分类浏览                                        | AI 语义搜索（V2 增强）       | ✅ 已完成 |
| **PG-005** | ✅ 信任与安全体验                | trust-badges Section + Footer + 店铺政策页（配送/退换/隐私）✅                                                              | —                            | ✅ 已完成 |

**验收标准（以独立站为主场景）**：买家通过 TG 链接到达一个独立站 → 在 **375px iPhone SE**
上浏览店铺首页（含 Footer） → 店内搜索/分类浏览找到商品 → 查看商品详情（信任徽章+买家保障标识）→ 加购物车 → 结账（Crypto 支付全流程，含余额预检和交易等待状态）→
**订单确认页**
→ 追踪订单 → 确认收货 → 提交评价 → 分享商品链接（TG/Twitter 有预览卡片）。商品页有 JSON-LD 结构化数据。访问不存在的页面有友好
**404 页面**。页面底部 Footer 有店铺政策链接。SaaS 模式同步兼容。桌面端同步可用。

### Tier 1 — Admin/Storefront 分离（从"工具"变"平台"）

让卖家感到"这是个正经平台"。

| ID         | 任务                    | 说明                                                                                                                                                                      | AI 增强 🤖                           | 预估      |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------- |
| **PG-101** | ✅ Admin Layout + 路由  | `/admin/` 前缀路由 + 侧边栏导航 + 响应式（桌面固定/移动汉堡菜单）✅                                                                                                       | —                                    | ✅ 已完成 |
| **PG-102** | ✅ 商品管理页           | `/admin/products` — 表格/卡片双视图 + 搜索 + 批量删除 + 行内操作 ✅                                                                                                       | —                                    | ✅ 已完成 |
| **PG-007** | ✅ 集成管理             | `/admin/settings` Integrations tab — TG 通知（TelegramSink + 配置 UI）✅、AI 配置（Key/Model 统一管理）✅。V2：Webhook 端点 CRUD UI                                       | —                                    | ✅ 已完成 |
| **PG-105** | ✅ 卖家 Dashboard       | `/admin/` 首页 — 4 指标卡片实时数据 + 最近订单 + 热门商品 + 空状态引导 + 骨架屏 ✅                                                                                        | AI 经营建议（V2 增强）               | ✅ 已完成 |
| **PG-106** | ✅ 订单管理增强         | `/admin/orders` — 批量确认 + 高级筛选/搜索/日期范围 + CSV/JSON 导出 + 移动端操作 ✅                                                                                       | —                                    | ✅ 已完成 |
| **PG-107** | ✅ 现有设置页迁入 Admin | 6 个 Admin 子页面 + 4 个 Content 组件提取 + hub 链接更新 ✅                                                                                                               | —                                    | ✅ 已完成 |
| **PG-108** | ✅ 卖家 Onboarding 引导 | 3 步向导：店铺资料+头像 → 创建首个商品 → 完成预览/跳转 ✅                                                                                                                 | AI 帮你写店铺简介（V2 增强）         | ✅ 已完成 |
| **PG-109** | ✅ 折扣系统             | Shopify 风格独立折扣系统：后端 6 步（DiscountStore + AppService + Engine + API）+ 前端 3 步（结账集成 + 商品标签 + 卖家管理页）+ 60 后端测试 + 10 E2E 测试 + 视觉回归基线 | 设计文档 `DISCOUNT_SYSTEM_DESIGN.md` | ✅ 已完成 |
| **PG-110** | ✅ AI 商品创建助手      | 图片→AI 生成标题/描述/标签/商品类型 ✅；文字→AI 润色描述 ✅；AiImageGeneratePanel + 4 个 AI action                                                                        | **核心 AI 功能**                     | ✅ 已完成 |
| **PG-111** | ✅ 移动端卖家体验       | Shopify 风格底部 Tab Bar + 4 步商品创建向导 + Camera-First 拍照 + 紧凑卡片列表 + FAB ✅                                                                                   | —                                    | ✅ 已完成 |

**验收标准**：新卖家在 **375px iPhone SE**
上注册后有引导路径，用 AI 辅助 30 秒内完成商品描述，Dashboard 有空状态引导，Admin 手机端可完成基本管理操作

### Tier 2 — 差异化竞争力（Shopify 做不到的）

| ID         | 任务                            | 说明                                                                                                                                                                        | AI 增强 🤖                     | 预估      |
| ---------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | --------- |
| **PG-201** | ✅ 店铺品牌化（Section-based）  | **15** Section 组件（含 video/countdown）+ JSON 配置 + CSS 变量主题 + 拖拽排序 + Google Fonts + **8 预设模板/配色** + 预设标题自动本地化 + 线框布局预览 + 确认对话框对比 ✅ | AI 推荐色板（从商品图提取）    | ✅ 已完成 |
| **PG-202** | ✅ AI Store Builder（MVP）      | 品牌描述→AI 生成配置 JSON→Dialog 内预览→Apply/Regenerate + **自动传递用户语言给 AI**（202a 完成，202b 对话微调待做）                                                        | **核心 AI 功能**               | ✅ 已完成 |
| **PG-203** | ✅ 收藏/愿望单                  | 商品收藏 ✅、列表管理 ✅、Wishlist 页面 ✅（后端 WishlistService + 前端 wishlistStore + ProductCard/Detail 集成）。降价提醒待 V2                                            | —                              | ✅ 已完成 |
| **PG-204** | 买家发现体验                    | 推荐、浏览历史、相关商品                                                                                                                                                    | AI 个性化推荐（基于浏览/购买） | 5-7 天    |
| **PG-205** | 智能通知中心                    | Admin 通知视图 + 买家状态推送                                                                                                                                               | AI 优先级排序 + 摘要           | 3-5 天    |
| **PG-206** | AI 客服助手                     | 买家常见问题自动回复（基于商品描述/政策生成）                                                                                                                               | **核心 AI 功能**               | 1-2 周    |
| **PG-207** | SaaS 首页重设计（Stores First） | 首页从"商品市场"转型为"店铺托管平台展示"：精选店铺卡片 + 平台统计 + Web3 差异化卖点 + 最新商品（不分类）。设计文档：`docs/SAAS_HOMEPAGE_DESIGN.md`                          | AI 精选店铺排序                | 3-5 天    |

### Tier 3 — 规模化运营

| ID         | 任务             | 说明                         | AI 增强 🤖                      | 预估     |
| ---------- | ---------------- | ---------------------------- | ------------------------------- | -------- |
| **PG-301** | 高级分析         | 转化漏斗、流量来源、商品表现 | AI 洞察报告（自然语言总结趋势） | 2-3 周   |
| **PG-302** | 客户管理         | 买家列表、购买历史、标签     | AI 客户分群                     | 1-2 周   |
| **PG-303** | 营销工具         | 限时折扣、满减、活动管理     | AI 生成促销文案 + 最佳时机建议  | 2-3 周   |
| **PG-304** | 多店铺管理       | 一个账号管理多个店铺         | —                               | 2-3 周   |
| **PG-305** | 插件系统（概念） | 第三方扩展能力设计           | —                               | 规划阶段 |

### Tier 0 推荐执行顺序（独立站优先）

```
PG-001（Cart + Checkout）← 所有交易流的基础，含 Crypto 支付 UX
  ↓
PG-002（SEO + 社交分享）← 独立站流量生命线，越早上线越早被发现
  ↓
PG-005（信任体验）← 独立站无平台背书，信任全靠自身
  ↓
PG-004（店内搜索 + 商品发现）← 独立站内浏览体验
  ↓
PG-003（评价系统）← 交易完成后才需要评价，也是独立站信任的积累
```

> **为什么 SEO 提前了**：独立站的买家通过社交链接和搜索引擎到达，SEO 和 OG 标签是独立站被发现的前提。没有 SEO，独立站就是孤岛。

---

## 4. V1 首版发布计划（Launch-Ready 定义）

### 4.1 V1 是什么

V1 不是全部功能做完，而是**用户可以完成核心价值闭环的最小专业版本**。

> **V1 一句话定义**：卖家在自己的独立站上用 AI 辅助创建商品，买家通过社交链接到达独立站，在手机（TG）或桌面上完成浏览、购买、追踪订单（Escrow 保护）的完整旅程。SaaS 模式同步兼容。
>
> **V1 核心叙事**：每个独立站是一个独立的 Web3 品牌店铺。买家感知到的是"这个卖家的店"，而非"一个大市场里的某个摊位"。

### 4.2 V1 范围

| 来源            | 包含任务              | 说明                      |
| --------------- | --------------------- | ------------------------- |
| **Tier 0**      | PG-001 ~ PG-005       | 交易闭环 = 不可缺少       |
| **Tier 1 精选** | PG-110（AI 商品创建） | 5-7 天，**V1 核心差异化** |

**已就绪的基础设施（不在 V1 前端工作量中）**：

- 独立站部署基础设施（Phase S1-S3）✅
- Webhook 节点级能力（F11/F11b）✅

**V1 前置能力确认**（开始 Tier 0 前需验证以下现有能力在独立站模式下可用）：

| 能力             | 确认点                                                      | 如不可用则                 |
| ---------------- | ----------------------------------------------------------- | -------------------------- |
| **买家订单列表** | `/account/orders` 页面在独立站可访问，列出当前买家的订单    | 纳入 PG-001 范围           |
| **买家订单详情** | `/account/orders/:id` 页面可查看订单状态、物流、Escrow 进度 | 纳入 PG-001 范围           |
| **买卖聊天**     | 商品详情页和订单详情页有"联系卖家"入口，Matrix 聊天可用     | 纳入 PG-005 范围           |
| **买家登录**     | Casdoor OAuth popup 在独立站域名下正常工作                  | 需配置修复（非前端工作量） |

**V1 原始不包含**（已全部提前完成）：

> 以下任务在原始 V1 范围外，但已在后续快速迭代中全部完成：

| 原不含                         | 最终状态                              |
| ------------------------------ | ------------------------------------- |
| ~~Admin Layout（PG-101/102）~~ | ✅ 已完成（V1.1 迭代）                |
| ~~Dashboard（PG-105）~~        | ✅ 已完成（V1.2 迭代）                |
| ~~订单增强（PG-106）~~         | ✅ 已完成（V1.3 迭代）                |
| ~~设置迁移（PG-107）~~         | ✅ 已完成（V1.2 迭代）                |
| ~~Onboarding（PG-108）~~       | ✅ 已完成（V1.3 迭代）                |
| ~~折扣系统（PG-109）~~         | ✅ 已完成（V1.3 迭代）                |
| ~~移动卖家体验（PG-111）~~     | ✅ 已完成（V1.3 迭代）                |
| ~~Tier 2 品牌化/AI/收藏~~      | ✅ PG-201/202/203 已完成（V2.0 迭代） |
| Tier 2 买家发现/通知/AI客服    | ⏳ PG-204~206 待执行                  |
| Tier 3 全部                    | ⏳ 待规划                             |

### 4.3 V1 用户旅程

```
买家旅程（独立站场景，Mobile-First）：
  TG/Twitter 看到卖家分享的商品链接（带预览卡片）
  → 点击到达卖家独立站的商品详情页
  → 浏览商品（信任徽章 + Escrow 标识 + 法币等价价格）
  → 加购物车（Cart Drawer）→ 继续浏览店铺 → 或直接结账
  → 结账：地址 → 配送 → Crypto 支付（余额预检 → 签名 → 等待确认）
  → 订单确认页（感谢 + 订单编号 + 预计流程 + 继续购物）
  → 追踪订单（Escrow 进度条）→ 确认收货 → 提交评价
  → 分享商品链接给朋友（TG/Twitter 预览卡片）

  注意：买家通过 Casdoor OAuth 登录，体验上是"登录这个店铺"，
  不感知 SaaS 平台的存在。如有购前疑问，可消息联系卖家。

卖家旅程（Desktop 优先，Mobile 基本可用）：
  部署独立站（RPi/Mac Mini/VPS 一键安装）
  → 登录管理后台 → 设置店铺资料
  → AI 辅助创建商品（拍照→自动生成描述）
  → 创建后跳转编辑页 → 查看商品前端展示
  → 分享店铺/商品链接到 TG 群和社交媒体
  → 收到订单通知 → 确认订单 → 标记发货 → 查看评价
```

**SaaS 兼容**：上述旅程在 SaaS 模式下同样可走通（卖家通过 SaaS 平台开店而非自部署，买家通过 SaaS 域名访问）。同一套前端通过
`isStandalone` 环境变量控制差异。

### 4.4 V1 发布标准

| 维度            | 标准                                                                     |
| --------------- | ------------------------------------------------------------------------ |
| **独立站体验**  | 买家从 TG 链接到达独立站 → 完成购买全流程，体验流畅自然                  |
| **店铺首页**    | 独立站首页是有品牌感的着陆页，不是空白或 marketplace 列表                |
| **移动端**      | iPhone SE（375px）买家全流程无障碍（含 TG Mini App 内）                  |
| **Crypto 支付** | 支付流程含余额预检、gas 透明、交易等待状态、失败恢复                     |
| **SaaS 兼容**   | SaaS 模式下交易流程同步可用                                              |
| **性能**        | LCP < 3s（4G 网络），交互延迟 < 200ms                                    |
| **稳定性**      | 交易路径零 Critical Bug，整体无 P0 Bug                                   |
| **SEO/分享**    | 独立站商品链接分享到 TG/Twitter 有预览卡片，Google 可索引                |
| **AI**          | 商品创建 AI 辅助可用（图片→描述生成）                                    |
| **信任**        | 买家在结账时能理解资金保障机制（用人话，不暴露技术术语）                 |
| **沟通**        | 买家可在商品详情页联系卖家（现有聊天能力确认可用）                       |
| **价格**        | 商品价格有法币等价显示（如 `0.015 ETH ≈ $42`）                           |
| **订单确认**    | 支付成功后有订单确认页（感谢信息 + 订单编号 + 预计流程 + 继续购物）      |
| **页面 Footer** | 所有页面底部有 Footer（店铺信息、政策链接、支付方式图标、社交链接）      |
| **政策页**      | 店铺有配送政策、退换货政策、隐私政策页面（支持卖家自定义内容）           |
| **404 页面**    | 访问不存在的路由时有友好的 404 页面（非空白/报错，含返回首页引导）       |
| **技术 SEO**    | 独立站有 sitemap.xml、商品 JSON-LD 结构化数据、robots.txt、Canonical URL |

### 4.5 V1 时间估算

> **V1 核心范围已全部完成**（2026-02-28）。以下为原始估算，供参考：

| 阶段                                                       | 原始估算 | 实际状态  |
| ---------------------------------------------------------- | -------- | --------- |
| PG-001（Cart + Checkout + 订单确认页 + Crypto 支付 UX）    | 8-12 天  | ✅ 已完成 |
| PG-002（SEO + 社交分享 + OG 预渲染 + 技术 SEO）            | 4-6 天   | ✅ 已完成 |
| PG-005（信任体验 + Footer + 政策页 + 法币等价 + 术语抽象） | 4-6 天   | ✅ 已完成 |
| PG-004（店内搜索增强 + 商品发现 + 404 页面）               | 4-6 天   | ✅ 已完成 |
| PG-003（评价系统）                                         | 5-7 天   | ✅ 已完成 |
| PG-110（AI 商品创建）                                      | 5-7 天   | ✅ 已完成 |

### 4.6 V1 之后（快速迭代）

> **V1.1~V1.3 及 Tier 2 核心已全部完成**（2026-02-28）。以下为原始规划，供参考：

| 版本 | 范围                                                         | 目标                                | 状态      |
| ---- | ------------------------------------------------------------ | ----------------------------------- | --------- |
| V1.1 | PG-007（集成管理）+ PG-101/102（Admin Layout）+ 全局跨店搜索 | 集成管理 + 卖家管理 + SaaS 市场发现 | ✅ 已完成 |
| V1.2 | PG-105/107/108（Dashboard + 设置迁入 + Onboarding）          | 降低卖家门槛                        | ✅ 已完成 |
| V1.3 | PG-109/106/111（折扣系统 + 订单增强 + 移动卖家）             | 提升运营工具                        | ✅ 已完成 |
| V2.0 | PG-201/202/203（品牌化 + AI Store Builder + 收藏）           | 差异化竞争力                        | ✅ 已完成 |
| V2.1 | PG-204~206（买家发现 + 通知中心 + AI 客服）                  | 差异化竞争力续                      | ⏳ 待执行 |
| V3.0 | Tier 3 全部（分析 + CRM + 营销）                             | 规模化运营                          | ⏳ 待规划 |

> **PG-007（集成管理）说明**：原为 OpenClaw/Agent 集成，已扩展为统一集成管理。包括：(1)
> TelegramSink 通知后端（mobazha 内置，ChannelNotificationSink）；(2) `/admin/settings/integrations`
> Tabs 布局（Notifications tab + AI Assistant tab）；(3) AI 代理引擎（OpenAI 兼容，API
> Key 服务端保管，Provider 列表从 mobazha.info 远程动态加载）；(4) NodeSettings DB 持久化（GORM
> AutoMigrate）；(5) 15 个 E2E 测试（UI + API）。全部完成 ✅。

### 4.7 独立站产品设计指导原则

以下设计原则贯穿所有 V1 任务的实施，不是独立任务，而是执行 PG-001~PG-005 时需持续考虑的体验维度。

#### 1. 店铺首页 = 品牌着陆页

独立站的 `/`（首页）是买家的第一印象。V1 无需完整的 Section-based 配置（那是 PG-201），但至少需要：

- 店铺名称 + logo + 封面图（已有基础）
- 精选/最新商品展示（非空白页面）
- 店铺简介 + 接受的支付方式
- 搜索框（店内搜索）

#### 2. Crypto 支付是"惊魂时刻"，需要特别设计

传统电商的支付是"输入卡号"，Crypto 支付是"连接钱包 + 签名 + 等待确认"。这是整个购买旅程中焦虑最高的时刻：

- **余额预检**：进入支付步骤前就告诉用户余额是否足够
- **Gas 费透明**：在支付摘要中显示预估 gas，不要让用户在钱包弹窗里才第一次看到
- **交易等待 UI**：提交后的等待画面（进度动画 + 预估时间 + "可以关闭页面"提示）
- **失败恢复**：交易失败时明确解释原因 + 可操作的下一步（重试/换链/联系卖家）

#### 3. 法币等价是基本需求

Crypto 定价的商品必须同时显示法币等价（如 `0.015 ETH ≈ $42`）：

- 商品卡片、商品详情页、购物车、结账页均需显示
- 使用 `tickerproxy` 提供的汇率 API
- 如果从加购到结账间价格波动超过一定阈值，提示用户

#### 4. 抽象 Crypto，不解释 Crypto

面向主流用户，技术术语应被隐藏：

| 技术术语           | 用户看到的               |
| ------------------ | ------------------------ |
| Escrow             | "买家保障" 或 "资金保护" |
| Smart Contract     | 不出现                   |
| Peer ID            | "卖家 ID" 或直接用店铺名 |
| IPFS               | 不出现                   |
| Gas Fee            | "网络手续费"             |
| Block Confirmation | "支付确认中"             |

> 技术术语只出现在面向技术用户的高级设置或帮助文档中。

#### 5. 买卖沟通不能断

在独立站场景下，买家唯一的"客服"就是卖家。确保：

- 商品详情页有 "Message Seller"/"联系卖家" 入口
- 订单详情页有联系卖家入口
- 现有 Matrix 聊天能力在这些位置可见且可用

#### 6. 买家登录体验要自然

独立站买家通过 Casdoor OAuth popup 登录。体验上：

- 触发时机：结账时才要求登录（浏览无需登录）
- 呈现方式："登录以完成购买"，不是"连接到 Mobazha 平台"
- 登录后回到原页面继续操作，不打断购买流程

#### 7. 移动端设计策略 — "同路由、分视图"（Platform View Pattern）

**核心洞察**：对于「浏览型」页面，响应式布局足够；但「操作型」关键页面（结账、商品详情、搜索），桌面和移动端的交互范式本质不同，不是"缩小排列"能解决的。强行用 CSS 断点塞进同一个组件，会导致组件膨胀（如当前
`ProductDetail.tsx` 已 1500+ 行）、两端体验都被折中。

**策略：同路由、分视图**

```
URL 不变（SEO 友好，链接可分享）
  └── 路由页面（thin shell）
      └── usePlatform() 检测平台
          ├── Desktop → DesktopView（桌面交互范式）
          ├── Mobile Web → MobileView（移动交互范式）
          └── TG Mini App → MobileView + TG 增强层
```

**逐页策略**：

| 页面                  | 策略                 | 原因                                                                   |
| --------------------- | -------------------- | ---------------------------------------------------------------------- |
| **商品详情**          | 🔀 **分视图**        | 桌面左图右信息并排 vs 移动全宽 Swiper + 折叠区 + 底部固定栏            |
| **结账**              | 🔀 **分视图**        | 桌面多步 Wizard + sidebar vs 移动单屏滚动 + 底部 CTA；TG 用 MainButton |
| **购物车**            | 🔀 **分组件**        | 桌面 Cart Drawer vs 移动全页购物车                                     |
| **搜索**              | 🔀 **分组件**        | 桌面页内搜索框 vs 移动全屏搜索覆盖层                                   |
| **店铺首页**          | 📱 响应式 + 组件替换 | 网格自适应，但 Hero/导航组件可按平台替换                               |
| **订单确认页**        | 📱 响应式            | 简单布局，断点调整即可                                                 |
| **订单列表/详情**     | 📱 响应式            | 表格→卡片视图切换足够                                                  |
| **政策页/404/Footer** | 📱 响应式            | 内容型页面                                                             |

**技术要求**：

1. **`usePlatform()` hook**（新建，扩展现有 `useBreakpoint()`）：

   ```
   { isMobile, isDesktop, isTGMiniApp, platform: 'desktop' | 'mobile' | 'tg' }
   ```

2. **业务逻辑共享**：Desktop 和 Mobile 视图共享同一套 hooks（`useCheckout`、`useProductDetail`、`useCart`），只有 UI 层不同

3. **TG 增强层**：Mobile 视图 + TG 特性叠加：
   - `MainButton` 替代底部固定 CTA（"去结账"、"确认支付"）
   - `BackButton` 替代自定义返回按钮
   - `HapticFeedback` 在操作确认时触发
   - 主题色同步（`themeParams`）

4. **渐进实施**：不需要一次性全部拆分。先从结账（PG-001）开始，验证模式后再扩展到商品详情等

> **为什么不分路由？** 分路由（如
> `/m/checkout`）会导致链接不可互换、SEO 冗余、用户手动访问错误版本。同路由分视图保持了 URL 的唯一性。

#### 8. V1 页面完整性 — 一个"真正的网站"需要的骨架

即使是 MVP，买家到达独立站后应该感觉这是一个完整的、专业的网站，而不是一个半成品：

| 缺失会怎样                        | 需要什么                                                | 归属   |
| --------------------------------- | ------------------------------------------------------- | ------ |
| 买家支付后看到空白或被跳回首页    | **订单确认页**（感谢 + 订单号 + 预计流程）              | PG-001 |
| 页面底部突然结束，没有导航和信息  | **Footer**（店铺信息 + 政策链接 + 支付方式 + 社交链接） | PG-005 |
| 买家想了解配送/退换货政策没地方看 | **政策页**（配送、退换货、隐私）— 卖家可自定义          | PG-005 |
| 访问错误链接看到白屏或报错        | **404 页面**（友好提示 + 返回首页 + 搜索引导）          | PG-004 |
| Google 爬虫找不到商品             | **sitemap.xml + JSON-LD + robots.txt**                  | PG-002 |

---

## 5. Admin/Storefront 架构设计

### 5.1 路由结构

```
mobazha-unified
│
├── /admin/                        ← 卖家管理（Admin Mode）
│   ├── /admin/                      Dashboard 总览
│   ├── /admin/products              商品管理列表
│   ├── /admin/products/new          创建商品（复用 listing/new）
│   ├── /admin/products/edit/:slug   编辑商品（复用 listing/edit）
│   ├── /admin/collections            商品集合管理 ✅
│   ├── /admin/collections/new        创建集合 ✅
│   ├── /admin/collections/:id        编辑集合 ✅
│   ├── /admin/discounts              折扣管理（已实现后端，前端 DiscountForm ✅）
│   ├── /admin/orders                订单管理
│   ├── /admin/orders/:orderId       订单详情
│   ├── /admin/analytics             数据分析
│   ├── /admin/settings              店铺设置
│   │   ├── /admin/settings/store    基本设置
│   │   ├── /admin/settings/shipping 配送设置
│   │   ├── /admin/settings/payments 支付设置
│   │   └── /admin/settings/policies 政策设置
│   └── /admin/marketing             营销工具（Tier 2+）
│
├── /store/:peerId/                ← 店铺门面（Storefront）
│   └── /store/:peerId               店铺首页 + 商品列表
│
├── /product/:slug                 ← 商品详情（Storefront）
│
├── /marketplace/                  ← 全局市场（Discovery）
│
├── /cart                          ← 购物车
├── /checkout                      ← 结账
│
└── /account/                      ← 买家中心
    ├── /orders                      我的订单
    ├── /wishlist                    收藏夹（Tier 2）
    └── /settings                    账号设置
```

### 5.2 Layout 设计

```
AdminLayout（/admin/* 路由）
┌──────────────────────────────────────┐
│  Logo    Store Name ▾   🔔  👤       │
├──────┬───────────────────────────────┤
│ 📊   │                               │
│ Home │      Main Content Area        │
│      │                               │
│ 📦   │                               │
│ Prod │                               │
│      │                               │
│ 📋   │                               │
│ Ords │                               │
│      │                               │
│ 📈   │                               │
│ Data │                               │
│      │                               │
│ ⚙️   │                               │
│ Set  │                               │
├──────┴───────────────────────────────┤
│  View Store →   |   Help & Docs      │
└──────────────────────────────────────┘

StorefrontLayout（其他路由）
┌──────────────────────────────────────┐
│  Logo  Search...   🛒 💬 🌐 👤       │
├──────────────────────────────────────┤
│                                      │
│         Content (Browse, Buy)        │
│                                      │
└──────────────────────────────────────┘
```

### 5.3 模式切换

- Admin 底部 "View Store" → 新标签页打开 `/store/{myPeerID}`
- Storefront 自己店铺页 → 右上角 "进入管理后台" → `/admin/`
- ProductDetail 自己商品 → 悬浮操作栏 "编辑" / "在管理后台查看"
- 全局：Header 右上角头像菜单中加 "Seller Dashboard" 入口

### 5.4 与独立站复用

```
SaaS 模式：
  Admin = /admin/（SaaS 平台内嵌）
  Storefront = /store/{peerId}/（平台内店铺）

独立站模式：
  Admin = /admin/（卖家 VPS 管理后台，BasicAuth 保护）
  Storefront = /（独立站首页，买家访问）
```

同一套 Admin 组件在两种部署模式下复用，通过 `isStandalone` 环境变量控制差异。

### 5.5 卖家 Onboarding 流程

新卖家首次进入 `/admin/` 时，不应该看到空荡荡的 Dashboard，而是引导式流程：

```
Step 1: 设置店铺资料
  → 店铺名称、头像、简介
  → "看起来不错！下一步"

Step 2: 创建第一个商品
  → 简化版商品创建（标题、图片、价格、描述）
  → "你的第一个商品已就绪！"

Step 3: 预览你的店铺
  → 展示店铺预览效果
  → "发布到市场" / "继续完善"

完成后 → Dashboard（显示引导完成提示 + 下一步建议）
```

### 5.6 空状态设计规范

每个 Admin 页面在数据为零时必须提供有意义的引导，而非空白：

| 页面                | 空状态内容                                                           |
| ------------------- | -------------------------------------------------------------------- |
| Dashboard（零销售） | 插图 + "你的店铺已就绪" + 快捷操作（添加商品、分享店铺、邀请买家）   |
| 商品管理（零商品）  | 插图 + "添加你的第一个商品" + 商品类型选择卡片（实物/数字/服务/RWA） |
| 订单管理（零订单）  | 插图 + "等待你的第一笔订单" + 推广建议（分享链接、SEO 优化提示）     |
| 数据分析（零数据）  | 插图 + "数据需要时间积累" + 预计数据可用时间说明                     |

### 5.7 信任与安全体验设计

Web3 平台的信任是第一关。以下元素需要贯穿交易全流程：

```
买家浏览商品时：
  → 卖家信任徽章（评分、交易数、注册时长）
  → "买家保障" 标识（用人话，不说 Escrow/Smart Contract）
  → 已接受的支付方式（带链 logo）

结账时：
  → 资金保障说明（"你的资金在确认收货前受到保护"）
  → 仲裁人信息（如有）
  → 预估交易流程时间线

订单进行中：
  → 订单进度可视化进度条（已支付 → 卖家确认 → 已发货 → 已完成）
  → 一键发起争议入口
  → 买家保障政策链接

完成时：
  → 引导评价（简化流程，提高评价率）
  → 交易摘要（含资金释放确认）

> 注意：面向用户的 UI 文案遵循 Section 4.7 第 4 条"抽象 Crypto"原则。
> "Escrow" 等术语仅在内部代码、文档和技术用户设置中使用。
```

---

## 5b. Platform View 架构（移动端设计实施）

### 5b.1 核心模式

```
apps/web/src/
├── app/                                 # 路由页面（thin shell）
│   ├── checkout/page.tsx                #   → usePlatform() → Desktop/Mobile 视图
│   ├── product/[slug]/page.tsx          #   → usePlatform() → Desktop/Mobile 视图
│   └── cart/page.tsx                    #   → 响应式 + 组件替换
│
├── components/
│   ├── checkout/
│   │   ├── CheckoutDesktop.tsx          # 桌面端：多步 Wizard + 右侧摘要
│   │   ├── CheckoutMobile.tsx           # 移动端：单屏滚动 + 底部 CTA
│   │   └── useCheckout.ts              # 共享业务逻辑（状态、验证、API）
│   │
│   ├── product/
│   │   ├── ProductDetailDesktop.tsx     # 桌面端：左图右信息并排
│   │   ├── ProductDetailMobile.tsx      # 移动端：全宽 Swiper + 折叠区
│   │   └── useProductDetail.ts         # 共享业务逻辑
│   │
│   └── search/
│       ├── SearchInline.tsx             # 桌面端：页内搜索框 + 下拉建议
│       └── SearchOverlay.tsx            # 移动端：全屏搜索覆盖层
│
├── hooks/
│   └── usePlatform.ts                   # 平台检测（扩展现有 useBreakpoint）
│
└── providers/
    └── TGMiniAppProvider.tsx             # TG Mini App 增强（MainButton/BackButton/Theme）
```

### 5b.2 `usePlatform()` Hook

```typescript
// 扩展现有 useBreakpoint()，新增 TG Mini App 检测
function usePlatform() {
  const { isMobile } = useBreakpoint();
  const isTGMiniApp = !!window.Telegram?.WebApp?.initData;

  return {
    isMobile, // < 768px
    isDesktop: !isMobile,
    isTGMiniApp,
    platform: isTGMiniApp ? 'tg' : isMobile ? 'mobile' : 'desktop',
  };
}
```

### 5b.3 路由页面模式

```typescript
// app/checkout/page.tsx — thin shell，不含业务逻辑
export default function CheckoutPage() {
  const { isMobile } = usePlatform();
  return isMobile ? <CheckoutMobile /> : <CheckoutDesktop />;
}
// 两个视图组件共享 useCheckout() hook 的全部业务逻辑
```

### 5b.4 TG Mini App 增强层

TG Mini App 使用移动端视图，并叠加 TG SDK 特有能力：

| TG 特性          | 替代什么          | 效果                                    |
| ---------------- | ----------------- | --------------------------------------- |
| `MainButton`     | 底部固定 CTA 按钮 | 原生外观，始终可见，TG 管理生命周期     |
| `BackButton`     | 自定义返回按钮    | TG 标题栏内的原生返回                   |
| `HapticFeedback` | 无                | 加购/支付确认时的触觉反馈               |
| `themeParams`    | CSS 变量          | 跟随 TG 主题色（深色/浅色模式自动适配） |
| `CloudStorage`   | localStorage      | 已集成，跨设备持久化                    |

```
TGMiniAppProvider
  └── 检测 isTGMiniApp
      ├── 是 → 注入 TG 增强：MainButton 控制、BackButton 事件、主题同步
      └── 否 → 透传（不影响普通 Web）
```

### 5b.5 渐进实施策略

不需要一次性拆分所有页面。按交易流程顺序和 ROI 逐步推进：

| 阶段        | 拆分页面                  | 归属任务      | 说明                            |
| ----------- | ------------------------- | ------------- | ------------------------------- |
| **第 1 步** | 结账（Checkout）          | PG-001        | 转化率最敏感的页面，优先拆分    |
| **第 2 步** | 搜索（Search）            | PG-004        | 全屏搜索覆盖层 vs 页内搜索      |
| **第 3 步** | 商品详情（ProductDetail） | PG-001 或后续 | 当前 1500+ 行，拆分同时优化架构 |
| 后续        | 购物车、店铺首页          | 按需          | 评估 ROI 决定是否拆分           |

> 对于第 3 步（商品详情），V1 可以先在现有组件上做增量优化（确保移动端核心体验可用），完整拆分可留到 V1.1。关键是
> **结账必须在 V1 就有独立的移动端视图**。

---

## 6. AI-First 集成策略

### 6.1 设计原则

Shopify 在 2023 年推出 Shopify
Magic 作为**后加**的 AI 功能。Mobazha 从第一天就将 AI 织入每个核心流程 — 这是后发优势。

```
Shopify 路径：功能先做好 → 后加 AI → 感觉像附加物
Mobazha 路径：AI 和功能同时设计 → AI 是体验的一部分 → 自然无感
```

**两层 AI 策略**：

1. **AI 辅助层**（V1）：Web UI 中的 AI 功能帮助人类卖家（商品创建、SEO 等）
2. **Agent 层**（V1.1+）：AI Agent 通过 API 运营店铺 → Webhook 通知 → TG 互动

> MBZ 架构天然适配 Agent 经济：每个节点有身份（PeerID）、店铺、钱包、P2P 通信、托管结算。今天操作者是人，明天操作者可以是 AI
> Agent。详见 `MBZ_AGENT_INVESTMENT_THESIS.md`。

### 6.2 AI 能力矩阵

**AI 辅助层（V1 — Web UI 驱动）**：

| 场景           | AI 做什么                    | 用户体验                    | 归属任务 |
| -------------- | ---------------------------- | --------------------------- | -------- |
| **商品创建**   | 图片→标题/描述/标签/商品类型 | "拍照上传，AI 帮你写好"     | PG-110   |
| **SEO**        | 自动生成 meta description    | 卖家无需理解 SEO            | PG-002   |
| **搜索**       | 语义理解 + 自然语言查询      | "便宜的防水耳机" → 精准结果 | PG-004   |
| **评价**       | 聚合评价生成摘要             | 买家快速了解商品口碑        | PG-003   |
| **店铺品牌**   | 描述→主题/布局/配色          | "我卖手工皮具" → 完整店铺   | PG-202   |
| **Onboarding** | 生成店铺简介                 | 新卖家 30 秒完成设置        | PG-108   |
| **Dashboard**  | 经营建议                     | "本周销量下降 15%，试试…"   | PG-105   |
| **客服**       | 基于商品/政策自动回复        | 买家即时获得答案            | PG-206   |
| **营销**       | 促销文案 + 时机建议          | 卖家一键生成活动            | PG-303   |
| **分析**       | 自然语言洞察报告             | "你的皮夹克在周末卖得最好"  | PG-301   |

**Agent 层（V1.1+ — API 驱动）**：

| 场景         | Agent 做什么                     | 交互方式           | 归属任务 |
| ------------ | -------------------------------- | ------------------ | -------- |
| **店铺运营** | 通过 API 创建/管理商品、处理订单 | REST API           | PG-007   |
| **订单通知** | Webhook → Agent → TG 推送        | Webhook 事件       | PG-007   |
| **定价调整** | 根据市场数据自动调价             | `PUT /v1/listings` | 未来     |

### 6.3 技术架构

```
前端                    后端代理                    AI 服务
┌─────────┐    POST    ┌──────────┐    API     ┌──────────┐
│ AI 组件  │ ───────→ │ /api/ai/ │ ───────→ │ LLM API  │
│ (按钮/   │ ←─────── │ 代理层   │ ←─────── │ (多供应商)│
│  面板)   │  stream   │ + 缓存   │           │          │
└─────────┘           └──────────┘           └──────────┘
                         ↓
                    ┌──────────┐
                    │ Fallback │  AI 不可用时的降级策略
                    │ 预设模板  │
                    └──────────┘
```

**关键决策**：

- 所有 AI 调用通过后端代理（不在前端暴露 API Key）
- 支持多供应商（OpenAI / Claude / 本地模型），可配置切换
- 每个 AI 功能都有 **Fallback**：AI 不可用时仍能手动操作
- 流式输出（Streaming）：用户看到实时生成过程，而非等待
- 隐私：商品图片和描述发送到 AI 前需明确告知用户

### 6.4 AI 基础设施（跨 Tier 复用）

| 组件                                              | 说明                                | 首次使用      |
| ------------------------------------------------- | ----------------------------------- | ------------- |
| `packages/core/services/ai/client.ts`             | AI 服务客户端（多供应商抽象）       | PG-002（SEO） |
| `apps/web/src/app/internal/ai/generate/route.ts`  | Next.js API Route 代理（OpenAI）    | PG-110 ✅     |
| `apps/web/src/server/aiHandler.ts`                | 框架无关 AI handler（共用核心逻辑） | PG-110 ✅     |
| `packages/core/services/ai/aiService.ts`          | 客户端 AI Service                   | PG-110 ✅     |
| `apps/web/src/components/Listing/AiAssistant.tsx` | AI 按钮 + 图片生成面板 + hook       | PG-110 ✅     |
| `packages/core/services/ai/streaming.ts`          | 流式输出处理（V2 增强）             | 未来          |
| `apps/web/src/components/ai/AIConversation.tsx`   | 对话式 AI 交互面板                  | PG-202        |
| 后端 `/api/ai/*` 代理端点                         | AI API 代理 + 缓存 + 限流           | PG-002        |

---

## 7. AI Store Builder 设计（Tier 2）

### 7.1 为什么不做 Liquid

| 方案                       | 工程量           | 用户门槛           | AI 时代适配 |
| -------------------------- | ---------------- | ------------------ | ----------- |
| Liquid 模板引擎            | 极大（6+ 月）    | 中等（需理解模板） | 差          |
| Section-based 可视化编辑   | 大（3-4 月）     | 低                 | 中          |
| **AI 生成 + Section 组件** | **中（4-6 周）** | **零**             | **最优**    |

### 7.2 技术架构

```
卖家输入 → LLM → Store Config JSON → Section 渲染引擎 → 店铺页面

Store Config JSON Schema:
{
  "theme": {
    "primaryColor": "#1a1a2e",
    "fontFamily": "serif",
    "borderRadius": "sm"
  },
  "sections": [
    { "type": "hero", "props": { "title": "...", "image": "...", "cta": "..." } },
    { "type": "featured-products", "props": { "count": 4, "layout": "grid" } },
    { "type": "about", "props": { "text": "...", "image": "..." } },
    { "type": "testimonials", "props": { "items": [...] } },
    { "type": "product-grid", "props": { "columns": 3, "sort": "newest" } }
  ]
}
```

### 7.3 Section 组件库（MVP 12 个）

| #   | Section              | 说明                                                 | 优先级 |
| --- | -------------------- | ---------------------------------------------------- | ------ |
| 1   | **Hero**             | 全幅横幅 + 标题 + CTA + 背景图/视频                  | P0     |
| 2   | **AnnouncementBar**  | 顶部公告条（促销、新品、重要通知）                   | P0     |
| 3   | **FeaturedProducts** | 精选商品展示（手动选择或按规则）                     | P0     |
| 4   | **ProductGrid**      | 全部商品网格（支持排序/筛选）                        | P0     |
| 5   | **About**            | 品牌故事 + 团队/创始人介绍                           | P1     |
| 6   | **TrustBadges**      | 信任徽章（Escrow 保障、加密支付、自托管）— Web3 特色 | P1     |
| 7   | **Testimonials**     | 客户评价精选                                         | P1     |
| 8   | **FAQ**              | 常见问题折叠面板                                     | P1     |
| 9   | **Collections**      | 商品集合导航（图文卡片，后端+前端已实现）            | P1     |
| 10  | **Gallery**          | 图片/视频画廊                                        | P2     |
| 11  | **RichText**         | 自由富文本内容                                       | P2     |
| 12  | **Contact**          | 联系方式 + 社交链接                                  | P2     |

---

## 8. 执行规范

### 8.1 通用规则

- 所有新页面遵循 `mobazha-unified` 现有规范（TypeScript、i18n、主题变量）
- Admin 页面桌面优先但**必须移动端可用**（很多卖家从手机管理店铺）
- Storefront 页面移动端优先
- **移动端实施策略**：操作型关键页面（结账、搜索、商品详情）采用 **Platform View 分视图**（Section
  5b），浏览型页面采用响应式。不要把桌面体验硬塞进移动端
- **分视图组件命名**：`XxxDesktop.tsx` / `XxxMobile.tsx`，路由页面为 thin shell，通过
  `usePlatform()` 分发
- **业务逻辑共享**：Desktop 和 Mobile 视图通过共享 hooks（`useCheckout`、`useProductDetail`）复用所有业务逻辑，视图层只负责 UI
- **TG Mini App**：使用移动端视图 + `TGMiniAppProvider`
  增强层（MainButton/BackButton/HapticFeedback/Theme），不需要第三套视图
- 新增翻译 key 必须同时添加到 `packages/core/i18n/locales/en.ts`
- 新增路由必须同步更新 `apps/web/src/routes.tsx`
- 所有列表/Dashboard 页必须设计**空状态**（零数据时的引导性 UI）
- 所有数据加载必须有 **Skeleton 骨架屏**（不是白屏或 spinner）
- Desktop 迁移原则：**理解用户意图，重新设计交互**（不照搬 Modal/弹窗模式）
- 所有交易关键路径必须有**错误恢复**：支付失败→重试/切换支付方式、网络断开→自动重连提示、钱包连接失败→引导重新连接
- 独立站首页展示店铺信息和商品（参见 Section 4.7 第 1 条）；SaaS
  marketplace 首页在零商品时显示诚实的空状态而非 mock 数据

### 8.1a 历史项目参考与 API 设计原则

产品未上线，无历史数据和用户迁移负担。两个历史项目可作为**设计参考源**，但必须从产品和 UX 角度重新设计：

**统一原则**：

1. 历史代码**只看用户意图、信息层级和业务逻辑**，不照搬交互模式和 API 结构
2. **前端先定义理想 UX**，需要新 API 或修改现有 API 时直接调整后端
3. **数据模型可以重新设计**（如评价、店铺配置、收藏等）

#### Desktop（mobazha-desktop）参考

> 参考路径：`mobazha-desktop/frontend/`

| Desktop 模式     | 问题                   | Unified 重设计           | API 变更                   |
| ---------------- | ---------------------- | ------------------------ | -------------------------- |
| Modal 弹窗结账   | 内容受限、无法分享 URL | 全页结账流               | 按需调整 checkout API      |
| Modal 弹窗购物车 | 商品多时体验差         | Cart Drawer + Cart 页面  | Cart API 已有，可复用      |
| 5 维评分         | 摩擦大、完成率低       | 1 星级 + 文字 + 图片     | **简化后端评分模型**       |
| 搜索结果平铺     | 无搜索建议             | 搜索建议 + 分面筛选      | 评估 mobazha.info 搜索 API |
| 无店铺配置       | 千店一面               | Section-based JSON 配置  | **新增 Store Config API**  |
| 无信任体验       | 买家不敢下单           | Escrow 可视化 + 卖家徽章 | **新增信任数据聚合 API**   |

#### Mobile App（mobazha-mobile）参考

> 参考路径：`mobazha-mobile/screens/`、`mobazha-mobile/components/` 技术栈：React Native 0.73 +
> React Navigation +
> Redux，正在逐步退役与 Unified 的关系：**mobazha-mobile 的移动端交互经验是 Platform
> View 移动端视图设计的重要参考**

**可参考的移动端 UX 经验**（学习意图，重新设计实现）：

| 移动端场景     | Mobile 屏幕                                                                   | 可参考什么                           | Unified 怎么做（重新设计）                                 |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------- |
| **结账流**     | `checkout.js` → `paymentMethod.js` → `purchaseState.js` → `paymentSuccess.js` | 步骤拆分、支付状态过渡、成功页信息   | `CheckoutMobile` 单屏滚动 + 底部 CTA，支付等待 UI 重新设计 |
| **购物车**     | `shoppingCart.js`                                                             | 按卖家分组、swipe 删除、底部结算栏   | 全页购物车 + 底部固定结算栏                                |
| **商品详情**   | `listing.js` + `ItemDetail` 组件                                              | 图片查看器、信息分区、底部操作栏     | `ProductDetailMobile` 全宽 Swiper + 折叠区                 |
| **搜索**       | `searchResult.js` + `searchFilter.js` + `categories.js`                       | 分类导航、筛选面板、结果网格         | `SearchOverlay` 全屏搜索 + 分面筛选                        |
| **评价**       | `ProductRatings.js` + `StoreRatings.js` + `OrderRating`                       | 评分交互、评价列表、图片展示         | 简化为 1-5 星 + 文字 + 图片（重新设计交互）                |
| **店铺页**     | `store.js` + `externalStore.js`                                               | 店铺头图、Tab 切换（商品/评价/关于） | 独立站首页重新设计为品牌着陆页                             |
| **聊天**       | `MatrixChatDetail.js` + `MatrixOrderChat.js`                                  | 消息气泡、订单关联聊天               | 确认现有能力可用，按需优化                                 |
| **订单**       | `order.js` + `orderDetails.js` + `OrderState`                                 | 订单卡片、状态时间线、操作按钮       | 确认现有页面移动端可用                                     |
| **钱包/支付**  | `wallet.js` + `cryptoBalance.js` + `sendMoney.js`                             | 余额展示、币种切换、交易列表         | 结账中的 Crypto 支付 UX 参考                               |
| **Onboarding** | `onboarding.js`                                                               | 引导步骤、进度指示                   | V1.2 Onboarding（PG-108）参考                              |

**不参考/需重新思考的**：

| Mobile 模式           | 问题                 | Unified 策略                     |
| --------------------- | -------------------- | -------------------------------- |
| React Native 组件     | 不适用 Web           | 用 React + Tailwind 重新实现     |
| Redux + Saga 状态管理 | 过重                 | Unified 用 Zustand + React Query |
| 底部 Tab 5 项导航     | 不一定适合独立站买家 | 根据 V1 场景重新规划导航结构     |
| 原生推送（Firebase）  | Web 无法直接用       | TG 通知 + Webhook（V1.1 PG-007） |
| 群组集市相关屏幕      | V1 不涉及            | 后续阶段评估                     |

### 8.1b 动态调整原则

本路线图是**指导框架，不是硬性规格书**。执行过程中遵循以下弹性原则：

1. **任务边界可伸缩**
   — 每个 PG 任务的范围可根据实际开发中发现的情况调整。如果某个子功能复杂度超预期，可先交付核心子集，剩余部分追加到下一轮
2. **执行顺序可调整**
   — 推荐顺序基于依赖关系，但如果某个任务因后端 API 未就绪等原因受阻，可先跳到不被阻塞的任务
3. **AI 增强层渐进式**
   — 标注了 🤖 的 AI 功能如果基础设施未就绪，先保证核心功能可用，AI 增强作为后续迭代补齐
4. **V1/V1.1 版本边界灵活** —
   PG-007 等标注为 V1.1 的任务，如果 V1 提前完成或工作量可控，可提前合入；反之 V1 中的任务如遇阻也可拆分
5. **新需求可插入** — 执行过程中发现的新需求（如用户反馈、技术债），通过在 Section
   9 追加新的 PG-xxx 行即可纳入追踪，不需修改整体结构

### 8.2 验收标准模板

每个 PG 任务完成时必须满足：

1. **功能验收** — 按任务描述的核心能力全部可用
2. **响应式** — 桌面端（1440px）+ 移动端（375px）都可用
3. **i18n** — 所有用户可见文字使用 `t()` 函数
4. **主题** — 不使用硬编码颜色，使用主题变量
5. **无障碍** — 按钮有 `aria-label`，图片有 `alt`
6. **类型安全** — 无 `any` 类型

### 8.3 AI 执行协议

每个 Tier 的执行由对应的 cursor skill 驱动：

| Tier     | Skill 文件                                          | 触发词                                                                              |
| -------- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Tier 0   | `.cursor/skills/pg-tier0-transaction-loop/SKILL.md` | "修复交易闭环"、"Tier 0"、"PG-00x"                                                  |
| Tier 0.5 | `.cursor/skills/pg-feedback-polish/SKILL.md`        | "反馈打磨"、"体验打磨"、"PG-006"~"PG-009"、"消灭 Unknown"、"身份人性化"、"登录品牌" |
| Tier 1   | `.cursor/skills/pg-tier1-admin-storefront/SKILL.md` | "Admin 分离"、"Tier 1"、"PG-10x"                                                    |
| Tier 2   | `.cursor/skills/pg-tier2-differentiation/SKILL.md`  | "差异化"、"Tier 2"、"AI Store Builder"、"PG-20x"                                    |
| Tier 3   | `.cursor/skills/pg-tier3-scale/SKILL.md`            | "规模化"、"Tier 3"、"PG-30x"                                                        |

---

## 9. 进度追踪

### Tier 0 — 交易闭环修复 ← V1 全部包含

| ID     | 任务                          | V1?   | 状态    | 完成日期   |
| ------ | ----------------------------- | ----- | ------- | ---------- |
| PG-001 | 购物车 + 结账（Mobile-First） | ✅ V1 | ✅ 完成 | 2026-02-25 |
| PG-002 | SEO + 社交分享                | ✅ V1 | ✅ 完成 | 2026-02-25 |
| PG-003 | 评价系统                      | ✅ V1 | ✅ 完成 | 2026-02-25 |
| PG-004 | 店内搜索 + 商品发现           | ✅ V1 | ✅ 完成 | 2026-02-25 |
| PG-005 | 信任与安全体验                | ✅ V1 | ✅ 完成 | 2026-02-25 |

### Tier 0.5 — 反馈驱动体验打磨 ← V1 必须完成

> 来源：2026-02-26 用户反馈（`feedbacks/feedbacks_2026.2.26.md`）详细规格：`docs/features/feedback-polish.md`
> 执行指南：`.cursor/skills/pg-feedback-polish/SKILL.md`

| ID      | 任务                                         | V1?   | 状态    | 完成日期   |
| ------- | -------------------------------------------- | ----- | ------- | ---------- |
| PG-006  | 身份人性化（Step 1-2 完成，Step 3-4 取消）   | ✅ V1 | ✅ 完成 | 2026-02-26 |
| PG-007b | E2E 数据质量 + 图片 Fallback                 | ✅ V1 | ✅ 完成 | 2026-02-26 |
| PG-008  | 登录页品牌化（前端完成，Casdoor 配置待手动） | ✅ V1 | ✅ 完成 | 2026-02-26 |
| PG-009  | 独立站首页差异化（StoreHero + 条件路由）     | ✅ V1 | ✅ 完成 | 2026-02-26 |

### Tier 1 — Admin/Storefront 分离

| ID     | 任务                      | V1?   | 状态    | 完成日期                                                                                                                                                                              |
| ------ | ------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-101 | Admin Layout + 路由       | V1.1  | ✅ 完成 | 2026-02-26 (Layout + Sidebar + Header + 5 页面 + i18n)                                                                                                                                |
| PG-102 | 商品管理页                | V1.1  | ✅ 完成 | 2026-02-26 (表格/卡片双视图 + 搜索 + 批量删除 + 行内操作 + i18n)                                                                                                                      |
| PG-007 | 集成管理（TG/AI/Webhook） | V1.1  | ✅ 完成 | 2026-02-26 (后端 ChannelNotificationSink + 前端 Admin Integrations UI + i18n en/zh)                                                                                                   |
| PG-105 | 卖家 Dashboard + 空状态   | V1.2  | ✅ 完成 | 2026-02-26 (4 指标卡片实时数据 + 最近订单 + 热门商品 + 空状态引导 + 骨架屏加载)                                                                                                       |
| PG-106 | 订单管理增强              | V1.3  | ✅ 完成 | 2026-02-26 (批量确认 + 高级筛选/搜索/日期范围 + CSV/JSON 导出 + 移动端操作 + 质量修复)                                                                                                |
| PG-107 | 现有设置页迁入 Admin      | V1.2  | ✅ 完成 | 2026-02-26 (6 个 Admin 子页面 + 4 个 Content 组件提取 + hub 链接更新)                                                                                                                 |
| PG-108 | 卖家 Onboarding 引导      | V1.3  | ✅ 完成 | 2026-02-26 (3 步向导：店铺资料+头像 → 创建首个商品 → 完成预览/跳转，localStorage 跟踪)                                                                                                |
| PG-109 | 折扣系统                  | V1.3  | ✅ 完成 | 2026-02-28 Shopify 风格 Discount 系统：P1 后端（3 模型 + 4 层架构 + 11 API）+ P2 前端（结账集成 + 商品标签 + 卖家管理页）+ Collection 集成 + 60 后端测试 + 10 E2E 测试 + 视觉回归基线 |
| PG-110 | AI 商品创建助手           | ✅ V1 | ✅ 完成 | 2026-02-26 (API Route + AI Service + UI 集成)                                                                                                                                         |
| PG-111 | 移动端卖家体验            | V1.3  | ✅ 完成 | Shopify 风格：底部 Tab Bar、4 步商品创建向导、Camera-First 拍照、紧凑卡片列表 + FAB                                                                                                   |

### Tier 2 — 差异化竞争力

| ID     | 任务                          | 状态                 | 完成日期                                                                                                                                                                                                                                                                                                                                       |
| ------ | ----------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-201 | 店铺品牌化（Section-based）   | ✅ 完成 (98%)        | 2026-02-28 后端 StorefrontAppService + 3 API ✅；前端 **15** Section 组件（含 video/countdown）+ StoreBrandingEditor（拖拽排序 + 响应式预览 + Google Fonts next/font 优化）+ StoreThemeProvider CSS 变量 + generateMetadata SEO + 5 预设模板 + 52 测试 ✅；设计文档 `docs/features/PG-201_STORE_BRANDING_DESIGN.md` v2.3；剩余 2%：AI 色板推荐 |
| PG-202 | AI Store Builder（MVP）       | ✅ 完成 (2026-02-28) | 后端 Go proxy 新增 `generate_store`/`refine_store` action + 精简 StoreConfig JSON Schema 提示词（~1800 tokens）+ 4096 max_tokens；前端 AIStoreBuilderDialog（idle→generating→preview 三阶段）+ 客户端 storeConfigValidator + aiService.generateStoreConfig + StoreBrandingEditor "AI Generate" 按钮 + 10s 冷却 + i18n en/zh。202b 对话微调待做 |
| PG-203 | 收藏/愿望单 + 降价提醒        | ✅ 完成 (2026-02-28) | 后端 WishlistAppService + 3 API；Zustand 全局状态 + 乐观更新；/wishlist 页面（快照展示+被动降价提示 usePriceUpdates）；ProductBottomBar/ProductDetail/ProductCard 三端收藏入口；移动端始终可见 Heart；Toast 反馈；i18n 时间格式。主动降价推送待通知基础设施就绪后实现。                                                                        |
| PG-204 | 买家发现体验（推荐/浏览历史） | ⏳ 未开始            |                                                                                                                                                                                                                                                                                                                                                |
| PG-205 | 智能通知中心                  | ⏳ 未开始            |                                                                                                                                                                                                                                                                                                                                                |
| PG-206 | AI 客服助手                   | ⏳ 未开始            |                                                                                                                                                                                                                                                                                                                                                |

### Tier 3 — 规模化运营

| ID     | 任务             | 状态      | 完成日期 |
| ------ | ---------------- | --------- | -------- |
| PG-301 | 高级分析         | ⏳ 未开始 |          |
| PG-302 | 客户管理         | ⏳ 未开始 |          |
| PG-303 | 营销工具         | ⏳ 未开始 |          |
| PG-304 | 多店铺管理       | ⏳ 未开始 |          |
| PG-305 | 插件系统（概念） | ⏳ 未开始 |          |

---

## 10. Phase M — Mobile-First Mini App 改造

> **独立路线图**：`docs/MOBILE_FIRST_ROADMAP.md` **审核报告**：`docs/MOBILE_AUDIT_REPORT.md`
> **开发规范**：`.cursor/rules/mobile-first-rules.mdc`
> **执行 Skill**：`.cursor/skills/mobile-first-miniapp/SKILL.md`

Phase M 是 Phase PG 的**移动端深化**。PG 建立了 Platform View 模式（Section
5b）和基础设施（`usePlatform`/`TGMiniAppProvider`/`CheckoutMobile`），Phase
M 全面实施到所有核心页面，并深度集成 Telegram Mini App 和 Discord Activity 的原生能力。

| Phase  | 目标                                                                                  | 预估   |
| ------ | ------------------------------------------------------------------------------------- | ------ |
| **M0** | 基础设施增强（React Query、手势库、BottomSheet、Discord Provider、导航架构）          | 1 周   |
| **M1** | 关键页面 Platform View 拆分（导航实施、商品详情、搜索、购物车、店铺、订单）           | 2-3 周 |
| **M2** | Mini App 专项增强（TG MainButton/BackButton/Share/Theme、Discord Activity、支付适配） | 1-2 周 |
| **M3** | 交互打磨（滑动手势、页面过渡、骨架屏、错误恢复）                                      | 1-2 周 |
| **M4** | 性能优化（JS 瘦身、字体按需、API 缓存、列表虚拟化）                                   | 1 周   |

**关键设计决策（v2 审核后确认）**：

- **React Query**：M0 早期引入（0.5-1d），收益显著，新 hooks 直接使用
- **支付适配**：Crypto 走 WalletConnect relay（QR 码可行），法币走 openLink 降级
- **导航架构**：TG/Discord 环境隐藏 MobileNav + MobilePageHeader 返回键

**触发词**："继续移动端改造"、"Phase M 下一步"、"Mini App 优化"

---

图例: ✅ 完成 | 🔄 进行中 | ⏳ 未开始

最后更新: 2026-03-01 (v42: Phase M 合并审核意见)
