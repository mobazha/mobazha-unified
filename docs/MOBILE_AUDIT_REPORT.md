# 移动端体验审核报告

> **Dated evidence:** This audit records observations for its reviewed build.
> It is not current public product guidance; see <https://docs.mobazha.org>.

> **审核日期**：2026-03-01
> **审核范围**：mobazha-unified 全部面向买家的 Storefront 页面 + Admin 管理页面
> **目标平台**：Telegram Mini App、Discord Activity、Mobile Web
> **基准设备**：iPhone SE (375px)、iPhone 14 (390px)、Pixel 5 (393px)

---

## 1. 审核角色矩阵

| #   | 角色                       | 审核焦点                                                     | 关键输出                    |
| --- | -------------------------- | ------------------------------------------------------------ | --------------------------- |
| 1   | **移动端 UX 专家**         | 触控目标、手势交互、信息密度、滚动体验、底部安全区           | 逐页触控审计 + 手势交互规范 |
| 2   | **Telegram Mini App 专家** | TG SDK 能力利用率、MainButton/BackButton、主题同步、TWA 限制 | TG 能力集成清单 + 限制规避  |
| 3   | **Discord Activity 专家**  | Embedded App SDK、iframe 约束、Activity 生命周期、权限模型   | Discord Activity 适配清单   |
| 4   | **移动端性能工程师**       | 首屏加载、JS 包体积、图片策略、API 瀑布、内存/帧率           | Lighthouse 报告 + 性能预算  |
| 5   | **前端状态管理专家**       | API 缓存、请求去重、乐观更新、离线支持、数据预取             | React Query 迁移方案        |
| 6   | **无障碍 (a11y) 审计员**   | 屏幕阅读器、键盘导航、色彩对比度、动效偏好、语义化           | WCAG 2.1 AA 合规报告        |
| 7   | **国际化 (i18n) 审计员**   | RTL 布局、文本溢出、日期/货币格式、翻译完整度                | 多语言移动端适配清单        |
| 8   | **安全审计员**             | Mini App 认证流、跨域 postMessage、本地存储、CSRF            | 安全审计报告                |

---

## 2. 基础架构现状

### 2.1 已就位的移动端基础设施 ✅

| 基础设施                   | 文件                                         | 说明                                                                               |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| **`usePlatform()` hook**   | `packages/ui/hooks/usePlatform.ts`           | 返回 `platform`/`isMobile`/`isTGMiniApp`/`isDiscordActivity`/`shouldUseMobileView` |
| **`useBreakpoint()` hook** | `packages/ui/hooks/useBreakpoint.ts`         | 断点：`mobile(<768)` / `tablet(768-1023)` / `desktop(≥1024)` / `large(≥1440)`      |
| **TGMiniAppProvider**      | `apps/web/src/components/TGMiniAppProvider/` | MainButton/BackButton/HapticFeedback/themeParams/expand/close                      |
| **MobileNav 底部导航**     | `apps/web/src/components/MobileNav/`         | Home/Orders/Cart/Chat/Me，购物车 badge，聊天未读 badge                             |
| **MobilePageHeader**       | `apps/web/src/components/MobilePageHeader/`  | 移动端页面头部（返回+标题+右侧操作），44px 触控目标                                |
| **AdminMobileBottomTabs**  | `apps/web/src/components/admin/`             | Admin 移动端底部 Tab（Dashboard/Products/Orders/Settings）                         |
| **touch-feedback CSS**     | `apps/web/src/app/globals.css`               | `touch-feedback` / `touch-feedback-bg` 工具类                                      |
| **Viewport 配置**          | `apps/web/src/app/layout.tsx`                | `device-width` + `viewportFit: cover` + themeColor（明/暗）                        |
| **PWA**                    | `apps/web/public/sw.js` + `manifest.json`    | Service Worker + 离线页面 + 安装提示                                               |
| **safe-area-inset**        | 多个移动端组件                               | CheckoutMobile/MobileListingWizard/AdminMobileBottomTabs                           |

### 2.2 Platform View 拆分进度

| 页面         | 拆分状态  | 说明                                                                                     |
| ------------ | --------- | ---------------------------------------------------------------------------------------- |
| **Checkout** | ✅ 已拆分 | `CheckoutDesktop.tsx` (524行) + `CheckoutMobile.tsx` (448行) + `useCheckout.ts` 共享逻辑 |
| **商品详情** | ❌ 未拆分 | `ProductDetail.tsx` (1,537行)，48 个 Tailwind 断点硬撑                                   |
| **搜索**     | ❌ 未拆分 | `search/page.tsx` (859行)，无 SearchOverlay                                              |
| **购物车**   | ❌ 未拆分 | `CartDrawer` 单一组件，无全页移动端购物车                                                |
| **店铺首页** | ❌ 未拆分 | `store/[peerId]/page.tsx` (1,612行)                                                      |
| **订单列表** | ❌ 未拆分 | `orders/page.tsx` (615行)                                                                |

