# Settings 系统重构设计文档

## 功能 ID

`FEAT-SETTINGS-REDESIGN-001`

## 版本

- v1.0 — 2026-02-21 — 初始设计

## 目标

将 Settings 从弹框（Dialog/Drawer）模式改造为 **Shopify 风格的独立页面模式**，统一桌面端和移动端体验，消除三套并存的冗余 UI，为后续 AI 集成做好前端基础。

## 设计原则

1. **页面优先** — 设置是独立页面（有 URL），不是弹框
2. **Shopify Settings Layout** — 左列描述 + 右列表单卡片（2fr:5fr）
3. **渐进改造** — 按 Phase 逐步迁移，每个 Phase 可独立验证
4. **一致性** — 桌面/移动端使用同一套路由和组件，仅布局响应式差异
5. **AI-Ready** — 语义化标记、结构化 Schema、可编程 API

---

## 当前问题

### 四套并存的 Settings UI

| 组件                            | 位置                                           | 类型                            | 状态                           |
| ------------------------------- | ---------------------------------------------- | ------------------------------- | ------------------------------ |
| **SettingsDrawer**              | `components/SettingsDrawer/SettingsDrawer.tsx` | Dialog 弹框（~3370行）          | 桌面端主力入口                 |
| **Settings Pages（独立实现）**  | `app/settings/*/page.tsx`                      | 页面路由，各页面自己实现完整 UI | 存在但桌面端入口被 Drawer 劫持 |
| **SettingsContent（共享组件）** | `components/SettingsContent/`                  | 可复用内容组件                  | 仅 AccessControl 子页在用      |
| **SettingsModal**               | `components/SettingsModal/SettingsModal.tsx`   | Dialog 弹框（~2100行）          | 已废弃，代码残留               |

> **关键发现**：Settings Pages 并不是空壳——`general/page.tsx`（511行）、`account/page.tsx`（342行）、`store/shipping/page.tsx`（824行）等页面都有**完整独立实现**，它们与 SettingsDrawer 中的对应 section 是**重复的两套代码**。此外，各页面还各自定义了同名但不同实现的 `SettingItem`、`SettingGroup` 等本地组件。

### 代码重复矩阵

| Section                      | SettingsDrawer 行范围 | 独立页面                                 | 页面行数     | 共享组件                 |
| ---------------------------- | --------------------- | ---------------------------------------- | ------------ | ------------------------ |
| General                      | L409–L787             | `general/page.tsx`                       | 511          | 无                       |
| Account                      | L788–L1081            | `account/page.tsx`                       | 342          | 无                       |
| Page Profile                 | L1083–L1364           | `page-profile/page.tsx`                  | 258          | 无                       |
| Store                        | L1367–L1380           | `store/page.tsx`                         | 193          | 无                       |
| Shipping                     | L1947–L2522           | `store/shipping/page.tsx`                | 824          | 无                       |
| Addresses                    | L1384–L1538           | `addresses/page.tsx`                     | 217          | 无                       |
| Blocked                      | L1540–L1847           | `blocked/page.tsx`                       | 189（Mock）  | 无                       |
| Moderation                   | L1850–L1944           | `moderation/page.tsx`                    | 156（Mock）  | 无                       |
| Chat Encryption              | L2625–L2748           | `chat-encryption/page.tsx`               | 200          | 无                       |
| Advanced                     | L2801–L2990           | `advanced/page.tsx`                      | 313          | 无                       |
| Access Control.Privacy       | 外部组件              | `access-control/privacy/page.tsx`        | 30（薄包装） | `PrivacySettingsContent` |
| Access Control.UserGroups    | 外部组件              | `access-control/user-groups/page.tsx`    | 30（薄包装） | `UserGroupsContent`      |
| Access Control.ProductGroups | 外部组件              | `access-control/product-groups/page.tsx` | 30（薄包装） | `ProductGroupsContent`   |
| Access Control.Requests      | 外部组件              | `access-control/requests/page.tsx`       | 30（薄包装） | `AccessRequestsContent`  |

### `openSettings()` 外部调用点

以下文件直接依赖 SettingsDrawer 的 `openSettings()` / `useSettingsDrawer()`：

| 文件                                           | 用途                                    | 迁移方案                                                                             |
| ---------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `Header.tsx` L54                               | 头像菜单"设置"和"访问控制"              | 改为 `router.push('/settings/general')`                                              |
| `settings/page.tsx` L52-64                     | 桌面端重定向到首页+弹框、移动端分类列表 | 桌面端改为重定向到 `/settings/general`；移动端改为 `router.push`                     |
| `store/[peerId]/page.tsx` L79,794,1300         | 店铺页"编辑资料"按钮和欢迎引导          | **特殊处理**：改为 `router.push('/settings/page-profile')`，但需考虑离开店铺页的体验 |
| `SettingsContent/ProductGroupsContent.tsx` L32 | 使用 `useSettingsDrawerOptional()`      | 改为 `useRouter()` + `router.push`                                                   |
| `SettingsContent/UserGroupsContent.tsx` L25    | 使用 `useSettingsDrawerOptional()`      | 改为 `useRouter()` + `router.push`                                                   |

> **店铺页特殊场景**：当前在 `store/[peerId]/page.tsx` 中，点击"编辑资料"会弹出设置 Drawer（不离开当前页）。迁移到页面模式后用户会跳转离开店铺页。建议：(a) 使用 `router.push('/settings/page-profile?from=store')` + 返回按钮回到店铺页，或 (b) 保留一个轻量编辑弹框仅用于"页面资料"快速编辑场景。

### 体验问题

- 桌面端访问 `/settings` 会被重定向回首页并弹出 Drawer
- URL 不可分享、不可书签
- SettingsDrawer 单文件 3370+ 行，极难维护
- Settings Pages 的各页面各自重复实现 `SettingItem`/`SettingGroup`，风格不统一
- 移动端点击设置也是打开 Drawer，没有利用页面路由
- 头像下拉菜单承载过多功能（店铺、商品、订单、设置、退出等）

