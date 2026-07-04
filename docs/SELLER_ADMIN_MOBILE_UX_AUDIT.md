# Seller Admin Mobile UX Audit — Standalone Store (375×667, Telegram Mini App)

> **Dated evidence:** This audit records observations for its reviewed build.
> It is not current public product guidance; see <https://docs.mobazha.org>.

**Date:** 2026-03-08  
**Viewport:** 375×667 (iPhone SE) — Telegram Mini App simulation  
**Target:** Mobazha standalone store seller admin experience  
**Base URL:** http://localhost:3002

---

## How to Run the Audit Script

Playwright browsers must be installed. Run:

```bash
cd apps/web
npx playwright install chromium
E2E_STANDALONE_PASS=test-standalone-pass npx playwright test standalone-seller-admin-mobile-audit --project=standalone
```

Screenshots will be saved to `apps/web/audit-output/`.

**Prerequisites:**

- Standalone store running on port 3002 (`pnpm dev --mode standalone --port 3002` or equivalent)
- Admin password: `test-standalone-pass` (or set `E2E_STANDALONE_PASS`)

---

## Access & Navigation

### Admin Entry Points

| Route             | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `/login`          | Seller Basic Auth (admin + password) and Buyer OAuth |
| `/admin`          | Dashboard (requires auth)                            |
| `/admin/products` | Product list                                         |
| `/admin/orders`   | Order list                                           |
| `/admin/settings` | Settings hub                                         |

### Critical: No Visible Admin Link on Homepage (Mobile)

- **Issue:** On standalone homepage, there is no explicit "Store Admin" or "Login" link in the buyer-facing MobileNav (Home, Orders, Cart, Chat, Me).
- **Impact:** Sellers must know to navigate to `/login` or `/admin` directly. In Telegram Mini App, users typically arrive via a link; if they land on the store homepage, they have no obvious way to access admin.
- **Severity:** **Critical**
- **Recommendation:** Add a "Store Admin" / "Manage Store" link in the header or footer when in standalone mode, or a floating button for authenticated sellers. Alternatively, add an admin entry to MobileNav when `authMode === 'basic'` (seller).

### Direct `/admin` Without Auth

- **Issue:** Navigating to `/admin` when unauthenticated triggers AuthGuard → redirect to `/login`. This is correct behavior.
- **Status:** ✅ Working as designed.

---

## Issues by Category

### 1. Layout & Overflow

| ID  | Severity        | Description                                                                                                                                                                        |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L1  | **Major**       | Admin layout uses `pb-20 lg:pb-6` for main content to avoid overlap with bottom tabs. On 375px, verify no content is cut off by the 56px bottom tab bar.                           |
| L2  | **Minor**       | Dashboard stat cards use `grid-cols-2 lg:grid-cols-4` — 2×2 on mobile is acceptable, but card labels (`admin.dashboard.activeProducts`, etc.) may truncate on very narrow screens. |
| L3  | **Minor**       | Recent orders / top products use horizontal scroll (`overflow-x-auto`, `min-w-[260px]`) on mobile. Ensure scroll indicators or snap points are visible.                            |
| L4  | **Enhancement** | Admin settings page uses `grid-cols-1 sm:grid-cols-2` — single column on mobile is fine; cards may feel tall.                                                                      |

### 2. Navigation

| ID  | Severity        | Description                                                                                                                                                                      |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | **Critical**    | No admin entry from standalone homepage for anonymous or first-time sellers. See "Admin Entry Points" above.                                                                     |
| N2  | **Major**       | AdminMobileBottomTabs shows 4 tabs (Dashboard, Products, Orders, Settings) with `text-[10px]` labels. At 375px, labels may be cramped; consider icon-only on very small screens. |
| N3  | **Minor**       | Admin bottom tabs use `pb-[env(safe-area-inset-bottom)]` — good for notched devices.                                                                                             |
| N4  | **Minor**       | Admin sidebar is `hidden lg:flex` — correct; mobile uses bottom tabs. No hamburger menu on mobile for admin.                                                                     |
| N5  | **Enhancement** | No breadcrumbs in admin. Deep settings paths (e.g. `/admin/settings/access-control/product-groups/[id]`) use `mobileBackHref` for back navigation — acceptable.                  |

### 3. Forms & Inputs

| ID  | Severity        | Description                                                                                                                                                                                                     |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | **Major**       | Login page: Standalone mode shows both "Store Admin" (username + password) and "Buyer" (OAuth) sections. Form uses `px-4 py-3` inputs. On 375px, the card has `mx-4` margin — verify inputs are not too narrow. |
| F2  | **Major**       | Login standalone: Seller form has no explicit `<label>` elements (only placeholders). Accessibility: add `aria-label` or visible labels for screen readers.                                                     |
| F3  | **Minor**       | Product add form (`/listing/new`) is a multi-step wizard. Mobile layout uses `md:hidden` for compact views — ensure all steps are usable at 375px.                                                              |
| F4  | **Minor**       | Admin product list: DropdownMenu for actions uses `min-w-[44px] min-h-[44px]` for trigger — meets touch target.                                                                                                 |
| F5  | **Enhancement** | Login inputs use `bg-white/10` on dark gradient — ensure sufficient contrast for placeholder text (`placeholder-white/50`).                                                                                     |

