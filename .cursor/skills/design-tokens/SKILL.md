---
name: design-tokens
description: Comprehensive design token system for Mobazha including color system, typography scale, spacing grid, border radius, elevation, and icon sizes. Use when making design decisions, setting up new pages, or checking visual consistency, "设计令牌", "设计系统", "色彩系统", "排版", "间距", "圆角", "阴影".
---

# 设计令牌系统

Mobazha 项目的视觉设计基础，统一色彩、排版、间距、圆角、阴影等设计决策。

**定义位置**：`apps/web/src/app/globals.css`（CSS 变量）+ `packages/core/theme/`（主题配置）

## 一、色彩系统

### 6 个主题

| 主题      | 设计意图             | 主色调    |
| --------- | -------------------- | --------- |
| Classic   | 经典清新，默认主题   | 青绿色    |
| Crypto    | 科技感，加密货币用户 | 深蓝+紫   |
| Business  | 专业商务             | 深蓝+灰   |
| Cyberpunk | 赛博朋克，年轻用户   | 霓虹粉+紫 |
| Nature    | 自然环保             | 深绿+棕   |
| Luxury    | 奢华高端             | 金+黑     |

每个主题有 light 和 dark 两种模式，通过 CSS 变量切换。

### 语义色映射

| 语义     | CSS 变量              | Tailwind 类名                   | 使用场景                |
| -------- | --------------------- | ------------------------------- | ----------------------- |
| 品牌主色 | `--theme-primary`     | `text-primary`, `bg-primary`    | CTA、链接、价格、选中态 |
| 辅助色   | `--theme-secondary`   | `text-secondary`                | 次要按钮、标签          |
| 强调色   | `--theme-accent`      | `text-accent`                   | 装饰、渐变              |
| 成功     | `--color-success`     | `text-success`, `bg-success/10` | 完成、通过、在线        |
| 警告     | `--color-warning`     | `text-warning`                  | 注意、即将过期          |
| 错误     | `--color-destructive` | `text-destructive`              | 删除、错误、失败        |
| 信息     | `--color-info`        | `text-info`, `bg-info/10`       | 提示、帮助              |

### 文字色层级

| 层级 | Tailwind                   | 用途             |
| ---- | -------------------------- | ---------------- |
| 一级 | `text-foreground`          | 标题、重要内容   |
| 二级 | `text-muted-foreground`    | 正文、描述       |
| 三级 | `text-muted-foreground/70` | 辅助信息、时间戳 |
| 四级 | `text-muted-foreground/50` | 占位符、禁用态   |
| 反色 | `text-primary-foreground`  | 主色按钮上的文字 |

### 表面色层级

| 层级 | Tailwind        | 用途          |
| ---- | --------------- | ------------- |
| 底层 | `bg-background` | 页面背景      |
| 卡片 | `bg-card`       | 卡片、对话框  |
| 悬浮 | `bg-muted`      | 菜单、Tooltip |
| 强调 | `bg-primary/10` | 选中态、高亮  |

## 二、排版系统

### 字号 Scale

| 级别    | 移动端 | 桌面端 | Tailwind                 | 使用场景     |
| ------- | ------ | ------ | ------------------------ | ------------ |
| Display | 28px   | 36px   | `text-2xl md:text-4xl`   | Me 页大标题  |
| H1      | 22px   | 28px   | `text-xl md:text-2xl`    | 页面主标题   |
| H2      | 18px   | 22px   | `text-lg md:text-xl`     | 区域标题     |
| H3      | 16px   | 18px   | `text-base md:text-lg`   | 卡片标题     |
| Body    | 14px   | 16px   | `text-sm md:text-base`   | 正文内容     |
| Caption | 12px   | 14px   | `text-xs md:text-sm`     | 时间戳、标签 |
| Micro   | 10px   | 12px   | `text-[10px] md:text-xs` | 徽章、状态   |

### 字重

| 字重           | Tailwind        | 使用场景             |
| -------------- | --------------- | -------------------- |
| Regular (400)  | `font-normal`   | 正文、描述           |
| Medium (500)   | `font-medium`   | 小标题、标签、导航项 |
| Semibold (600) | `font-semibold` | 卡片标题、按钮、价格 |
| Bold (700)     | `font-bold`     | 页面标题、重要数据   |

### 行高

| 内容类型     | Tailwind          | 值    |
| ------------ | ----------------- | ----- |
| 紧凑（标题） | `leading-tight`   | 1.25  |
| 正常（正文） | `leading-normal`  | 1.5   |
| 宽松（阅读） | `leading-relaxed` | 1.625 |

### 字体

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

## 三、间距系统

### 基础网格：8px

| Token | 值   | Tailwind         | 使用场景                           |
| ----- | ---- | ---------------- | ---------------------------------- |
| 0.5x  | 4px  | `1` (p-1, gap-1) | 最小间距、图标内边距               |
| 1x    | 8px  | `2` (p-2, gap-2) | 图标与文字间距                     |
| 1.5x  | 12px | `3` (p-3, gap-3) | **移动端卡片标准内边距**           |
| 2x    | 16px | `4` (p-4, gap-4) | **桌面端卡片标准内边距**、页面边距 |
| 3x    | 24px | `6` (p-6, gap-6) | 区域分隔                           |
| 4x    | 32px | `8` (p-8, gap-8) | 大区域分隔                         |
| 6x    | 48px | `12` (p-12)      | 页面区域间距                       |

