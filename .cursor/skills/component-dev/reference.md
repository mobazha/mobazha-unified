# Component Development Detailed Reference

## Spacing Standards

### Card Padding

| Element        | Min Padding       | Tailwind      |
| -------------- | ----------------- | ------------- |
| Card container | 16px              | `p-4`         |
| Complex card   | 20-24px           | `p-5`/`p-6`   |
| List item      | 12-16px           | `p-3`/`p-4`   |
| Button padding | 8-12px horizontal | `px-3`/`px-4` |

### Element Spacing

| Scenario      | Min Gap | Tailwind                |
| ------------- | ------- | ----------------------- |
| Icon & text   | 8px     | `gap-2`                 |
| Button group  | 8-12px  | `gap-2`/`gap-3`         |
| Form elements | 16px    | `space-y-4`             |
| Sections      | 16-24px | `space-y-4`/`space-y-6` |

### Safe Distances

| Element Type           | Min Distance from Edge |
| ---------------------- | ---------------------- |
| Text content           | 16px                   |
| Icons/buttons          | 12px                   |
| Checkboxes/interactive | 16px                   |

### Spacing Examples

```tsx
// ✅ Good — card with adequate padding
<div className="rounded-lg border p-4">
  <div className="flex items-center gap-2">
    <Icon />
    <span>Text content</span>
  </div>
</div>

// ✅ Good — list with proper spacing
<div className="space-y-4">
  <ListItem className="p-4" />
  <ListItem className="p-4" />
</div>

// ❌ Bad — padding too small
<div className="rounded-lg border p-1">...</div>

// ❌ Bad — missing element gap
<div className="flex items-center">
  <Icon /><span>Text</span>  {/* needs gap-2 */}
</div>
```

## Responsive Design

### Use Tailwind responsive classes

```tsx
// ✅ Good
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">

// ❌ Bad — hardcoded
<div style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
```

### Use useBreakpoint hook

```tsx
import { useBreakpoint } from '@mobazha/ui/hooks';

function ResponsiveComponent() {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  if (isMobile) return <MobileLayout />;
  return <DesktopLayout />;
}
```

## Performance

### memo

```tsx
export const ProductCard = memo(function ProductCard(props) {
  // ...
});
```

### useCallback

```tsx
const handleClick = useCallback(
  (id: string) => {
    // ...
  },
  [dependency]
);
```

### Avoid inline objects

```tsx
// ❌ Creates new object every render
<Component style={{ color: 'red' }} />

// ✅ Use className or useMemo
<Component className="text-red-500" />
```

## Accessibility

```tsx
// Clickable elements
<button aria-label="Add to cart">
<a href="#" aria-label="View product">

// Images
<img alt="Product thumbnail" />

// Forms
<input aria-label="Search" />
<label htmlFor="email">Email</label>
```

## Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from './ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    title: 'Test Product',
    price: 99.99,
  };

  it('renders product info', () => {
    render(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ProductCard product={mockProduct} onClick={onClick} />);
    fireEvent.click(screen.getByTestId('product-card'));
    expect(onClick).toHaveBeenCalledWith(mockProduct);
  });
});
```

## Interaction Feedback Utility Classes

```tsx
// Touch feedback — slight shrink on press
<button className="touch-feedback">Click me</button>

// List item touch feedback — bg change
<div className="touch-feedback-bg">List item</div>

// Hover lift (desktop)
<Card className="hover-lift">Card</Card>

// Hover highlight (desktop)
<div className="hover-highlight">List item</div>
```

## Mobile Compact Mode

```tsx
// ✅ Mobile compact
<Card className="p-3">
  <h2 className="text-base font-semibold">
  <p className="text-sm">
  <span className="text-xs text-muted-foreground">
</Card>

// ✅ Responsive — mobile compact, desktop normal
<Card className="p-3 md:p-4">
  <h2 className="text-base md:text-lg">
  <p className="text-sm md:text-base">
</Card>
```

## Design Tokens

Use Tailwind design tokens, never hardcode:

```tsx
// ✅ Use tokens
<div className="text-primary bg-background">

// ❌ Hardcoded
<div style={{ color: '#00BCD4' }}>
```

## cn() Utility

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'base-styles',
  isActive && 'active-styles',
  className
)}>
```
