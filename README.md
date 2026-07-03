# Mobazha Unified

An open-source commerce frontend for storefronts, marketplaces, checkout, and seller management.

Mobazha Unified powers the buyer and seller experiences at
[app.mobazha.org](https://app.mobazha.org/). The same codebase connects to both Mobazha-hosted
services and self-hosted Mobazha nodes, adapting the interface to the capabilities reported by the
connected backend.

[Try Mobazha](https://app.mobazha.org/) ·
[Run a self-hosted node](https://github.com/mobazha/mobazha3.0) ·
[Architecture](./docs/architecture/RUNTIME_CAPABILITIES.md) · [Contributing](./CONTRIBUTING.md)

> **Status:** This project is a release candidate. APIs, packaging, and deployment instructions may
> change before the first stable release.

## What is included

- Buyer-facing storefronts, product discovery, and marketplace experiences
- Product detail, cart, checkout, and payment-selection flows
- Seller administration for products, orders, shipping, and store appearance
- Responsive interfaces for web, mobile, and embedded experiences
- Shared Vite and Next.js entry points backed by reusable core and UI packages

## Use Mobazha

### Hosted service

Visit [app.mobazha.org](https://app.mobazha.org/) to create a store or explore Mobazha without
setting up infrastructure.

### Self-hosted node

Run the open-source [Mobazha node](https://github.com/mobazha/mobazha3.0) on your own infrastructure
when you want to control the deployment, data, domain, and available integrations. The node provides
the backend and can serve its embedded Web UI after startup.

The current open-source node enables BTC, BCH, and LTC payments by default. Actual availability also
depends on the seller configuration and the current checkout session.

## How it works

Mobazha Unified does not build a separate frontend for each deployment type. The connected backend
publishes a versioned runtime-capability snapshot, and the frontend renders only the experiences and
payment methods that snapshot makes available.

Payment availability is resolved from:

1. The backend runtime-capability response, which is authoritative
2. The payment methods enabled by the seller
3. The current checkout session

The frontend may narrow that result for safety or session validity, but it never enables a payment
method that the backend did not advertise. Optional payment paths remain unavailable until a valid
capability response is present.

Browser-wallet integrations use browser-injected provider standards. The public source tree does not
bundle Reown AppKit or WalletConnect SDK packages, while UTXO checkout remains backend-monitored and
does not require a browser wallet connector.

See [Runtime capability architecture](./docs/architecture/RUNTIME_CAPABILITIES.md) for the complete
contract.

## Development

### Requirements

- Node.js 20 or newer
- pnpm 9 (the repository pins pnpm 9.15.4)
- A compatible Mobazha backend

### Run the frontend locally

Install the workspace dependencies:

```bash
git clone https://github.com/mobazha/mobazha-unified.git
cd mobazha-unified
corepack pnpm install --frozen-lockfile
```

To run the Vite frontend against a self-hosted node listening on `http://127.0.0.1:5102`:

```bash
NEXT_PUBLIC_ENV_MODE=standalone \
NEXT_PUBLIC_AUTH_MODE=basic \
NEXT_PUBLIC_API_URL=http://127.0.0.1:5102 \
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5102 \
corepack pnpm dev:vite
```

The development server is available at `http://127.0.0.1:3000` by default. Build and start the
[Mobazha node](https://github.com/mobazha/mobazha3.0#build-from-source) first if you do not already
have a compatible backend.

### Common commands

```bash
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @mobazha/web build
corepack pnpm --filter @mobazha/web build:next
```

### Application entry points

Both entry points share the same outer provider tree in
`apps/web/src/components/OuterProviders.tsx`:

| Entry                             | File                          | Command                                 |
| --------------------------------- | ----------------------------- | --------------------------------------- |
| Vite (development / embedded app) | `apps/web/src/main.tsx`       | `pnpm dev:vite`                         |
| Next.js (production SSR)          | `apps/web/src/app/layout.tsx` | `pnpm --filter @mobazha/web build:next` |

Provider order and runtime-capability behavior must remain equivalent across both entry points.

## Project layout

```text
mobazha-unified/
├── apps/web/                 # Next.js and Vite web application
├── apps/extension/           # Browser extension entry point
├── packages/core/            # Runtime config, API, payment and domain logic
├── packages/commerce-web/    # Shared commerce feature contracts
├── packages/ui/              # Shared UI components
├── config/editions/          # Packaging and compatibility profiles
└── docs/architecture/        # Public architecture contracts
```

## Security and supply chain

Report security issues privately as described in [SECURITY.md](./SECURITY.md). Exact production
dependency licenses and release checks are recorded in the
[supply-chain audit](./docs/security/SUPPLY_CHAIN_AUDIT.md).

## Contributing

Contributions are welcome. Before opening a pull request, read [CONTRIBUTING.md](./CONTRIBUTING.md)
and sign off commits under the [Developer Certificate of Origin](./DCO.md). Project decisions and
release responsibilities are described in [GOVERNANCE.md](./GOVERNANCE.md).

## License and attribution

Mobazha Unified is licensed under the [Mozilla Public License 2.0](./LICENSE) (MPL-2.0).

Originally developed by [fengzie](https://github.com/fengzie) and maintained by the Mobazha
contributors. The canonical source repository is
[mobazha/mobazha-unified](https://github.com/mobazha/mobazha-unified). Project origin, copyright,
and redistribution attribution are recorded in [NOTICE](./NOTICE) and
[Attribution and source identity](./docs/legal/ATTRIBUTION.md).

## Trademark

The Mobazha name, logo, and visual identity are not granted by the MPL-2.0 source license and remain
subject to [the trademark policy](./TRADEMARKS.md).
