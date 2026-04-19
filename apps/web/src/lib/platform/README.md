# `@/lib/platform` — Cross-Channel Capability Abstraction

MVP-1 of the Mini App roadmap. Gives business code a single set of hooks
that work on Telegram Mini App, Web, and (stubbed) Discord Activity.

Spec: [`docs/miniapp/MINIAPP_MVP_EXECUTION.md §3`](../../../../../../go/src/github.com/mobazha/mobazha_hosting/docs/miniapp/MINIAPP_MVP_EXECUTION.md)

## What's in the box

| Hook            | Purpose                                        | TG backend          | Web backend                             |
| --------------- | ---------------------------------------------- | ------------------- | --------------------------------------- |
| `usePrimaryCTA` | Bottom CTA button (Checkout / Add to cart ...) | `MainButton`        | no-op (`isNative=false`, render inline) |
| `useBackAction` | Back button + LIFO handler stack (G1)          | `BackButton`        | `popstate` + history sentinel           |
| `useConfirm`    | Confirm / alert dialog                         | `showConfirm/Alert` | `window.confirm/alert`                  |
| `useHaptic`     | Success / warning / error / selection / impact | `HapticFeedback`    | `navigator.vibrate` (Android only)      |
| `useShare`      | Native share sheet                             | `t.me/share/url`    | `navigator.share` → clipboard fallback  |

## How channel detection works

Today the provider simply asks `useTGMiniApp()` whether the Telegram SDK is
present and routes to the TG adapter when it is. Future channels (Discord
Activity) slot in by adding a detector + adapter — see "Adding a new channel".

## Business-code guidelines

1. **Never** `import { useTGMainButton } from '@/hooks/...'` in new code.
   Use `usePrimaryCTA` / `useBackAction`. The old hooks are kept only as TG
   adapter internals and will be removed post-MVP-1.
2. **Never** read `window.Telegram.WebApp` directly. If you need a capability
   that isn't listed above, extend the interface (see "Adding a new capability").
3. **Do not** branch on `capabilities.channel` for business logic — that
   field is for analytics/logging only. Branch on the `isNative` flag of the
   individual capability instead (e.g. `primaryCTA.isNative`).
4. **Primary CTA is a singleton per app instance.** Only one top-level
   component per route should call `setText` on the MainButton.

## Provider placement

```tsx
// apps/web/src/app/providers.tsx (or equivalent root)
<TGMiniAppProvider>
  <PlatformProvider>{children}</PlatformProvider>
</TGMiniAppProvider>
```

`PlatformProvider` depends on `TGMiniAppProvider` for the SDK reference, so
it must nest inside.

## G1 — BackAction stack semantics

Drawer/modal example:

```tsx
function AddressEditor({ open, onClose }) {
  const back = useBackAction();
  useEffect(() => {
    if (!open) return;
    return back.pushHandler(onClose);
  }, [open, onClose, back]);
  ...
}
```

Guarantees:

- Most recent `push` wins (LIFO). Two nested drawers → outer one still there
  after inner closes.
- Stack empty → TG BackButton hidden, Web `popstate` listener removed.
- `pushHandler(fn)` returns a single-use cleanup; calling it twice is a
  no-op (Strict Mode safe).

## Adding a new channel

1. Create `adapters/<channel>.ts` implementing the 5 capabilities.
2. Add detection in `context.tsx` (e.g. check for Discord's embedded SDK).
3. Add a row to the table above; ensure every capability returns a sensible
   value (prefer no-ops with `isSupported:false` over throwing).
4. Add a unit test under `__tests__/<channel>-adapter.test.ts` asserting
   no-op parity and any channel-specific behavior.

## Adding a new capability

1. Define the interface in `types.ts`. Keep it minimal — abstract only what
   existing business code uses, not speculative future features.
2. Add a noop implementation in `adapters/noop.ts`.
3. Implement TG + Web adapters. Prefer `isSupported` / `isNative` flags over
   throwing for unsupported operations.
4. Add a narrow hook under `hooks/` + re-export from `index.ts`.
5. Test: TG adapter with SDK mocks, Web adapter with JSDOM.

## Migration checklist

See §3.6 of the execution doc. MVP targets:

- `apps/web/src/components/Cart/CartMobile.tsx`
- `apps/web/src/components/Checkout/CheckoutMobile.tsx`
- `apps/web/src/components/Product/ProductDetail.tsx`
- `apps/web/src/hooks/useCloseGuard.ts` (optional — closing-confirmation
  is not in the 5 MVP capabilities; revisit post-MVP).
- `apps/web/src/components/TGMiniAppProvider/TGBackButtonManager.tsx`
  (currently a page-level back coordinator; migrate to `useBackAction.pushHandler`).
