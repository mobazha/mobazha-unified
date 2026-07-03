# Mobazha Unified

The shared storefront and seller-admin frontend for Mobazha nodes.

Originally developed by [fengzie](https://github.com/fengzie) and maintained by
the Mobazha contributors. The canonical source repository is
[mobazha/mobazha-unified](https://github.com/mobazha/mobazha-unified).

The same `main` branch is designed to run against Community Edition and hosted or
commercial deployments. The frontend does not select an edition at build time:
the connected backend publishes a versioned runtime capability snapshot, and the
UI projects only the payment methods that snapshot makes available.

**License:** [Mozilla Public License 2.0](./LICENSE) (MPL-2.0)

Project origin, copyright, and redistribution attribution are recorded in
[NOTICE](./NOTICE) and [Attribution and source identity](./docs/legal/ATTRIBUTION.md).

## Backend-driven capabilities

Payment availability is resolved from:

1. The backend runtime capability response (authoritative)
2. Seller-enabled payment methods
3. The current checkout session

The frontend may narrow that result for safety or session validity, but it must
never invent a payment method that the backend did not advertise. Optional
payment kinds fail closed until the versioned capability response is available.

The Community Edition backend currently advertises these payment rails:

| Chain | Rail             |
| ----- | ---------------- |
| BTC   | UTXO transparent |
| BCH   | UTXO transparent |
| LTC   | UTXO transparent |

Other backends can advertise additional methods without requiring a separate
frontend branch. Historical edition manifests remain as packaging and regression
fixtures; they are not a compile-time ceiling for this shared frontend.

See [Runtime capability architecture](./docs/architecture/RUNTIME_CAPABILITIES.md).

## Wallet boundary

The public core uses browser-injected wallet provider standards and does not ship
Reown AppKit or WalletConnect SDK packages. This keeps the MPL source tree free of
connector-specific redistribution and usage terms. Deployments can add richer
wallet UX later through a separately reviewed adapter or plugin without forking
the frontend product line.

UTXO checkout remains backend-monitored and does not require a browser wallet
connector.

## Entry points

Both entry points share the same outer provider tree in
`apps/web/src/components/OuterProviders.tsx`:

| Entry                             | File                          | Command                                 |
| --------------------------------- | ----------------------------- | --------------------------------------- |
| Vite (development / embedded app) | `apps/web/src/main.tsx`       | `pnpm dev:vite`                         |
| Next.js (production SSR)          | `apps/web/src/app/layout.tsx` | `pnpm --filter @mobazha/web build:next` |

Keep provider order and runtime-capability behavior equivalent across both entry
points.

## Requirements

- Node.js 20 or newer
- pnpm 9 (the repository pins pnpm 9.15.4)

## Commands

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm dev:vite
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @mobazha/web build
corepack pnpm --filter @mobazha/web build:next
```

Point `NEXT_PUBLIC_API_URL` (or the equivalent standalone configuration) at the
target Mobazha backend.

## Project layout

```text
mobazha-unified/
├── apps/web/                 # Next.js and Vite web application
├── apps/extension/           # Browser extension entry point
├── packages/core/            # Runtime config, API, payment and domain logic
├── packages/ui/              # Shared UI components
├── config/editions/          # Packaging and compatibility profiles
└── docs/architecture/        # Public architecture contracts
```

## Supply chain

Exact production dependency licenses and release checks are recorded in
[the supply-chain audit](./docs/security/SUPPLY_CHAIN_AUDIT.md). A public release
must keep the lockfile, license conclusions and security audit in sync.

## Contributing

Contributions are welcome. Before opening a pull request, read
[CONTRIBUTING.md](./CONTRIBUTING.md) and sign off commits under the
[Developer Certificate of Origin](./DCO.md). Project decisions and release
responsibilities are described in [GOVERNANCE.md](./GOVERNANCE.md). Report
security issues privately as described in [SECURITY.md](./SECURITY.md).

## Trademark

The Mobazha name, logo and visual identity are not granted by the MPL-2.0 source
license and remain subject to [the trademark policy](./TRADEMARKS.md).
