# Phase M — Mobile-First Mini App 改造路线图

> **定位**：将 Mobazha 从"桌面端可用、移动端勉强"进化为"移动端原生级体验"，
> 以 Telegram Mini App 和 Discord Activity 为主要发布形态。
>
> **核心策略**：同路由、分视图（Platform View Pattern）— URL 不变，
> 根据 `usePlatform().shouldUseMobileView` 加载不同的视图组件。
>
> **前置审核**：`docs/MOBILE_AUDIT_REPORT.md`（移动端体验审核报告）
>
> **与其他路线图的关系**：
>
> - `docs/PROFESSIONAL_GRADE_ROADMAP.md` — 前端产品专业化（Phase PG，Tier 0-2 ✅）
> - Phase M 是 Phase PG 的**移动端深化**，PG 建立了 Platform View 模式和基础设施，M 全面实施

---

## 1. 战略背景

### 1.1 为什么移动端是重中之重

| 维度         | 说明                                                                  |
| ------------ | --------------------------------------------------------------------- |
| **分发渠道** | TG Mini App + Discord Activity 是主要买家入口，用户在手机上打开链接   |
| **用户行为** | 买家从 TG 群/Discord 频道看到商品链接 → 点击 → 在 Mini App 内完成购买 |
| **竞争优势** | 嵌入式购物（不离开社交 App）> 跳转浏览器，转化率可提升 2-3x           |
| **技术趋势** | TG Mini App 月活 5 亿+、Discord Activity 覆盖 1.5 亿+ 活跃用户        |

### 1.2 目标用户旅程

```
TG 群/Discord 频道
  → 看到卖家分享的商品链接/Mini App 入口
  → 点击打开 Mini App（不离开 TG/Discord）
  → 浏览商品（全宽图片 Swiper + 底部操作栏）
  → 搜索更多商品（全屏搜索覆盖层）
  → 加购物车（TG MainButton "查看购物车"）
  → 结账（已有 CheckoutMobile + Crypto 支付）
  → 订单确认 + 分享给朋友（TG 原生分享）
  → 收到订单状态推送（TG 通知 / Discord DM）
```

### 1.3 设计原则

1. **Mobile-First, Mini App-Native** — 每个页面先为 375px 设计，再向上适配
2. **同路由分视图** — URL 不变（SEO 友好），UI 按平台分发
3. **宿主 App 能力优先** — TG MainButton > 自定义按钮，TG Share > Web Share
4. **共享业务逻辑** — Desktop/Mobile 视图共享同一套 hooks，只有 UI 层不同
5. **渐进增强** — Mobile Web 是基线，TG/Discord 是增强层
6. **性能预算** — LCP < 2.5s，首屏 JS < 200KB gzip，TTI < 3.5s
7. **AI-First** — AI 能力（自动商品描述、Store Builder、AI 客服）在移动端同等提供，
   输入范式适配（语音输入 > 长文本打字、拍照上传 > 文件选择）

---

## 2. Phase 分解

### Phase M0：基础设施增强（预估 1 周）

为所有后续改造提供基座。

| ID       | 任务                      | 说明                                                                    | 预估   |
| -------- | ------------------------- | ----------------------------------------------------------------------- | ------ |
| **M0-1** | React Query 集成          | 安装 + QueryClientProvider + devtools + 示例 hook                       | 0.5-1d |
| **M0-2** | 图片统一优化              | raw `<img>` → `next/image` 或 `loading="lazy"` + `srcset`               | 1d     |
| **M0-3** | Discord Activity Provider | 参照 TGMiniAppProvider，封装 `@discord/embedded-app-sdk`                | 1-2d   |
| **M0-4** | 手势库集成                | 引入 `@use-gesture/react`，封装 `useSwipeAction`/`usePullRefresh` hooks | 1d     |
| **M0-5** | 底部 Sheet 统一组件       | 基于 Radix Dialog 封装 `BottomSheet` 组件（支持拖拽关闭、snap points）  | 0.5d   |
| **M0-6** | Mini App 导航架构         | 处理 MobileNav/MobilePageHeader 在 TG/Discord 中的显隐策略              | 0.5d   |

**M0-1 React Query 集成 — 评估结论：**

> **收益确认**：当前 ~25 个手工 fetch hooks 全部使用 `useState + useEffect + useCallback`，
> 无共享缓存、无去重、无后台刷新。React Query 引入后：
>
> - 请求去重（多组件共享同一数据 → 单次请求）
> - stale-while-revalidate（移动端页面切换时立即显示缓存 → 后台刷新）
> - 自动重试（适配弱网环境）
> - 乐观更新（加购、收藏等场景瞬时反馈）
>
> **复杂度低**：M0 仅做安装 + Provider + devtools + 1 个示例 hook 迁移（约 2-3 小时），
> ~18 个 API service 模块无需修改，新 M1 hooks 直接使用 React Query。
> 旧 hooks 按改造页面逐步迁移，不需要一次性全量替换。
>
> **风险低**：React Query ~13KB gzip，不影响现有 Zustand stores（Zustand 管理客户端状态，
> React Query 管理服务器状态，职责清晰分离）。

