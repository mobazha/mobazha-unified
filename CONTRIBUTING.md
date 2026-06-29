# Contributing to Mobazha Unified

Thank you for helping improve the shared Mobazha storefront and seller-admin frontend.

## Before you start

- Use GitHub Issues or Discussions for proposals and user questions.
- Open an issue before large architecture, payment, security, or public API changes.
- Do not include credentials, private endpoints, customer data, proprietary code, or generated secrets.
- Report vulnerabilities privately according to `SECURITY.md`.

## Runtime capability boundary

The same `main` branch supports Community Edition and other backend deployments. The backend runtime capability response is authoritative. Frontend code may narrow the advertised set for safety or session validity, but it must never invent or enable a payment method the backend did not advertise.

A new default Community Edition payment capability requires an accepted design decision, backend capability-manifest change, threat review, negative tests, and an explicit license decision.

## Development workflow

1. Create a focused branch from `main`.
2. Add or update tests with the implementation.
3. Run:

   ```bash
   corepack pnpm install --frozen-lockfile
   corepack pnpm typecheck
   corepack pnpm --filter @mobazha/core test:unit
   corepack pnpm --filter @mobazha/web build
   corepack pnpm --filter @mobazha/web build:next
   ```

4. Keep Vite and Next.js behavior equivalent.
5. Update public documentation when behavior, API contracts, configuration, security assumptions, or runtime capability handling changes.

## Developer Certificate of Origin

Every commit must be signed off to certify the Developer Certificate of Origin in `DCO.md`:

```bash
git commit -s -m "fix(scope): concise description"
```

The sign-off must use a name and email address you are authorized to contribute under.

## Review expectations

Maintainers review correctness, accessibility, responsive behavior, tests, compatibility, security boundaries, dependency licensing, and documentation. UI changes should include desktop and mobile evidence where practical.
