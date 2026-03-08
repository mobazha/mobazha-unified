# Cart & Checkout UX Audit Report — Standalone Store Mobile (375×667)

**Date:** 2026-03-08  
**Audit Scope:** Mobazha standalone store (decentralized e-commerce) in Telegram Mini App mobile mode  
**Viewport:** 375×667 (iPhone SE)

---

## Prerequisites for Manual Testing

1. **Start standalone frontend:**

   ```bash
   cd ~/dev/openbazaar/mobazha-unified/apps/web
   DOTENV=.env.standalone.local pnpm dev --mode standalone --port 3002
   ```

2. **Ensure Docker E2E + standalone node + seed data:**

   ```bash
   cd ~/dev/mobazha/tests/e2e/docker
   make demo && make seed
   ```

3. **Run automated audit (optional):**

   ```bash
   cd ~/dev/openbazaar/mobazha-unified/apps/web
   npx playwright install chromium
   CI= STANDALONE_BASE_URL=http://localhost:3002 npx playwright test standalone-cart-checkout-ux-audit --project=standalone --reporter=list
   ```

   Screenshots will be saved to `playwright-report/cart-checkout-audit/`.

4. **Manual test in browser:** Set viewport to 375×667, navigate to `http://localhost:3002`.

---

## Issues Found (Code-Based Analysis)

### Critical

| ID      | Issue                                              | Location                           | Description                                                                                                                                                                                                                                                  |
| ------- | -------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C-1** | No toast for Add to Cart                           | `useProductDetail.ts`              | Add to cart only shows a checkmark on the button (`cartSuccess`) for 3 seconds. No toast notification. Per `component-rules.mdc`: "加入购物车需有明确的确认提示（toast 或 badge 动画）".                                                                     |
| **C-2** | Multi-vendor cart: no global checkout              | `CartMobile.tsx` L304–322          | When cart has items from multiple vendors, the fixed bottom bar is hidden (`groups.length === 1`). Users must checkout per vendor. No clear "Checkout all" or explanation of multi-vendor flow.                                                              |
| **C-3** | Cart redirects to login despite being public route | `cart/layout.tsx`, `AuthGuard.tsx` | `routeConfig.ts` marks `/cart` as public, but `AuthGuard` does NOT check `isPublicRoute()`. It always redirects unauthenticated users to `/login`. Anonymous users cannot view cart. **Fix:** AuthGuard should skip redirect when `isPublicRoute(pathname)`. |

### Major

| ID      | Issue                                         | Location                       | Description                                                                                                                                                                  |
| ------- | --------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M-1** | Add to Cart disabled when `!paymentAvailable` | `ProductDetailMobile.tsx` L627 | Button shows "Payment Unavailable" when `paymentAvailable` is false. No explanation of why (e.g. "Seller has not set up payment methods"). Non-crypto users may be confused. |
| **M-2** | Payment selection UX for non-crypto users     | `CheckoutMobile.tsx`           | Checkout shows crypto + fiat options. For non-crypto users, fiat (Stripe/PayPal) should be prominent. Verify layout and copy clarity.                                        |
| **M-3** | Cart icon badge visibility                    | `MobileNav.tsx`                | Cart count badge may not be visible or prominent on 375px. Verify `data-testid="cart-badge"` or equivalent exists and is updated after add-to-cart.                          |
| **M-4** | Product link in cart requires `peerID`        | `CartMobile.tsx` L79–80        | `Link href={/product/${item.listing.slug}}` — standalone products may need `?peerID=` for correct routing. Verify cart item links work for standalone.                       |
| **M-5** | Empty cart → checkout flow                    | `checkout.spec.ts`             | Unauthenticated users going to `/checkout` are redirected to `/login`. Ensure redirect preserves `returnUrl` so user returns to checkout after OAuth.                        |

### Minor

