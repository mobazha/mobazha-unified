# Mobazha 全量 UX 审核报告

> 审核日期：2026-02-26
> 审核范围：70+ 页面 × Desktop + Mobile 双端
> 重点：移动端用户体验与整体一致性

---

## 一、审核摘要

| 严重级别     | 数量 | 说明                 |
| ------------ | ---- | -------------------- |
| **Critical** | 7    | 功能不可达、无法操作 |
| **Major**    | 12   | 体验严重受损、不一致 |
| **Minor**    | 8    | 细节瑕疵、可改进     |

---

## 二、Critical 问题（必须修复）

### C1. 通知页删除按钮在移动端不可见

- **文件**: `apps/web/src/app/notifications/page.tsx`
- **问题**: 删除按钮使用 `opacity-0 group-hover:opacity-100`，移动端无 hover 事件，用户永远看不到删除按钮
- **影响**: 移动端用户无法删除通知
- **修复**: 改为 swipe-to-delete 或长按菜单，或默认可见

### C2. 店铺仲裁员删除按钮在移动端不可见

- **文件**: `apps/web/src/app/settings/store/moderators/page.tsx`
- **问题**: 同 C1，删除按钮仅 hover 可见
- **影响**: 移动端用户无法移除仲裁员
- **修复**: 改为滑动删除或默认显示删除图标

### C3. MobileNav 标签文字过小

- **文件**: `apps/web/src/components/MobileNav/MobileNav.tsx`
- **问题**: 底部导航标签使用 `text-[10px]`（10px），低于 WCAG 推荐的 12px 最小字号
- **影响**: 老年用户和视力不佳用户难以辨认导航文字
- **修复**: 改为 `text-[11px]` 或 `text-xs`（12px）

### C4. MobileHeader 扫码按钮触摸目标过小

- **文件**: `apps/web/src/components/MobileHeader/MobileHeader.tsx`
- **问题**: 扫码按钮 `w-9 h-9`（36px），低于 44px 最小触摸目标
- **影响**: 用户难以准确点击
- **修复**: 改为 `w-11 h-11`（44px）

### C5. 根布局禁止缩放

- **文件**: `apps/web/src/app/layout.tsx`
- **问题**: `maximumScale: 1, userScalable: false` 阻止用户缩放页面
- **影响**: 违反 WCAG 2.1 AA 标准，视力障碍用户无法放大文字
- **修复**: 移除 `maximumScale` 和 `userScalable` 限制

### C6. /me 页面在桌面端空白

- **文件**: `apps/web/src/app/me/page.tsx`
- **问题**: 整个页面 `md:hidden`，桌面端用户看到空白页
- **影响**: 桌面端用户通过 MobileNav 链接或直接 URL 访问时看到空白
- **修复**: 桌面端重定向到 `/profile` 或 `/settings`

### C7. 隐私设置使用 window.alert

- **文件**: `apps/web/src/app/settings/privacy/page.tsx`
- **问题**: 使用 `window.alert()` 显示操作结果
- **影响**: 破坏移动端体验，弹出原生对话框不可定制
- **修复**: 改用 toast 通知

---

## 三、Major 问题（严重影响体验）

### M1. 8 个页面缺少 MobilePageHeader

以下页面在移动端没有页面标题头和返回按钮：

- `/search` — 搜索页
- `/wallet` — 钱包总览
- `/notifications` — 通知中心
- `/listing/new` — 创建商品
- `/listing/edit/[slug]` — 编辑商品
- `/listing/import` — 导入商品
- `/moderator/cases` — 仲裁案例
- `/moderators/[id]` — 仲裁员详情

**影响**: 移动端用户无法通过页面头部返回，依赖底部导航或浏览器后退
**修复**: 统一添加 `MobilePageHeader`

### M2. Checkout 子页面头部不一致

- `checkout/payment-method` 和 `checkout/moderator` 使用自定义 sticky header
- `checkout/confirmation` 使用 `MobilePageHeader`
- 主 `checkout` 页面无头部
  **修复**: 统一使用 `MobilePageHeader` 或统一的 checkout header

### M3. 订单详情 More 按钮过小

- **文件**: `apps/web/src/app/orders/[orderId]/page.tsx`
- **问题**: More actions 按钮 `w-6 h-6`（24px），远低于 44px
- **修复**: 增大触摸区域到 `w-11 h-11`

### M4. 搜索输入框高度不足

- **文件**: `apps/web/src/components/MobileHeader/MobileHeader.tsx`
- **问题**: 搜索输入 `h-10`（40px），低于 44px 推荐值
- **修复**: 改为 `h-11`

### M5. Receiving 设置布局不一致

- **文件**: `apps/web/src/app/settings/receiving/page.tsx`
- **问题**: 使用自定义 Header/Footer 而非 Settings layout，与其他设置页面风格割裂
- **修复**: 重写为使用 `SettingsPageHeader` + `SettingsSection`

### M6. Privacy 设置布局不一致

