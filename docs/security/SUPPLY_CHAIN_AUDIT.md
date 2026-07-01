# Community Edition Supply-Chain Audit

Audit date: 2026-06-28

This audit covers the exact dependency graph resolved from `pnpm-lock.yaml` with pnpm 9.15.4. It is a source-release gate; redistributors of built applications must also preserve the notices and license texts required by the dependencies actually included in their artifacts.

## Result

- `pnpm licenses list --prod --json` reports 352 installed production paths,
  325 package/license records, and 19 license expressions.
- Two packages reported `Unknown` package metadata. Their shipped license files were reviewed and recorded in `config/editions/license-conclusions.json`:
  - `eyes@0.1.8`: MIT
  - `text-encoding-utf-8@1.0.2`: Unlicense
- Reown AppKit and WalletConnect packages were removed from the Community Edition dependency graph because their shipped license terms are outside the intended open-source dependency boundary.
- The historical AppKit provider source remains for reference but is excluded from the Community Edition TypeScript and production import graphs.
- Residual `@solana/web3.js`, `ethers`, and `viem` dependencies keep dormant compatibility source type-checkable. They are not registered by Community Edition payment providers or executors.
- The resolved security baseline is Next.js 16.2.9, React Router 7.15.0,
  `ws` 7.5.11/8.21.0. `pnpm audit --prod --audit-level high` reports
  no High or Critical findings (4 Low and 17 Moderate remain for routine review).

No unresolved dependency-license metadata remains after applying the exact-version conclusions above.

## Copyleft and choice-of-license dependencies

- `@img/sharp-libvips-darwin-arm64` declares LGPL-3.0-or-later. Binary redistributors must retain its notices and comply with the applicable LGPL terms.
- `rpc-websockets@9.3.2` declares LGPL-3.0-only and is retained through dormant Solana compatibility dependencies. It is not registered by Community Edition payment providers or executors.
- Packages declaring a permissive alternative remain consumed under the applicable permissive alternative.
- MPL-2.0 dependencies remain under their own file-level terms and are compatible with this repository's MPL-2.0 source release.

## Reproduction

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm --filter @mobazha/core test
pnpm --filter @mobazha/web build
pnpm --filter @mobazha/web build:next
pnpm audit --prod --audit-level high
```

Production bundle checks must additionally confirm that external wallet initializers,
non-UTXO payment executors, commercial/private checkout SDK initializers, and private
settlement-provider routes are absent from Community Edition JavaScript output.