```
阶段 1（M0-1）：安装 + Provider 包装 + devtools + 1 个示例 hook     ← 0.5-1 天
阶段 2（M1-x）：新 Platform View hooks 用 useQuery/useMutation    ← 随 M1 自然完成
阶段 3（M4-3）：逐步迁移现有手工 fetch hooks（可选，按需）          ← 视收益决定
```

**M0-6 Mini App 导航架构策略：**

```
TG Mini App：
  隐藏 MobileNav 底部导航（TG 自有底栏会遮挡）
  隐藏 MobilePageHeader 返回箭头（用 TG BackButton 替代）
  保留 MobilePageHeader 标题和右侧操作

Discord Activity：
  隐藏 MobileNav（Discord 自有 Activity 控制栏）
  MobilePageHeader 保留但调整样式

Mobile Web：
  MobileNav + MobilePageHeader 完整显示（基线）
```

---

### Phase M1：关键页面 Platform View 拆分（预估 2-3 周）

按买家交易旅程顺序，拆分核心页面为 Desktop/Mobile 独立视图。

#### M1-0：Mini App 导航架构实施（P0，预估 1d）

**前置条件**：M0-6 中确定了导航策略，M1-0 负责实际实施。

```
MobileNav.tsx：
  const { isTGMiniApp, isDiscordActivity } = usePlatform();
  if (isTGMiniApp || isDiscordActivity) return null;  // 宿主 App 有自己的底栏

MobilePageHeader.tsx：
  const { isTGMiniApp } = usePlatform();
  // TG 环境隐藏左侧返回按钮（用 BackButton 替代），保留标题和右侧操作
  {!isTGMiniApp && <BackArrow />}
```

**交付物**：

- `MobileNav` 按平台条件渲染
- `MobilePageHeader` 返回按钮按平台条件渲染
- `useTGBackButton` hook（统一绑定路由回退栈）
- 底部安全区在 TG/Discord 环境的高度调整

#### M1-1：商品详情 Platform View（P0，预估 3-4d）

**当前**：`ProductDetail.tsx` (1,537 行，单文件响应式)

**目标**：

```
app/product/[slug]/page.tsx           ← thin shell
components/Product/
├── ProductDetailDesktop.tsx          ← 桌面端：左图右信息并排
├── ProductDetailMobile.tsx           ← 移动端（见下方设计）
├── useProductDetail.ts               ← 共享业务逻辑（提取自现有）
├── ProductImageSwiper.tsx            ← 移动端图片 Swiper
├── ProductInfoAccordion.tsx          ← 移动端折叠信息区
├── ProductBottomBar.tsx              ← 已有，需增强
└── ProductVariantSelector.tsx        ← 变体选择（pill/chip 样式）
```

**Mobile View 布局设计：**

```
┌─────────────────────┐
│ ← Back    Store     │ MobilePageHeader
├─────────────────────┤
│                     │
│   [图片 Swiper]     │ 全宽，支持滑动 + 捏合缩放
│   · · ○ · ·         │ 页面指示器
│                     │
├─────────────────────┤
│ ¥42.00  ≈ 0.015 ETH│ 价格（法币+加密）
│ ★★★★☆ (23 reviews) │ 评分摘要
│ 🛡️ Buyer Protection │ 信任标识
├─────────────────────┤
│ Color: [Red][Blue]… │ 变体选择（pill 样式）
│ Size:  [S] [M] [L]  │
├─────────────────────┤
│ ▼ Description       │ Accordion 折叠
│ ▼ Shipping          │
│ ▼ Reviews (23)      │
│ ▼ Return Policy     │
├─────────────────────┤
│ [Add to Cart] [Buy] │ 底部固定操作栏 (44px)
└─────────────────────┘

TG Mini App 内：
  底部操作栏 → TG MainButton "Add to Cart"
  返回按钮 → TG BackButton
  加购成功 → HapticFeedback.notificationOccurred('success')
```

**AI 增强子任务：**

- 如 AI 商品描述功能存在（PG-107 AI Product Assistant），在移动端适配输入方式
- 优先支持拍照上传图片 → AI 自动生成描述（移动端拍照 > 桌面端文件选择）
- AI 生成结果使用 Skeleton + 流式展示

#### M1-2：搜索 Mobile View（P0，预估 2-3d）

**当前**：`search/page.tsx` (859 行，响应式)

**目标**：

```
app/search/page.tsx                   ← thin shell
components/Search/
├── SearchDesktop.tsx                 ← 桌面端：页内搜索 + 侧边筛选
├── SearchOverlay.tsx                 ← 移动端：全屏搜索覆盖层
├── useSearch.ts                      ← 共享搜索逻辑
├── SearchHistory.tsx                 ← 搜索历史（localStorage/CloudStorage）
├── SearchSuggestions.tsx             ← 即时搜索建议
└── FilterSheet.tsx                   ← 筛选底部 Sheet
```

**Mobile View 布局设计：**

