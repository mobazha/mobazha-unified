# @mobazha/commerce-web

Stable, product-neutral contracts for composing Mobazha storefront, product,
cart, checkout and seller-admin frontend features.

The package provides:

- route, navigation, capability and slot composition contracts;
- neutral storefront, product-action and cart-summary surfaces;
- a complete guest-checkout panel and shared administration primitives;
- an authorization-aware HTTP client for application-owned providers.

Applications own their routes, navigation and product-specific providers. A
feature package contributes descriptors and UI slots guarded by explicit
runtime capabilities. This package must never import an application source
tree or inspect a product build flag.

Private applications consume a released package version. They must not import
`apps/web/src/**` from the unified repository.