- **文件**: `apps/web/src/app/settings/privacy/page.tsx`
- **问题**: 同 M5，使用自定义布局和 `window.alert`
- **修复**: 重写为标准 Settings 布局 + toast

### M7. Listing 页面底部操作栏缺少 Safe Area

- **文件**: `apps/web/src/app/listing/new/page.tsx`
- **问题**: 底部固定栏没有 `pb-[env(safe-area-inset-bottom)]`
- **影响**: iPhone X+ 刘海屏设备操作栏被 home indicator 遮挡
- **修复**: 添加 safe-area padding

### M8. Listing 编辑页头部按钮溢出

- **文件**: `apps/web/src/app/listing/edit/[slug]/page.tsx`
- **问题**: 头部 5 个按钮（Preview/Delete/Cancel/Save Draft/Publish）在移动端会水平溢出
- **修复**: 移动端收纳为 dropdown menu

### M9. 店铺页按钮缺少文字

- **文件**: `apps/web/src/app/store/[peerId]/page.tsx`
- **问题**: `hidden sm:inline` 隐藏按钮文字，仅显示图标，功能不明确
- **修复**: 添加 tooltip 或移动端也显示简短文字

### M10. Tab 按钮触摸目标偏小

多个页面的 tab 按钮 padding 过小（`px-2 py-1` ≈ 28px 高）：

- 钱包币种详情页
- 通知页
- 订单列表页
  **修复**: 统一 tab 高度为 `min-h-[44px]`

### M11. 仲裁案例页面全硬编码文案

- **文件**: `apps/web/src/app/moderator/cases/page.tsx` 及 `[orderId]/page.tsx`
- **问题**: 所有文案（"Moderation Cases"、"Review and resolve disputes"等）硬编码英文
- **修复**: 使用 i18n `t()` 函数

### M12. Settings 页面 redirect 使用 window.innerWidth

- **文件**: `apps/web/src/app/settings/page.tsx`
- **问题**: 用 `window.innerWidth >= 1024` 检测桌面端进行 redirect，resize 时行为不可预测
- **修复**: 使用 `useIsDesktop()` hook 或 CSS `lg:` 方案

---

## 四、Minor 问题（可改进）

### m1. Login 页面 padding 不响应

`max-w-md px-8` 在极窄屏幕（<375px）上两侧 padding 过大

### m2. Onboarding 页面间距过大

`gap-8` 在小屏幕上过于分散

### m3. 钱包页面使用 mock 数据

`mockAssets`、`mockTransactions` 硬编码

### m4. 收款设置硬编码中文

"收款地址"、"加载失败"等中文硬编码

### m5. Profile 页面无 MobilePageHeader

/profile 只做 redirect，无独立移动端 UI

### m6. Settings categories 间距偏大

移动端 `p-4` 应为 `p-3` 以符合 mobile-ux-guide 规范

### m7. 产品详情页底部固定栏与 MobileNav 冲突处理

虽然 MobileNav 在 product detail 隐藏了，但 checkout 相关页面的底部栏高度不统一

### m8. 订单详情页 orderId 截断硬编码

`Order #{displayOrder.orderId.slice(0, 8)}...` 应使用 i18n

---

## 五、页面一致性矩阵

| 特性             | 首页 | 搜索 | 购物车 | 结账 | 订单 | 钱包 | 设置 | 商品 | 店铺 |
| ---------------- | ---- | ---- | ------ | ---- | ---- | ---- | ---- | ---- | ---- |
| MobilePageHeader | ✗    | ✗    | ✓      | ✗    | ✓    | ✗    | ✗    | ✓    | ✗    |
| MobileHeader     | ✓    | ✗    | ✗      | ✗    | ✗    | ✗    | ✗    | ✗    | ✗    |
| Footer           | ✓    | ✗    | ✗      | ✗    | ✗    | ✗    | ✗    | ✓    | ✗    |
| Bottom Bar       | ✗    | ✗    | ✗      | ✓    | ✗    | ✗    | ✗    | ✓    | ✗    |
| Safe Area        | ✓    | —    | —      | ?    | ✓    | —    | —    | ✓    | —    |
| Touch 44px       | ✓    | ✗    | ✓      | ✓    | ✗    | ✗    | ✓    | ✓    | ✓    |
| i18n             | ✓    | ✓    | ✓      | ✓    | ✓    | ✗    | ✓    | ✓    | ✓    |

---

## 六、修复优先级路线图

### P0 — 立即修复（Critical）

1. C1/C2: hover-only 删除按钮 → 移动端可见
2. C3: MobileNav 字号 → 12px
3. C4: 扫码按钮触摸目标 → 44px
4. C5: 移除缩放限制
5. C6: /me 桌面端 redirect
6. C7: window.alert → toast

### P1 — 本周修复（Major）

7. M1: 8 个页面添加 MobilePageHeader
8. M2: Checkout header 统一
9. M3-M4: 触摸目标修正
10. M5-M6: Settings 布局统一
11. M7: Safe Area 补全
12. M8: Listing 按钮收纳

### P2 — 下周改进（Minor）

13. m1-m8: 各细节修正