```
┌─────────────────────┐
│ ← [🔍 Search...   ] │ 自动聚焦输入框
├─────────────────────┤
│ Recent Searches      │ 搜索历史
│ vintage bag  ×       │
│ leather wallet  ×    │
│ handmade ring  ×     │
├─────────────────────┤
│ 输入后 → 即时建议    │
│ "leather" → 12 件    │
│ "leather bag" → 5 件 │
├─────────────────────┤
│ [🔽 Filter] [Sort ▾]│ 筛选+排序
│ ┌────┐ ┌────┐       │
│ │prod│ │prod│       │ 2 列网格
│ │card│ │card│       │
│ └────┘ └────┘       │
│ ┌────┐ ┌────┐       │
│ │    │ │    │       │
└─────────────────────┘
```

#### M1-3：购物车 Mobile View（P1，预估 2d）

**目标**：

```
app/cart/page.tsx                     ← 增强现有
components/Cart/
├── CartDesktop.tsx                   ← 桌面端（保持现有 + 优化）
├── CartMobile.tsx                    ← 移动端全页
├── useCart.ts                        ← 共享逻辑
├── CartItemSwipeable.tsx             ← 滑动删除商品
└── CartBottomBar.tsx                 ← 底部固定结算栏
```

**Mobile View 特点：**

- 全页显示（非 Drawer）
- 商品项支持左滑删除
- 数量步进器加大到 44px
- 底部固定结算栏：总价 + "去结账" 按钮
- 按卖家分组（多卖家场景）
- TG 环境：MainButton "Checkout (¥128)"

#### M1-4：店铺首页优化（P1，预估 2d）

**目标**：不完全拆分 Desktop/Mobile（Section 组件已有响应式），
但做以下移动端增强：

- 商品网格移动端改为 2 列（当前 `grid-cols-1` → `grid-cols-2`）
- Hero 组件移动端 CTA 按钮全宽
- 分类导航水平滚动 + 渐变遮罩
- Section 间距移动端减小

#### M1-5：订单列表优化（P2，预估 1d）

- 移动端筛选收起为按钮 + 底部 Sheet
- 下拉刷新（`usePullRefresh` hook）
- 订单卡片滑动操作（确认收货/联系卖家）

---

### Phase M2：Mini App 专项增强（预估 1-2 周）

#### M2-1：TG MainButton/BackButton 集成（P0，预估 2d）

```typescript
// 集成方式：在各 Mobile View 内通过 useTGMiniApp() 条件绑定
// 不需要修改 TGMiniAppProvider，只需在页面组件内使用

function ProductDetailMobile() {
  const { isTGMiniApp, mainButton, backButton, haptic } = useTGMiniApp();
  const { product, addToCart } = useProductDetail();

  useEffect(() => {
    if (isTGMiniApp && mainButton) {
      mainButton.setText(`Add to Cart - ${product.price}`);
      mainButton.show();
      mainButton.onClick(() => {
        addToCart();
        haptic?.notificationOccurred('success');
      });
      return () => mainButton.hide();
    }
  }, [isTGMiniApp, product]);

  // BackButton 绑定路由返回
  useEffect(() => {
    if (isTGMiniApp && backButton) {
      backButton.show();
      backButton.onClick(() => router.back());
      return () => backButton.hide();
    }
  }, [isTGMiniApp]);

  return (
    <>
      {/* 移动端 UI */}
      {/* 非 TG 环境显示底部操作栏；TG 环境用 MainButton 替代 */}
      {!isTGMiniApp && <ProductBottomBar />}
    </>
  );
}
```

**集成页面清单：**

| 页面     | MainButton 文案            | BackButton | HapticFeedback |
| -------- | -------------------------- | ---------- | -------------- |
| 商品详情 | "Add to Cart - ¥42"        | ✅         | 加购成功       |
| 购物车   | "Checkout (¥128)"          | ✅         | —              |
| 结账     | "Pay ¥128"                 | ✅         | 支付确认       |
| 搜索     | 隐藏                       | ✅         | —              |
| 订单详情 | "Confirm Receipt" (如适用) | ✅         | 确认收货       |

**TG 额外 SDK 能力优先级（M2 范围）：**

| TG SDK 能力          | 优先级 | 用途                                             |
| -------------------- | ------ | ------------------------------------------------ |
| `showPopup()`        | P1     | 替代自定义 Modal 做确认对话框（原生风格，更快）  |
| `showAlert()`        | P1     | 简单提示（替代 Toast/Snackbar 的部分场景）       |
| `showConfirm()`      | P1     | 二次确认（删除商品、取消订单）                   |
| `requestWriteAccess` | P2     | 获得向用户发消息的权限（订单通知推送）           |
| `switchInlineQuery`  | P2     | 支持 inline 模式商品搜索（在聊天中 @bot 搜商品） |
| `openInvoice()`      | P3     | TG Payments（如未来接入 TG 原生支付）            |

#### M2-2：TG 主题同步（P1，预估 1d）

```typescript
// TGMiniAppProvider 内新增主题同步
useEffect(() => {
  if (themeParams) {
    document.documentElement.style.setProperty('--tg-bg', themeParams.bg_color);
    document.documentElement.style.setProperty('--tg-text', themeParams.text_color);
    document.documentElement.style.setProperty('--tg-hint', themeParams.hint_color);
    document.documentElement.style.setProperty('--tg-link', themeParams.link_color);
    document.documentElement.style.setProperty('--tg-button', themeParams.button_color);
    document.documentElement.style.setProperty('--tg-button-text', themeParams.button_text_color);
  }
}, [themeParams]);
```

