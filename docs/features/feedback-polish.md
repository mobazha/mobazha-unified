# 反馈驱动体验打磨（Feedback-Driven Polish）

## 功能 ID

`PG-006` ~ `PG-009`（Tier 0.5 — 交易闭环打磨）

## 背景

2026-02-26，将桌面端和移动端 E2E 截图（~80 张）给新买家和新卖家用户查看，收集到详细反馈。
反馈文件：`feedbacks/feedbacks_2026.2.26.md`

**关键发现**：

- Tier 0（PG-001~005）已修复交易流程骨架，但用户看到的**截图是修复前的版本**
- 产品详情页桌面端已可用（有 Buyer Protection、Description、Shipping），但移动端截图仍显示 "Product not found"（E2E 数据问题）
- 反馈中 80% 的问题已有路线图对应项，但有 4 个关键缺口未被覆盖

## 反馈与路线图映射

### 已被 Tier 0 解决（需向用户展示更新后截图）

| 反馈问题         | 解决方        | 验证方法                            |
| ---------------- | ------------- | ----------------------------------- |
| 商品详情页不可用 | PG-001        | 桌面端截图已有完整页面              |
| 购物车→结账断裂  | PG-001        | 桌面端 Checkout 3 步流程已完整      |
| 没有买家保障说明 | PG-005        | Buyer Protection 卡片已在商品详情页 |
| 没有 Footer      | PG-005        | 所有页面已有完整 Footer             |
| 没有评价系统     | PG-003        | Customer Reviews 区域已存在         |
| SEO 缺失         | PG-002        | sitemap + JSON-LD + OG 标签已完成   |
| 聊天页崩溃       | E2E mock 问题 | 需确认实际聊天功能正常              |

### 路线图缺口（本文档定义的新任务）

| 缺口                              | 新任务 ID   | 优先级 | 说明                      | 状态                  |
| --------------------------------- | ----------- | ------ | ------------------------- | --------------------- |
| "Unknown" 和 Peer ID 遍布所有页面 | **PG-006**  | P0     | 影响所有页面的信任感      | ✅ 完成（2026-02-26） |
| 搜索/购物车/结账中商品图片缺失    | **PG-007b** | P0     | E2E 数据 + 图片 fallback  |
| 登录页无品牌感                    | **PG-008**  | P1     | Casdoor 配置 + 主题化     |
| 独立站首页仍是集市模板            | **PG-009**  | P1     | `isStandalone` 首页差异化 |

### 已有路线图项（需提前/强化执行）

| 反馈问题                 | 路线图映射      | 建议               |
| ------------------------ | --------------- | ------------------ |
| "Connect Wallet" 太突出  | PG-005 术语抽象 | PG-006 中一并处理  |
| 订单详情暴露 Escrow 术语 | PG-005 术语抽象 | PG-006 中一并处理  |
| 设置太技术化             | PG-107          | 保持原排期（V1.2） |
| 商品发布超长单页         | PG-111          | 保持原排期（V1.3） |
| 无数据分析               | PG-105          | 保持原排期（V1.2） |
| 纯加密支付               | 未排期          | P3，非 V1 范围     |

---

## PG-006: 身份人性化 + 术语抽象

### 用户故事

- 作为买家，我在任何页面都应该看到可读的用户名和店铺名，而非密码学 ID，以便我知道自己在和谁交易
- 作为买家，我在订单和通知中应该看到自然语言描述，而非 "Unknown" 前缀和技术术语

### 问题清单

通过截图确认，以下位置展示了裸 Peer ID 或 "Unknown"：

| 页面                 | 问题            | 展示内容                                                                      | 期望展示                                             |
| -------------------- | --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| 搜索结果卡片         | 卖家名          | "Unknown"                                                                     | 店铺名（如 "TechStore"），无名时 "Store QmY8...tRnC" |
| 订单列表 (Sales)     | Buyer 列        | "QmBuyer..."                                                                  | 买家用户名，无名时截断 Peer ID + tooltip             |
| 订单列表 (Purchases) | Seller 列       | "QmY8tRn..."                                                                  | 卖家店铺名                                           |
| 订单详情             | Seller/Buyer 区 | "Unknown" / "QmBuyerPeer1..."                                                 | 可读名称 + 头像                                      |
| 通知                 | 所有类型        | "Unknown Payment received" / "Unknown Order shipped" / "Unknown Notification" | 去掉 "Unknown"，直接显示事件描述                     |
| 商品详情             | 卖家信息        | "QmY8tRnC"                                                                    | 店铺名 + View Store 链接                             |
| 订单详情             | 支付信息        | "0x123456...abcdef"                                                           | 截断地址 + 复制按钮                                  |
| Header               | Connect Wallet  | 蓝色突出按钮                                                                  | 降为次要按钮或移入菜单                               |
| 订单详情             | Escrow 说明     | "Funds held in escrow for ~37 days"                                           | "你的资金在确认收货前受到保护"                       |