---

## 目标架构

### 桌面端（≥1024px）

```
┌──────────────────────────────────────────────────────────────┐
│  Logo  [搜索]       市场  🔔  💬  🛒  💰  [头像]             │
├──────────────────────────────────────────────────────────────┤
│              ← 返回                                           │
├───────────┬──────────────────────────────────────────────────┤
│ Settings  │                                                   │
│ Sidebar   │   Section Title                                   │
│ (w-64)    │                                                   │
│           │   ┌─ 左列描述(2fr) ─┬── 右列表单(5fr) ────────┐  │
│ ● 通用    │   │                  │                          │  │
│   账户    │   │ 语言与地区        │  ┌─ Card ─────────────┐ │  │
│   页面资料│   │                  │  │ 语言: [下拉选择]     │ │  │
│   店铺    │   │ 配置你的偏好      │  │ 国家: [下拉选择]     │ │  │
│   配送    │   │ 语言和所在        │  │ 货币: [下拉选择]     │ │  │
│ ────────  │   │ 地区              │  └─────────────────────┘ │  │
│ ▼ 访问控制│   │                  │                          │  │
│   隐私    │   └──────────────────┴──────────────────────────┘  │
│   用户组  │                                                   │
│   商品组  │   ┌─ 左列描述(2fr) ─┬── 右列表单(5fr) ────────┐  │
│   请求    │   │                  │                          │  │
│ ────────  │   │ 外观主题          │  ┌─ Card ─────────────┐ │  │
│   地址    │   │                  │  │ 主题: [选择卡片]     │ │  │
│   屏蔽    │   │ 选择应用的        │  │ 模式: ☀ 浅色 🌙 深色│ │  │
│   仲裁    │   │ 显示风格          │  └─────────────────────┘ │  │
│   加密    │   │                  │                          │  │
│ ────────  │   └──────────────────┴──────────────────────────┘  │
│   高级    │                                                   │
│           │                                                   │
└───────────┴──────────────────────────────────────────────────┘
```

### Sidebar 导航分组

Sidebar 按功能分组，增加可扫描性。分组标题为灰色小号文字（不可点击），各组用分隔线分开：

```
── 个人 ──────────────
  通用设置          /settings/general
  账户绑定          /settings/account

── 商店 ──────────────
  页面资料          /settings/page-profile
  店铺设置          /settings/store
  配送              /settings/store/shipping

── 安全与隐私 ────────
  ▼ 访问控制        /settings/access-control
    隐私            /settings/access-control/privacy
    用户组          /settings/access-control/user-groups
    商品组          /settings/access-control/product-groups
    访问请求        /settings/access-control/requests

── 其他 ──────────────
  地址管理          /settings/addresses
  屏蔽名单          /settings/blocked
  仲裁              /settings/moderation
  聊天加密          /settings/chat-encryption

── 系统 ──────────────
  高级设置          /settings/advanced
```

> 移动端 `/settings` 首页的分类列表也采用相同分组，每组用 Card 包裹。

### 移动端（<768px）

```
/settings 首页:
┌──────────────────────┐
│ ← 设置                │
├──────────────────────┤
│ ┌─ Card ───────────┐ │
│ │ ⚙ 通用     >     │ │
│ │ 🔗 账户     >     │ │
│ │ 👤 页面资料  >     │ │
│ │ 🏪 店铺     >     │ │
│ └──────────────────┘ │
│ ┌─ Card ───────────┐ │
│ │ 🛡 访问控制  >     │ │
│ └──────────────────┘ │
│ ...                   │
└──────────────────────┘

/settings/general 子页面:
┌──────────────────────┐
│ ← 通用设置            │
├──────────────────────┤
│ 语言与地区             │
│ 配置你的偏好语言和地区  │
│                       │
│ ┌─ Card ───────────┐ │
│ │ 语言: [下拉选择]   │ │
│ │ 国家: [下拉选择]   │ │
│ │ 货币: [下拉选择]   │ │
│ └──────────────────┘ │
│                       │
│ 外观主题              │
│ 选择应用的显示风格     │
│                       │
│ ┌─ Card ───────────┐ │
│ │ 主题: [选择卡片]   │ │
│ └──────────────────┘ │
└──────────────────────┘
```

### 头像下拉菜单精简

```
当前（臃肿）:                    目标（精简）:
┌──────────────────┐           ┌──────────────────┐
│ 用户名             │           │ 用户名             │
│ peerID            │           │ peerID            │
│ ──────────        │           │ ──────────        │
│ 🏪 我的店铺       │           │ 👤 个人资料        │
│ ➕ 创建商品       │ ←删除     │ 🏪 我的店铺        │
│ ──────────        │           │ ──────────        │
│ 📦 销售          │ ←删除     │ ⚙  设置           │ → router.push('/settings/general')
│ 🛍 购买          │ ←删除     │ ──────────        │
│ 📊 RWA 资产      │ ←删除     │ 🚪 退出登录        │
│ ──────────        │           └──────────────────┘
│ ⚙  设置          │
│ 🛡 访问控制      │ ←删除
│ ──────────        │
│ 🚪 退出登录       │
└──────────────────┘
```

移除的项目去向：

- **创建商品** → 店铺页面内的操作按钮（已有入口）
- **销售/购买** → 订单页面的 tab（已有 `/orders?tab=sales`）
- **RWA 资产** → 保持独立入口，或放到钱包/资产区域
- **访问控制** → 设置页面的子项（已有 `/settings/access-control`）

### 移动端详细规范

#### 导航流程

移动端（<1024px）没有 Sidebar，使用 **列表页 → 子页面 → 返回** 的堆栈导航模式：

