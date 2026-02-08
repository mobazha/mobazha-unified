---
name: motion-design
description: Motion design system for Mobazha including animation principles, duration standards, easing functions, prefers-reduced-motion support, and scene-specific animation patterns. Use when adding animations, transitions, or micro-interactions, "动效", "动画", "过渡", "transition", "animate", "微交互".
---

# 动效设计系统

Mobazha 项目的动画和过渡效果统一规范。

## 三大原则

1. **目的性**：每个动画必须有明确目的（引导注意力、反馈操作、建立空间关系）
2. **连贯性**：相同类型的交互使用相同的动画模式
3. **自然感**：遵循物理直觉，进入减速、退出加速

## 时长标准

| 类别            | 时长      | Tailwind                      | 使用场景                      |
| --------------- | --------- | ----------------------------- | ----------------------------- |
| 微交互          | 100-150ms | `duration-150`                | 按钮状态、复选框、开关        |
| 颜色/透明度变化 | 200ms     | `duration-200`                | hover 效果、焦点、active 状态 |
| 面板/展开       | 200-300ms | `duration-200`/`duration-300` | 下拉菜单、手风琴、Tooltip     |
| 模态/抽屉       | 300ms     | `duration-300`                | Dialog、Sheet、Drawer         |
| 页面/大区域     | 300-500ms | `duration-300`/`duration-500` | 页面过渡、Tab 切换内容        |

**原则**：越小的元素动画越快，越大的区域动画越慢。

## 缓动函数

| 场景     | 缓动                 | CSS / Tailwind                      |
| -------- | -------------------- | ----------------------------------- |
| 元素进入 | ease-out（减速进入） | `ease-out`                          |
| 元素退出 | ease-in（加速退出）  | `ease-in`                           |
| 元素移动 | ease-in-out          | `ease-in-out`                       |
| 弹性效果 | cubic-bezier         | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| 项目默认 | Material ease        | `cubic-bezier(0.4, 0, 0.2, 1)`      |

项目 CSS 变量：

```css
--animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
```

## prefers-reduced-motion 适配（必须）

**所有动画必须尊重用户的减少动效偏好**：

```tsx
// ✅ 正确：CSS 方式（推荐）
<div className="transition-all duration-200 motion-reduce:transition-none">

// ✅ 正确：装饰性动画在减少动效模式下隐藏
<div className="animate-fade-in motion-reduce:animate-none">

// ✅ 正确：全局 CSS 降级
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**例外**：不需要降级的场景：

- 加载指示器（spinner）— 功能性动画
- 进度条 — 传达信息的动画

## 场景对照表

### 操作确认

```tsx
// Toast 通知（已有，参见 use-toast）
toast({ title: '添加成功', variant: 'success' });

// 按钮状态变化
<Button disabled={isSubmitting}>
  {isSubmitting ? <Spinner className="w-4 h-4 mr-2 animate-spin" /> : null}
  {isSubmitting ? '处理中...' : '提交'}
</Button>;
```

### 导航过渡

```tsx
// Tab 内容切换
<div className="animate-fade-in" key={activeTab}>
  {tabContent}
</div>

// 模态框出入（Radix Dialog 已内置）
// data-[state=open]:animate-in data-[state=closed]:animate-out
```

### 状态变化

```tsx
// 收藏图标切换
<Heart
  className={cn(
    'transition-all duration-200',
    isFavorited ? 'fill-destructive text-destructive scale-110' : 'text-muted-foreground'
  )}
/>

// 开关/复选框
<Switch className="transition-colors duration-200" />
```

### 列表增删

```tsx
// 目前使用 CSS 动画
<div className="animate-fade-in" key={item.id}>
  <ItemCard item={item} />
</div>

// 删除时的过渡
<div className={cn(
  'transition-all duration-200',
  isRemoving && 'opacity-0 -translate-x-4'
)}>
```

## 项目已有动画工具类

定义在 `apps/web/src/app/globals.css`：

| 工具类                   | 效果            | 使用场景           |
| ------------------------ | --------------- | ------------------ |
| `animate-fade-in`        | 淡入            | 页面内容加载完成   |
| `animate-slide-up`       | 从下方滑入      | 底部面板、Toast    |
| `animate-slide-in-right` | 从右方滑入      | 侧边抽屉、详情面板 |
| `animate-scale-in`       | 缩放进入        | 弹出菜单、Tooltip  |
| `touch-feedback`         | 按压缩放+透明度 | 移动端按钮/卡片    |
| `touch-feedback-bg`      | 按压背景变色    | 移动端列表项       |
| `hover-lift`             | 悬停提升+阴影   | 桌面端卡片         |

## framer-motion 决策指南

**当前状态**：项目未使用 framer-motion，完全依赖 CSS 动画 + Radix UI 内置动画。

**何时考虑引入 framer-motion**：

- 需要列表增删动画（AnimatePresence）
- 需要共享元素过渡（layout animation）
- 需要手势驱动的动画（drag、spring）
- 需要交错动画（stagger children）

**何时不需要**：

- 简单的 hover/active 状态变化 → CSS transition
- 模态框/Sheet 进出 → Radix UI 内置
- 淡入/滑入效果 → 项目已有工具类
- 骨架屏脉冲 → `animate-pulse`

**建议**：当前 CSS 动画能满足大部分需求。仅在需要上述复杂场景时按需引入 framer-motion，避免增加 bundle 体积。

## 快速检查清单

- [ ] 动画是否有明确目的（反馈、引导、空间）？
- [ ] 时长是否符合标准（微交互 150ms、面板 300ms）？
- [ ] 是否添加了 `motion-reduce:` 降级？
- [ ] 缓动函数是否正确（进入 ease-out、退出 ease-in）？
- [ ] 是否使用了项目已有的工具类（而非重复定义）？
- [ ] 装饰性动画是否可被 `prefers-reduced-motion` 禁用？