**主题冲突处理策略：**

Mobazha 有店铺主题系统（卖家自定义颜色），TG/Discord 也推送宿主主题。
处理优先级：

```
TG Mini App 内：
  背景色 / 基础文本色 → 使用 TG themeParams（保证视觉融合）
  品牌色 / 商品展示色 → 保留店铺主题色（卖家品牌辨识度）
  MainButton 颜色 → TG 控制（无法自定义）

Discord Activity 内：
  深色/浅色模式 → 跟随 Discord（用户偏好）
  品牌色 → 保留店铺主题色

Mobile Web：
  完全使用店铺主题系统（无宿主约束）
```

#### M2-3：TG 分享集成（P1，预估 0.5d）

```typescript
function useShare() {
  const { isTGMiniApp } = useTGMiniApp();

  return {
    share: (url: string, text?: string) => {
      if (isTGMiniApp && window.Telegram?.WebApp?.openTelegramLink) {
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text || '')}`;
        window.Telegram.WebApp.openTelegramLink(shareUrl);
      } else if (navigator.share) {
        navigator.share({ url, text });
      } else {
        navigator.clipboard.writeText(url);
      }
    },
  };
}
```

#### M2-4：Discord Activity Provider（P1，预估 2-3d）

```
components/DiscordActivityProvider/
├── DiscordActivityProvider.tsx     ← SDK 初始化 + 认证 + 主题
├── useDiscordActivity.ts          ← Context hook
└── discordThemeSync.ts            ← Discord 主题 → CSS 变量
```

功能清单：

- `@discord/embedded-app-sdk` 初始化
- OAuth2 PKCE 认证（iframe 内，无弹窗）
- 主题同步（跟随 Discord 深色/浅色）
- Activity 生命周期（暂停/恢复/关闭）
- 消息嵌入分享

#### M2-5：下拉刷新（P1，预估 1d）

```typescript
// hooks/usePullRefresh.ts
// 基于 @use-gesture/react 实现
// 在 Mini App 环境下尤其重要（无浏览器刷新按钮）

function usePullRefresh(onRefresh: () => Promise<void>) {
  // ...拖拽检测、阈值判定、回弹动画、刷新回调
}

// 使用
function OrderListMobile() {
  const { refresh } = useOrders();
  const pullRefreshProps = usePullRefresh(refresh);
  return <div {...pullRefreshProps}>...</div>;
}
```

#### M2-6：Mini App 支付方式适配（P0，预估 2-3d）

Mini App 环境下支付流程需特殊处理：

**支付方式可行性矩阵：**

| 支付方式                     | TG Mini App     | Discord Activity | Mobile Web | 实现方式                                                                   |
| ---------------------------- | --------------- | ---------------- | ---------- | -------------------------------------------------------------------------- |
| **Crypto — WalletConnect**   | ✅ 可行         | ✅ 可行          | ✅ 可行    | Reown AppKit 弹出 QR 码 → 手机钱包扫描 → 签名交易 → 回调确认               |
| **Crypto — MetaMask 浏览器** | ❌ 无法直接调用 | ❌ 无法直接调用  | ✅ 可行    | 仅 dApp 浏览器内可用                                                       |
| **Stripe（信用卡/借记卡）**  | ⚠️ 需 openLink  | ⚠️ iframe 限制   | ✅ 可行    | iframe 内嵌可能受限 → 使用 `openLink` 跳转外部支付页或 Payment Request API |
| **PayPal**                   | ⚠️ 需 openLink  | ⚠️ 需 openLink   | ✅ 可行    | PayPal 弹窗在 iframe 内受限 → `openLink` 或 redirect 模式                  |

**WalletConnect 在 Mini App 中的流程：**

```
用户在 Mini App 内点击 "Pay with Crypto"
  → Reown AppKit 显示 QR 码（或调用已连接钱包）
  → 用户在手机上打开钱包 App 扫描 QR 码
  → 钱包 App 中确认交易签名
  → WalletConnect relay 通知 Mini App 交易已签名
  → Mini App 显示 "Payment confirming..."
  → 链上确认后完成订单

关键点：
  - WalletConnect v2 基于 relay server，不需要直接 deep link
  - QR 码 UI 需适配移动端（全屏展示，高对比度）
  - 已连接的钱包可直接唤起，无需重新扫码
  - 超时处理：30s 无签名 → 提示用户检查钱包
```

**法币支付在 Mini App 中的策略：**

```
Stripe：
  方案 A（优先）：Payment Request API → Apple Pay/Google Pay 原生支付面板
  方案 B（降级）：openLink 跳转到外部支付页面 → 返回 Mini App
  方案 C（iframe 兼容）：Stripe Elements 内嵌表单（需测试 TG/Discord 兼容性）

PayPal：
  统一使用 redirect 模式（非弹窗模式），适配 iframe 环境