```
/settings          →  /settings/general      →  返回 /settings
（分类列表首页）        （具体设置子页面）
                   →  /settings/access-control  →  /settings/access-control/privacy
                      （子分类列表）                 （三级页面，返回到 access-control）
```

#### `SettingsPageHeader`：统一的页面标题和返回按钮

当前各子页面**各自重复实现**返回按钮和标题（每个页面 ~10 行重复代码）。统一为 `SettingsPageHeader` 组件：

```tsx
interface SettingsPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string; // 返回链接，默认 '/settings'
  actions?: React.ReactNode; // 右侧操作按钮（如 "添加地址"）
}

export const SettingsPageHeader: React.FC<SettingsPageHeaderProps> = ({
  title,
  description,
  backHref = '/settings',
  actions,
}) => (
  <div className="mb-4 md:mb-6">
    {/* 移动端/平板 返回按钮 — 桌面端隐藏 */}
    <div className="lg:hidden mb-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[44px]"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm">{t('common.back')}</span>
      </Link>
    </div>

    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex-shrink-0">{actions}</div>}
    </div>
  </div>
);
```

**返回目标**（`backHref`）规则：

- 一级设置页（general/account/...）：返回 `/settings`
- Access Control 子页（privacy/user-groups/...）：返回 `/settings/access-control`
- Shipping：返回 `/settings/store`
- 三级页面（user-groups/:id/members）：返回上一级 `/settings/access-control/user-groups`

#### 触摸目标和交互

| 元素           | 最小尺寸  | 实现                                   |
| -------------- | --------- | -------------------------------------- |
| 返回按钮       | 44×44px   | `min-h-[44px]` + 足够的 padding        |
| 设置分类列表项 | 48px 高度 | `p-4`（16px上下） + icon(40px)         |
| Switch/Toggle  | 44×24px   | shadcn/ui 默认尺寸已满足               |
| 表单点击区域   | 44px 高度 | Select/Input 默认 `h-10`(40px)，可接受 |
| 操作按钮       | 44×44px   | `size="default"` 或更大                |

> 参考 Apple HIG：所有可交互元素最小触摸目标 44×44pt。

#### 移动端 `/settings` 首页（分类列表）

当前实现使用 `openSettings()` 弹出 Drawer，迁移后改为 `router.push()`：

```tsx
// Phase 3 后的移动端首页（不再使用 openSettings）
export default function SettingsPage() {
  const { t } = useI18n();
  const router = useRouter();

  // 桌面端重定向到 /settings/general（不再弹 Drawer）
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      router.replace('/settings/general');
    }
  }, [router]);

  // 移动端/平板显示分类列表
  return (
    <div className="lg:hidden">
      <h1 className="text-lg font-semibold mb-4">{t('settings.title')}</h1>

      {/* 「个人」分组 */}
      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory ... href="/settings/general" />
        <SettingsCategory ... href="/settings/account" />
      </div>

      {/* 「商店」分组 */}
      <div className="bg-card rounded-lg border overflow-hidden mb-4">
        <SettingsCategory ... href="/settings/page-profile" />
        <SettingsCategory ... href="/settings/store" />
      </div>

      {/* ... 其余分组 ... */}
    </div>
  );
}
```

分组方式与 Sidebar 导航分组一致（个人、商店、安全与隐私、其他、系统），每组用 Card 包裹。

#### 移动端弹框/选择器处理

| 场景               | 桌面端          | 移动端                  |
| ------------------ | --------------- | ----------------------- |
| 语言/国家/货币选择 | Dialog 居中弹出 | Dialog 全屏或底部 Sheet |
| 主题选择           | 内联 RadioGroup | 同桌面端（Card 内选择） |
| 地址编辑           | Dialog 居中     | 全屏 Dialog             |
| 颜色/图片选择      | Dialog          | 底部 Sheet              |

实现方式：复用 shadcn/ui 的 `Dialog` 组件，移动端通过 CSS 将 `DialogContent` 设为全屏：

```tsx
<DialogContent
  className="sm:max-w-md max-h-[85vh] overflow-hidden
  /* 移动端全屏 */
  fixed inset-0 sm:inset-auto sm:top-[50%] sm:left-[50%]
  sm:translate-x-[-50%] sm:translate-y-[-50%]
  w-full h-full sm:h-auto sm:w-auto sm:rounded-lg rounded-none
"
>
  <DialogHeader>...</DialogHeader>
  <ScrollArea className="flex-1">...</ScrollArea>
</DialogContent>
```

或使用 Drawer 组件（来自 vaul）作为移动端替代：

```tsx
// 响应式容器：桌面用 Dialog，移动用 Drawer
const isDesktop = useMediaQuery('(min-width: 768px)');
return isDesktop ? <Dialog ... /> : <Drawer ... />;
```

#### 移动端 SaveBar 适配

- 位置：固定在底部，**在键盘上方**
- 实现：使用 `position: fixed; bottom: 0;`，iOS 需配合 `env(safe-area-inset-bottom)` 避开 Home Indicator
- 键盘弹出时：Save Bar 被键盘推上去（iOS Safari 默认行为），不需要额外处理
- 如果键盘遮挡 Save Bar，备选方案：页面顶部显示一个小的 "未保存" 提示条

```tsx
<div
  className="fixed bottom-0 left-0 right-0 z-50
  bg-card border-t border-border shadow-lg
  pb-[env(safe-area-inset-bottom)]
"
>
  ...
</div>
```

#### 移动端性能注意

- `/settings` 首页的分类列表很轻量，不需要特殊优化
- 各子页面通过路由懒加载，每次只加载一个页面的 chunk
- 弹框（语言/国家/货币等长列表选择器）使用 `ScrollArea` + 虚拟滚动或限制显示数量，避免 200+ 国家/货币导致的滚动卡顿

---

## Settings Layout 组件规范

### 核心布局组件：`SettingsSection`

```tsx
interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode; // 右列的 Card 内容
}
```