### 术语映射表（PG-005 已定义，本任务分析结论）

| 技术术语           | 当前状态                                           | 决策                                   |
| ------------------ | -------------------------------------------------- | -------------------------------------- |
| Escrow             | `BuyerProtectionBanner` 已抽象为"Buyer Protection" | ✅ 已合理处理，crypto 流保留技术准确性 |
| Smart Contract     | 仅在 crypto 流的信任说明中出现                     | ✅ 对 Web3 用户是信任信号，保留        |
| Peer ID            | 全局已替换为可读名称/截断格式                      | ✅ Step 2 已完成                       |
| IPFS               | 仅在隐私政策法律文本中                             | ✅ 无需修改                            |
| Gas Fee            | 代码中不存在                                       | ✅ 无需处理                            |
| Block Confirmation | 代码中不存在                                       | ✅ 无需处理                            |
| Moderator          | 保持原样                                           | ✅ Stripe 用户不接触此术语             |
| Connect Wallet     | Header 主色按钮                                    | ⏸️ 暂缓，等 Stripe 集成后重新评估      |

### 实施步骤

1. ✅ **创建身份展示工具函数** `packages/core/utils/identity.ts`

   ```typescript
   formatUserName(data?, options?) → 可读名称 | 截断 peerID | fallback
   truncatePeerId(peerId, chars?) → "QmY8…tRnC"
   truncateAddress(address, startChars?, endChars?) → "0x1234…cdef"
   formatNotificationName(data?) → 通知发送者名（空=省略主语）
   ```

   单元测试：`packages/core/__tests__/utils/identity.test.ts`

2. ✅ **全局搜索替换** — 20+ 文件完成身份人性化
   - 搜索结果 / 首页 → vendorName 空时用截断 peerID，再空则隐藏
   - 订单列表 → 角色标签 i18n (`t('order.seller')` / `t('order.buyer')`) 兜底
   - 订单详情 → 截断 peerID + 角色标签 i18n 兜底
   - 通知 → 空字符串省略主语
   - 聊天 → `t('chat.defaultRoom')` 兜底
   - 结账 → `t('order.seller')` 兜底
   - 数据转换层 → `formatUserName()` + 角色标签 fallback
   - 所有 UI fallback 文案已 i18n 化

3. ~~**Header "Connect Wallet" 降级**~~ → **暂缓**

   > **决策（2026-02-26）**：钱包连接对 Web3 用户购物贯穿始终，是核心 CTA。
   > 即将添加 Stripe 法币支付后，Header 按钮可能改为「支付方式」入口。
   > 等 Stripe 集成后整体重新评估支付入口的 UI 优先级。

4. ~~**术语替换（Escrow / Smart Contract / Gas Fee 等）**~~ → **取消**

   > **决策（2026-02-26）**：代码分析发现：
   >
   > - "Gas Fee" 和 "Block Confirmation" 代码中不存在
   > - "IPFS" 仅在隐私政策法律文本中出现
   > - "Escrow" 和 "Smart Contract" 仅出现在 crypto 支付流中，对 Web3 用户是信任信号
   > - `BuyerProtectionBanner` 已将 escrow 抽象为"买家保障"
   > - `EscrowStatusBar` 使用用户友好的步骤标签（Paid / Confirmed / Shipped 等）
   > - Stripe 法币用户根本不会看到这些 crypto 术语
   >   **结论**：现有术语处理已合理，不需要额外替换。

5. ✅ **交易地址展示优化**（在 Step 2 中一并完成）
   - 区块链地址/peerID 全部使用截断格式 `slice(0,6)…slice(-4)`

### 设计决策：Fallback 策略

**重要背景**：`name` 是后端必填项（`validateProfile` 强制非空），onboarding 前端也有校验。
生产环境中 vendorName 几乎总有值。Fallback 是**防御性编程**，仅面向极端边缘情况
（历史数据、索引同步延迟、API 故障）。E2E 截图中的 "Unknown" 是 mock 数据质量问题（PG-007b），
非生产问题。

**名称不可用时的 fallback 是上下文相关的，不能一刀切。** 详见 `.cursor/rules/identity-display-rules.mdc`。

核心判断：

