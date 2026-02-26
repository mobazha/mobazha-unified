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

| 缺口                              | 新任务 ID   | 优先级 | 说明                      |
| --------------------------------- | ----------- | ------ | ------------------------- |
| "Unknown" 和 Peer ID 遍布所有页面 | **PG-006**  | P0     | 影响所有页面的信任感      |
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

### 术语映射表（PG-005 已定义，本任务落地）

| 技术术语           | 用户看到的                          | 适用位置       |
| ------------------ | ----------------------------------- | -------------- |
| Escrow             | "买家保障" / "Buyer Protection"     | 订单详情、结账 |
| Smart Contract     | 不出现                              | 全局           |
| Peer ID            | "卖家 ID" 或直接用店铺名            | 订单、搜索结果 |
| IPFS               | 不出现                              | 全局           |
| Gas Fee            | "网络手续费" / "Network Fee"        | 结账支付步骤   |
| Block Confirmation | "支付确认中" / "Confirming payment" | 支付等待 UI    |
| Moderator          | "争议仲裁" / "Dispute Resolution"   | 订单详情       |
| Connect Wallet     | "付款方式" 或降级                   | Header         |

### 实施步骤

1. **创建身份展示工具函数** `packages/core/utils/identity.ts`

   ```typescript
   // 从 profile/peer 数据提取可读名称
   formatUserName(profile?: { name?: string; peerID?: string }): string
   // → "TechStore" | "Store QmY8...tRnC" | "User QmBu...eer1"

   // 截断长地址/ID 用于展示
   truncateAddress(address: string, startChars?: number, endChars?: number): string
   // → "0x1234...cdef"

   // 格式化通知消息（去掉 "Unknown" 前缀）
   formatNotificationMessage(type: string, data: any): string
   ```

2. **全局搜索替换** — 找到所有直接渲染 `peerID` 或 `vendorID.peerID` 的位置
   - ProductCard（搜索结果） → `formatUserName(vendor)`
   - OrderList（Buyer/Seller 列）→ `formatUserName(peer)`
   - OrderDetail（Seller/Buyer 区）→ 头像 + `formatUserName` + 可折叠查看完整 ID
   - NotificationList → `formatNotificationMessage()`
   - ProductDetail 卖家信息区 → 店铺名 + View Store

3. **Header "Connect Wallet" 调整**
   - 未连接状态：降为文字链接或移入头像下拉菜单
   - 已连接状态：显示截断地址 + 小圆点状态指示器
   - 视觉优先级低于 "Sign In" / "My Account"

4. **Escrow 术语替换**
   - 订单详情：`EscrowStatusBar` 使用人话标签（已在 PG-005 定义但需检查实际文案）
   - "Funds are being held in escrow for approximately 37 days..." → "你的资金在确认收货前受到保护。如有问题，可发起争议。"
   - "Open Dispute" 按钮保留但增加解释 tooltip

5. **交易地址展示优化**
   - 所有区块链地址：`truncateAddress()` + 复制按钮 + Etherscan/explorer 链接

### 验收标准

- [ ] 所有页面无裸 Peer ID 直接渲染（grep `peerID` 展示位，全部走 `formatUserName`）
- [ ] 通知列表无 "Unknown" 前缀
- [ ] 订单列表和详情中 Buyer/Seller 显示可读名称
- [ ] Header 无突出的 "Connect Wallet" 蓝色按钮
- [ ] 订单详情中无裸露 "escrow" / "smart contract" 术语
- [ ] 移动端 375px 验证通过
- [ ] E2E 截图更新

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

## PG-007b: E2E 测试数据质量 + 图片 Fallback

### 用户故事

- 作为测试截图的查看者，我应该看到逼真的商品图片和卖家名称，而非灰色占位符和 "Unknown"
- 作为买家，商品图片加载失败时我应该看到友好的 fallback 而非空白灰块

### 问题

1. E2E 测试 mock 数据中商品没有真实图片 → 搜索结果/购物车/结账全是灰色占位符
2. 移动端部分页面数据未正确注入（商品详情 "Product not found"、结账 "No items"）
3. 图片加载失败的 fallback UI 不够友好（仅灰色图标）

### 实施步骤

1. **丰富 E2E mock 数据**
   - `e2e/fixtures/seed-visual-data.ts` 中为商品添加真实图片 URL（使用 picsum.photos 或 unsplash 占位图）
   - 为 mock 商品设置真实的卖家名称（不是默认 "Unknown"）
   - 购物车数据确保移动端和桌面端一致

2. **修复移动端数据注入**
   - 排查移动端商品详情 "Product not found" 的 mock 路由匹配问题
   - 排查移动端结账 "No items" 的 localStorage 购物车数据注入时机

3. **图片 Fallback 优化**
   - ProductCard / CartItem / CheckoutSummary 的图片组件添加渐进式 fallback：
     - 加载中 → Skeleton 动画
     - 加载失败 → 商品类型图标（如相机/耳机/咖啡豆的通用图标）或 "无图片" 友好提示
     - 不是灰色空白块

4. **更新全部快照**
   - 运行 `--update-snapshots` 刷新 ~80 张截图
   - 确认新截图中搜索结果有图片、购物车有缩略图、卖家名可读

### 验收标准

- [ ] 搜索结果截图中所有商品卡片有图片
- [ ] 购物车截图中商品有缩略图
- [ ] 结账摘要中商品有缩略图
- [ ] 移动端商品详情不再显示 "Product not found"
- [ ] 移动端结账不再显示 "No items to checkout"
- [ ] 图片加载失败有友好 fallback（非灰色空白块）

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

## PG-009: 独立站首页差异化（V1 最小版）

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

### 验收标准

- [ ] 独立站模式首页显示卖家品牌（名称/logo/简介/商品）
- [ ] 独立站模式首页无 "10K+ Stores" 等集市统计
- [ ] 独立站模式首页有店内搜索框
- [ ] SaaS 模式首页保持不变（或统计数字来自真实数据）
- [ ] 移动端 375px 验证通过

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