参考 Shopify Polaris 的 Settings Layout pattern（2fr:5fr 两列）：

```tsx
<SettingsSection
  title={t('settings.general.localeTitle')}
  description={t('settings.general.localeDesc')}
>
  <Card>
    <VStack gap="md">
      <FormField label={t('settings.general.language')}>
        <Select ... />
      </FormField>
      <FormField label={t('settings.general.country')}>
        <Select ... />
      </FormField>
    </VStack>
  </Card>
</SettingsSection>
```

### 响应式规则

| 断点                    | 布局                       | Sidebar         | 内容区                                                     |
| ----------------------- | -------------------------- | --------------- | ---------------------------------------------------------- |
| `<768px` (mobile)       | 单列，全宽                 | 隐藏            | SettingsSection 折叠为单列（标题+描述 → 卡片依次堆叠）     |
| `768px–1023px` (tablet) | 两列 `grid-cols-[2fr_5fr]` | 隐藏            | SettingsSection 两列，无 Sidebar，通过页面顶部返回按钮导航 |
| `≥1024px` (desktop)     | 两列 + 左侧 Sidebar        | 固定显示 `w-64` | SettingsSection 两列，Sidebar 导航                         |

> **Tablet 说明**：768–1023px 范围内 Sidebar 隐藏（`hidden lg:block`），但 SettingsSection 已是两列。此时页面导航依赖顶部返回按钮（与移动端相同）。这是有意设计——Sidebar 仅在足够宽时（≥1024px）显示，避免挤压内容区。

### 间距规范

| 元素             | 桌面端                               | 移动端              | 说明                        |
| ---------------- | ------------------------------------ | ------------------- | --------------------------- |
| Section 之间     | `divide-y` + `py-10`                 | `divide-y` + `py-6` | 移动端更紧凑                |
| Card 内部        | `p-6`                                | `p-4`               | 移动端减少内边距            |
| 表单字段间       | `space-y-4`                          | `space-y-4`         | 保持一致                    |
| 左列描述文字     | `text-sm text-muted-foreground mt-1` | 同左                | 移动端描述在卡片上方        |
| 右列最大宽度     | `max-w-2xl`                          | 无限制（全宽）      | 移动端内容区占满屏幕        |
| 页面底部 padding | `pb-24`（有 SaveBar 时）             | `pb-24`             | 为 SaveBar 留出空间         |
| 页面标题下方     | `mb-6`                               | `mb-4`              | 标题到第一个 Section 的间距 |

使用响应式 class 实现差异：

```tsx
<SettingsSection className="py-6 md:py-10" ... />
<Card className="p-4 md:p-6">...</Card>
```

### 保存交互模式

| 类型              | 适用场景                                  | 实现                             |
| ----------------- | ----------------------------------------- | -------------------------------- |
| **即时保存**      | Switch/Toggle、单项选择（语言/货币/主题） | 选择后自动调用 API + toast       |
| **底部 Save Bar** | 多字段文本表单（页面资料、店铺描述等）    | 检测 dirty state，底部浮动保存栏 |
| **二次确认**      | 危险操作（删除/重置/清除数据）            | AlertDialog 确认                 |

**各页面的保存模式**：

| 页面            | 模式                    | 原因                                                    |
| --------------- | ----------------------- | ------------------------------------------------------- |
| General         | **即时保存**            | 每个字段（语言/国家/货币/主题）都是独立选择，选完即生效 |
| Account         | **即时保存**            | 绑定/解绑操作本身就是独立 API 调用                      |
| Page Profile    | **Save Bar**            | 包含名称、简介等多字段文本，需统一提交                  |
| Store           | **Save Bar**            | 包含店铺政策等多字段文本                                |
| Shipping        | **即时保存** + 二次确认 | 每个 Profile/Zone/Rate 独立保存，删除需确认             |
| Access Control  | **即时保存**            | Switch 类和列表增删                                     |
| Addresses       | **即时保存** + 二次确认 | 地址增删改独立操作，删除需确认                          |
| Blocked         | **即时保存**            | 屏蔽/取消屏蔽即时生效                                   |
| Moderation      | **Save Bar**            | 仲裁设置含文本表单                                      |
| Chat Encryption | **即时保存** + 二次确认 | 备份/恢复为独立操作                                     |
| Advanced        | **二次确认**            | 大多是危险操作（重置、清除等）                          |

底部 Save Bar 规范（仅 Page Profile / Store / Moderation 使用）：

```
┌──────────────────────────────────────────────────────────┐
│ ⚠ 有未保存的更改                    [放弃更改] [保存]      │
└──────────────────────────────────────────────────────────┘
```

- 固定在视口底部，从底部滑入（`animate-in slide-in-from-bottom-4`）
- 仅在有修改时出现（`isDirty = true`）
- 保存成功后自动隐藏 + toast 提示
- 离开页面时如有未保存更改，弹出确认框（`beforeunload` + 路由拦截）

---

## 改造计划

### Phase 0: 准备工作（基础）

**目标**：创建基础布局组件，不改变现有行为

- [ ] P0-1: 创建 `SettingsSection` 布局组件
  - 位置：`apps/web/src/components/SettingsLayout/SettingsSection.tsx`
  - 实现两列布局（左描述 + 右表单），响应式折叠
  - 移动端单列 → `md:` 两列（`grid-cols-1 md:grid-cols-[2fr_5fr]`）
  - 移动端 `gap-y-2`，桌面 `gap-y-4`
  - 右列移动端全宽，桌面 `md:max-w-2xl`
- [ ] P0-2: 创建 `SettingsPageHeader` 组件
  - 位置：`apps/web/src/components/SettingsLayout/SettingsPageHeader.tsx`
  - 移动端/平板（`<1024px`）显示返回按钮（`lg:hidden`），桌面端隐藏
  - 返回按钮触摸目标 ≥ 44px（`min-h-[44px]`）
  - 支持 `backHref` prop（默认 `/settings`）和 `actions` 右侧操作区
  - **消除**各页面自行实现返回按钮的重复代码
