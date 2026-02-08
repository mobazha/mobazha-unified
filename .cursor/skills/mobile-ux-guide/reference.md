# Mobile UX Detailed Reference

## Animation Specs

| Interaction     | Duration | Tailwind       |
| --------------- | -------- | -------------- |
| Toggle switch   | 250ms    | `duration-250` |
| Panel slide     | 200ms    | `duration-200` |
| List item tap   | 150ms    | `duration-150` |
| Page transition | 300ms    | `duration-300` |
| Color/opacity   | 200ms    | `duration-200` |

CSS variables:

```css
:root {
  --animation-duration-fast: 200ms;
  --animation-duration-normal: 250ms;
  --animation-duration-slow: 300ms;
  --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## Touch Feedback

```tsx
// Tap feedback — slight scale + opacity
<button className="active:scale-[0.98] active:opacity-80 transition-all duration-150">
  Button
</button>

// Or use utility class
<button className="touch-feedback">Button</button>

// List item tap
<div className="active:bg-muted/50 transition-colors duration-150">
  List item
</div>

// Background touch feedback
<div className="touch-feedback-bg">List item</div>
```

## Long Press (计划中 — 尚未实现)

> **注意**：`useLongPress` hook 尚未在项目中实现。以下为计划中的 API 设计，请勿在代码中引用。

```tsx
// 计划中的 API（未实现）
import { useLongPress } from '@/hooks/useLongPress';

function Component() {
  const longPressProps = useLongPress(
    () => {
      // long press callback
    },
    { delay: 500 }
  );

  return <div {...longPressProps}>Long press me</div>;
}
```

## Swipe Gestures (计划中 — 尚未实现)

> **注意**：项目尚未封装 Swipe 手势 hook。以下为原生实现参考，实际使用时建议先封装为 `useSwipe` hook。

```tsx
// 参考实现（建议封装后再使用）
const handleTouchStart = e => {
  setStartX(e.touches[0].clientX);
};

const handleTouchMove = e => {
  const diff = startX - e.touches[0].clientX;
  if (Math.abs(diff) > 50) {
    // trigger swipe action
  }
};
```

## Loading States

```tsx
// Skeleton
<Skeleton className="h-11 w-11 rounded-full" />  {/* avatar */}
<Skeleton className="h-4 w-3/4" />               {/* text */}

// Button loading
<Button disabled className="opacity-70">
  <Spinner className="w-4 h-4 mr-2" />
  Loading...
</Button>
```

## ProductCard Sizing

Original calculation:

```javascript
// Standard mode
width: SCREEN_WIDTH * 0.47; // ~47% screen width
height: SCREEN_WIDTH * 0.65; // ~65% screen width

// Compact mode
width: (SCREEN_WIDTH - 32) * 0.31;
height: SCREEN_WIDTH * 0.38;
```

Web implementation:

```tsx
<div className="grid grid-cols-2 gap-3">
  <ProductCard compact />
</div>
```

## Round Corners

| Size   | Value | Tailwind      |
| ------ | ----- | ------------- |
| Small  | 8px   | `rounded-lg`  |
| Medium | 12px  | `rounded-xl`  |
| Large  | 16px  | `rounded-2xl` |

## Common Fixes

### List item too tall

```tsx
// ❌ <div className="py-4 px-4">
// ✅ <div className="py-2.5 px-4">
```

### Card padding too large

```tsx
// ❌ <Card className="p-4 space-y-4">
// ✅ <Card className="p-3 space-y-3">
```

### Font too large

```tsx
// ❌ <h2 className="text-xl font-semibold">
// ✅ <h2 className="text-base font-semibold">
```

### Missing touch feedback

```tsx
// ❌ <button onClick={handleClick}>Click</button>
// ✅ <button onClick={handleClick} className="active:scale-[0.98] active:opacity-80 transition-all duration-150">Click</button>
```

## Responsive Adaptation

Mobile-first, desktop-enhanced:

```tsx
// Font: mobile small, desktop normal
<h1 className="text-lg md:text-xl">Title</h1>
<p className="text-sm md:text-base">Content</p>

// Spacing: mobile compact, desktop relaxed
<Card className="p-3 md:p-4">

// Grid: mobile 2 cols, desktop 4+ cols
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
```

## Utility Classes (defined in globals.css)

```tsx
// Touch feedback
<button className="touch-feedback">Click me</button>
<div className="touch-feedback-bg">List item</div>

// Touch target
<button className="touch-target">Button</button>
<a className="touch-target-inline">Link</a>

// Responsive padding
<div className="p-responsive">...</div>      {/* 12px mobile, 16px desktop */}
<div className="gap-responsive">...</div>    {/* 12px mobile, 16px desktop */}

// Responsive font
<p className="text-responsive">...</p>       {/* 14px mobile, 16px desktop */}
<span className="text-responsive-sm">...</span> {/* 12px mobile, 14px desktop */}

// Animations
<div className="animate-fade-in">...</div>
<div className="animate-slide-up">...</div>
<div className="animate-slide-in-right">...</div>
<div className="animate-scale-in">...</div>
```
