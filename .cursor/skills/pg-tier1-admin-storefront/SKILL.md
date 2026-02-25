# Tier 1: Admin/Storefront 分离执行指南

> **目标**：建立卖家管理后台，实现 Admin 和 Storefront 的清晰分离，引入 AI 商品创建助手。
> **触发词**："Admin 分离"、"Tier 1"、"PG-101"~"PG-111"

## 执行前检查

1. 读取 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 5 — Admin 架构设计
2. 读取 Section 9 → Tier 1 进度，找到第一个 ⏳ 的任务
3. 确认 Tier 0 核心任务（PG-001 ~ PG-005）已完成或不阻塞

## AI-First 原则

Tier 1 的核心 AI 功能是 **PG-110 AI 商品创建助手**（V1 差异化）。AI 基础设施组件（`AIGenerateButton`、`AIStreamingText`、AI 后端代理）在此任务中首次建立，供后续 Tier 复用。

## 独立站 + TG 兼容

- Admin 组件通过 `isStandalone` 环境变量兼容 SaaS 和独立站
- 卖家管理后台在桌面端优先，但基本操作（如确认订单）需移动端可用
- PG-007（OpenClaw/Agent 集成）在 V1.1 评估，视工作量可提前

## 依赖关系

```
PG-101 (AdminLayout) ← 多数 Tier 1 任务都依赖此项
  ├── PG-102 (商品管理) ← 依赖 PG-101
  ├── PG-105 (Dashboard) ← 依赖 PG-101
  ├── PG-106 (订单增强) ← 依赖 PG-101
  ├── PG-107 (设置迁移) ← 依赖 PG-101
  └── PG-108 (Onboarding) ← 依赖 PG-101

独立任务（不依赖 PG-101，可并行或提前）：
  PG-109 (结账优惠券) ← 依赖 Tier 0 PG-001 (Checkout)
  PG-110 (AI 商品创建) ← 独立，V1 核心 AI 功能，建立 AI 基础设施
  PG-111 (移动端卖家) ← 依赖 PG-101
  PG-007 (Agent 集成) ← V1.1，独立于 AdminLayout
```

---

## PG-101: Admin Layout + 路由

### 创建文件

```
apps/web/src/
├── components/admin/
│   ├── AdminLayout.tsx          ← 侧边栏 + 内容区布局
│   ├── AdminSidebar.tsx         ← 侧边栏导航
│   └── AdminHeader.tsx          ← Admin 顶部栏
├── app/admin/
│   └── page.tsx                 ← Dashboard 占位页（PG-105 完善）
```

### AdminLayout 设计

```tsx
// 结构：固定侧边栏 + 滚动内容区
<div className="flex h-screen">
  <AdminSidebar />
  <div className="flex-1 flex flex-col overflow-hidden">
    <AdminHeader />
    <main className="flex-1 overflow-y-auto p-6">{children}</main>
  </div>
</div>
```

### 侧边栏导航项

| 图标            | 标签      | 路由               | 说明     |
| --------------- | --------- | ------------------ | -------- |
| LayoutDashboard | Dashboard | `/admin`           | 总览     |
| Package         | Products  | `/admin/products`  | 商品管理 |
| ShoppingCart    | Orders    | `/admin/orders`    | 订单管理 |
| BarChart3       | Analytics | `/admin/analytics` | 数据分析 |
| Settings        | Settings  | `/admin/settings`  | 设置     |

底部：
| 图标 | 标签 | 行为 |
|---|---|---|
| ExternalLink | View Store | 新标签页打开 `/store/{myPeerID}` |
| HelpCircle | Help | 打开文档链接 |

### 路由注册

在 `apps/web/src/routes.tsx` 中添加 `/admin/*` 路由组，使用 `AdminLayout` 包装。

### 响应式

- 桌面端（≥1024px）：固定侧边栏 240px
- 平板端（768-1023px）：收缩侧边栏（仅图标）
- 移动端（<768px）：隐藏侧边栏，汉堡菜单触发

### 认证保护

Admin 路由必须验证登录状态：

- 未登录 → 跳转到 `/login`
- 已登录但无卖家身份 → 显示引导页（"创建你的店铺"）

---

## PG-102: 商品管理页

### 路由

`/admin/products` → 商品列表管理

### 功能

1. **商品列表**
   - 表格视图（桌面）/ 卡片列表（移动）
   - 列：缩略图、标题、状态（活跃/草稿/下架）、价格、库存、更新时间
   - 排序：标题、价格、库存、更新时间