- [ ] P0-3: 创建 `SaveBar` 组件
  - 底部浮动保存栏，支持 dirty state 检测
  - 移动端兼容 iOS Safe Area（`pb-[env(safe-area-inset-bottom)]`）
  - 从底部滑入动画（`animate-in slide-in-from-bottom-4`）
- [ ] P0-4: 创建 `useSettingsForm` hook
  - 位置：`packages/core/hooks/useSettingsForm.ts`
  - 管理表单状态、dirty 检测、保存/取消、离开确认

**验收标准**：

- `SettingsSection` 在 375px 宽度下单列渲染，768px 两列渲染
- `SettingsPageHeader` 在 375px 显示返回按钮，1024px+ 隐藏
- `SaveBar` 在 iOS Safari 底部不被 Home Indicator 遮挡
- 组件可独立渲染，不影响现有功能

### Phase 1: 重构第一个设置页 — General（样板）

**目标**：将现有的 `/settings/general/page.tsx`（511行，已有完整功能）重构为 `SettingsSection` 两列布局，建立迁移模式

> **注意**：这不是从零迁移。`general/page.tsx` 已经有完整的语言/国家/货币/主题/声音设置功能和选择弹框。任务是**重构布局**为 Shopify 风格，并**抽取业务逻辑到 core hook**。

- [ ] P1-1: 将 `general/page.tsx` 中的业务逻辑提取到 hook
  - 创建 `packages/core/hooks/useGeneralSettings.ts`
  - 包含：语言/国家/货币/主题/通知声音 的状态和操作
  - 复用现有的 `useCurrencySelection`、`useNotificationStore`、`useTheme` 等
- [ ] P1-2: 创建 `GeneralSettingsContent.tsx`
  - 位置：`apps/web/src/components/SettingsContent/GeneralSettingsContent.tsx`
  - 使用 `SettingsSection` 两列布局替代现有的 `SettingGroup` 列表布局
  - 保留现有的选择弹框 UI（语言、国家、货币、主题），它们在两列布局的右列 Card 内使用
  - **删除**页面内的局部 `SettingItem`/`SettingGroup` 组件定义
- [ ] P1-3: 更新 `/settings/general/page.tsx`
  - 改为薄包装：只含 `SettingsPageHeader` + `GeneralSettingsContent`
  - 保留移动端返回按钮
- [ ] P1-4: 浏览器验证
  - 桌面端访问 `/settings/general` 显示两列布局
  - 移动端显示单列布局
  - **所有现有功能不丢失**：语言/国家/货币弹框选择、主题切换、声音设置

**验收标准**：

- `/settings/general` 桌面端呈现 Shopify 风格两列布局
- 语言/国家/货币切换正常工作（弹框选择 → 即时保存 → toast）
- 主题切换即时生效
- 声音设置的 Switch/Slider 正常工作
- General 页面**不使用 Save Bar**（全部即时保存）

### Phase 2: 重构所有设置页

**目标**：逐个将各 Settings Pages 重构为统一的 `SettingsSection` 两列布局

> **关键**：大部分页面已有完整功能实现，任务是**重构布局 + 抽取 hook**，而非从零开发。参考 Phase 1 建立的 General 样板模式。

重构顺序（按复杂度从低到高）：

| 序号 | Section             | 目标页面                     | 现有页面行数 | 复杂度 | 说明                      |
| ---- | ------------------- | ---------------------------- | ------------ | ------ | ------------------------- |
| 2-1  | Blocked（屏蔽）     | `/settings/blocked`          | 189          | 低     | Mock 数据，待接 API       |
| 2-2  | Chat Encryption     | `/settings/chat-encryption`  | 200          | 低     | 已完整                    |
| 2-3  | Account（账户绑定） | `/settings/account`          | 342          | 低     | 已完整，OAuth 绑定        |
| 2-4  | Moderation（仲裁）  | `/settings/moderation`       | 156          | 低     | Mock 数据                 |
| 2-5  | Addresses（地址）   | `/settings/addresses`        | 217          | 中     | 含地址表单弹框            |
| 2-6  | Page Profile        | `/settings/page-profile`     | 258          | 中     | 含头像上传                |
| 2-7  | Advanced（高级）    | `/settings/advanced`         | 313          | 中     | 含危险操作区              |
| 2-8  | Store（店铺）       | `/settings/store`            | 193          | 高     | 部分功能待完善            |
| 2-9  | Shipping（配送）    | `/settings/store/shipping`   | 824          | 高     | 最复杂，Profile/Zone/Rate |
| 2-10 | Access Control      | `/settings/access-control/*` | 30×4         | 中     | 已用共享组件，需调整布局  |

每个 Section 的重构步骤（同 Phase 1 模式）：

1. **阅读**现有 `page.tsx` 和 SettingsDrawer 对应 section 的代码，确认功能完整性
2. **提取**业务逻辑到 `packages/core/hooks/use{Section}Settings.ts`
3. **创建** `{Section}SettingsContent.tsx` 使用 `SettingsSection` 两列布局
4. **更新**对应 `page.tsx` 为薄包装
5. **删除**页面内局部定义的 `SettingItem`/`SettingGroup` 等重复组件
6. **浏览器验证**（桌面端两列 + 移动端单列 + 功能完整）

**验收标准**：

- 每个设置页面都使用统一的 `SettingsSection` 两列布局
- 页面内无局部定义的 `SettingItem`/`SettingGroup`（全部使用共享组件或 `SettingsSection`）
- 所有现有功能不丢失
- 所有 URL 可直接访问

### Phase 3: 切换入口和清理

**目标**：删除弹框模式，统一为页面导航

#### 过渡策略

Phase 2 和 Phase 3 之间会有一个过渡期。规则：

