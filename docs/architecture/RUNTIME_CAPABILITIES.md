# Runtime Capability Architecture

## Decision

Mobazha Unified has one frontend product line. Community, hosted and commercial
deployments use the same repository and `main` branch. Backend runtime
capabilities, rather than frontend branches or build-time edition flags, control
which payment methods are visible and executable.

## Authority and projection

The backend publishes a versioned capability snapshot. The frontend stores that
snapshot centrally and projects it through payment selectors, checkout, seller
configuration and order actions.

```text
backend runtime config
        |
        v
central capability store
        |
        +--> seller payment settings
        +--> checkout selector and session validation
        +--> order settlement actions
        +--> marketing and setup summaries
```

UI components must consume the central projection helpers. They must not infer
availability from a coin name, a dormant source file, an installed dependency or
a deployment label.

## Failure behavior

- Optional payment kinds fail closed until a versioned snapshot is available.
- Checkout selections are revalidated when runtime capabilities change.
- A backend may narrow capabilities at any time; the frontend must not widen them.
- Unknown settlement types remain opaque backend instructions. Provider-specific
  routing logic does not belong in public UI components.

## Community profile

The Community Edition backend currently publishes BTC, BCH, LTC and transparent
ZEC payment capabilities. That boundary is owned by the backend distribution.
The shared frontend contains compatibility manifests and tests for the profile,
but does not hard-code it as the maximum capability set.

## Extension direction

Future payment and wallet integrations should use stable adapter contracts:

1. A backend plugin registers a payment method and exposes it in runtime config.
2. An optional frontend adapter supplies only the UI or signing behavior that the
   method requires.
3. Core checkout and order code continue to use provider-neutral identifiers and
   opaque settlement metadata.

Connector-specific dependencies require independent license and security review.
They must remain optional so adding a plugin does not change the license boundary
of the MPL core.
