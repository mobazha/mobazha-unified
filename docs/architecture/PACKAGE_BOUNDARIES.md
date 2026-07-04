# Public Frontend Package Boundaries

## Decision

Mobazha Unified separates internal application implementation, generic visual foundations, reusable
commerce features and application shells:

```text
@mobazha/core          internal runtime, API, state and domain implementation
@mobazha/ui            generic visual and platform foundations
@mobazha/commerce-kit  public commerce contracts, workflows and feature surfaces
applications           routes, providers, adapters, localization and branding
```

Physical directories are workspace peers, but they do not represent equivalent architectural layers
or publication policies.

## Dependency direction

```text
Unified application  -> core, ui, commerce-kit
downstream application -> ui, commerce-kit
commerce-kit -> ui                 (target direction for stable primitives)
commerce-kit -X-> core
ui -X-> core
core -X-> ui, commerce-kit
```

`@mobazha/commerce-kit` must remain consumable without Unified application source. It may use stable
public primitives from `@mobazha/ui`, but it must not import `apps/**`, internal stores, application
providers or `@mobazha/core`. Applications connect concrete APIs and runtime behavior through
explicit ports, props, policies and adapters.

## Package responsibilities

### `@mobazha/core`

`@mobazha/core` is an internal implementation package. It owns API clients, authentication,
application stores, infrastructure providers, data transforms and hooks whose behavior is specific
to Unified. It is not the public dependency surface for downstream applications.

### `@mobazha/ui`

`@mobazha/ui` owns generic, domain-neutral visual foundations such as tokens, accessible primitives,
responsive helpers and reusable platform utilities. Application-local components remain local until
more than one real consumer needs a stable API. The package must not accumulate commerce workflows
or application routing policy merely because they render React elements.

### `@mobazha/commerce-kit`

`@mobazha/commerce-kit` is a public React web feature kit. Its target boundary owns:

- versioned commerce contracts and adapter ports;
- capability-aware route, navigation and slot descriptors;
- cross-application workflow state and typed error models;
- reusable storefront, product, cart, checkout and seller-admin surfaces;
- contract tests and consumer fixtures for its public API.

The kit does not own top-level routing, branding, localization, identity providers, deployment
configuration or product-specific policy. A route descriptor declares a contribution; the host
application decides whether and how to materialize it.

### Applications

Applications own their route tree, provider graph, branding, localization, runtime configuration and
concrete adapters. They may narrow behavior for safety, but they must not fork shared workflow
semantics when the kit already defines a contract.

## Frontend product composition

[`RFC-0003: Composable Frontend Product Model`](https://github.com/mobazha/mobazha-docs/blob/main/rfcs/0003-composable-frontend-product-model.md)
defines the cross-repository target. Frontend products are compositions across independent
deployment, root-experience, authentication, presentation-channel, network-policy, branding,
code-inclusion and backend-capability dimensions; they are not branches of one product-type enum.

Composition has two separate stages:

```text
build time: public foundations + selected public features + application-local/private features
runtime:    included feature ∩ product profile ∩ backend effective capability
            ∩ supported experience/channel ∩ authorization ∩ readiness
```

The backend capability snapshot remains authoritative. A host profile or feature descriptor may
narrow that set but may not manufacture availability. Runtime configuration cannot activate code
that was not included in the artifact. Routes, navigation, providers, workflows and actions should
ultimately project from one resolved composition so their condition sets cannot drift.

Private distributions may implement compatible composition contracts from their own repositories.
Their source, product identity, manifest, brand and build entrypoint remain physically absent from
this public repository. Public features declare neutral requirements such as capability,
experience, auth, channel or egress support; they never inspect a private product identity.

`@mobazha/commerce-kit` is one public feature-catalog provider within this model. It is not the
complete product composer, application shell, router or provider graph. The RFC is Draft and does
not introduce dynamic plugins, remote React code, Agent surfaces or a plugin marketplace.

Guest Checkout is the first proving slice. `CommerceGuestCheckoutPort`, the pure workflow reducer
and its React hook share settings loading, availability, order submission, retry and payment-handoff
semantics. Applications still own cart/address input, supply validation, encryption, product payment
policy, order-status polling, navigation and presentation beyond the shared surface. A richer host
may consume the controller without replacing its page with `GuestCheckoutPanel`; a smaller host may
use the panel directly with the same port.

## Promotion rule

A feature moves from an application into `@mobazha/commerce-kit` only when:

1. at least two real applications need the same bounded behavior;
2. request, response, state and error semantics are explicit;
3. product differences can be expressed through ports, policy or capabilities;
4. the extraction does not regress either consumer;
5. package-level contract tests and consumer build tests cover the public API.

Until those conditions hold, the feature stays application-local. Shared code is extracted by
vertical slice rather than by copying an entire page tree.

## Target public API and rendering rules

- The root export contains only stable contracts and composition APIs.
- Feature APIs use explicit subpath exports such as `/checkout`, `/cart` and `/product`.
- UI components do not hard-code backend paths, product identity or deployment switches.
- User-facing text is supplied through labels or a host localization adapter.
- Interactive components define their client-rendering and accessibility contract explicitly.
- Styling uses documented tokens or stable primitives instead of an isolated, undocumented class
  system.
- Public IDs and capabilities are namespaced and validated during composition.

The current rendering baseline exposes `CommerceLabelResolver` and stable `COMMERCE_LABEL_KEYS`; the
host selects the locale and maps those keys to copy. Applications import
`@mobazha/commerce-kit/styles.css` once and theme the documented `--commerce-*` custom properties
instead of copying the package's class declarations.

## Agent-provided surfaces

Build-time, reviewed plugins are trusted application code and may contribute a React component
through the existing slot contract. Runtime agent output is an untrusted data boundary and must
never provide a component, JSX, HTML, JavaScript or arbitrary CSS.

When a real cross-application Agent UI slice is promoted, it must use a versioned declarative
descriptor and artifact references. The host validates the descriptor's schema, capability and
policy before resolving its `kind` to a trusted renderer. Navigation or tool actions are intents
only: the host owns authorization, confirmation, idempotency, execution and audit. Model clients,
chat transport, orchestration and tool runtimes remain application or service concerns, not Commerce
Kit responsibilities.

No separate generic Agent UI package is introduced until at least two non-commerce consumers
demonstrate a stable common contract.

## Validation

Each public release must verify:

- package build, typecheck and unit tests;
- installation from the packed artifact rather than workspace source aliases;
- at least one Next.js and one Vite consumer build;
- duplicate route, navigation and slot rejection;
- unsupported capability and contract-version failure behavior;
- absence of imports from application source or internal implementation packages.