- Phase 2 期间 SettingsDrawer **保持运行**，但**禁止新增功能**
- 每个 Section 重构完成后，不需要从 SettingsDrawer 中立即删除（Phase 3 统一删除）
- 验证"功能等价"的方法：对比新页面和 SettingsDrawer 中同一 section 的所有 UI 元素和操作

#### 具体步骤

- [ ] P3-1: 修改 Header 头像下拉菜单
  - 精简菜单项（见上方设计）
  - 设置点击改为 `router.push('/settings/general')`
  - 访问控制改为 `router.push('/settings/access-control')`
  - 移除 `import { useSettingsDrawer } from '../SettingsDrawer'`
- [ ] P3-2: 修改 `/settings/page.tsx`
  - 移除桌面端重定向到首页的逻辑
  - 桌面端：直接重定向到 `/settings/general`
  - 移动端：显示分类列表，点击后 `router.push('/settings/xxx')` 而非 `openSettings()`
- [ ] P3-3: 修改 `store/[peerId]/page.tsx`
  - "编辑资料"按钮改为 `router.push('/settings/page-profile?from=store')`
  - 欢迎引导中的"设置资料"同上
  - `page-profile` 页面检测 `from=store` 参数，返回按钮指向店铺页
- [ ] P3-4: 修改 `SettingsContent/ProductGroupsContent.tsx` 和 `UserGroupsContent.tsx`
  - 将 `useSettingsDrawerOptional()` 替换为 `useRouter()` + `router.push`
  - 移除 `import { useSettingsDrawerOptional } from '@/components/SettingsDrawer/SettingsDrawer'`
- [ ] P3-5: 删除 SettingsDrawer
  - 移除 `SettingsDrawerProvider` 及其在 `app/layout.tsx`（或 `main.tsx`）中的引用
  - 删除 `apps/web/src/components/SettingsDrawer/` 整个目录
  - 从 `components/index.ts` 中移除导出
- [ ] P3-6: 删除 SettingsModal
  - 删除 `apps/web/src/components/SettingsModal/` 整个目录
- [ ] P3-7: 全局搜索验证，确保无残留引用
  - 搜索 `useSettingsDrawer`、`openSettings`（来自 SettingsDrawer）、`SettingsDrawerProvider`、`useSettingsDrawerOptional`、`SettingsModal`
  - 每个匹配必须替换或删除

**验收标准**：

- 头像下拉菜单精简为 4-5 项
- 所有设置入口都导航到页面（`router.push`）而非弹框
- 项目中无 SettingsDrawer / SettingsModal / useSettingsDrawerOptional 残留
- SettingsDrawerProvider 从根布局中移除
- `pnpm tsc --noEmit` 通过（无编译错误）

### Phase 4: UI 打磨和一致性

**目标**：对齐 Shopify 级别的视觉质量

- [ ] P4-1: SettingsSidebar 视觉优化
  - 添加分组标题（如「商店」「安全」「系统」）
  - 活跃项高亮样式
  - 滚动时 sticky header
- [ ] P4-2: 全局一致性检查
  - 所有 Card 使用统一圆角、阴影
  - 表单控件大小统一
  - 间距遵循 4px 网格
  - Save Bar 出现/消失动画
- [ ] P4-3: 加载状态
  - 页面切换时 skeleton loading
  - API 调用时 inline loading
- [ ] P4-4: 错误处理
  - 保存失败的 toast + 内联错误
  - 网络断开时的降级 UI
- [ ] P4-5: 移动端体验
  - 返回导航流畅
  - 表单键盘适配（`inputMode`、`enterKeyHint`）
  - 长表单自动滚动到错误位置

### Phase 5: AI-Ready 增强

**目标**：为 AI Agent 集成做好前端基础

- [ ] P5-1: 语义化 data attributes
  - 所有设置表单字段添加 `data-ai-field`
  - 所有操作按钮添加 `data-ai-action`
  - 所有设置页面添加 `data-ai-page`
- [ ] P5-2: Settings Schema
  - 创建 `packages/core/schemas/settingsSchema.ts`
  - 定义每个设置项的类型、选项、验证规则
  - AI 可通过 Schema 理解设置结构
- [ ] P5-3: Command Palette 基础（⌘K）
  - 创建全局搜索框组件
  - 支持快速跳转到任何设置项
  - 为后续 AI 对话入口预留

---

## 文件路径规范

### 新增文件

```
packages/core/hooks/
  useGeneralSettings.ts          # General 设置业务逻辑
  useStoreSettings.ts            # Store 设置业务逻辑
  useAccountSettings.ts          # Account 设置业务逻辑
  useAccessControlSettings.ts    # Access Control 设置业务逻辑
  useSettingsForm.ts             # 通用设置表单管理

apps/web/src/components/SettingsLayout/
  index.ts                       # 导出
  SettingsSection.tsx            # 两列布局组件
  SettingsPageHeader.tsx         # 页面标题
  SaveBar.tsx                    # 底部保存栏

apps/web/src/components/SettingsContent/
  GeneralSettingsContent.tsx     # 通用设置（从 SettingsDrawer 提取）
  AccountSettingsContent.tsx     # 账户设置
  PageProfileSettingsContent.tsx # 页面资料设置
  StoreSettingsContent.tsx       # 店铺设置
  ShippingSettingsContent.tsx    # 配送设置
  BlockedSettingsContent.tsx     # 屏蔽设置
  ModerationSettingsContent.tsx  # 仲裁设置
  AdvancedSettingsContent.tsx    # 高级设置
  ChatEncryptionContent.tsx      # 加密设置
  (已有) PrivacySettingsContent.tsx
  (已有) UserGroupsContent.tsx
  (已有) ProductGroupsContent.tsx
  (已有) AccessRequestsContent.tsx
```

### 删除文件

```
apps/web/src/components/SettingsDrawer/    # 整个目录（Phase 3）
apps/web/src/components/SettingsModal/     # 整个目录（Phase 3）
```

