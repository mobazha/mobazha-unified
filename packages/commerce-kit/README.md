# @mobazha/commerce-kit

Public React web contracts and feature surfaces for composing Mobazha
storefront, product, cart, checkout and seller-admin experiences.

The package provides:

- route, navigation, capability and slot composition contracts;
- neutral storefront, product-action and cart-summary surfaces;
- an initial guest-checkout reference surface and shared administration primitives;
- an authorization-aware HTTP client for application-owned providers.

Applications own their routes, navigation and product-specific providers. A
feature package contributes descriptors and UI slots guarded by explicit
runtime capabilities. This package must never import an application source
tree or inspect a product build flag.

Downstream applications consume a versioned package artifact and provide their
own adapters, branding, localization and runtime policy. They must not import
`apps/web/src/**` from this repository.

`@mobazha/commerce-kit` is a domain feature kit, not a design system and not an
application shell. Generic visual primitives belong to `@mobazha/ui`; internal
API clients, stores and application-specific hooks belong to `@mobazha/core`.
The kit must not depend on `@mobazha/core`. Host applications connect their
implementation through explicit ports, props and policies.

See [Package boundaries](../../docs/architecture/PACKAGE_BOUNDARIES.md) for the
authoritative public dependency and ownership rules.
