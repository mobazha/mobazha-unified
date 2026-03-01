# Code Review Detailed Checklist

## Architecture Consistency (20%)

- [ ] No business types in `apps/` (`interface`/`type`, except Props) → move to `@mobazha/core/types/`
- [ ] No `transform*` or `map*` functions in `apps/` → move to `@mobazha/core/utils/transforms/`
- [ ] Components don't call `xxxApi.*` directly → use hooks
- [ ] No duplicate logic across files → consolidate in core
- [ ] Context (e.g. `viewingContext`) properly passed through components

```typescript
// ❌ Wrong
// apps/web/src/components/Order/OrderDetailDesktop.tsx (M5-2 前为 OrderDetailModal.tsx)
interface DisplayOrder { ... }  // should be in @mobazha/core/types/
function transformCoreOrder() { ... }  // should be in @mobazha/core/utils/
const order = await ordersApi.getOrder(id);  // should use hooks

// ✅ Correct
import { DisplayOrder, transformCoreOrder } from '@mobazha/core';
const { displayOrder } = useOrderDetail(orderId, viewingContext);
```

## React/Hooks (15%)

- [ ] No memory leaks — `useEffect` has cleanup when subscribing
- [ ] Dependency arrays are complete
- [ ] No unnecessary re-renders — use `useCallback` for callbacks passed to children
- [ ] No `console.log` debug code left behind

```typescript
// ❌ Memory leak
useEffect(() => {
  const subscription = subscribe();
  // missing: return () => subscription.unsubscribe();
}, []);

// ❌ Incomplete deps
useEffect(() => {
  fetchData(userId); // userId not in deps
}, []);
```

## TypeScript (15%)

- [ ] No `any` type — use `unknown` + type guards
- [ ] All functions have parameter and return types
- [ ] Use `interface` for object types, `type` for unions
- [ ] Use `import type` for type-only imports

## Responsive & Spacing (10%)

- [ ] No hardcoded sizes (use responsive values)
- [ ] Cards have adequate padding (at least `p-4` desktop, `p-3` mobile)
- [ ] Icons and text have proper spacing (`gap-2`)
- [ ] Content doesn't touch card boundaries
- [ ] Interactive elements meet 44px touch target

## Currency Formatting (included in Architecture 20%)

- [ ] No hardcoded currency symbols (`$`, `€`, `¥`)
- [ ] No local `formatPrice`/`formatFiatAmount` functions in `apps/`
- [ ] No manual `Math.pow(10, divisibility)` unit conversion
- [ ] No `.toFixed(2)` for price display
- [ ] Uses `useCurrency()` hook from `@mobazha/core`

## Theme Colors (included in Code Quality 20%)

- [ ] No hardcoded colors (`text-slate-*`, `bg-gray-*`, `text-emerald-*`)
- [ ] Uses theme variables (`text-foreground`, `bg-background`, `text-primary`)
- [ ] Warning/alert boxes have dark mode variants

## Migration Consistency (10%)

- [ ] Feature aligned with original RN implementation
- [ ] API call parameters match
- [ ] State management logic matches
- [ ] Error handling approach matches
