# Mobile-First Mini App 改造执行器

> **触发词**：
> "继续移动端改造"、"Phase M 下一步"、"Mini App 优化"、
> "移动端下一步"、"M0-x"、"M1-x"、"M2-x"、"M3-x"、"M4-x"

## 1. 执行协议

当触发时，AI 必须按以下顺序执行：

1. 读取 `docs/MOBILE_FIRST_ROADMAP.md` Section 7 — 找到第一个 ⏳ 任务
2. 读取 `docs/MOBILE_AUDIT_REPORT.md` — 了解相关页面的审核问题
3. 读取 `.cursor/rules/mobile-first-rules.mdc` — 遵循开发规范
4. 如涉及特定页面，读取现有组件代码了解当前实现
5. 告知用户待执行任务摘要和预估工作量
6. 按下方各任务的执行步骤推进
7. 完成后更新 `docs/MOBILE_FIRST_ROADMAP.md` Section 7 进度表

---

## 2. Phase M0 执行步骤

### M0-1：React Query 集成

```
Step 1：安装依赖
  pnpm add @tanstack/react-query @tanstack/react-query-devtools -w
  （或在 packages/core 中添加）

Step 2：创建 QueryClient Provider
  apps/web/src/providers/QueryProvider.tsx
  - 配置 defaultOptions（staleTime、gcTime、retry）
  - 包装在 layout.tsx 中

Step 3：创建示例 hook
  将一个简单的 API 调用迁移到 useQuery
  （如商品详情 fetchProduct → useProductQuery）

Step 4：验证
  确认缓存、去重、后台刷新正常工作
```

### M0-2：图片统一优化

```
Step 1：扫描所有 raw <img> 用法
  rg '<img ' apps/web/src/ --files-with-matches

Step 2：分类处理
  - 商品图片 → ProductImage 组件（已有 next/image）
  - 集合/分类图片 → 迁移到 next/image 或添加 loading="lazy"
  - 头像/图标 → 添加 loading="lazy"

Step 3：验证
  确认无 raw <img> 遗漏（或有明确理由）
```

### M0-3：Discord Activity Provider

```
Step 1：安装 SDK
  pnpm add @discord/embedded-app-sdk

Step 2：创建 Provider
  apps/web/src/components/DiscordActivityProvider/
  ├── DiscordActivityProvider.tsx
  ├── useDiscordActivity.ts
  └── index.ts

Step 3：集成到 layout.tsx
  参照 TGMiniAppProvider 的嵌套方式

Step 4：OAuth2 认证流
  使用 SDK 内置的 authenticate() 方法
  对接现有 AUTH_DISCORD_MINI_APP_SIGNIN 后端

Step 5：验证
  在 Discord Activity 测试环境验证认证和主题
```

### M0-4：手势库集成

```
Step 1：安装
  pnpm add @use-gesture/react

Step 2：封装通用 hooks
  packages/ui/hooks/useSwipeAction.ts    ← 滑动删除/操作
  packages/ui/hooks/usePullRefresh.ts    ← 下拉刷新

Step 3：创建 SwipeableItem 组件
  packages/ui/components/SwipeableItem.tsx

Step 4：验证
  在购物车商品项上测试滑动删除
```

### M0-5：底部 Sheet 组件

```
Step 1：基于 Radix Dialog 封装 BottomSheet
  packages/ui/components/BottomSheet.tsx
  - 从底部滑入
  - 支持拖拽关闭
  - snap points（50%/85% 高度）
  - 背景遮罩

Step 2：导出组件
  更新 packages/ui/index.ts

Step 3：验证
  在筛选面板场景测试
```

### M0-6：Mini App 导航架构

```
Step 1：分析现有 MobileNav 和 MobilePageHeader
  读取 apps/web/src/components/MobileNav/MobileNav.tsx
  读取 apps/web/src/components/MobilePageHeader/MobilePageHeader.tsx
  确认当前渲染逻辑

Step 2：MobileNav 按平台条件渲染
  添加 usePlatform() 检测
  TG Mini App / Discord Activity → return null
  Mobile Web → 正常渲染

Step 3：MobilePageHeader 返回键按平台条件渲染
  TG 环境隐藏左侧返回箭头（BackButton 替代）
  保留标题和右侧操作区

Step 4：创建 useTGBackButton hook
  packages/ui/hooks/useTGBackButton.ts
  统一绑定 TG BackButton → router.back()

Step 5：调整底部安全区高度
  TG 环境：底部安全区需考虑 MainButton 区域
  Discord 环境：需考虑 Activity 控制栏

Step 6：验证
  Mobile Web 导航完整
  TG Mini App 无重复导航控件
  Discord Activity 无重复导航控件
```

---

## 3. Phase M1 执行步骤

### M1-0：Mini App 导航架构实施

