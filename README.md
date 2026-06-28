# Mobazha Unified — Community Edition

Self-hostable storefront and seller admin frontend for the Mobazha Community Edition node.

**Status:** Community Edition candidate (2026-04-23 anchor). Not a production release.

**License:** [Mozilla Public License 2.0](./LICENSE) (MPL-2.0)

## Scope

Community Edition exposes exactly four UTXO payment rails:

| Chain | Rail                                          |
| ----- | --------------------------------------------- |
| BTC   | UTXO transparent                              |
| BCH   | UTXO transparent                              |
| LTC   | UTXO transparent                              |
| ZEC   | UTXO transparent (transparent addresses only) |

Guest checkout is enabled only when all selected payment methods fall within this allowlist.

The machine-readable manifest lives at [`config/editions/community.json`](./config/editions/community.json) and is mirrored in `@mobazha/core/edition`.

## Backend authority

Runtime payment capabilities are the **intersection** of:

1. Backend edition / node capability responses (authoritative)
2. Seller-configured payment methods
3. Frontend Community Edition policy (may narrow, never widen)

When the node does not yet expose `/edition/capabilities`, the frontend uses a typed adapter with a safe four-chain fallback. See `packages/core/edition/backendCapabilities.ts` for the integration seam.

## Dual entry points

Both entry points share the same outer provider tree via `apps/web/src/components/OuterProviders.tsx`:

| Entry                        | File                          | Command                                 |
| ---------------------------- | ----------------------------- | --------------------------------------- |
| **Vite** (dev / TMA)         | `apps/web/src/main.tsx`       | `pnpm dev:vite`                         |
| **Next.js** (production SSR) | `apps/web/src/app/layout.tsx` | `pnpm --filter @mobazha/web build:next` |

Keep provider order and composition identical when changing shared infrastructure.

## Dormant compatibility source

This repository retains historical EVM, Solana, TRON, and fiat compatibility **source** (types, parsers, identifiers, dormant implementation files) from the 2026-04-23 anchor for protocol compatibility and future private builds.

Community Edition production entry points **do not** register, route, initialize, or bundle:

- Reown AppKit / Web3 wallet connectors
- EVM, Solana, or TRON payment executors
- Fiat provider checkout or admin configuration UI

Prefer removing production imports and provider registration over deleting dormant source. Residual package dependencies that keep dormant files type-checkable are listed under [Remaining supply-chain review](#remaining-supply-chain-review).

## Requirements

- Node.js >= 20
- pnpm >= 9

## Commands

```bash
# Install
pnpm install --frozen-lockfile

# Development (Vite)
pnpm dev:vite

# Typecheck
pnpm typecheck

# Unit tests
pnpm test

# Production build (Vite default in apps/web)
pnpm build
```

Point `NEXT_PUBLIC_API_URL` (or standalone equivalents) at your Community Edition node.

## Project layout

```
mobazha-unified/
├── config/editions/community.json   # Edition manifest
├── apps/web/                        # Next.js + Vite web app
├── packages/core/                   # Shared services, hooks, edition policy
│   └── edition/                     # Capability intersection + backend adapter
└── packages/ui/                     # Shared UI components
```

## Remaining supply-chain review

The following dependencies remain in `packages/core` solely to keep dormant compatibility source type-checkable. They are **not** registered in Community Edition production providers or executors. Review for license and SBOM before public release:

- `@reown/appkit`, `@reown/appkit-adapter-ethers`, `@reown/appkit-adapter-solana`
- `@solana/web3.js`, `ethers`, `viem`

Apps/web additionally lists `@stripe/*` and `@paypal/react-paypal-js` for dormant fiat UI source.

## Contributing

Community contributions are intended to be covered by DCO. See project governance docs when published.

## Trademark

Mobazha name, logo, and visual identity are reserved under a separate trademark policy.
