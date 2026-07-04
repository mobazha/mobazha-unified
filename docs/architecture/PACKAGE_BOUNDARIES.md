# Public Frontend Package Boundaries

## Decision

Mobazha Unified separates internal application implementation, generic visual
foundations, reusable commerce features and application shells:

```text
@mobazha/core          internal runtime, API, state and domain implementation
@mobazha/ui            generic visual and platform foundations
@mobazha/commerce-kit  public commerce contracts, workflows and feature surfaces
applications           routes, providers, adapters, localization and branding
```

Physical directories are workspace peers, but they do not represent equivalent
architectural layers or publication policies.

## Dependency direction

```text
Unified application  -> core, ui, commerce-kit
downstream application -> ui, commerce-kit
commerce-kit -> ui                 (target direction for stable primitives)
commerce-kit -X-> core
ui -X-> core
core -X-> ui, commerce-kit
```

`@mobazha/commerce-kit` must remain consumable without Unified application
source. It may use stable public primitives from `@mobazha/ui`, but it must not
import `apps/**`, internal stores, application providers or `@mobazha/core`.
Applications connect concrete APIs and runtime behavior through explicit ports,
props, policies and adapters.

## Package responsibilities

### `@mobazha/core`

`@mobazha/core` is an internal implementation package. It owns API clients,
authentication, application stores, infrastructure providers, data transforms
and hooks whose behavior is specific to Unified. It is not the public dependency
surface for downstream applications.

### `@mobazha/ui`

`@mobazha/ui` owns generic, domain-neutral visual foundations such as tokens,
accessible primitives, responsive helpers and reusable platform utilities.
Application-local components remain local until more than one real consumer
needs a stable API. The package must not accumulate commerce workflows or
application routing policy merely because they render React elements.

### `@mobazha/commerce-kit`

`@mobazha/commerce-kit` is a public React web feature kit. Its target boundary
owns:

- versioned commerce contracts and adapter ports;
- capability-aware route, navigation and slot descriptors;
- cross-application workflow state and typed error models;
- reusable storefront, product, cart, checkout and seller-admin surfaces;
- contract tests and consumer fixtures for its public API.

The kit does not own top-level routing, branding, localization, identity
providers, deployment configuration or product-specific policy. A route
descriptor declares a contribution; the host application decides whether and
how to materialize it.

### Applications

Applications own their route tree, provider graph, branding, localization,
runtime configuration and concrete adapters. They may narrow behavior for
safety, but they must not fork shared workflow semantics when the kit already
defines a contract.

## Promotion rule

A feature moves from an application into `@mobazha/commerce-kit` only when:

1. at least two real applications need the same bounded behavior;
2. request, response, state and error semantics are explicit;
3. product differences can be expressed through ports, policy or capabilities;
4. the extraction does not regress either consumer;
5. package-level contract tests and consumer build tests cover the public API.

Until those conditions hold, the feature stays application-local. Shared code
is extracted by vertical slice rather than by copying an entire page tree.

## Target public API and rendering rules

- The root export contains only stable contracts and composition APIs.
- Feature APIs use explicit subpath exports such as `/checkout`, `/cart` and
  `/product`.
- UI components do not hard-code backend paths, product identity or deployment
  switches.
- User-facing text is supplied through labels or a host localization adapter.
- Interactive components define their client-rendering and accessibility
  contract explicitly.
- Styling uses documented tokens or stable primitives instead of an isolated,
  undocumented class system.
- Public IDs and capabilities are namespaced and validated during composition.

## Validation

Each public release must verify:

- package build, typecheck and unit tests;
- installation from the packed artifact rather than workspace source aliases;
- at least one Next.js and one Vite consumer build;
- duplicate route, navigation and slot rejection;
- unsupported capability and contract-version failure behavior;
- absence of imports from application source or internal implementation packages.
