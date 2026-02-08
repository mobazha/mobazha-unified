---
name: desktop-ux-guide
description: Apply Mobazha desktop UX standards including hover states, keyboard navigation, information density, and desktop-specific features. Use when creating or modifying desktop UI, or when the user asks about hover effects, keyboard navigation, desktop layout, "桌面端", "悬停效果", "键盘导航", "信息密度".
---

# Desktop UX Guide

Ensure mobazha-unified desktop experience is high-quality and takes advantage of large screens.

## Quick Reference: Hover Effects

| Element          | Hover Effect      | Tailwind                                 |
| ---------------- | ----------------- | ---------------------------------------- |
| Card             | Shadow + lift     | `hover:shadow-lg hover:-translate-y-0.5` |
| Primary button   | Darker bg         | `hover:bg-primary/90`                    |
| Secondary button | Bg appears        | `hover:bg-muted`                         |
| Link             | Color + underline | `hover:text-primary hover:underline`     |
| List item        | Bg appears        | `hover:bg-muted/50`                      |
| Image            | Scale             | `hover:scale-105`                        |
| Icon button      | Bg circle         | `hover:bg-muted rounded-full`            |

All hover effects need `transition-all duration-200` or `transition-colors`.

## Keyboard Navigation

- All interactive elements must be Tab-focusable
- Visible focus state: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
- Enter/Space triggers click
- Escape closes modals/dropdowns
- Arrow keys navigate lists

## Information Density

| Scenario     | Mobile              | Desktop                        |
| ------------ | ------------------- | ------------------------------ |
| Product grid | 2 cols              | 4-5 cols                       |
| List display | Card list           | Table or compact list          |
| Navigation   | Bottom tab / drawer | Sidebar (persistent)           |
| Detail page  | Single column       | Left-right split               |
| Chat         | Full screen         | Left list + right conversation |
| Forms        | Single column       | Multi-column grid              |

## Data Display Standards

### Table vs Card List

| 数据特征                       | 推荐展示  | 说明                   |
| ------------------------------ | --------- | ---------------------- |
| 多字段结构化数据（订单、交易） | Table     | 支持排序、筛选、列对齐 |
| 视觉导向数据（商品、店铺）     | Card Grid | 图片为主、信息摘要     |
| 简单列表（通知、消息）         | List      | 单列紧凑布局           |

### Table 交互标准

- 表头可点击排序，显示排序方向箭头（`ChevronUp`/`ChevronDown`）
- 支持列筛选（Popover 筛选面板）
- 行 hover 效果：`hover:bg-muted/30`
- 分页控件放在表格底部，显示总条数和当前页

### Infinite Scroll vs Pagination

| 场景               | 推荐                    | 原因                           |
| ------------------ | ----------------------- | ------------------------------ |
| 商品浏览、Feed 流  | Infinite Scroll         | 探索性浏览，流畅体验           |
| 订单列表、交易历史 | Pagination              | 需要定位特定记录，需要页码引用 |
| 搜索结果           | Pagination              | 用户需要知道总量和进度         |
| 聊天消息           | Infinite Scroll（向上） | 按时间线浏览                   |

### Sidebar Behavior

- `lg:` 以上：侧边栏固定可见（`hidden lg:block w-64`）
- `md:` - `lg:`：可折叠侧边栏（图标模式 `w-16`，悬停展开）
- `< md:`：隐藏侧边栏，使用 Sheet/Drawer 替代

## Desktop Checklist

- [ ] All cards have hover shadow effect
- [ ] All buttons have hover bg change
- [ ] All links have hover color/underline
- [ ] List items have hover bg feedback
- [ ] All interactive elements Tab-focusable
- [ ] Focus state visible (`focus-visible:ring-2`)
- [ ] Grid layout 4+ columns on desktop
- [ ] Complex data uses tables (not card lists)
- [ ] Sidebar navigation persistent on desktop
- [ ] Important elements have Tooltips
- [ ] Custom scrollbar styling
- [ ] Tables have sort/filter indicators
- [ ] Pagination or infinite scroll appropriate for context

For detailed patterns (context menu, drag-and-drop, batch operations, shortcuts), see [reference.md](reference.md).
