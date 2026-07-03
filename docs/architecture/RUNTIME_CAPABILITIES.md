# Runtime Product Composition

## Decision

Mobazha Unified has one public repository, one `main` branch, and one shared web
application. Standalone Store, Hosted Store, Marketplace and Sovereign are composed
from four orthogonal runtime axes instead of frontend forks:

- `authMode`: authentication transport only;
- `deployment`: `hosted`, `standalone`, or `sovereign`;
- `experience`: root product shell (`platform`, `store`, or `marketplace`);
- `capabilities`: backend-implemented product behavior.

Runtime config schema V3 is the only supported bootstrap contract. The product
has not launched, so V2 flat fields and edition-based frontend branching were
removed instead of retained as compatibility aliases.

## Authority

```text
runtime-config.js (shell-owned deployment/experience/auth/brand)
        |
        v
central RuntimeConfig store
        ^
        |
GET /v1/runtime-config (backend-owned features/capabilities)
```

The bootstrap shell selects deployment, experience, authentication transport and
branding before React mounts. A later backend refresh replaces only features and
capabilities, so a dedicated marketplace domain cannot be reset to the platform
home by a generic SaaS API response.

`capabilitiesReady` distinguishes an intentional denial from a shell placeholder.
Route boundaries render a loading/error state until an authoritative backend
snapshot arrives and only then render Not Found for a disabled capability.

Capabilities control availability, permissions control the current actor, and
feature flags control experiments or kill switches. None of these substitutes
for server-side authorization.

## Schema V3

```typescript
interface RuntimeConfig {
  schemaVersion: 3;
  authMode: 'hosted' | 'basic' | 'standalone';
  deployment: {
    mode: 'hosted' | 'standalone' | 'sovereign';
    allowExternalResources: boolean;
  };
  experience:
    | { kind: 'platform' | 'store' }
    | { kind: 'marketplace'; marketplaceIdentifier: string };
  capabilitiesReady: boolean;
  features: Record<string, RuntimeFeatureEntry>;
  capabilities: {
    commerce: { storefront: boolean; storeAdmin: boolean; checkout: boolean };
    marketplace: {
      discovery: boolean;
      operator: boolean;
      selling: boolean;
      curation: boolean;
      sellerReview: boolean;
      customDomains: boolean;
      releasePublishing: boolean;
      attribution: boolean;
    };
    sovereign: { isolatedRuntime: boolean; managedFleet: boolean };
    payments: { methods: RuntimePaymentCapability[] };
  };
}
```

## Supported compositions

| Composition           | Deployment | Experience  | Product capabilities                         |
| --------------------- | ---------- | ----------- | -------------------------------------------- |
| Standalone Store      | standalone | store       | commerce + allowlisted payments              |
| Hosted Platform       | hosted     | platform    | commerce + marketplace + extended payments   |
| Dedicated Marketplace | hosted     | marketplace | commerce + marketplace                       |
| Sovereign             | sovereign  | store       | commerce + isolated runtime + local payments  |

The default manifest is release metadata and a payment fallback profile. It is
not a global frontend identity, and business UI must not branch on an edition
name.

## UI rules

- Components consume `useRuntimeCapability()` or typed projection helpers.
- Storefront, Checkout, Store Admin, Marketplace and Operator routes fail closed
  when their capability is absent.
- Fine-grained Operator requests and controls independently consume curation,
  seller-review, custom-domain, release-publishing and attribution capabilities.
- Navigation uses the same capability keys as route boundaries.
- Auth mode may choose OAuth, Basic or popup behavior, but must not infer product
  availability.
- Sovereign build-time aliases remain only where dependencies must be physically
  removed from the bundle; ordinary UI variation uses runtime capabilities.
- Unknown or malformed runtime config does not override compile-time shell-owned
  authentication or endpoint settings. Its in-memory fallback denies capabilities
  and external resources until an authoritative V3 snapshot is available.

## Payment extensions

Payment and wallet integrations continue to use stable adapter contracts:

1. A backend plugin registers a payment method and exposes it in runtime config.
2. An optional frontend adapter supplies only required UI or signing behavior.
3. Core checkout and order code use provider-neutral identifiers and opaque
   settlement metadata.

Connector-specific dependencies require independent license and security review
and remain optional so they do not alter the MPL core boundary.
