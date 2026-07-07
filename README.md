# Mobazha Unified

**The capability-driven storefront, checkout, seller, and marketplace experience for Mobazha.**

Mobazha Unified is the shared frontend for hosted services and self-hosted Mobazha Nodes. It
resolves the active store and backend, renders only effective capabilities, and presents buyer,
seller, and operator workflows without becoming a second authority for orders or money.

[Try the hosted Beta](https://app.mobazha.org/) ·
[Product map](https://docs.mobazha.org/project/product-map) ·
[Run a Node](https://docs.mobazha.org/self-host/install) ·
[Runtime capabilities](https://docs.mobazha.org/build/runtime-capabilities) ·
[Contributing](./CONTRIBUTING.md)

> **Release status:** the current public target is `v0.3.0-rc.1`. It has not been tagged or
> published as a stable frontend release. Workspace package versions such as `0.0.1` are
> development-package versions, not a separate public product release.

[![Conceptual Mobazha product map showing experiences, commerce Core, and optional services](https://docs.mobazha.org/images/docs/project/mobazha-product-atlas.svg)](https://docs.mobazha.org/project/product-map)

_One commerce model can be presented through hosted, standalone, storefront, marketplace, embedded,
and Agent-assisted experiences. The connected backend remains authoritative for effective
capabilities and business state._

## Start with your goal

| Goal                                      | Start here                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Explore the current hosted experience     | [Open app.mobazha.org](https://app.mobazha.org/)                                                |
| Understand the complete product           | [How Mobazha fits together](https://docs.mobazha.org/project/product-map)                       |
| Connect Unified to your own backend       | [Install a Mobazha Node](https://docs.mobazha.org/self-host/install)                            |
| Understand whether a feature is available | [Runtime capabilities](https://docs.mobazha.org/build/runtime-capabilities)                     |
| Build or embed a frontend surface         | [Development](#development) and [package boundaries](./docs/architecture/PACKAGE_BOUNDARIES.md) |
| Review future direction                   | [Public roadmap](https://docs.mobazha.org/project/roadmap)                                      |

## Where this repository fits

| Component                                          | Responsibility                                                                                                     | Source                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| [Mobazha Node](https://github.com/mobazha/mobazha) | Commerce Core, business-state authority, persistence, payment verification, APIs, messaging, and operator controls | `mobazha/mobazha`                        |
| **Mobazha Unified — this repository**              | Storefront, checkout, seller administration, marketplace, and responsive experience surfaces                       | `mobazha/mobazha-unified`                |
| Mobazha hosted services                            | Optional managed backend operation, routing, discovery, and service-specific capabilities                          | Service-specific distributions and terms |
| [Mobazha Docs](https://docs.mobazha.org)           | Canonical public product knowledge, user guidance, policy, architecture, and release scope                         | `mobazha/mobazha-docs`                   |

Unified presents and requests work. The backend serving the active store or order context validates
protected actions and owns admitted state.

## Product surfaces

| Surface     | Current responsibilities                                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Buyer       | Store and marketplace discovery, product detail, cart, checkout, payment selection, order tracking, and recovery entry points |
| Seller      | Products, options, supply, shipping, orders, storefront appearance, policies, payments, and integrations                      |
| Operator    | Marketplace and seller-review workflows, deployment-aware navigation, and capability-gated administration                     |
| Integration | Responsive Web, embedded and sovereign profiles, deep links, notifications, and API-backed workflows                          |

The repository also contains a browser-extension application entry point. Source presence does not
mean the extension, every embedded channel, or every profile is part of the current universal
release boundary.

## One frontend, several operating paths

### Hosted

[app.mobazha.org](https://app.mobazha.org/) is the fastest way to evaluate the current buyer and
seller experience without maintaining the underlying server. Hosted availability, data handling,
limits, and pricing follow the applicable service terms.

### Self-hosted

Run the open-source [Mobazha Node](https://github.com/mobazha/mobazha) when you want direct control
over deployment, store data, domain, backup, and enabled integrations. Unified can connect to the
Node directly or be served as its embedded Web UI.

### Composed and embedded

Build profiles can adapt navigation, authentication transport, branding, external-resource policy,
and included frontend surfaces. A profile can narrow what the user sees; it cannot enable a backend
capability or bypass authorization.

Compare
[hosted, self-hosted, and hybrid operation](https://docs.mobazha.org/start/choose-deployment) and
review
[channels and integration contracts](https://docs.mobazha.org/project/surfaces-and-integrations).

## Capability-driven experience

Unified keeps deployment, experience, capability, permission, and experiment state separate. New
work becomes available only when the applicable gates agree:

```text
distribution allowlist
  ∩ compatible contract
  ∩ feature included in the build
  ∩ backend capability ready
  ∩ current identity authorized
  ∩ resource and dependency ready
```

Pending capability state remains a loading state, not an authoritative denial. Clients may hide or
narrow actions for safety, but they never widen the backend's response. Notifications and local UI
state do not independently advance an order or payment.

The framework-neutral composition and shared commerce contracts live in `@mobazha/commerce-kit`;
applications retain routing, providers, authorization, localization, and final rendering.

## Current release boundary

- The release target is `v0.3.0-rc.1`; stable signed artifacts and reproducibility attestations
  remain pending.
- Hosted and self-hosted experiences share frontend contracts but can expose different effective
  capabilities.
- The default open-source Node release boundary includes BTC, BCH, and LTC, subject to seller
  configuration and the active checkout session.
- Browser wallet support uses standards exposed by the browser. Connector presence in source is not
  a release commitment.
- Vite and Next.js entry points must preserve the same capability and provider boundaries.

Read the canonical [release scope](https://docs.mobazha.org/project/release-scope) and
[runtime capability guide](https://docs.mobazha.org/build/runtime-capabilities).

## Development

### Requirements

- Node.js 20 or newer
- pnpm 9; the repository pins pnpm 9.15.4
- A compatible hosted or self-hosted Mobazha backend

Install the workspace:

```bash
git clone https://github.com/mobazha/mobazha-unified.git
cd mobazha-unified
corepack pnpm install --frozen-lockfile
```

Run the Vite frontend against a self-hosted Node on `http://127.0.0.1:5102`:

```bash
NEXT_PUBLIC_ENV_MODE=standalone \
NEXT_PUBLIC_AUTH_MODE=basic \
NEXT_PUBLIC_API_URL=http://127.0.0.1:5102 \
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5102 \
corepack pnpm dev:vite
```

The development server listens on `http://127.0.0.1:3000` by default.

### Application entry points

Both entry points share the outer provider tree in `apps/web/src/components/OuterProviders.tsx`:

| Entry                               | File                          | Command                                 |
| ----------------------------------- | ----------------------------- | --------------------------------------- |
| Vite — development and embedded app | `apps/web/src/main.tsx`       | `pnpm dev:vite`                         |
| Next.js — production SSR            | `apps/web/src/app/layout.tsx` | `pnpm --filter @mobazha/web build:next` |

Provider order, runtime configuration, and capability behavior must remain equivalent across both
entry points.

## Project layout

```text
mobazha-unified/
├── apps/web/                 # Next.js and Vite web application
├── apps/extension/           # Browser-extension application entry point
├── packages/core/            # Internal runtime, API, payment, and domain implementation
├── packages/ui/              # Generic visual and platform foundations
├── packages/commerce-kit/    # Public commerce contracts and feature surfaces
├── config/editions/          # Packaging and compatibility profiles
└── docs/architecture/        # Repository-local architecture contracts
```

See [Public package boundaries](./docs/architecture/PACKAGE_BOUNDARIES.md).

## Verification

Run the main repository checks:

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @mobazha/web build
corepack pnpm --filter @mobazha/web build:next
corepack pnpm docs:authority:check
```

Release maintainers must also inspect production bundles, desktop and mobile behavior, dependency
and secret scans, checksums, provenance, and the exact source commit used for each artifact.

## Documentation

Canonical public knowledge:

- [Product model](https://docs.mobazha.org/project/product-map)
- [Buyer guidance](https://docs.mobazha.org/buy)
- [Seller guidance](https://docs.mobazha.org/sell)
- [Channels and integrations](https://docs.mobazha.org/project/surfaces-and-integrations)
- [Runtime capabilities](https://docs.mobazha.org/build/runtime-capabilities)
- [Public roadmap](https://docs.mobazha.org/project/roadmap)

Repository-local implementation evidence:

- [Frontend package boundaries](./docs/architecture/PACKAGE_BOUNDARIES.md)
- [Supply-chain audit](./docs/security/SUPPLY_CHAIN_AUDIT.md)
- [v0.3.0-rc.1 release-candidate notes](./docs/releases/v0.3.0-rc.1.md)

## Contributing and security

Contributions are welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md), sign off commits under the
[Developer Certificate of Origin](./DCO.md), and follow the private vulnerability-reporting process
in [SECURITY.md](./SECURITY.md).

Project decisions and release responsibilities are described in [GOVERNANCE.md](./GOVERNANCE.md).
The source-code license does not grant rights to use the Mobazha name or visual identity; see
[TRADEMARKS.md](./TRADEMARKS.md).

## License and attribution

Mobazha Unified is licensed under the [Mozilla Public License 2.0](./LICENSE) (MPL-2.0).

Originally developed by [fengzie](https://github.com/fengzie) and maintained by the Mobazha
contributors. The canonical source repository is
[mobazha/mobazha-unified](https://github.com/mobazha/mobazha-unified). Project origin, copyright,
and redistribution attribution are recorded in [NOTICE](./NOTICE) and
[Attribution and source identity](./docs/legal/ATTRIBUTION.md).
