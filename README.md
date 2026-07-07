# Mobazha Unified

**One commerce experience for independent stores, connected markets, and direct deals.**

Commerce should not need a different frontend every time a store changes backend, market, or
channel. Mobazha Unified brings storefronts, product discovery, checkout, orders, store management,
and marketplace experiences into one responsive application that can follow the store across hosted
and self-hosted operation.

[Try Mobazha](https://app.mobazha.org/) ·
[Explore the product](https://docs.mobazha.org/project/product-map) ·
[Run your own store](https://docs.mobazha.org/self-host/install) ·
[Documentation](https://docs.mobazha.org/) · [Contributing](./CONTRIBUTING.md)

> **Current status:** `v0.3.0-rc.1` is the public release target. Workspace package versions such as
> `0.0.1` are development versions, not separate product releases.

[![A Mobazha merchant storefront with branded store identity and product listings](./docs/assets/screenshots/mobazha-official-store.jpg)](https://app.mobazha.org/)

_A merchant storefront presented by Mobazha Unified. The same experience can connect to a hosted or
self-hosted backend._

## Commerce from both sides

For buyers, Unified provides the path from discovery and product detail through checkout, payment,
order progress, communication, and recovery.

For sellers, it brings together store identity, listings, supply, shipping, payments, orders,
promotions, storefront presentation, and day-to-day operations.

For markets and integrations, the same commerce journeys can appear through marketplaces, direct
links, embedded channels, responsive Web experiences, and Agent-assisted workflows. What appears in
the interface follows the capabilities and permissions of the connected backend.

## One interface, different ways to run

- **Hosted:** use [app.mobazha.org](https://app.mobazha.org/) without operating the server yourself.
- **Self-hosted:** connect Unified to an open-source
  [Mobazha Node](https://github.com/mobazha/mobazha) that you control.
- **Composed:** package selected buyer, seller, marketplace, or embedded experiences for a specific
  distribution or channel.

Unified presents commerce; it does not become a second source of truth. The backend serving the
active store or order validates protected actions and owns the resulting business state.

[See how Mobazha fits together](https://docs.mobazha.org/project/product-map) or
[compare hosted, self-hosted, and hybrid operation](https://docs.mobazha.org/start/choose-deployment).

## Try or build it

Open [app.mobazha.org](https://app.mobazha.org/) to explore the current hosted experience.

Developers can run Unified against a compatible hosted or local backend:

```bash
git clone https://github.com/mobazha/mobazha-unified.git
cd mobazha-unified
corepack pnpm install --frozen-lockfile
corepack pnpm dev:vite
```

The development server listens on `http://127.0.0.1:3000` by default. Connection profiles and local
backend configuration are covered in the repository documentation.

## Go deeper

- [Product model](https://docs.mobazha.org/project/product-map)
- [Buyer journey](https://docs.mobazha.org/buy)
- [Seller journey](https://docs.mobazha.org/sell)
- [Channels and integrations](https://docs.mobazha.org/project/surfaces-and-integrations)
- [Runtime capabilities](https://docs.mobazha.org/build/runtime-capabilities)
- [Public roadmap](https://docs.mobazha.org/project/roadmap)
- [Frontend package boundaries](./docs/architecture/PACKAGE_BOUNDARIES.md)

## Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md), sign off commits under the
[Developer Certificate of Origin](./DCO.md), and report vulnerabilities through the private process
in [SECURITY.md](./SECURITY.md).

## License and attribution

Mobazha Unified is licensed under the [Mozilla Public License 2.0](./LICENSE). The source-code
license does not grant rights to use the Mobazha name or visual identity; see
[TRADEMARKS.md](./TRADEMARKS.md).

Originally developed by [fengzie](https://github.com/fengzie) and maintained by the Mobazha
contributors. The canonical source repository is
[mobazha/mobazha-unified](https://github.com/mobazha/mobazha-unified). See [NOTICE](./NOTICE) and
[Attribution and source identity](./docs/legal/ATTRIBUTION.md) for details.