---

## 3. 逐页移动端审核

### 3.1 商品详情页 — `ProductDetail.tsx`（1,537 行）

**当前问题：**

| 问题                  | 严重度 | 说明                                       |
| --------------------- | ------ | ------------------------------------------ |
| 单文件过大            | 🔴 高  | 1,537 行包含桌面和移动端所有逻辑，维护困难 |
| 图片浏览器体验差      | 🔴 高  | 移动端缺少全宽 Swiper、捏合缩放、指示器    |
| 底部操作栏不够突出    | 🟡 中  | 加购/购买按钮未固定底部，滚动后不可见      |
| 信息密度过高          | 🟡 中  | 描述/配送/评价未折叠，移动端需大量滚动     |
| 无 TG MainButton 集成 | 🟡 中  | Mini App 内未利用原生 MainButton 做"加购"  |
| 变体选择器触控不友好  | 🟡 中  | 下拉选择在移动端不如 pill/chip 选择器直观  |

**改造建议：**

- 拆分为 `ProductDetailDesktop.tsx` + `ProductDetailMobile.tsx`
- 提取 `useProductDetail.ts` 共享 hook
- 移动端：全宽图片 Swiper → 价格+快速操作 → Accordion 折叠区 → 底部固定操作栏
- TG 环境用 MainButton 替代底部 CTA

### 3.2 搜索页 — `search/page.tsx`（859 行）

**当前问题：**

| 问题                 | 严重度 | 说明                                      |
| -------------------- | ------ | ----------------------------------------- |
| 无全屏搜索覆盖层     | 🔴 高  | 移动端复用桌面布局，搜索输入不够突出      |
| 筛选面板非底部 Sheet | 🟡 中  | 移动端筛选应用底部弹出 Sheet，而非侧边栏  |
| 搜索历史缺失         | 🟡 中  | Mini App 内无浏览器地址栏，搜索历史更重要 |
| 键盘处理             | 🟡 中  | 搜索时虚拟键盘弹出后布局未适配            |

**改造建议：**

- 新增 `SearchOverlay.tsx`：全屏搜索 + 搜索历史 + 即时建议
- 筛选用底部 Sheet（`@radix-ui/react-dialog` 或自定义）
- 结果网格移动端 2 列

### 3.3 购物车 — `CartDrawer.tsx`（226 行）+ `cart/page.tsx`（334 行）

**当前问题：**

| 问题                  | 严重度 | 说明                                       |
| --------------------- | ------ | ------------------------------------------ |
| Drawer 在小屏体验受限 | 🟡 中  | 抽屉式在商品多时需大量滚动，且操作空间不足 |
| 无滑动删除            | 🟡 中  | 移动端惯例的滑动删除手势未实现             |
| 数量调整按钮偏小      | 🟡 中  | +/- 步进器触控目标需增大                   |
| 结算栏未固定底部      | 🟡 中  | 滚动后结算按钮不可见                       |

**改造建议：**

- 移动端用全页购物车替代 Drawer
- 添加滑动删除手势
- 底部固定结算栏（总价+结算按钮）

### 3.4 店铺首页 — `store/[peerId]/page.tsx`（1,612 行）

**当前问题：**

| 问题                  | 严重度 | 说明                                               |
| --------------------- | ------ | -------------------------------------------------- |
| 单文件过大            | 🟡 中  | 1,612 行，包含 sections 渲染、tabs 切换、商品网格  |
| 商品网格移动端 1 列   | 🟡 中  | 当前 `grid-cols-1 sm:grid-cols-2`，移动端应为 2 列 |
| Hero 组件移动端未优化 | 🟡 中  | 全幅 Hero 在小屏文字可能溢出，CTA 按钮需放大       |
| 分类导航触控不友好    | 🟡 中  | 水平滚动分类如有的话，需要明确的滑动指示           |

**改造建议：**

- 移动端商品网格改为 2 列（`grid-cols-2`）
- Hero 组件文字自适应 + CTA 全宽
- 分类导航水平滚动 + 渐变遮罩指示

### 3.5 订单列表 — `orders/page.tsx`（615 行）

**当前问题：**