```
Step 1：实施 M0-6 中设计的导航策略
  （如 M0-6 已完成，此步直接跳过）

Step 2：创建 useTGMainButton hook
  packages/ui/hooks/useTGMainButton.ts
  接口：useTGMainButton({ text, onClick, visible, color? })
  自动处理 show/hide/setText/onClick/offClick

Step 3：创建 useTGBackButton hook
  packages/ui/hooks/useTGBackButton.ts
  接口：useTGBackButton(onBack?: () => void)
  默认 onBack = router.back()

Step 4：集成测试
  TG Bot 测试模式下验证 MainButton/BackButton
  Mobile Web 下验证无影响
```

### M1-1：商品详情 Platform View

**这是最大的改造任务，需仔细执行。**

```
Step 1：分析现有 ProductDetail.tsx
  - 读取完整文件
  - 标记哪些是业务逻辑（API、状态、计算）
  - 标记哪些是 UI（JSX、样式、布局）

Step 2：提取 useProductDetail.ts
  从 ProductDetail.tsx 中提取所有业务逻辑：
  - 商品数据获取
  - 变体选择状态
  - 加购逻辑
  - 收藏逻辑
  - 价格计算（含法币等价）
  - 分享逻辑
  - 评价数据

Step 3：创建 ProductDetailDesktop.tsx
  - 将现有 ProductDetail.tsx 的 JSX 迁移过来
  - 使用 useProductDetail() hook 获取数据
  - 保持桌面端布局不变

Step 4：创建 ProductDetailMobile.tsx
  按路线图 Section 2 M1-1 的设计：
  - ProductImageSwiper（全宽图片滑动）
  - 价格 + 信任标识
  - 变体选择（pill/chip 样式）
  - Accordion 折叠区（描述/配送/评价/政策）
  - 底部固定操作栏（加购+购买）

Step 5：修改路由页面
  app/product/[slug]/page.tsx → thin shell：
  usePlatform().shouldUseMobileView → Mobile/Desktop

Step 6：TG 增强
  在 ProductDetailMobile 内：
  - useTGMiniApp() → MainButton "Add to Cart"
  - BackButton → router.back()
  - HapticFeedback → 加购成功

Step 7：验证
  - 桌面端（1440px）：所有功能与拆分前行为一致
  - iPhone SE (375px) 移动端体验
  - TG Mini App 内 MainButton 工作
  - 所有变体/加购/收藏功能正常
  - 截图对比：桌面端拆分前 vs 拆分后（确认无视觉回归）

Step 8：AI 增强（如 AI Product Assistant 存在）
  - 移动端适配 AI 商品描述输入方式
  - 优先拍照上传 → AI 识别生成描述
  - AI 结果展示用 Skeleton + 流式文本

Step 9：清理
  将旧 ProductDetail.tsx 中的代码迁移完毕后，
  更新导入路径（搜索所有引用旧文件的地方），
  确认无引用后删除旧文件。
  注意：先 git status 确认无未暂存变更。
```

### M1-2：搜索 Mobile View

```
Step 1：分析现有 search/page.tsx
Step 2：提取 useSearch.ts 共享 hook
Step 3：创建 SearchDesktop.tsx（保持现有布局）
Step 4：创建 SearchOverlay.tsx（全屏搜索）
  - SearchHistory 组件
  - SearchSuggestions 组件
  - FilterSheet（底部 Sheet 筛选）
  - 2 列结果网格
Step 5：修改路由页面 → thin shell
Step 6：验证
```

### M1-3：购物车 Mobile View

```
Step 1：分析现有 cart/page.tsx + CartDrawer.tsx
Step 2：提取 useCart.ts 共享 hook
Step 3：创建 CartMobile.tsx
  - CartItemSwipeable（滑动删除）
  - 数量步进器 44px
  - CartBottomBar（固定结算栏）
Step 4：TG 增强：MainButton "Checkout (¥128)"
Step 5：验证
```

### M1-4：店铺首页优化

```
Step 1：修改商品网格 → 移动端 2 列
Step 2：Hero 组件移动端 CTA 全宽
Step 3：分类导航水平滚动 + 渐变遮罩
Step 4：验证
```

### M1-5：订单列表优化

```
Step 1：筛选区 → 移动端按钮 + 底部 Sheet
Step 2：下拉刷新
Step 3：订单卡片优化
Step 4：验证
```

---

## 4. Phase M2 执行步骤

### M2-1：TG MainButton/BackButton 集成

```
Step 1：创建 TG 增强 hooks
  packages/ui/hooks/useTGMainButton.ts
  packages/ui/hooks/useTGBackButton.ts

Step 2：按页面集成
  - ProductDetailMobile → MainButton "Add to Cart"
  - CartMobile → MainButton "Checkout (¥XX)"
  - CheckoutMobile → MainButton "Pay ¥XX"（检查是否已有）
  - 所有 Mobile View → BackButton

Step 3：验证（TG Bot 测试模式）
```

