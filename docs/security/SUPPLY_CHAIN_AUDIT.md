# Community Edition Supply-Chain Audit

Audit date: 2026-06-28

This audit covers the exact dependency graph resolved from `pnpm-lock.yaml` with pnpm 9.15.4. It is a source-release gate; redistributors of built applications must also preserve the notices and license texts required by the dependencies actually included in their artifacts.

## Result

- 955 installed package instances were classified into 24 license expressions.
- Two packages reported `Unknown` package metadata. Their shipped license files were reviewed and recorded in `config/editions/license-conclusions.json`:
  - `eyes@0.1.8`: MIT
  - `text-encoding-utf-8@1.0.2`: Unlicense
- Reown AppKit 1.8.15 and WalletConnect 2.23.0 packages were removed from the Community Edition dependency graph because their shipped Community License terms are outside the intended open-source dependency boundary.
- The historical AppKit provider source remains for reference but is excluded from the Community Edition TypeScript and production import graphs.
- Next.js was raised to 16.2.6 and React Router to 7.15.0. Targeted pnpm overrides pin vulnerable `ws` 7.x/8.x transitive paths to 7.5.11/8.21.0 without widening unrelated peer ranges.
- `pnpm audit --prod --audit-level high` passes with no High or Critical findings. Remaining Low/Moderate findings must continue to be reviewed during routine dependency updates.

No unresolved dependency-license metadata remains after applying the two exact-version conclusions above.

## Copyleft and choice-of-license dependencies

- `@img/sharp-libvips-darwin-arm64` declares LGPL-3.0-or-later. It is a platform package used by the image tooling stack; binary redistributors must retain its notices and comply with the applicable LGPL terms.
- `rpc-websockets@9.3.2` declares LGPL-3.0-only and is retained through dormant Solana compatibility dependencies. It is not registered by Community Edition payment providers or executors.
- Packages declaring a permissive alternative, such as `MIT OR GPL-3.0-or-later`, `BSD-3-Clause OR GPL-2.0`, or `MPL-2.0 OR Apache-2.0`, are consumed under the applicable permissive alternative.
- MPL-2.0 dependencies remain under their own file-level terms and are compatible with this repository's MPL-2.0 source release.

## Reproduction

```bash
pnpm install --frozen-lockfile
pnpm licenses list --json
pnpm typecheck
pnpm --filter @mobazha/core test
pnpm --filter @mobazha/web build
pnpm --filter @mobazha/web build:next
pnpm audit --prod --audit-level high
```

Production bundle checks must additionally confirm that external wallet initializers, non-UTXO payment executors, and fiat checkout SDK initializers are absent from Community Edition output.
