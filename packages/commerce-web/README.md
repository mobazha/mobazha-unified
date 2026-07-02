# @mobazha/commerce-web

Stable, product-neutral contracts for composing Mobazha storefront, product,
cart, checkout and seller-admin frontend features.

Applications own their routes, navigation and product-specific providers. A
feature package contributes descriptors and UI slots guarded by explicit
runtime capabilities. This package must never import an application source
tree or inspect a product build flag.

Private applications consume a released package version. They must not import
`apps/web/src/**` from the unified repository.