| 问题             | 严重度 | 说明                           |
| ---------------- | ------ | ------------------------------ |
| 筛选区占空间大   | 🟡 中  | 移动端筛选应收起为按钮+Sheet   |
| 缺少下拉刷新     | 🟡 中  | Mini App 无浏览器刷新按钮      |
| 订单卡片信息密度 | 🟢 低  | 已有响应式卡片，但可进一步优化 |

### 3.6 订单详情 — `orders/[orderId]/page.tsx`（902 行）

**当前问题：**

| 问题         | 严重度 | 说明                           |
| ------------ | ------ | ------------------------------ |
| 操作按钮位置 | 🟡 中  | "确认收货"等关键操作应固定底部 |
| 时间线展示   | 🟢 低  | 已有进度条，移动端间距可优化   |

### 3.7 Checkout（已拆分）— `CheckoutMobile.tsx`（448 行）

**当前状态：✅ 已完成 Platform View 拆分**

| 项目                    | 状态      |
| ----------------------- | --------- |
| Desktop/Mobile 分视图   | ✅        |
| 共享 `useCheckout` hook | ✅        |
| 底部固定 CTA            | ✅        |
| safe-area-inset         | ✅        |
| TG MainButton 替代      | ⚠️ 未实现 |

---

## 4. Telegram Mini App 专项审核

### 4.1 已集成的 TG 能力

| TG SDK 能力                         | 集成状态  | 当前使用                           |
| ----------------------------------- | --------- | ---------------------------------- |
| `ready()` + `expand()`              | ✅        | 初始化时调用                       |
| `themeParams`                       | ✅        | 通过 Context 暴露                  |
| `MainButton`                        | ✅ 已封装 | ⚠️ 无实际页面使用                  |
| `BackButton`                        | ✅ 已封装 | ⚠️ 无实际页面使用                  |
| `HapticFeedback`                    | ✅ 已封装 | ⚠️ 无实际页面使用                  |
| `CloudStorage`                      | ❌ 未集成 | —                                  |
| `BiometricManager`                  | ❌ 未集成 | —                                  |
| `initData` 认证                     | ✅        | Mini App 自动登录                  |
| `openLink()` / `openTelegramLink()` | ❌ 未集成 | —                                  |
| `shareUrl()`                        | ❌ 未集成 | —                                  |
| `sendData()`                        | ❌ 未集成 | —                                  |
| `showPopup()`                       | ❌ 未集成 | 可替代自定义 Modal 做确认对话框    |
| `showAlert()` / `showConfirm()`     | ❌ 未集成 | 原生风格提示/确认框                |
| `requestWriteAccess`                | ❌ 未集成 | 获取向用户发消息的权限（订单推送） |
| `switchInlineQuery`                 | ❌ 未集成 | 在聊天中 inline 搜索商品           |

### 4.2 TG Mini App 待改进项

| #   | 改进项                         | 优先级 | 说明                                         |
| --- | ------------------------------ | ------ | -------------------------------------------- |
| 1   | MainButton 集成到关键页面      | P0     | 商品详情"加购"、Checkout"去支付"、Cart"结算" |
| 2   | BackButton 集成路由系统        | P0     | 替代浏览器返回，统一路由回退栈               |
| 3   | HapticFeedback 在关键操作      | P1     | 加购成功、支付确认、订单状态变更             |
| 4   | themeParams → CSS 变量映射     | P1     | 颜色跟随 TG 主题（深色/浅色自动适配）        |
| 5   | shareUrl 商品/店铺分享         | P1     | 利用 TG 原生分享替代 Web Share API           |
| 6   | openLink 外部链接处理          | P2     | 在 TG 内正确处理外部链接跳转                 |
| 7   | CloudStorage 替代 localStorage | P2     | 跨设备持久化（购物车、搜索历史）             |

### 4.3 TG Mini App 已知限制

| 限制                    | 影响                         | 规避策略                         |
| ----------------------- | ---------------------------- | -------------------------------- |
| 无地址栏                | 用户无法手动输入 URL 或刷新  | 下拉刷新 + 完善的导航结构        |
| viewport 高度受键盘影响 | 输入框聚焦时布局可能跳动     | `viewport-fit: cover` + 动态调整 |
| 无浏览器开发工具        | 调试困难                     | 使用 `eruda` 或 TG Bot 调试模式  |
| iframe 同源限制         | 第三方支付弹窗可能受限       | 使用 `openLink` 打开外部支付页   |
| 文件上传限制            | 部分 TG 客户端限制文件选择器 | 优先相机拍照，提供文件选择降级   |

### 4.4 Mini App 支付可行性分析