```

**实施步骤：**

- 检测 Mini App 环境 → 选择合适的支付方式展示和流程
- CheckoutMobile 中的 PaymentDrawer/PaymentMethodSelector 按平台适配
- WalletConnect QR 展示适配移动端视口
- 法币支付降级方案实现 + 返回后状态恢复

---

### Phase M3：交互体验打磨（预估 1-2 周）

| ID       | 任务                | 说明                                           | 预估 |
| -------- | ------------------- | ---------------------------------------------- | ---- |
| **M3-1** | 滑动手势完善        | 购物车滑动删除、订单卡片滑动操作、图片画廊滑动 | 2d   |
| **M3-2** | 页面过渡动画        | 页面间滑入/滑出，模拟原生 App 体感             | 1-2d |
| **M3-3** | 骨架屏完善          | 所有数据页面对应 Skeleton 布局                 | 1d   |
| **M3-4** | 空状态移动端优化    | 插图 + 引导按钮 + 触控友好                     | 0.5d |
| **M3-5** | 底部 Sheet 统一应用 | 筛选、支付方式、更多操作 → BottomSheet         | 1d   |
| **M3-6** | 键盘体验优化        | 输入框聚焦时布局不跳动、键盘上方固定操作栏     | 1d   |
| **M3-7** | 错误恢复增强        | 网络断开→重连提示、支付失败→重试、离线→缓存页  | 1d   |

---

### Phase M4：性能优化（预估 1 周）

| ID       | 任务            | 目标                                                 | 预估       |
| -------- | --------------- | ---------------------------------------------------- | ---------- |
| **M4-1** | JS 包瘦身       | 分析 bundle，首屏 JS < 200KB gzip                    | 1-2d       |
| **M4-2** | 字体按需加载    | 8 个 Google Font → 仅加载当前店铺使用的              | 0.5d       |
| **M4-3** | API 请求优化    | React Query 预取 + stale-while-revalidate + 请求合并 | 1d         |
| **M4-4** | 列表虚拟化      | 商品 > 50 时虚拟滚动（`@tanstack/react-virtual`）    | 1d         |
| **M4-5** | Lighthouse 达标 | Performance ≥ 90、Accessibility ≥ 90、LCP < 2.5s     | 1d（调优） |
| **M4-6** | 图片预加载策略  | 首屏图片 priority + viewport 外 lazy                 | 0.5d       |

---

## 3. 执行顺序与依赖

```
M0（基础设施）  ← 不可跳过
  │
  ├─ M0-1 React Query ──────────────────────────→ M4-3 API 优化
  ├─ M0-4 手势库 ────→ M1-3 购物车手势 ──→ M3-1 滑动完善
  ├─ M0-5 BottomSheet ─→ M1-2 筛选 Sheet ──→ M3-5 统一应用
  └─ M0-6 导航架构 ──→ M1-0 导航实施
  │
  ↓
M1-0（Mini App 导航架构实施）  ← MobileNav/Header 按平台显隐
  │
  ↓
M1-1（商品详情拆分）  ← 买家最高频页面
  │
  ├── 提取 useProductDetail.ts
  ├── ProductDetailMobile.tsx
  └── ProductDetailDesktop.tsx
  │
  ↓
M1-2（搜索 Mobile View）  ← 移动端发现入口
  │
  ↓
M2-1（TG MainButton/BackButton）  ← Mini App 原生体验
M2-2（TG 主题同步）
M2-3（TG 分享）
M2-6（Mini App 支付适配）  ← WalletConnect + 法币降级
  │
  ↓
M1-3（购物车 Mobile）  ← 转化漏斗
  │
  ↓
M2-4（Discord Activity Provider）  ← 第二平台
  │
  ↓
M3（交互打磨）  ← "能用" → "好用"
  │
  ↓
M4（性能优化）  ← "好用" → "丝滑"
  │
  ↓
M1-4/M1-5（剩余页面）  ← 按需
```

---

## 4. 测试策略

### 4.1 Platform View 回归测试

每个页面拆分为 Desktop/Mobile 后，必须验证：

```
功能回归：
  桌面端（1440px）：所有功能与拆分前行为一致
  移动端（375px）：新 Mobile View 功能完整

视觉回归：
  桌面端：截图与拆分前对比（Playwright screenshot comparison）
  移动端：新基线截图

交叉测试：
  同一 URL 在不同设备宽度下正确切换视图
  热重载时视图切换不闪烁
