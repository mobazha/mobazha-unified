# @mobazha/commerce-kit

Public React web contracts and feature surfaces for composing Mobazha storefront, product, cart,
checkout and seller-admin experiences.

The package provides:

- route, navigation, capability and slot composition contracts;
- neutral storefront, product-action and cart-summary surfaces;
- an initial guest-checkout reference surface and shared administration primitives;
- an authorization-aware HTTP client with typed HTTP/network/timeout errors, request cancellation
  and request-ID propagation.

Applications own their routes, navigation and product-specific providers. A feature package
contributes descriptors and UI slots guarded by explicit runtime capabilities. This package must
never import an application source tree or inspect a product build flag.

Downstream applications consume a versioned package artifact and provide their own adapters,
branding, localization and runtime policy. They must not import `apps/web/src/**` from this
repository.

Interactive surfaces require a host-owned `CommerceLabelResolver`; the package never selects a
locale or ships user-visible fallback copy. Import the documented baseline stylesheet once, then
override its public CSS variables from the application theme:

```tsx
import '@mobazha/commerce-kit/styles.css';
import { COMMERCE_LABEL_KEYS, type CommerceLabelResolver } from '@mobazha/commerce-kit';

const labels: CommerceLabelResolver = (key, values) => i18n.t(key, values);
```

The stable styling contract is the `--commerce-*` custom-property namespace plus the exported
component class names. Applications may theme those variables, but should not copy the package's
internal declarations. Confirmation dialogs trap focus, close on Escape, restore the invoking
element's focus and expose busy/disabled state to assistive technology.

Reviewed extensions bundled with an application may contribute React components through slots.
Runtime agents are untrusted data producers: they must use host-validated, versioned declarative
descriptors and artifact references rather than supplying JSX, HTML, scripts or styles. The host
retains renderer selection, authorization, confirmation, action execution and audit ownership.

`@mobazha/commerce-kit` is a domain feature kit, not a design system and not an application shell.
Generic visual primitives belong to `@mobazha/ui`; internal API clients, stores and
application-specific hooks belong to `@mobazha/core`. The kit must not depend on `@mobazha/core`.
Host applications connect their implementation through explicit ports, props and policies.

The kit is also not the complete frontend product composer. A product is resolved from build-time
code inclusion, a distribution-owned product profile, authoritative backend capabilities, the
current experience/channel, authorization and readiness. Feature packages declare neutral
requirements; they do not branch on a named public or private product. Private distributions can
compose their own modules through compatible contracts while keeping those modules physically out of
this repository. See the Draft
[Composable Frontend Product Model RFC](https://github.com/mobazha/mobazha-docs/blob/main/rfcs/0003-composable-frontend-product-model.md).

Guest Checkout is the first shared vertical slice. Its public boundary is deliberately layered:

```text
CommerceGuestCheckoutPort -> workflow reducer / React hook -> host-rendered view
```

The port owns only settings and order creation. Hosts provide their concrete API adapter and retain
route ownership, cart and address collection, inventory or supply validation, encryption, payment
policy, order-status polling and navigation. This keeps richer applications from losing behavior
while allowing smaller applications to use `GuestCheckoutPanel` directly:

```tsx
import { createGuestCheckoutPort } from '@mobazha/commerce-kit/checkout';
import { GuestCheckoutPanel } from '@mobazha/commerce-kit/checkout/client';

const guestCheckout = createGuestCheckoutPort(httpClient, {
  settingsPath: '/settings/guest-checkout',
  ordersPath: '/guest/orders',
});

<GuestCheckoutPanel port={guestCheckout} items={items} labels={labels} />;
```

The root and `/checkout` exports are server-safe contracts. Interactive React surfaces use explicit
client entrypoints such as `/checkout/client`, `/product`, `/cart` and `/admin` so packed consumers
preserve their React Server Component boundary.

Product actions support both a neutral default renderer and host rendering. Rich applications can
use `CommerceProductActionButtons.renderAction` to retain their own design-system button, responsive
layout and product-policy wording while Commerce Kit owns the stable `add-to-cart` / `buy-now`
action identity, disabled state and callback wiring. Entity-specific stock, payment, ownership and
asset policy remains in the host; those decisions are not global product-composition capabilities.

Cart summary follows the same pattern. `CommerceCartSummary` remains the neutral card for smaller
applications, while `CommerceCartSummaryContent.renderSummary` exposes normalized item-count, total,
checkout-disabled and checkout-action state without imposing a card. Hosts retain seller grouping,
authentication or registration wording, currency formatting and channel-native CTA adapters.

`createCommerceHttpClient()` applies a 30-second default timeout and sends an `X-Request-ID` unless
the host already supplied one. Hosts can set a default or per-request `timeoutMs`, pass an
`AbortSignal`, and branch on `CommerceHttpError.kind` without parsing error messages.

See [Package boundaries](../../docs/architecture/PACKAGE_BOUNDARIES.md) for the authoritative public
dependency and ownership rules.
