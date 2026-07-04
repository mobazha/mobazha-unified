# Frontend Product Composition

## Scope

Unified assembles frontend products from independent deployment, root-experience, authentication,
presentation-channel, network-policy, code-inclusion and backend-capability dimensions. Product
names are reviewed profiles over those dimensions; feature code must not switch on product names.

This document records the first implementation slice of the cross-repository composable frontend
product model. It is implementation guidance, not a public plugin or extension contract.

## Package and host boundary

The application shell owns product composition because it is the only layer allowed to consume all
three workspace packages:

```text
application shell / composition
  -> @mobazha/core          runtime config and internal state
  -> @mobazha/ui            domain-neutral visual foundations
  -> @mobazha/commerce-kit  public commerce feature provider
```

The pure internal resolver lives in `packages/core/config/frontendComposition.ts`; the application
passes request context, presentation channel and build inclusion into it. Commerce Kit remains a
feature provider and does not become the complete product composer, router or provider graph.

## Condition inventory and ownership

The initial audit found several condition families. They must be migrated by responsibility rather
than deleted mechanically:

| Existing condition                                               | Dimension                          | Keep at                                 | Migrate when                                                         |
| ---------------------------------------------------------------- | ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `__SOVEREIGN__` around Vite imports and route-table construction | code inclusion                     | build entrypoint                        | never replace physical code pruning with a runtime flag              |
| `__SOVEREIGN__` in feature visibility                            | code inclusion/profile             | resolved composition                    | the same feature also contributes a route, navigation item or action |
| `isStandaloneMode()` in API/auth transport                       | authentication/deployment          | host infrastructure                     | only after Runtime Config owns an equivalent transport decision      |
| `isStandaloneMode()` in feature visibility                       | deployment used as a feature proxy | resolved composition                    | replace with explicit capability and context requirements            |
| `experience.kind` at the root experience switch                  | root experience                    | application shell                       | keep as an explicit root projection                                  |
| `usePlatform()` for responsive layout                            | viewport/channel presentation      | UI/application view                     | do not turn responsive layout into product identity                  |
| `usePlatform()` for channel capability                           | presentation channel               | resolved composition or channel adapter | when the channel changes feature availability                        |
| `useRuntimeCapability()` in isolated UI branches                 | business capability                | resolved composition                    | when routes/navigation/actions need the same decision                |
| storefront request context                                       | request-scoped experience          | application shell input                 | pass explicitly; it is not equivalent to standalone deployment       |

The first migrated formulas are Guest Checkout, marketplace operator navigation/routes and
marketplace seller-review navigation/routes. Authentication visibility remains a host rendering
concern; backend authorization remains authoritative for every operation.

## Supported profile baseline

The first resolver accepts only currently exercised shell profiles:

| Deployment | Root experience | Auth transport      | Channels      | Status    |
| ---------- | --------------- | ------------------- | ------------- | --------- |
| hosted     | platform        | hosted              | web, embedded | supported |
| hosted     | store           | hosted              | web, embedded | supported |
| hosted     | marketplace     | hosted              | web, embedded | supported |
| standalone | store           | standalone or basic | web, embedded | supported |
| sovereign  | store           | standalone or basic | web, embedded | supported |

Other combinations are unsupported until a real distribution proves them. In particular,
standalone/sovereign marketplace roots and the browser-extension application shell are not silently
treated as supported by this matrix. The extension keeps its existing application-local routing
until it consumes the same Runtime Config and composition lifecycle.

## Resolver contract

`resolveFrontendComposition` is pure and receives:

- the validated Runtime Config and its readiness status;
- presentation channel and request-scoped storefront context;
- the host-supported profile matrix;
- the build-included feature catalog.

It returns `pending`, `ready` or `invalid`, enabled and excluded feature IDs, and structured
diagnostics. Important invariants are:

1. pending capability state is not an authoritative denial and does not become a false 404;
2. the backend capability snapshot can enable only code already present in the build catalog;
3. profile and presentation policy can narrow backend availability but cannot widen it;
4. unsupported profiles, duplicate feature IDs and invalid runtime state fail closed;
5. restricted-egress profiles exclude features that require external resources;
6. diagnostics use neutral feature IDs and never reveal credentials or distribution-local code.

The first version resolves feature eligibility used by routes and navigation. Provider, workflow and
action contribution types remain unchanged until representative product slices require them.

## Migration rule

Move one vertical slice at a time:

1. add its neutral feature definition and requirements to the build catalog;
2. make route boundaries and navigation read the same resolved feature ID;
3. preserve existing auth boundaries and API adapters;
4. add pending, enabled, denied, unsupported-profile and build-absence tests;
5. remove the old product-identity formula only after equivalent behavior passes.

Compile-time route/import pruning remains in place. A runtime resolver is not a substitute for
physical absence of distribution-local source.

## Next slices

After the baseline proves stable, migrate product actions, cart summary and the smallest reusable
admin primitives in that order. A public composition package, dynamic provider graph, universal
manifest, Agent surface protocol or runtime plugin system is not part of this implementation stage.