```

### 4.2 Mini App 专项测试

| 环境                   | 测试方式                         | 关键验证点                                  |
| ---------------------- | -------------------------------- | ------------------------------------------- |
| TG Mini App（iOS）     | TG Bot 测试模式 + iPhone 真机    | MainButton/BackButton 绑定、safe-area、主题 |
| TG Mini App（Android） | TG Bot 测试模式 + Android 真机   | 同上 + 返回键行为                           |
| Discord Activity       | Discord Dev Portal + 浏览器      | OAuth 流程、主题同步、iframe 限制           |
| Mobile Web（Safari）   | iPhone Safari + Remote Debugging | 基线功能、无 TG/Discord 增强                |
| Mobile Web（Chrome）   | Android Chrome + DevTools        | 同上                                        |

### 4.3 支付流程测试矩阵

| 支付方式             | TG Mini App                   | Discord Activity | Mobile Web         |
| -------------------- | ----------------------------- | ---------------- | ------------------ |
| WalletConnect QR     | ✅ 扫码 → 签名 → 确认         | ✅ 同上          | ✅ 同上            |
| WalletConnect 已连接 | ✅ 直接唤起 → 签名            | ✅ 同上          | ✅ 同上            |
| Stripe（信用卡）     | ✅ Payment Request / openLink | ⚠️ iframe 测试   | ✅ Stripe Elements |
| PayPal               | ✅ redirect 模式              | ⚠️ redirect 测试 | ✅ popup/redirect  |

### 4.4 E2E 测试覆盖

M1 完成后新增 Playwright 移动端视口测试：

```typescript
// 移动端买家完整旅程
test('mobile buyer journey', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  // 浏览 → 搜索 → 商品详情 → 加购 → 购物车 → 结账
});
```

---

## 5. 验收标准

### 5.1 功能验收

| 维度         | 标准                                                       |
| ------------ | ---------------------------------------------------------- |
| **触控目标** | 所有可交互元素 ≥ 44×44px，间距 ≥ 8px                       |
| **手势**     | 购物车滑动删除、图片滑动浏览、下拉刷新                     |
| **导航**     | MobileNav 底部导航 + MobilePageHeader 返回 + TG BackButton |
| **安全区**   | iOS 刘海/底部 `env(safe-area-inset-*)` 正确处理            |

### 5.2 Mini App 验收

| 维度              | 标准                                        |
| ----------------- | ------------------------------------------- |
| **TG MainButton** | 商品详情/购物车/结账 关键 CTA 用 MainButton |
| **TG BackButton** | 所有非首页页面绑定 BackButton 返回          |
| **TG 主题**       | 深色/浅色模式跟随 TG 主题自动切换           |
| **TG 分享**       | 商品/店铺可通过 TG 原生分享                 |
| **Discord 认证**  | Activity 内 OAuth 无弹窗完成                |
| **Discord 主题**  | 跟随 Discord 主题                           |

### 5.3 性能验收

| 指标    | 目标         | 测试条件               |
| ------- | ------------ | ---------------------- |
| LCP     | < 2.5s       | 4G Throttle, iPhone SE |
| FID/INP | < 200ms      | 真机测试               |
| CLS     | < 0.1        | —                      |
| 首屏 JS | < 200KB gzip | Bundle 分析            |
| 帧率    | ≥ 55fps      | 滚动/动画场景          |

### 5.4 支付验收

| 维度              | 标准                                                     |
| ----------------- | -------------------------------------------------------- |
| **WalletConnect** | TG/Discord 内 QR 码正常显示 + 扫码签名 + 回调确认        |
| **已连接钱包**    | 直接唤起签名，无需重新扫码                               |
| **Stripe 降级**   | iframe 受限时 `openLink` 跳转 → 支付完成 → 返回 Mini App |
| **PayPal 降级**   | redirect 模式完成支付 → 返回 Mini App                    |
| **超时处理**      | 30s 无响应 → 友好提示 + 重试按钮                         |

### 5.5 端到端验收场景

```
场景 1：TG Mini App 买家完整旅程
  打开 Mini App → 浏览店铺 → 搜索商品 → 查看详情 →
  加购物车（MainButton）→ 结账 → Crypto 支付 →
  订单确认 → 分享给朋友（TG Share）→ 查看订单

场景 2：Discord Activity 买家浏览
  打开 Activity → OAuth 自动登录 → 浏览商品 →
  加购物车 → 结账 → 支付 → 订单确认

场景 3：Mobile Web 降级
  浏览器打开 → 同移动端视图 → 底部操作栏（非 MainButton）→
  完成购买
```

---

## 6. 技术规范

### 6.1 Platform View 模式

```typescript
// 路由页面（thin shell）
export default function ProductPage({ params }: { params: { slug: string } }) {
  const { shouldUseMobileView } = usePlatform();
  return shouldUseMobileView
    ? <ProductDetailMobile slug={params.slug} />
    : <ProductDetailDesktop slug={params.slug} />;
}
```

### 6.2 共享 Hook 模式

```typescript
// hooks 承载全部业务逻辑，视图层只负责 UI
function useProductDetail(slug: string) {
  const product = useQuery(['product', slug], () => fetchProduct(slug));
  const { addToCart } = useCart();
  const { isTGMiniApp } = usePlatform();

  return {
    product: product.data,
    isLoading: product.isLoading,
    addToCart: (variant, quantity) => { ... },
    share: () => { ... },
    // 所有业务逻辑在此
  };
}
```

### 6.3 Mini App 增强层模式

```typescript
// 基线：Mobile Web UI
// 增强层 1：TG Mini App（MainButton/BackButton/Haptic/Theme）
// 增强层 2：Discord Activity（SDK/Theme/Lifecycle）