| 支付方式                   | TG Mini App | Discord Activity | 关键挑战                         | 推荐方案                                                          |
| -------------------------- | ----------- | ---------------- | -------------------------------- | ----------------------------------------------------------------- |
| **Crypto — WalletConnect** | ✅ 可行     | ✅ 可行          | QR 码展示需适配小屏              | Reown AppKit QR → 钱包 App 扫码签名 → relay 回调                  |
| **Crypto — dApp 浏览器**   | ❌ 不可用   | ❌ 不可用        | Mini App 在 iframe/WebView 中    | 仅 Mobile Web（dApp 浏览器）可用，Mini App 统一走 WalletConnect   |
| **Stripe Elements**        | ⚠️ 需测试   | ⚠️ iframe 嵌套   | iframe-in-iframe 兼容性          | 优先 Payment Request API（Apple Pay/Google Pay），降级 `openLink` |
| **PayPal**                 | ⚠️ 弹窗受限 | ⚠️ 弹窗受限      | `window.open()` 在 iframe 内受限 | redirect 模式（非 popup），返回后恢复状态                         |

**WalletConnect 在 Mini App 中的优势**：

- 基于 relay server 通信，不需要 deep link（TG/Discord iframe 内无法 deep link）
- 用户手机上的钱包 App（MetaMask、Trust Wallet 等）通过 QR 码连接
- 已连接的钱包可直接唤起签名请求，无需重新扫码
- 项目已集成 Reown AppKit（WalletConnect v2），基础设施已就位

**法币支付降级策略**：

- `openLink()`（TG）/ `window.open()`（Discord）跳转到外部支付页面
- 支付完成后通过 URL 回调或轮询恢复 Mini App 内的订单状态

### 4.5 导航架构盲点

当前 `MobileNav` 和 `MobilePageHeader` 在所有移动端环境统一显示，
但 TG/Discord 有自己的导航控件，导致 UI 冲突：

| 问题                                       | 影响  | 说明                                    |
| ------------------------------------------ | ----- | --------------------------------------- |
| MobileNav 底部栏 + TG 键盘区域冲突         | 🔴 高 | TG 底部有 MainButton 区域，两层底栏叠加 |
| MobilePageHeader 返回 + TG BackButton 冗余 | 🟡 中 | 两个返回按钮，用户困惑                  |
| MobileNav + Discord Activity 控制栏冲突    | 🟡 中 | Discord 底部有 Activity 控制栏          |

**解决方案**：M0-6 + M1-0 中实施 Mini App 导航架构（按平台条件渲染）。

### 4.6 AI 功能移动端缺口

项目已有 AI 能力（PG-107 AI Product Assistant、PG-201 AI Store Builder），
但移动端适配不足：

| AI 功能           | 桌面端      | 移动端/Mini App | 缺口                         |
| ----------------- | ----------- | --------------- | ---------------------------- |
| AI 商品描述生成   | ✅ 文本输入 | ⚠️ 文本输入不便 | 需支持拍照上传 → AI 识别生成 |
| AI Store Builder  | ✅ 表单引导 | ⚠️ 未适配       | 移动端步骤式引导需更简化     |
| AI 客服（PG-205） | ⏳ 待实现   | —               | 移动端用底部 Sheet 聊天窗    |

---

## 5. Discord Activity 专项审核

### 5.1 当前集成状态

| 能力                              | 状态             | 说明                                        |
| --------------------------------- | ---------------- | ------------------------------------------- |
| `usePlatform().isDiscordActivity` | ✅ 检测逻辑已有  | 基于 URL 参数或 SDK 检测                    |
| Discord Embedded App SDK          | ❌ 未集成        | 需引入 `@discord/embedded-app-sdk`          |
| OAuth2 认证                       | ✅ 后端 API 已有 | `AUTH_DISCORD_MINI_APP_SIGNIN` 等路径已定义 |
| 主题同步                          | ❌ 未实现        | —                                           |
| Activity 生命周期                 | ❌ 未实现        | —                                           |

### 5.2 Discord Activity 待实现

| #   | 任务                    | 优先级 | 说明                                          |
| --- | ----------------------- | ------ | --------------------------------------------- |
| 1   | DiscordActivityProvider | P0     | 参照 TGMiniAppProvider，封装 SDK 初始化和认证 |
| 2   | OAuth2 PKCE 认证流      | P0     | iframe 内不能弹窗，需 Discord SDK 内置 OAuth  |
| 3   | 主题同步                | P1     | Discord 主题 → CSS 变量                       |
| 4   | Activity 关闭/暂停      | P1     | 正确处理 Activity 生命周期事件                |
| 5   | 消息嵌入分享            | P2     | 商品/店铺卡片嵌入 Discord 消息                |