2. **搜索和筛选**
   - 关键词搜索
   - 状态筛选（全部/活跃/草稿）
   - 类型筛选（实物/数字/服务/RWA）

3. **批量操作**
   - 多选 checkbox
   - 批量删除、批量下架

4. **操作入口**
   - "添加商品" 按钮 → `/admin/products/new`（或复用 `/listing/new` 带 `?from=admin` 回调）
   - 行内 "编辑" → `/listing/edit/{slug}?from=admin`
   - 行内 "预览" → 新标签页 `/product/{slug}`
   - 行内 "复制"、"删除"

### 数据来源

复用 `productDataService.getMyListings()` 获取当前卖家商品列表。

---

## PG-105: 卖家 Dashboard

### 路由

`/admin/` → Dashboard 总览

### 指标卡片（第一行）

| 指标       | 数据源        | 说明               |
| ---------- | ------------- | ------------------ |
| 总销售额   | 订单 API 聚合 | 所有已完成订单金额 |
| 新订单数   | 订单 API 过滤 | 最近 7 天新订单    |
| 活跃商品数 | 商品 API 计数 | 已发布商品总数     |
| 平均评分   | Profile API   | 店铺平均评分       |

### 最近订单列表

显示最近 5-10 条订单，包含：订单号、买家名、金额、状态、时间。
"查看全部" → `/admin/orders`

### 热门商品

显示前 5 个销量最高的商品。
"查看全部" → `/admin/products`

### 快捷操作

- 添加新商品
- 查看店铺
- 处理待办订单

---

## PG-106: 订单管理增强

### 在 `/admin/orders` 复用现有订单组件

- 复用 `OrderTable`（桌面）和 `OrderListCompact`（移动），但增强功能
- 默认只显示"销售"标签（卖家视角），隐藏"购买"标签
- 增加批量操作（多选 → 批量确认/批量发货）
- 增加导出功能（CSV/JSON）
- 增加日期范围筛选

---

## PG-107: 现有设置页迁入 Admin

将以下页面映射到 Admin 路由：

| 现有路由                     | Admin 路由                   | 说明         |
| ---------------------------- | ---------------------------- | ------------ |
| `/settings/store`            | `/admin/settings`            | 店铺设置主页 |
| `/settings/store/policies`   | `/admin/settings/policies`   | 政策设置     |
| `/settings/store/shipping`   | `/admin/settings/shipping`   | 配送设置     |
| `/settings/store/moderators` | `/admin/settings/moderators` | 仲裁人设置   |
| `/settings/page-profile`     | `/admin/settings/profile`    | 店铺资料     |

### 实施方式

- 创建 Admin 路由指向同一页面组件（或包装组件使用 AdminLayout）
- 保留旧路由作为重定向（向后兼容）
- 逐步引导用户使用 `/admin/settings/` 入口

---

## PG-108: 卖家 Onboarding 引导

### 问题

新卖家注册后进入 Admin，看到空白的 Dashboard，不知道下一步做什么。

### 实施步骤

1. **Onboarding 状态管理**
   - 在 userStore 中跟踪 `onboardingCompleted` 状态
   - 首次进入 `/admin/` 时检测是否完成 onboarding

2. **引导流程组件** — `OnboardingWizard`
   - Step 1: 设置店铺（名称、头像、简介）— 复用现有 Profile 编辑组件
   - Step 2: 创建第一个商品 — 简化版表单（标题、图片、价格、描述）
   - Step 3: 预览店铺效果 — 嵌入预览 + "发布到市场"/"继续完善" 选项
   - 进度指示器（1/3、2/3、3/3）
   - "跳过"选项（不强制）

3. **Dashboard 空状态集成**
   - 未完成 onboarding 时显示引导入口
   - 完成后显示"下一步建议"卡片（邀请买家、SEO 优化、促销活动）

### 关键文件

| 文件                                                 | 修改内容                     |
| ---------------------------------------------------- | ---------------------------- |
| `apps/web/src/components/admin/OnboardingWizard.tsx` | 新建                         |
| `apps/web/src/app/admin/page.tsx`                    | 根据 onboarding 状态条件渲染 |
| `packages/core/stores/userStore.ts`                  | 新增 onboarding 状态         |

---

## PG-109: 结账优惠券

### 问题

卖家可以在商品编辑页创建优惠券（`CouponEditor`），但买家在结账时无法输入优惠码。

> 从 Tier 2 移到 Tier 1：创建端已有，应用端缺失导致整个优惠券功能闭环断裂。

### Desktop 参考