### M2-2：TG 主题同步

```
Step 1：在 TGMiniAppProvider 中增加 CSS 变量映射
Step 2：创建 tg-theme.css 变量定义
Step 3：组件中使用 TG 变量（带 fallback）
Step 4：验证深色/浅色模式切换
```

### M2-3：TG 分享集成

```
Step 1：创建 useShare() hook
Step 2：集成到商品详情"分享"按钮
Step 3：集成到店铺页"分享店铺"
Step 4：验证 TG 分享弹窗
```

### M2-4：Discord Activity Provider

同 M0-3（如 M0 阶段未完成，在此完成）

### M2-5：下拉刷新

```
Step 1：完善 usePullRefresh hook（如 M0-4 中初始版）
Step 2：集成到：商品列表、订单列表、店铺页
Step 3：添加刷新动画（旋转图标）
Step 4：验证
```

### M2-6：Mini App 支付方式适配

```
Step 1：分析现有支付流程
  读取 CheckoutMobile.tsx 和 PaymentDrawer.tsx
  确认当前支付方式选择 UI 和逻辑

Step 2：WalletConnect QR 移动端适配
  - QR 码展示区域适配移动端视口（全屏或接近全屏）
  - 高对比度 QR（深色背景+白色 QR 码）
  - 超时处理：30s 无签名 → 提示 "Check your wallet app"
  - 已连接钱包：跳过 QR 直接发送签名请求

Step 3：法币支付 Mini App 降级
  - 检测 Mini App 环境
  - TG：Stripe 使用 openLink 跳转外部支付页
  - Discord：Stripe 使用 window.open 或 redirect
  - PayPal 统一使用 redirect 模式（非 popup）
  - 支付完成后通过 URL 回调恢复状态

Step 4：PaymentMethodSelector 按平台适配
  - Mini App 中隐藏不可用的支付方式（如浏览器钱包扩展）
  - WalletConnect 标注 "Scan with wallet app"
  - 法币标注 "Opens payment page"（提示用户会跳转）

Step 5：验证
  - TG Mini App 中 WalletConnect QR 显示正常
  - TG Mini App 中 Stripe openLink 跳转 + 返回
  - Mobile Web 中原有支付流程不受影响
```

---

## 5. 通用验证清单

每个任务完成后，执行以下验证：

```
功能回归：
□ 桌面端功能不退化（1440px 测试）
□ iPhone SE (375px) 全流程可用
□ 触控目标 ≥ 44×44px
□ 底部安全区正确处理

Mini App 特定：
□ TG Mini App 环境增强生效（如适用）
□ MobileNav 在 TG/Discord 中已隐藏
□ MobilePageHeader 返回键在 TG 中已隐藏
□ Toast/Snackbar 在 TG 中定位在顶部
□ 确认操作在 TG 中优先使用 showPopup()

导航与主题：
□ TG BackButton 绑定路由回退
□ 主题色处理：基础色跟随 TG，品牌色保留店铺主题

代码质量：
□ 业务逻辑在共享 hook 中，不在视图组件中
□ 新增翻译 key 已添加到 en.ts
□ 无 TypeScript 错误
□ 无 ESLint 警告
□ 骨架屏/加载状态正确
□ 空状态有引导 UI

支付（如涉及 Checkout）：
□ WalletConnect QR 在 Mini App 中正常显示
□ 法币支付有 Mini App 降级方案
□ 支付完成后状态正确恢复
```

---

## 6. 注意事项

### 不要做的事

- ❌ 不要一次性迁移所有 API 到 React Query，逐步迁移
- ❌ 不要为 Mobile View 写独立的业务逻辑，必须用共享 hook
- ❌ 不要在 TG MainButton 回调中做复杂逻辑，保持简洁
- ❌ 不要引入 framer-motion 等重型动画库，用 CSS transition
- ❌ 不要修改路由 URL（同路由分视图的核心原则）
- ❌ 不要在 TG 环境用自定义 Modal 做确认（优先 showPopup）
- ❌ 不要在 TG 环境显示 MobileNav（TG 有自己的底栏）
- ❌ 不要用 TG themeParams 完全覆盖店铺品牌色
- ❌ 不要在拆分 Desktop/Mobile 后直接删除旧文件（先确认所有引用已更新）

### 要做的事

- ✅ 每个 Mobile View 都要在 375px 下测试
- ✅ 共享 hook 要有完整的 TypeScript 类型
- ✅ TG/Discord 增强使用条件检测，非 Mini App 环境不影响
- ✅ 底部操作栏要处理 safe-area-inset
- ✅ 新增组件要导出到对应包的 index.ts
