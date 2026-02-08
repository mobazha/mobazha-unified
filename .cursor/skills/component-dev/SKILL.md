---
name: component-dev
description: Create and modify UI components following Mobazha conventions including directory structure, spacing standards, accessibility, and testing. Use when building new components, reviewing component code, or when the user asks about component patterns, spacing, accessibility, "组件开发", "创建组件", "间距规范", "无障碍".
---

# Component Development Guide

## UI Component Libraries

| Scenario                                | Use                           |
| --------------------------------------- | ----------------------------- |
| Form controls (Input, Select, Switch)   | `@/components/ui` (shadcn/ui) |
| Dialogs (Dialog, AlertDialog)           | `@/components/ui` (shadcn/ui) |
| Toast notifications                     | `@/components/ui` (shadcn/ui) |
| Business cards (ProductCard, OrderCard) | `@mobazha/ui`                 |
| Layout (Container, Grid)                | `@mobazha/ui`                 |

## Directory Structure

```
packages/ui/components/
├── ProductCard/
│   ├── index.tsx           # Export
│   ├── ProductCard.tsx     # Main component
│   ├── ProductCard.test.tsx # Tests
│   └── types.ts            # Types (optional)
```

## Component Template

```tsx
'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';

export interface ProductCardProps {
  /** Product data */
  product: Product;
  /** Click callback */
  onClick?: (product: Product) => void;
  /** Custom styles */
  className?: string;
}

export const ProductCard = memo(function ProductCard({
  product,
  onClick,
  className,
}: ProductCardProps) {
  return (
    <article
      className={cn('rounded-lg border p-4', className)}
      onClick={() => onClick?.(product)}
      data-testid="product-card"
    >
      {/* content */}
    </article>
  );
});
```

## Quick Checklist

- [ ] Use `memo` for components receiving object props
- [ ] Use `useCallback` for callbacks passed to children
- [ ] Use `cn()` for merging class names
- [ ] Use design tokens, not hardcoded colors
- [ ] All clickable elements have `aria-label`
- [ ] Images have `alt` attribute
- [ ] Form inputs have `aria-label` or `<label>`
- [ ] Add `data-testid` for E2E testing

For detailed spacing tables, testing examples, and interaction patterns, see [reference.md](reference.md).

## 相关功能文档

- **[UI 组件](../../docs/features/ui-components.md)** — shadcn/ui 组件清单、自定义组件、导入路径
- **[商品模块](../../docs/features/listing-module.md)** — TokenInput 组件设计、表单区块组件架构
- **[配送档案](../../docs/features/shipping-profiles.md)** — 配送组件清单（12 个组件）、UI 交互设计