function ProductDetailMobile({ slug }: { slug: string }) {
  const detail = useProductDetail(slug);
  const tg = useTGMiniApp();
  const discord = useDiscordActivity();

  // TG 增强
  useTGMainButton(tg, {
    text: `Add to Cart - ${detail.product?.price}`,
    onClick: detail.addToCart,
    visible: !!detail.product,
  });

  useTGBackButton(tg, () => router.back());

  // 基线 Mobile UI
  return (
    <div>
      <MobilePageHeader title={detail.product?.title} />
      <ProductImageSwiper images={detail.product?.images} />
      {/* ... */}
      {!tg.isAvailable && <ProductBottomBar onAddToCart={detail.addToCart} />}
    </div>
  );
}
```

### 6.4 文件命名约定

| 类型              | 命名               | 示例                       |
| ----------------- | ------------------ | -------------------------- |
| Desktop 视图      | `XxxDesktop.tsx`   | `ProductDetailDesktop.tsx` |
| Mobile 视图       | `XxxMobile.tsx`    | `ProductDetailMobile.tsx`  |
| 共享 Hook         | `useXxx.ts`        | `useProductDetail.ts`      |
| 移动端子组件      | 描述性名称         | `ProductImageSwiper.tsx`   |
| TG 增强 Hook      | `useTGXxx.ts`      | `useTGMainButton.ts`       |
| Discord 增强 Hook | `useDiscordXxx.ts` | `useDiscordActivity.ts`    |

---

## 7. 进度追踪

### Phase M0 — 基础设施增强

| ID   | 任务                      | 状态         | 完成日期   |
| ---- | ------------------------- | ------------ | ---------- |
| M0-1 | React Query 集成          | ✅ 完成      | 2026-03-01 |
| M0-2 | 图片统一优化              | ✅ 完成      | 2026-03-01 |
| M0-3 | Discord Activity Provider | ⏳ 延后至 M2 |            |
| M0-4 | 手势库集成                | ✅ 完成      | 2026-03-01 |
| M0-5 | 底部 Sheet 组件           | ✅ 完成      | 2026-03-01 |
| M0-6 | Mini App 导航架构         | ✅ 完成      | 2026-03-01 |

### Phase M1 — 关键页面 Platform View 拆分

| ID   | 任务                   | 状态    | 完成日期   |
| ---- | ---------------------- | ------- | ---------- |
| M1-0 | Mini App 导航架构实施  | ✅ 完成 | 2026-03-01 |
| M1-1 | 商品详情 Platform View | ✅ 完成 | 2026-03-01 |
| M1-2 | 搜索 Mobile View       | ✅ 完成 | 2026-03-01 |
| M1-3 | 购物车 Mobile View     | ✅ 完成 | 2026-03-01 |
| M1-4 | 店铺首页优化           | ✅ 完成 | 2026-03-01 |
| M1-5 | 订单列表优化           | ✅ 完成 | 2026-03-01 |

### Phase M2 — Mini App 专项增强

| ID   | 任务                          | 状态    | 完成日期   |
| ---- | ----------------------------- | ------- | ---------- |
| M2-1 | TG MainButton/BackButton 集成 | ✅ 完成 | 2026-03-01 |
| M2-2 | TG 主题同步                   | ✅ 完成 | 2026-03-01 |
| M2-3 | TG 分享集成                   | ✅ 完成 | 2026-03-01 |
| M2-4 | Discord Activity Provider     | ✅ 完成 | 2026-03-01 |
| M2-5 | 下拉刷新                      | ✅ 完成 | 2026-03-01 |
| M2-6 | Mini App 支付方式适配         | ✅ 完成 | 2026-03-01 |

### Phase M3 — 交互打磨

| ID   | 任务                | 状态      | 完成日期                                                                                                                                   |
| ---- | ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| M3-1 | 滑动手势完善        | ✅ 完成   | useSwipeGesture hook + ProductDetail 图片画廊滑动 + 点指示器                                                                               |
| M3-2 | 页面过渡动画        | ✅ 完成   | CSS pageEnter 动画 + PageTransition 组件 + Cart/Search/Checkout 集成                                                                       |
| M3-3 | 骨架屏完善          | ✅ 完成   | 首页 isLoading 传递修复 + 各页面骨架屏审查确认                                                                                             |
| M3-4 | 空状态移动端优化    | ✅ 完成   | EmptyState 触控友好(min-h-44px) + 大图标容器 + SearchMobile 空状态统一                                                                     |
| M3-5 | 底部 Sheet 统一应用 | ✅ 完成   | BottomSheet 增强(拖拽关闭+部分高度) + PaymentDrawer 响应式 + SearchMobile 排序/分类 BottomSheet + ProductDetailMobile 更多操作 BottomSheet |
| M3-6 | 键盘体验优化        | ⏳ 未开始 |                                                                                                                                            |
| M3-7 | 错误恢复增强        | ⏳ 未开始 |                                                                                                                                            |

### Phase M4 — 性能优化

| ID   | 任务            | 状态      | 完成日期 |
| ---- | --------------- | --------- | -------- |
| M4-1 | JS 包瘦身       | ⏳ 未开始 |          |
| M4-2 | 字体按需加载    | ⏳ 未开始 |          |
| M4-3 | API 请求优化    | ⏳ 未开始 |          |
| M4-4 | 列表虚拟化      | ⏳ 未开始 |          |
| M4-5 | Lighthouse 达标 | ⏳ 未开始 |          |
| M4-6 | 图片预加载策略  | ⏳ 未开始 |          |

---

## 8. 截图验证工作流

每个页面级改造完成后，Playwright 自动截取三种视图：

| 视图        | 尺寸                      | 说明                        | 存放目录                    |
| ----------- | ------------------------- | --------------------------- | --------------------------- |
| Mobile      | 375×812 @3x               | 标准 iPhone 移动端          | `docs/screenshots/mobile/`  |
| Desktop     | 1440×900                  | 标准桌面端（对照参考）      | `docs/screenshots/desktop/` |
| TG Mini App | 375×812 @3x + TG SDK 注入 | 模拟 Telegram Mini App 环境 | `docs/screenshots/tg/`      |

**实现**：`apps/web/e2e/screenshot-mobile.spec.ts`，集成 Playwright mock API routes。

**命令**：

```bash
cd apps/web
SCREENSHOT_PATH=/product/wireless-headphones SCREENSHOT_NAME=m1-1-product-detail \
  npx playwright test e2e/screenshot-mobile.spec.ts --project=chromium