### 修改文件

```
apps/web/src/app/layout.tsx                             # 移除 SettingsDrawerProvider（Phase 3）
apps/web/src/app/settings/page.tsx                      # 移除桌面端重定向（Phase 3）
apps/web/src/app/settings/layout.tsx                    # 调整布局（Phase 0）
apps/web/src/app/settings/general/page.tsx              # 使用 GeneralSettingsContent（Phase 1）
apps/web/src/app/settings/*/page.tsx                    # 所有子页面同上（Phase 2）
apps/web/src/components/Header/Header.tsx               # 精简头像菜单，移除 useSettingsDrawer（Phase 3）
apps/web/src/components/SettingsSidebar/                # 添加分组标题（Phase 4）
apps/web/src/app/store/[peerId]/page.tsx                # 移除 openSettings，改为 router.push（Phase 3）
apps/web/src/components/SettingsContent/ProductGroupsContent.tsx  # 移除 useSettingsDrawerOptional（Phase 3）
apps/web/src/components/SettingsContent/UserGroupsContent.tsx     # 移除 useSettingsDrawerOptional（Phase 3）
apps/web/src/components/index.ts                        # 移除 SettingsDrawer 导出（Phase 3）
```

---

## SettingsSection 组件实现参考

```tsx
interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  className,
}) => (
  <div
    className={cn(
      // 移动端单列，平板及以上两列
      'grid grid-cols-1 md:grid-cols-[2fr_5fr] gap-x-8 gap-y-2 md:gap-y-4',
      className
    )}
  >
    {/* 左列（移动端为上方）：标题 + 描述 */}
    <div className="md:pt-1.5">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>}
    </div>

    {/* 右列（移动端为下方）：表单卡片 */}
    <div className="md:max-w-2xl">{children}</div>
  </div>
);
```

### Section 间分隔方式

多个 Section 之间使用分割线 + padding，**不要**同时用 `gap` 和 `divide-y`。移动端使用较小的间距：

```tsx
{/* ✅ 正确：用 divide-y 分隔，响应式 padding */}
<div className="divide-y divide-border">
  <SettingsSection className="pb-6 md:pb-10" ... />
  <SettingsSection className="py-6 md:py-10" ... />
  <SettingsSection className="pt-6 md:pt-10" ... />
</div>

{/* ❌ 错误：gap 和 divide-y 同时使用会导致间距叠加 */}
<div className="space-y-10 divide-y divide-border">
  <SettingsSection ... />
</div>
```

## SaveBar 组件实现参考

```tsx
interface SaveBarProps {
  isDirty: boolean;
  isLoading: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export const SaveBar: React.FC<SaveBarProps> = ({ isDirty, isLoading, onSave, onDiscard }) => {
  const { t } = useI18n();

  if (!isDirty) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg animate-in slide-in-from-bottom-4">
      <Container size="lg">
        <div className="flex items-center justify-between h-16 gap-4">
          <p className="text-sm text-muted-foreground">{t('settings.unsavedChanges')}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onDiscard} disabled={isLoading}>
              {t('common.discard')}
            </Button>
            <Button onClick={onSave} disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
};
```

---

## 浏览器验证清单

每个 Phase 完成后，使用 browser-use subagent 或手动进行以下检查：

### 桌面端检查（1440x900）

- [ ] 导航到 `/settings/general`，显示左侧 Sidebar + 右侧两列内容
- [ ] 左列显示 Section 标题和描述
- [ ] 右列显示 Card 包裹的表单控件
- [ ] Sidebar 当前项高亮
- [ ] 点击 Sidebar 切换页面，URL 变化
- [ ] 修改设置后底部出现 Save Bar
- [ ] 保存成功后 Save Bar 消失，显示 toast
- [ ] 头像下拉菜单精简且功能正常

### 移动端检查（375x667）

- [ ] `/settings` 显示分组的分类卡片列表（个人、商店、安全与隐私、其他、系统）
- [ ] 点击分类跳转到子页面（`router.push`，而非弹框）
- [ ] 每个子页面顶部显示返回按钮（`SettingsPageHeader`），点击返回正确页面
- [ ] SettingsSection 折叠为单列（标题+描述在上，Card 在下）
- [ ] Card 内 padding 为 `p-4`（移动端紧凑模式）
- [ ] Section 间距 `py-6`（比桌面端 `py-10` 更紧凑）
- [ ] 所有可点击元素触摸目标 ≥ 44px
- [ ] 选择弹框（语言/国家/货币）在移动端全屏或底部 Sheet 展示
- [ ] 键盘弹出时 Save Bar 不被遮挡（对有 Save Bar 的页面）
- [ ] 长列表选择器（国家列表、货币列表）滚动流畅
- [ ] Access Control 中间页显示子分类列表，点击跳转到三级页面
- [ ] 底部 Footer（MobileNav）正常显示

### 平板检查（768x1024）

- [ ] SettingsSection 呈现两列布局（左描述 + 右表单）
- [ ] 无 Sidebar，页面顶部有返回按钮
- [ ] 内容区不被截断，`max-w-2xl` 约束右列宽度

### 功能完整性

- [ ] 语言切换后全局文案变化
- [ ] 国家/货币切换正确保存
- [ ] 主题切换即时生效
- [ ] 所有 Switch 类设置即时保存
- [ ] 地址增删改正常
- [ ] 屏蔽用户列表正常
- [ ] 访问控制子页面导航正常

---

## AI 语义化标记规范

### data-ai-field

标记可编辑的表单字段：

```tsx
<Select
  data-ai-field="settings.general.language"
  data-ai-label="语言"
  data-ai-type="select"
  data-ai-options="en,zh,ja,ko,es,fr,de,ru,pt"
  ...
/>
```

### data-ai-action

标记可触发的操作：

```tsx
<Button
  data-ai-action="settings.save"
  data-ai-scope="general"
  ...
/>
```

