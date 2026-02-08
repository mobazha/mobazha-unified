---
name: code-simplifier
description: Simplify and refine recently written code for clarity, consistency, and maintainability while preserving all functionality. Use after completing a coding task, fixing a bug, or when the user asks to "simplify", "clean up", "refine", "简化代码", "清理代码", "优化代码", "精简", "重构".
---

# Code Simplifier

对最近修改的代码进行精简优化，提升清晰度和可维护性，不改变行为。

## 适用场景

- 实现新功能后
- 修复 bug 后（特别是添加了多层条件判断时）
- 重构或性能优化后
- 用户要求"简化"、"清理"、"优化"代码时

## Simplification Rules

### DO

- Reduce unnecessary complexity and nesting
- Eliminate redundant code and abstractions
- Improve variable and function names for clarity
- Consolidate related logic
- Remove obvious comments that describe what code does
- Use early returns to reduce nesting
- Extract repeated patterns into shared utilities

### DON'T

- Change what the code does — only how it does it
- Use nested ternary operators — prefer `if/else` or `switch`
- Prioritize fewer lines over readability
- Create overly clever solutions hard to understand
- Combine too many concerns into single functions
- Remove helpful abstractions that improve organization

## Process

1. Identify recently modified code sections (via `git diff` or user specification)
2. Analyze for simplification opportunities
3. Apply project conventions from `.cursor/rules/`
4. Verify all functionality remains unchanged
5. Run `pnpm validate:quick` to confirm no regressions

## Architecture Check

After simplifying, verify code still follows project architecture:

- Types in `@mobazha/core/types/`, not in `apps/`
- Transform functions in `@mobazha/core/utils/`, not duplicated
- Components use hooks for data, not direct API calls
- No duplicate business logic across files

## Example

```typescript
// ❌ Before: nested, hard to follow
function getStatus(order) {
  if (order) {
    if (order.state === 'PENDING') {
      if (order.funded) {
        return 'funded';
      } else {
        return 'awaiting_payment';
      }
    } else if (order.state === 'FULFILLED') {
      return 'shipped';
    } else {
      return 'unknown';
    }
  }
  return 'not_found';
}

// ✅ After: early returns, flat structure
function getStatus(order) {
  if (!order) return 'not_found';

  switch (order.state) {
    case 'PENDING':
      return order.funded ? 'funded' : 'awaiting_payment';
    case 'FULFILLED':
      return 'shipped';
    default:
      return 'unknown';
  }
}
```