| ID      | Issue                           | Location                    | Description                                                                                                              |
| ------- | ------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **m-1** | Swipe-to-delete discoverability | `CartMobile.tsx` L36–75     | SwipeableCartItem has no hint that swiping reveals delete. Consider a subtle hint or first-time tooltip.                 |
| **m-2** | Quantity stepper touch targets  | `CartMobile.tsx` L112–130   | Minus/Plus buttons are `w-11 h-11` (44px) — meets minimum. Verify `touch-feedback` class provides adequate tap feedback. |
| **m-3** | Order notes field               | `CheckoutMobile.tsx`        | Order notes may be below fold on small screens. Ensure it's visible before Place Order.                                  |
| **m-4** | Discount code input             | `DiscountInput.tsx`         | Verify discount input is mobile-friendly (no keyboard overlap, proper `inputMode`).                                      |
| **m-5** | Address form mobile             | `CheckoutAddressModals.tsx` | Shipping address forms: verify `inputMode`, `enterKeyHint`, and no keyboard overlap.                                     |

### Enhancement

| ID      | Issue                 | Location                  | Description                                                                                                           |
| ------- | --------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **E-1** | Add to Cart animation | `ProductDetailMobile.tsx` | Checkmark feedback is brief. Consider subtle badge pulse or cart icon bounce.                                         |
| **E-2** | Empty cart CTA        | `CartMobile.tsx` L244–246 | "Continue Shopping" links to `/`. Consider linking to store homepage or last visited product.                         |
| **E-3** | Error states          | `checkout.spec.ts`        | Network error handling: verify error messages display and retry is available.                                         |
| **E-4** | Standalone OAuth flow | `AuthProvider.tsx`        | Standalone: buyer OAuth uses SaaS Casdoor. Verify popup/redirect works in Telegram WebView (may need in-app browser). |

---

## Flow Summary

### 1. Product Detail → Add to Cart

- **Add to Cart button:** `ProductDetailMobile.tsx` L621–645. Visible when `stock > 0` and `paymentAvailable`.
- **Feedback:** Button shows checkmark (`cartSuccess`) for 3 seconds. No toast.
- **Cart count:** `useCartStore` updates; `MobileNav` should show badge. Verify badge exists and updates.

### 2. Cart Page

- **Route:** `/cart` — public (no login required).
- **Layout:** `CartMobile` with vendor-grouped sections. Each section has its own Checkout button.
- **Multi-vendor:** Bottom bar only when `groups.length === 1`. Otherwise, per-vendor checkout only.
- **Empty state:** Shopping bag icon, "Cart is empty" message, "Continue Shopping" button.

### 3. Checkout

- **Route:** `/checkout` — private (requires login).
- **Auth:** Unauthenticated users redirect to `/login`. Standalone uses SaaS Casdoor OAuth for buyer identity.
- **Steps:** Order summary, shipping address, shipping method, discount, payment method, Place Order.

### 4. Standalone OAuth

- **Config:** `.env.standalone.local` — `NEXT_PUBLIC_SAAS_URL`, `NEXT_PUBLIC_CASDOOR_URL`.
- **Flow:** OAuth popup/redirect to Casdoor; user logs in; returns to app with JWT.
- **Telegram WebView:** May need `tg.openLink()` for OAuth in external browser.

---

## Screenshot Checklist (Manual)

Capture these at 375×667:

1. `01-homepage.png` — Standalone homepage
2. `02-product-detail.png` — Product before Add to Cart
3. `03-after-add-to-cart.png` — After Add to Cart (check badge + feedback)
4. `04-cart-page.png` — Cart with items
5. `05-checkout-or-login.png` — Checkout or login redirect
6. `06-empty-cart.png` — Empty cart state
7. `07-checkout-auth-prompt.png` — Login prompt when going to checkout unauthenticated

---

## Recommendations

1. **Add toast for Add to Cart** — Use `useToast` per `no-browser-dialogs.mdc`. Example: `toast({ description: t('product.addedToCart'), duration: 1500 })`.
2. **Multi-vendor cart UX** — Add a clear message when `groups.length > 1`: "Checkout each store separately" or "Your cart contains items from multiple stores. Proceed to checkout per store."
3. **Payment Unavailable clarity** — Add tooltip or link: "Seller has not configured payment methods."
4. **Verify cart layout auth** — Ensure cart is accessible without login when `isPublicRoute('/cart')` is true.
5. **Run Playwright audit** — After `npx playwright install`, run the audit script to capture screenshots and validate flows.