### data-ai-page

标记页面身份：

```tsx
<main data-ai-page="settings.general" data-ai-title="通用设置">
  ...
</main>
```

---

---

## 快速开始（给 AI 的行动指南）

当你要执行某个 Phase 时，按以下顺序操作：

```
1. 阅读本文档对应 Phase 的描述和验收标准
2. 阅读「代码重复矩阵」找到目标 Section 在 SettingsDrawer 中的行范围 + 现有页面
3. 阅读现有页面代码（如 general/page.tsx），理解当前实现
4. 阅读 SettingsDrawer 中同一 section 的代码，对比差异
5. 启动前端：cd ~/dev/openbazaar/mobazha-unified/apps/web && pnpm dev:vite --port 3000
6. 按步骤实施改造
7. 用 browser-use subagent 验证（桌面 1440x900 + 移动 375x667）
8. 运行 pnpm tsc --noEmit 确保编译通过
```

**E2E Docker 环境**（登录测试需要）：

```bash
# 检查后端是否运行
curl -sf http://localhost:18080/api/serverInfo && echo "OK"
# 如果没运行，启动 Docker E2E 环境
cd ~/dev/mobazha/tests/e2e/docker && make up && make wait
# 测试账号：testuser1/123
```

---

## i18n Key 策略

### 复用现有 key

现有的 i18n key 命名比较混乱（`settings.sidebar.*`、`settingsModal.*`、`settingsExtended.*`），但**不在本次重构中统一重命名**。原则：

- **优先复用**现有 key，避免引入不必要的变更
- 新增 key 按 `settings.{section}.{field}` 格式命名
- `SettingsSection` 的 `title`/`description` 尽量复用 `settingsExtended.*` 或 `settingsModal.*` 中已有的描述性 key

### 需要新增的 key

| Key                                | 用途                      |
| ---------------------------------- | ------------------------- |
| `settings.unsavedChanges`          | Save Bar 提示文案         |
| `settings.general.localeTitle`     | "语言与地区" Section 标题 |
| `settings.general.localeDesc`      | "配置你的偏好语言和地区"  |
| `settings.general.appearanceTitle` | "外观主题" Section 标题   |
| `settings.general.appearanceDesc`  | "选择应用的显示风格"      |
| `settings.general.soundTitle`      | "声音设置" Section 标题   |
| `settings.general.soundDesc`       | "通知提示音和语音播报"    |

> 其余 Section 的标题/描述 key 在各自迁移时逐步添加。

---

## E2E 测试影响

现有 E2E 测试文件 `settings.spec.ts` 和 `settings-flow.spec.ts` 很可能依赖 SettingsDrawer 的 DOM 结构（Dialog、特定的 data-testid 等）。

### 迁移后需要更新的 E2E 测试

| 测试文件                     | 影响                             | 处理时机                            |
| ---------------------------- | -------------------------------- | ----------------------------------- |
| `e2e/settings.spec.ts`       | 选择器可能依赖 Dialog DOM        | Phase 3 删除 Drawer 后更新          |
| `e2e/settings-flow.spec.ts`  | 设置打开/关闭/导航的交互方式变化 | Phase 3 删除 Drawer 后更新          |
| `e2e/desktop-visual.spec.ts` | 设置页面截图基线需要重新生成     | Phase 4 打磨后 `--update-snapshots` |

### 建议

- Phase 1-2 期间**不动 E2E 测试**（Drawer 仍然存在，旧测试仍能跑）
- Phase 3 删除 Drawer 后，**立即更新** E2E 测试
- 更新时把选择器改为基于路由的测试（导航到 `/settings/general` 而非打开 Dialog）

---

## 性能考量

### 页面模式 vs 弹框模式

| 维度         | 弹框模式（当前）                      | 页面模式（目标）       |
| ------------ | ------------------------------------- | ---------------------- |
| 首次加载     | 不加载（弹框未打开）                  | 不加载（路由懒加载）   |
| 打开设置     | 渲染整个 SettingsDrawer（3370行组件） | 仅加载当前页面的 chunk |
| 切换 Section | 组件内部切换（快）                    | 路由切换 + chunk 加载  |
| 内存占用     | 弹框关闭后 DOM 卸载                   | 每个页面按需加载卸载   |

### 确保路由懒加载

现有的路由配置已使用 `lazyPage()` 做懒加载，新的设置页面也会自动受益：

```tsx
// routes.tsx 中已有的模式
{ path: '/settings/general', element: lazyPage(() => import('./app/settings/general/page')) }
```

确保 Content 组件不被过早 import。如果 `GeneralSettingsContent` 较大，可以考虑在 page.tsx 中动态导入：

```tsx
const GeneralSettingsContent = lazy(
  () => import('@/components/SettingsContent/GeneralSettingsContent')
);
```

---

## 相关文档

- [Desktop UX Guide](../../.cursor/skills/desktop-ux-guide/SKILL.md) — 桌面端交互规范
- [Mobile UX Guide](../../.cursor/skills/mobile-ux-guide/SKILL.md) — 移动端交互规范
- [Component Dev Guide](../../.cursor/skills/component-dev/SKILL.md) — 组件开发规范
- [Design Tokens](../../.cursor/skills/design-tokens/SKILL.md) — 设计令牌
- [Theme System](./theme-system.md) — 主题系统
- [Account Binding](./account-binding.md) — 账号绑定
- [Shipping Profiles](./shipping-profiles.md) — 配送档案

## 迁移检查清单

- [ ] Phase 0: 基础布局组件完成
- [ ] Phase 1: General 设置页面完成（样板）
- [ ] Phase 2: 所有设置页面迁移完成
- [ ] Phase 3: 入口切换 + 旧组件删除
- [ ] Phase 4: UI 打磨和一致性
- [ ] Phase 5: AI-Ready 增强
- [ ] E2E 测试更新
- [ ] 迁移状态文档更新
