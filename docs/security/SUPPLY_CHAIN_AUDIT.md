# Supply-Chain Audit

Audit date: 2026-07-01

This audit covers the exact production dependency graph resolved from
`pnpm-lock.yaml` with pnpm 9.15.4. It is a source-release gate; distributors of
built applications must also preserve notices and license texts required by the
dependencies included in their artifacts.

## Result

- `pnpm licenses list --prod --json` reports 352 installed production paths,
  325 package/license records and 19 license expressions.
- Two packages report `Unknown` package metadata. Their shipped license files
  are reviewed in `config/editions/license-conclusions.json`:
  - `eyes@0.1.8`: MIT
  - `text-encoding-utf-8@1.0.2`: Unlicense
- Reown AppKit and WalletConnect packages are absent from the dependency graph.
  The frontend uses browser-injected provider standards instead.
- The resolved security baseline is Next.js 16.2.9, React Router 7.18.0,
  Vite 7.3.6, Vitest 3.2.6, Rollup 4.59.0 and `ws` 7.5.11/8.21.0.
- `pnpm audit --prod --audit-level=high` reports no High or Critical
  production advisory. The complete development graph also reports no High or
  Critical advisory after applying exact patched-version overrides; its
  remaining findings are 5 Low and 24 Moderate.

No unresolved dependency-license metadata remains after applying the recorded
exact-version conclusions.

## Connector license boundary

Reown AppKit 1.8.15 was evaluated and intentionally excluded from the public
core. Its package is distributed under the Reown Community License Agreement,
which includes network-use, attribution, redistribution and commercial-threshold
conditions rather than an OSI open-source license. A future connector may be
offered as a separately reviewed optional plugin; it must not silently enter the
MPL core dependency or production bundle.

## Copyleft and choice-of-license dependencies

- `@img/sharp-libvips-darwin-arm64` declares LGPL-3.0-or-later. Binary
  distributors must retain its notices and comply with the applicable LGPL terms.
- `openpgp@6.3.0` declares LGPL-3.0-or-later and is dynamically loaded for
  end-to-end encrypted address payloads.
- `rpc-websockets@9.3.2` declares LGPL-3.0-only and is retained through Solana
  compatibility dependencies.
- Release archives and container images include `THIRD_PARTY_NOTICES.md` plus
  the resolved dependency license texts under `third-party-licenses/`.
- Packages declaring a permissive alternative are consumed under the applicable
  permissive alternative.
- MPL-2.0 dependencies remain under their own file-level terms and are compatible
  with this repository's MPL-2.0 source release.

## Reproduction

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm licenses list --prod --json
corepack pnpm typecheck
corepack pnpm --filter @mobazha/core test
corepack pnpm --filter @mobazha/web build
corepack pnpm --filter @mobazha/web build:next
corepack pnpm audit --prod --audit-level=high
corepack pnpm audit --audit-level=high
```

Production bundle checks must additionally confirm that unapproved wallet SDKs
and provider-specific private settlement implementations are absent.