### 响应式间距

| 场景         | 移动端 | 桌面端 | 写法                                 |
| ------------ | ------ | ------ | ------------------------------------ |
| 卡片内边距   | 12px   | 16px   | `p-3 md:p-4` 或 `p-responsive`       |
| 列表项间距   | 10px   | 12px   | `py-2.5 md:py-3`                     |
| 元素间距     | 12px   | 16px   | `gap-3 md:gap-4` 或 `gap-responsive` |
| 页面水平边距 | 16px   | 24px   | `px-4 md:px-6`                       |

## 四、圆角系统

| Token  | 值     | Tailwind       | 使用场景         |
| ------ | ------ | -------------- | ---------------- |
| Small  | 4px    | `rounded`      | 小标签、徽章     |
| Medium | 8px    | `rounded-lg`   | 输入框、按钮     |
| Large  | 12px   | `rounded-xl`   | 卡片、对话框     |
| XLarge | 16px   | `rounded-2xl`  | 大卡片、底部面板 |
| Full   | 9999px | `rounded-full` | 头像、图标按钮   |

**原则**：容器越大，圆角越大。

## 五、阴影/层级系统

| Elevation | Tailwind    | 使用场景                |
| --------- | ----------- | ----------------------- |
| Level 0   | 无阴影      | 内嵌元素、列表项        |
| Level 1   | `shadow-sm` | 卡片静止状态            |
| Level 2   | `shadow-md` | 浮动按钮、下拉菜单      |
| Level 3   | `shadow-lg` | 卡片 hover 状态、模态框 |
| Level 4   | `shadow-xl` | Toast、Tooltip          |

```tsx
// 桌面端卡片 hover 提升效果
<Card className="shadow-sm hover:shadow-lg transition-shadow duration-200">
```

## 六、图标尺寸

| 尺寸 | Tailwind            | 使用场景                 |
| ---- | ------------------- | ------------------------ |
| 16px | `w-4 h-4`           | 行内图标、输入框图标     |
| 20px | `w-5 h-5`           | 按钮图标、导航图标       |
| 24px | `w-6 h-6`           | 标准独立图标             |
| 32px | `w-8 h-8`           | 功能入口图标             |
| 44px | `w-11 h-11`         | 列表头像（最小触摸目标） |
| 60px | `w-[60px] h-[60px]` | 大头像                   |

**图标库**：Lucide React（`lucide-react`）

## 七、断点

| 名称    | 宽度      | Tailwind 前缀  | 场景           |
| ------- | --------- | -------------- | -------------- |
| Mobile  | < 768px   | （默认）       | 手机竖屏       |
| Tablet  | >= 768px  | `md:`          | 平板、手机横屏 |
| Desktop | >= 1024px | `lg:`          | 小型笔记本     |
| Large   | >= 1440px | `xl:` / `2xl:` | 大屏显示器     |

## 八、品牌区域渐变变量

Hero 等品牌展示区域使用专用 CSS 变量，每套主题有不同的配色：

| 变量                      | 用途               | Classic  | Crypto      | Business | Cyberpunk  | Nature    | Luxury     |
| ------------------------- | ------------------ | -------- | ----------- | -------- | ---------- | --------- | ---------- |
| `--hero-gradient-from`    | 渐变起始（深色）   | slate    | black       | slate    | zinc       | stone     | black      |
| `--hero-gradient-via`     | 渐变中间（主题色） | cyan     | green       | blue     | purple     | green     | amber      |
| `--hero-gradient-to`      | 渐变结束（深色）   | slate    | black       | slate    | zinc       | stone     | black      |
| `--hero-accent`           | 主强调色           | cyan-400 | green-400   | blue-400 | pink-400   | lime-400  | amber-400  |
| `--hero-accent-secondary` | 辅强调色           | teal-400 | emerald-400 | sky-400  | violet-400 | green-400 | yellow-400 |
| `--hero-glow`             | 光晕/阴影色        | cyan-500 | green-500   | blue-500 | pink-500   | lime-500  | amber-500  |

使用示例：

```tsx
// 渐变背景
<section className="bg-gradient-to-br from-[var(--hero-gradient-from)] via-[var(--hero-gradient-via)] to-[var(--hero-gradient-to)]">

// 渐变文字
<span className="bg-gradient-to-r from-[var(--hero-accent)] to-[var(--hero-accent-secondary)] bg-clip-text text-transparent">

// 光晕效果
<div className="bg-[var(--hero-glow)]/20 rounded-full blur-3xl" />
```

## 快速检查清单

- [ ] 颜色是否使用语义变量（而非硬编码）？
- [ ] 字号是否来自 Scale 表（而非随意值）？
- [ ] 间距是否遵循 8px 网格（4px 仅用于微调）？
- [ ] 圆角是否与容器大小匹配？
- [ ] 阴影层级是否正确（静止 sm、悬浮 lg）？
- [ ] 图标尺寸是否来自标准尺寸（16/20/24/32）？
- [ ] 响应式写法是否 mobile-first（`p-3 md:p-4`）？

## 相关功能文档

- **[主题系统](../../docs/features/theme-system.md)** — 6 种预设主题配置、CSS 变量完整列表、亮暗模式切换、防闪烁处理