- 该 UI 位置是否**必须**展示名称？（如 "From: [name]"、资料卡片、结账页）→ 用角色标签 ("Seller"/"Buyer")
- 该 UI 位置可以**省略**名称？（如商品卡片卖家行、通知前缀）→ 用空字符串/不渲染
- 该 UI 位置必须展示**某种标识**？（如聊天房间名）→ 用功能标签 ("Chat")

### 验收标准

- [x] 所有页面无裸 Peer ID 直接渲染（grep `peerID` 展示位，全部走 `formatUserName` 或截断）
- [x] 通知列表无 "Unknown" 前缀
- [x] 订单列表和详情中 Buyer/Seller 有可读名称或角色标签兜底
- [x] Fallback 策略与上下文匹配（非盲目空字符串）
- [x] 所有 UI fallback 文案使用 i18n `t()` 函数
- [ ] ~~Header 无突出的 "Connect Wallet" 蓝色按钮~~ → 暂缓，等 Stripe 集成后重新评估
- [x] Escrow/Smart Contract 术语已在 crypto 流中合理使用，`BuyerProtectionBanner` 已抽象
- [ ] 移动端 375px 验证通过（PG-007b 截图更新时一并验证）
- [ ] E2E 截图更新（PG-007b 时一并执行）

### 关键文件

| 文件                                                  | 修改内容                           |
| ----------------------------------------------------- | ---------------------------------- |
| `packages/core/utils/identity.ts`                     | **新建** — 身份展示工具函数        |
| `apps/web/src/components/ProductCard/ProductCard.tsx` | 卖家名用 `formatUserName`          |
| `apps/web/src/components/Order/OrderListCompact.tsx`  | Buyer/Seller 列用 `formatUserName` |
| `apps/web/src/app/orders/[orderId]/page.tsx`          | 术语替换 + 身份展示                |
| `apps/web/src/app/notifications/page.tsx`             | 去掉 "Unknown" 前缀                |
| `apps/web/src/components/Product/ProductDetail.tsx`   | 卖家信息区优化                     |
| `apps/web/src/components/Header/Header.tsx`           | Connect Wallet 降级                |

---

## PG-007b: E2E 测试数据质量 + 图片 Fallback ✅ 完成 | 2026-02-26

### 用户故事

- 作为测试截图的查看者，我应该看到逼真的商品图片和卖家名称，而非灰色占位符和 "Unknown"
- 作为买家，商品图片加载失败时我应该看到友好的 fallback 而非空白灰块

### 实施结果

1. **✅ 创建共享 ProductImage 组件**（`components/ui/product-image.tsx`）
   - `ProductImage`：基于 `next/image`，支持 `fill` 模式，加载中显示 Skeleton，失败显示 `ImageOff` 图标
   - `ProductImageNative`：基于原生 `<img>`，轻量版，适用于购物车/订单等非关键图片
   - 三种图标尺寸（sm/md/lg）适配不同容器

2. **✅ 替换 12+ 处内联图片渲染**
   - `ProductCard`：`next/image` → `ProductImage`（含 hover scale 动画）
   - `Cart page`、`CartDrawer`：`<img>` → `ProductImageNative`
   - `CheckoutDesktop`、`CheckoutMobile`：内联 SVG → `ProductImageNative`
   - `OrderCard`：`next/image` → `ProductImage`
   - `OrderListCompact`、`OrderTable`、`OrderSummaryCard`：内联 SVG → `ProductImageNative`
   - `OrderDetailsSection`、`OrderDetailContent`（2处）：内联 `<img>` → `ProductImageNative`

3. **✅ E2E mock 数据全量添加图片**
   - `mock-api-routes.ts`：所有 thumbnail 从空字符串改为 `picsum.photos` URL
   - `seed-visual-data.ts`：购物车注入数据使用 picsum URLs
   - 新增 `mockImageRoutes()`：拦截 `/v1/media/images/*` 请求重定向到 picsum

4. **⏸️ 快照更新**：代码改动完成，快照更新待下次 E2E 运行时执行

### 验收标准

- [x] 图片加载失败有友好 fallback（ImageOff 图标 + bg-muted 背景）
- [x] 加载中状态有 Skeleton 动画（ProductImage 组件）
- [x] E2E mock 数据中所有商品有图片 URL
- [x] 统一的图片组件替代分散的内联实现
- [ ] 快照更新（待下次 E2E 运行）

---

## PG-008: 登录页品牌化

### 用户故事

- 作为买家，登录页面应该看起来像是这个店铺的一部分，而非跳转到了第三方网站
- 作为独立站访客，登录体验应该自然融入独立站的品牌

### 问题

当前 Casdoor 登录页显示：

- `[Mobazha E2E]`（图片 alt 文字而非真实 logo）
- 地球图标（不是品牌 logo）
- "Powered by Casdoor"（第三方品牌暴露）
- 无品牌色彩