### 4. Tables & Lists

| ID  | Severity        | Description                                                                                                                                                                          |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1  | **Major**       | Orders page: Uses `OrderTable` on desktop and `OrderListCompact` on mobile (`useIsDesktop`). Verify OrderListCompact is readable at 375px — no horizontal scroll for essential info. |
| T2  | **Major**       | Products page: Uses `useIsMobile` to switch between table and grid/card view. Mobile shows card layout; ensure product cards show title, price, status without overflow.             |
| T3  | **Minor**       | Product actions dropdown: On mobile, `DropdownMenuContent` has `w-40`. Verify it doesn’t overflow viewport on narrow screens.                                                        |
| T4  | **Enhancement** | Admin settings cards: `SettingsCard` uses `flex items-start gap-4 p-5`. On 375px, description text may wrap; ensure no truncation of critical info.                                  |

### 5. UX Flow

| ID  | Severity        | Description                                                                                                                                                                                                                     |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | **Critical**    | First-time seller flow: After Basic Auth login, redirect goes to `redirect` param or `/`. If no redirect, seller lands on homepage with no clear "Go to Admin" CTA. Consider redirecting to `/admin` by default for Basic Auth. |
| U2  | **Major**       | Onboarding: Empty dashboard shows `OnboardingWizard`. Verify wizard steps are usable on 375px and that "Skip" is easily tappable.                                                                                               |
| U3  | **Minor**       | Dashboard quick actions: "Add Product" links to `/listing/new?from=admin`. Ensure back navigation returns to admin.                                                                                                             |
| U4  | **Minor**       | "View Store" in standalone mode goes to `/` (homepage). Correct.                                                                                                                                                                |
| U5  | **Enhancement** | No explicit "Switch to buyer view" when seller is logged in. Sellers may want to browse as buyer; consider a toggle or link.                                                                                                    |

### 6. Mobile-Specific

| ID  | Severity        | Description                                                                                                                                                                     |
| --- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Major**       | Product list FAB: `bottom-24` positions the "Add" FAB above the AdminMobileBottomTabs (h-14). At 375×667, the FAB could overlap scrollable content. Verify z-index and spacing. |
| M2  | **Minor**       | AdminHeader: On mobile (`lg:hidden`), shows MobazhaLogo + "Admin" title. Avatar and user menu are in a dropdown — ensure touch target is ≥44px.                                 |
| M3  | **Minor**       | Header has NotificationDropdown, LanguageSwitcher, ThemeSwitcher. On 375px, these may crowd the header; compact variants are used.                                              |
| M4  | **Enhancement** | Admin layout main content: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. On 375px, `px-4` (16px) is reasonable.                                                                     |
| M5  | **Enhancement** | Telegram Mini App: No explicit MainButton/BackButton integration in admin. Consider TG WebApp API for native feel.                                                              |

### 7. Confirmation Dialogs

| ID  | Severity        | Description                                                                                        |
| --- | --------------- | -------------------------------------------------------------------------------------------------- |
| C1  | **Minor**       | Product delete uses `AlertDialog` — correct pattern. Ensure dialog is not cut off on 375px.        |
| C2  | **Enhancement** | Order actions (confirm, ship, etc.): Verify confirmation dialogs use full-width buttons on mobile. |

---

## Summary by Severity

| Severity    | Count |
| ----------- | ----- |
| Critical    | 2     |
| Major       | 8     |
| Minor       | 12    |
| Enhancement | 9     |

---

## Recommended Fix Order

1. **Critical:** Add admin entry point on standalone homepage (link or button to `/login` or `/admin`).
2. **Critical:** Default redirect after Basic Auth login to `/admin` when no `redirect` param.
3. **Major:** Verify OrderListCompact and product cards at 375px (no overflow).
4. **Major:** Add visible labels or aria-labels to login form.
5. **Major:** Verify FAB + bottom tabs layout (no overlap).
6. **Major:** Review AdminMobileBottomTabs label size on very narrow screens.

---

## Screenshot Checklist (When Running Audit)

After running the Playwright script, verify:

- [ ] `01-homepage.png` — Homepage loads; note if admin link is visible
- [ ] `02-homepage-nav.png` — Homepage with nav; `02-admin-direct.png` — /admin redirect to login
- [ ] `03-login-page.png` — Login form fits 375px; both Store Admin and Buyer sections visible
- [ ] `04-after-login.png` — Post-login destination
- [ ] `05-admin-dashboard.png` — Stat cards, quick actions, lists
- [ ] `06-admin-products.png` — Product list/cards
- [ ] `07-admin-product-add.png` — Listing wizard first step
- [ ] `08-admin-orders.png` — Order list
- [ ] `09-admin-settings.png` — Settings hub
- [ ] `10-admin-settings-profile.png` — Profile settings
- [ ] `11-admin-bottom-tabs.png` — Bottom tab bar visible and not overlapping content

---

## References

- Login page: `apps/web/src/app/login/page.tsx`
- Admin layout: `apps/web/src/app/admin/layout.tsx`
- AdminMobileBottomTabs: `apps/web/src/components/admin/AdminMobileBottomTabs.tsx`
- Mobile UX rules: `.cursor/skills/mobile-ux-guide/`
- Visual check rules: `.cursor/rules/visual-check-rules.mdc`