```

**TG 模拟原理**：通过 `page.addInitScript()` 注入 `window.Telegram.WebApp` 对象（含 `initData`、`themeParams`、`MainButton`、`BackButton` 等），使 `TGMiniAppProvider` 检测到 TG 环境并触发 TG 专属 UI 适配。

**流程**：截图 → AI 自审（检查布局/间距/可读性/TG 适配） → 修复问题 → 最终截图存档。

**命名**：

- Mobile: `{任务ID}-{页面名}-375.png`
- Desktop: `{任务ID}-{页面名}-1440.png`
- TG: `{任务ID}-{页面名}-tg-375.png`

**环境变量**：
| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SCREENSHOT_PATH` | URL 路径 | `/` |
| `SCREENSHOT_NAME` | 输出文件名前缀 | `screenshot` |
| `BASE_URL` | 基础 URL | `http://localhost:3001` |
| `SKIP_TG` | 设为 `1` 跳过 TG 截图 | 不跳过 |
| `MOCK_API` | 设为 `0` 禁用 API mock | 启用 |

### Phase M1 截图审核

| 页面     | Mobile | Desktop | TG  | AI 自审 | 人工审核 | 备注                              |
| -------- | ------ | ------- | --- | ------- | -------- | --------------------------------- |
| 商品详情 | ✅     | ✅      | ✅  | ✅      | ⏳       | PWA 提示遮挡内容，TG 模式下应隐藏 |
| 搜索     | ⏳     | ⏳      | ⏳  |         |          |                                   |
| 购物车   | ⏳     | ⏳      | ⏳  |         |          |                                   |
| 店铺首页 | ⏳     | ⏳      | ⏳  |         |          |                                   |
| 订单列表 | ⏳     | ⏳      | ⏳  |         |          |                                   |

### AI 自审发现

#### M1-0 导航架构验证

| 检查项                                | 结果    | 说明                           |
| ------------------------------------- | ------- | ------------------------------ |
| MobileNav TG 隐藏                     | ✅ 通过 | TG 主页截图无底部导航栏        |
| MobileNav Mobile 显示                 | ✅ 通过 | 普通移动端主页截图有底部导航栏 |
| MobilePageHeader 返回按钮 TG 隐藏     | ✅ 通过 | TG 商品详情截图无 `<` 返回箭头 |
| MobilePageHeader 返回按钮 Mobile 显示 | ✅ 通过 | 普通移动端有 `<` 返回箭头      |
| MainContent 底部间距 TG               | ✅ 通过 | TG 模式无 `pb-20` 多余间距     |
| Desktop 不受影响                      | ✅ 通过 | 桌面端布局完整无变化           |

#### M1-1 商品详情

| 问题                   | 严重度 | 说明                                                                    |
| ---------------------- | ------ | ----------------------------------------------------------------------- |
| PWA 安装提示遮挡       | 中     | "Install Mobazha" 横幅覆盖了 Buyer Protection 区域，TG 模式下应自动隐藏 |
| Mobile/TG 视图几乎相同 | 低     | 当前 TG 无专属 UI 差异化（预期，后续 Phase 可增加 TG MainButton 集成）  |
| Desktop 布局完整       | —      | 左图右详情、卖家卡片、运费表、评价区域均正常渲染                        |
| Mock 数据注入正常      | —      | 三种视图均显示 "Wireless Noise-Cancelling Headphones"、$89.99、4.8 评分 |

---

## 9. AI 执行协议

当用户说"继续移动端改造"、"Phase M 下一步"、"Mini App 优化"时，AI 执行：

1. 读取 `docs/MOBILE_FIRST_ROADMAP.md` Section 7 — 找到第一个 ⏳ 任务
2. 读取 `docs/MOBILE_AUDIT_REPORT.md` — 了解该页面的审核问题
3. 读取对应的 `.cursor/rules/mobile-first-rules.mdc` — 执行规范
4. 告知用户待执行任务摘要
5. 按技术规范（Section 6）执行
6. **完成后执行截图验证流程（Section 8）**
7. 完成后更新 Section 7 进度表

---

图例: ✅ 完成 | 🔄 进行中 | ⏳ 未开始

最后更新: 2026-03-01 (v5: M1-0 导航架构实施完成，M1-1 商品详情完成，截图验证通过)