---

## 6. 性能审核

### 6.1 当前性能指标（预估）

| 指标             | 预估值  | 目标值  | 状态      |
| ---------------- | ------- | ------- | --------- |
| LCP（4G 移动端） | ~3-4s   | < 2.5s  | 🟡 需优化 |
| FID/INP          | ~150ms  | < 200ms | ✅ 可接受 |
| CLS              | ~0.05   | < 0.1   | ✅ 良好   |
| 首屏 JS（gzip）  | ~300KB+ | < 200KB | 🟡 需瘦身 |
| 图片优化覆盖率   | ~60%    | 100%    | 🟡 需统一 |

### 6.2 性能问题清单

| 问题                       | 影响                                | 解决方案                                                    |
| -------------------------- | ----------------------------------- | ----------------------------------------------------------- |
| 8 个 Google Fonts 全量加载 | 首屏阻塞 + 带宽浪费                 | 按店铺主题动态加载，仅加载使用中的字体                      |
| 无 React Query/SWR         | ~25 个 hooks 手工 fetch，无缓存去重 | 引入 React Query（评估确认：0.5-1d 安装，收益显著，风险低） |
| 部分图片未用 next/image    | 无自动 WebP/AVIF、无 lazy           | 统一使用 `next/image` 或添加 `loading="lazy"`               |
| 大组件未拆分               | 移动端加载不需要的桌面代码          | Platform View 拆分 + 动态导入                               |
| 无列表虚拟化               | 商品 50+ 时滚动卡顿                 | 引入 `@tanstack/react-virtual`                              |

---

## 7. 无障碍审核

### 7.1 已做到的

- 部分组件有 `aria-label`（Header、CartDrawer、Checkout）
- 使用 Radix UI 组件（自带 a11y 基础）
- `prefers-reduced-motion` CSS 支持已就位
- 触控目标大部分 ≥ 44px

### 7.2 待改进的

| 问题                       | 优先级 | 说明                                   |
| -------------------------- | ------ | -------------------------------------- |
| 缺少系统性 focus 管理      | P1     | 页面切换、模态关闭后焦点未回到触发元素 |
| 部分图片 `alt=""`          | P1     | 商品缩略图需有意义的 alt 文本          |
| 表单错误提示无 `aria-live` | P2     | 表单验证错误应对屏幕阅读器可见         |
| 颜色对比度未全面审核       | P2     | 需工具化检查所有文本/背景组合          |

---

## 8. 综合评级

| 维度                  | 评分（/10） | 说明                                            |
| --------------------- | ----------- | ----------------------------------------------- |
| 移动端基础架构        | 8/10        | usePlatform、breakpoints、MobileNav 等已就位    |
| Platform View 实施    | 2/10        | 仅 Checkout 完成拆分，核心页面（商品/搜索）未拆 |
| TG Mini App 集成深度  | 3/10        | Provider 已有但 SDK 能力未实际绑定到页面        |
| Discord Activity 集成 | 1/10        | 仅有检测逻辑，无 SDK 集成                       |
| 移动端交互体验        | 4/10        | 缺手势（滑动/下拉刷新）、底部 Sheet、页面过渡   |
| 性能                  | 5/10        | PWA 和代码分割已有，但缓存和图片优化不足        |
| 无障碍                | 5/10        | 基础已有，缺系统性 focus 和语义化               |

**总体移动端成熟度：4/10 — "基础可用但体验粗糙"**

关键差距在于：核心交易页面未做 Platform View 拆分，TG/Discord SDK 能力封装了但未实际使用。

---

## 9. 改造优先级建议

```
P0（阻塞上线）：
  React Query 安装 + Provider（基础设施，0.5-1d，新代码立即受益）
  Mini App 导航架构（MobileNav/Header 按平台显隐，避免 UI 冲突）
  商品详情 Platform View 拆分（买家最高频页面）
  TG MainButton/BackButton 实际集成
  搜索 Mobile View（移动端发现入口）
  Mini App 支付方式适配（WalletConnect QR + 法币降级）

P1（显著提升体验）：
  购物车 Mobile 全页 + 手势
  Discord Activity Provider
  下拉刷新（Mini App 无浏览器刷新）
  TG 主题同步 + 冲突处理
  TG showPopup/showAlert 替代自定义 Modal

P2（打磨至专业水准）：
  底部 Sheet 统一组件
  页面过渡动画
  字体按需加载
  列表虚拟化
  无障碍补全
  AI 功能移动端适配
```

> 详细改造路线图见：`docs/MOBILE_FIRST_ROADMAP.md`
