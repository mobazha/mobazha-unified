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

For detailed patterns (context menu, drag-and-drop, batch operations, shortcuts), see [reference.md](reference.md).