```
Purchase.vue 中的 Coupons 组件：
- 输入框 + "Apply" 按钮
- 显示在 hasCoupons(listing) 为 true 时
- 成功后显示折扣金额
```

### 实施步骤

1. **CouponInput 组件** — 输入框 + "Apply" 按钮
2. 在 checkout 页面集成（订单摘要区域）
3. 调用 API 验证优惠码 → 显示折扣金额
4. 提交订单时传入 coupon codes
5. 错误处理（无效码、过期、不适用）

---

## PG-110: AI 商品创建助手

### 目标

让卖家用最少输入创建高质量的商品页面。这是 Mobazha 的**核心 AI 差异化功能**。

### 用户场景

```
场景 A：图片驱动
  卖家上传 3 张商品图片
  → AI 自动识别商品类型
  → 生成标题、描述、标签、分类建议
  → 卖家微调后发布

场景 B：文字驱动
  卖家输入简短描述（"手工皮革钱包，意大利植鞣革"）
  → AI 扩写为完整的商品描述（卖点、材质、尺寸建议）
  → 生成 SEO 优化的标题和标签

场景 C：混合
  卖家上传图片 + 输入关键词
  → AI 综合生成所有字段
```

### 实施步骤

1. **AI 基础设施**（首次建立，后续 Tier 复用）
   - `packages/core/services/ai/client.ts` — AI 服务客户端（多供应商抽象）
   - `packages/core/services/ai/streaming.ts` — SSE 流式输出处理
   - 后端 AI 代理端点（hosting 或独立 AI 微服务）

2. **AIGenerateButton 组件**
   - 通用"AI 生成"按钮（✨ 图标 + "AI 生成"文字）
   - 点击后显示加载动画 → 流式输出结果到目标字段
   - 可用于标题、描述、标签等任何文本字段旁

3. **商品创建页集成**
   - 标题字段旁：`AIGenerateButton` → 从图片/描述生成标题
   - 描述字段旁：`AIGenerateButton` → 从标题/图片生成详细描述
   - 标签字段：AI 自动建议（从描述提取）
   - 分类字段：AI 自动建议（从标题/描述推断）
   - 全部字段保持可编辑，AI 只是建议

4. **图片分析**（如 AI 供应商支持 Vision）
   - 上传首张图片后 → 调用 Vision API → 返回商品识别结果
   - 结果用于自动填充标题/描述草稿

5. **Fallback**
   - AI 不可用时 `AIGenerateButton` 显示 disabled 状态 + tooltip
   - 手动输入流程不受影响

### 关键文件

| 文件                                              | 修改内容           |
| ------------------------------------------------- | ------------------ |
| `packages/core/services/ai/client.ts`             | 新建 AI 服务客户端 |
| `packages/core/services/ai/streaming.ts`          | 新建流式处理       |
| `apps/web/src/components/ai/AIGenerateButton.tsx` | 新建通用 AI 按钮   |
| `apps/web/src/components/ai/AIStreamingText.tsx`  | 新建流式文字       |
| `apps/web/src/app/listing/new/page.tsx`           | 集成 AI 生成       |
| `apps/web/src/app/listing/edit/[slug]/page.tsx`   | 集成 AI 生成       |

---

## PG-111: 移动端卖家体验

### 问题

卖家在手机上管理店铺体验差：

- 商品创建长表单无移动端导航
- Admin 布局未针对移动端优化
- 无法直接用手机拍照上传商品图片

### 实施步骤

1. **商品创建移动端 Tab 导航**
   - 将左侧栏导航改为移动端 Tab Bar / Stepper
   - 各 Section 可滑动切换或点击跳转
   - 进度指示（1/5、2/5...）

2. **Admin Layout 移动端适配**
   - 侧边栏 → 底部 Tab 或汉堡菜单
   - Dashboard 卡片单列堆叠
   - 表格 → 卡片列表视图切换
   - 快捷操作浮动按钮（FAB）

3. **手机拍照上传**
   - 图片上传按钮增加"拍照"选项（`capture="environment"`）
   - 拍照后自动压缩到合适尺寸
   - 结合 PG-110：拍照→AI 自动识别→生成描述

---

## 完成后更新

1. 更新 `docs/PROFESSIONAL_GRADE_ROADMAP.md` Section 9 — 状态改 ✅ + 日期
2. 更新 `docs/migrations/status.md`
3. 新增路由更新 `apps/web/src/routes.tsx`
4. 新增 i18n key 更新 `packages/core/i18n/locales/en.ts`（admin.nav.\* 等）
5. 运行 `pnpm validate:quick`
