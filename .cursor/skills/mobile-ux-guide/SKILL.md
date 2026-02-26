---
name: mobile-ux-guide
description: Apply Mobazha mobile UX standards including font sizes, spacing, touch targets, and interaction patterns from original mobazha-mobile. Use when creating or modifying mobile-responsive components, or when the user asks about mobile layout, spacing, touch behavior, "移动端", "手机端", "触摸", "间距".
---

# Mobile UX Guide

Ensure mobazha-unified mobile experience matches original mobazha-mobile.

## Quick Reference

### Font Sizes

| Element     | Original RN | Tailwind      | Usage                |
| ----------- | ----------- | ------------- | -------------------- |
| Large title | 28px        | `text-2xl`    | Me page header       |
| Page title  | 17-18px     | `text-lg`     | Standard page titles |
| Card title  | 15-16px     | `text-base`   | List items, cards    |
| Body text   | 14-15px     | `text-sm`     | Main content         |
| Secondary   | 12-13px     | `text-xs`     | Timestamps, hints    |
| Small label | 10px        | `text-[10px]` | Badges, status       |

### Spacing (4px grid)

| Value | Tailwind      | Usage                     |
| ----- | ------------- | ------------------------- |
| 4px   | `gap-1`/`p-1` | Minimal, icon padding     |
| 8px   | `gap-2`/`p-2` | Icon-text gap             |
| 12px  | `gap-3`/`p-3` | **Standard card padding** |
| 16px  | `gap-4`/`p-4` | Page margin, section gap  |
| 24px  | `gap-6`/`p-6` | Section separator         |

### Component Sizes

| Component              | Size    | Tailwind            |
| ---------------------- | ------- | ------------------- |
| List avatar            | 44x44px | `w-11 h-11`         |
| Profile avatar (large) | 60x60px | `w-[60px] h-[60px]` |
| Icon button            | 32x32px | `w-8 h-8`           |
| Touch target min       | 44x44pt | `min-h-11 min-w-11` |
| List item height       | 48-56px | `h-12`/`h-14`       |

### Responsive Pattern

```tsx
// Mobile compact, desktop normal
<Card className="p-3 md:p-4">
  <h2 className="text-base md:text-lg">Title</h2>
  <p className="text-sm md:text-base">Content</p>
</Card>
```

## Mobile Footer 规范

移动端不显示桌面 Footer，底部导航由 MobileNav 提供：

```tsx
// Footer.tsx
<footer className="hidden md:block ...">
  {/* 仅桌面端显示 */}
</footer>

// MobileNav.tsx — 移动端底部导航栏
<nav className="fixed bottom-0 md:hidden ...">
  {/* Home, Search, Cart, Profile */}
</nav>
```

主内容区需要底部留白避免被 MobileNav 遮挡：`pb-24 lg:pb-8`

## Mobile Checklist

- [ ] Page title `text-lg`, not `text-xl`+
- [ ] Body text `text-sm`, not `text-base`
- [ ] Card padding `p-3`, not `p-4`+
- [ ] List item padding `py-2.5`/`py-3`, not `py-4`
- [ ] All touch targets min 44px
- [ ] Clickable elements have `active:` feedback
- [ ] Product grid uses 2-column layout
- [ ] No desktop Footer on mobile (`hidden md:block`)
- [ ] Content has `pb-24 lg:pb-8` to clear MobileNav

## 移动端视觉测试

移动端有专门的 Playwright 视觉回归测试：

| 文件                          | 设备                    |
| ----------------------------- | ----------------------- |
| `e2e/mobile-visual.spec.ts`   | Pixel 5 (Mobile Chrome) |
| `e2e/mobile-ux-audit.spec.ts` | iPhone 12 (390×844)     |

更新快照：`pnpm --filter @mobazha/web exec playwright test mobile-visual --update-snapshots --project="Mobile Chrome"`

For detailed interaction patterns and animations, see [reference.md](reference.md).
