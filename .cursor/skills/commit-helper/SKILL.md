---
name: commit-helper
description: Generate commit messages and run pre-commit validation following Mobazha conventions. Use when committing code, writing commit messages, running pre-commit checks, or when the user says "commit", "提交", "提交代码", "validate", "验证", "检查".
---

# Commit Helper

## Pre-Commit Validation

**Recommended**: Use the unified validation commands:

```bash
# Quick validation (lint + tsc for all packages)
pnpm validate:quick

# Full validation (lint + tsc + test + build)
pnpm validate
```

For individual package checks:

```bash
# Core package only
pnpm --filter @mobazha/core lint
cd packages/core && pnpm exec tsc --noEmit

# Full build (catches import/export/routing issues)
pnpm build
```

## Commit Message Format

```
<type>(<scope>): <subject>

[optional body]
[optional footer]
```

### Types

| Type       | Description           | Example                                       |
| ---------- | --------------------- | --------------------------------------------- |
| `feat`     | New feature           | `feat(core): add useProducts hook`            |
| `refactor` | Refactoring/migration | `refactor(core): migrate matrixService to TS` |
| `fix`      | Bug fix               | `fix(ui): ProductCard responsive layout`      |
| `test`     | Tests                 | `test(core): add useProducts unit tests`      |
| `docs`     | Documentation         | `docs(features): add product list spec`       |
| `chore`    | Config/build          | `chore: setup eslint rules`                   |
| `style`    | Formatting            | `style(ui): format with prettier`             |
| `perf`     | Performance           | `perf(core): optimize product query`          |

### Scopes

| Scope     | Directory                      |
| --------- | ------------------------------ |
| `core`    | packages/core                  |
| `ui`      | packages/ui                    |
| `web`     | apps/web                       |
| `config`  | packages/config or root config |
| `scripts` | tools/scripts                  |
| `docs`    | docs/                          |

## Commit Granularity

**Principle**: Each commit focuses on a single responsibility.

```
# ✅ Good sequence
feat(core): add Product type definition
feat(core): add useProducts hook skeleton
feat(core): implement useProducts fetch logic
test(core): add useProducts unit tests

# ❌ Bad
feat: add product feature    # too broad
fix stuff                     # no info
WIP                           # meaningless
```

## Workflow

```bash
# 1. Quick validate
pnpm validate:quick

# 2. Stage changes
git add .

# 3. Commit
git commit -m "feat(core): add useProducts hook"
```

## After Modifying packages/core

Rebuild the core package:

```bash
pnpm --filter @mobazha/core build
```

Then restart the web dev server.

## Next.js Cache Issues

When encountering module export errors but files exist:

```bash
cd apps/web && rm -rf .next && pnpm dev
```