### 实施步骤

1. **Casdoor 配置优化**
   - 上传正确的 Mobazha logo 到 Casdoor application 配置
   - 设置 application 的 display name 为 "Mobazha"（不是 "Mobazha E2E"）
   - 配置 CSS 自定义：隐藏或重新样式化 "Powered by Casdoor"

2. **独立站登录页品牌化**
   - 独立站模式下，Casdoor OAuth popup 应传递店铺品牌信息
   - 如 Casdoor 不支持动态品牌化，考虑在 popup 打开前显示中间页（"正在安全跳转到登录..."）

3. **E2E 登录页截图更新**
   - Casdoor 测试环境配置正确的 logo
   - 更新登录页截图

### 验收标准

- [ ] 登录页显示正确的 Mobazha logo（非 alt 文字）
- [ ] "Powered by Casdoor" 不可见或样式化为极不显眼
- [ ] 登录页主题色与平台一致
- [ ] 移动端登录页同样品牌化

---

## PG-009: 独立站首页差异化（V1 最小版） — ✅ 完成 | 2026-02-26

### 用户故事

- 作为独立站的买家，首页应该是这个卖家的品牌着陆页，展示卖家的店铺信息和商品
- 作为买家，我不应该看到 "10K+ Active Stores" 这种与这个独立站无关的统计数据

### 问题

当前首页是 SaaS marketplace 模板：

- Hero: "Trade Freely. Trade Securely." — 集市口号
- 统计: "10K+ Active Stores, 50K+ Products Listed" — 不真实的大数字
- CTA: "Explore Market" / "Start Selling" — 集市导向
- 内容: Trending Now / Featured & Services — 来自集市数据

在独立站模式下，买家到达的是一个卖家的店铺，应该看到这个卖家的品牌和商品。

### 实施步骤

1. **独立站首页组件** `StandaloneHomePage`
   - 条件：`isStandalone === true` 时使用
   - 内容：
     - 店铺名称 + logo + 封面图（从 profile API 获取）
     - 店铺简介
     - 搜索框（店内搜索）
     - 接受的支付方式图标
     - 最新/所有商品网格

2. **SaaS 首页诚实化**
   - `isStandalone === false` 时保留现有首页布局
   - 但统计数字应来自真实数据，非硬编码
   - 如果是新平台无数据，显示诚实的空状态或隐藏统计区

3. **`isStandalone` 路由分发**
   - `app/page.tsx`（首页）根据 `isStandalone` 分发不同组件
   - 独立站模式 → `StandaloneHomePage`
   - SaaS 模式 → 现有 `MarketplaceHomePage`

### V1 实施结果

**新组件**：

- `StoreHero`（`components/StoreHero/StoreHero.tsx`）— 独立站 Hero，展示店铺头像/名称/简介/位置/商品数/评分/搜索框

**修改**：

- `app/page.tsx` — `isStandalone()` 条件分发：StoreHero vs Hero，独立站标题改为 "All Products"，隐藏 Featured/Categories 区

### 验收标准

- [x] 独立站模式首页显示卖家品牌（名称/logo/简介/商品）
- [x] 独立站模式首页无 "10K+ Stores" 等集市统计
- [x] 独立站模式首页有店内搜索框
- [x] SaaS 模式首页保持不变
- [ ] 移动端 375px 验证通过（待 E2E 截图更新）

---

## 执行优先级

```
PG-006（身份人性化 + 术语抽象）  ← P0，影响所有页面，~3-4 天
  ↓
PG-007b（E2E 数据质量 + 图片 fallback）  ← P0，让截图"说服人"，~1-2 天
  ↓
PG-008（登录品牌化）  ← P1，独立站信任基线，~1 天
  ↓
PG-009（独立站首页差异化）  ← P1，品牌着陆页，~2-3 天
  ↓
更新全部截图，进行第二轮用户展示
  ↓
继续 PG-110（AI 商品创建）← V1 差异化
```

总计 ~7-10 天，完成后再次征集用户反馈。

## 测试用例引用

- E2E 视觉测试：`apps/web/e2e/desktop-visual.spec.ts` + `mobile-visual.spec.ts`
- 身份展示单元测试：`packages/core/__tests__/utils/identity.test.ts`（新建）
- 图片 fallback 组件测试：对应组件测试文件

## 相关文档

- [用户反馈原文](../../feedbacks/feedbacks_2026.2.26.md)
- [Professional Grade Roadmap](../PROFESSIONAL_GRADE_ROADMAP.md)
- [Tier 0 SKILL](../../.cursor/skills/pg-tier0-transaction-loop/SKILL.md)
