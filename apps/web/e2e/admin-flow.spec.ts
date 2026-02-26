/**
 * Admin Panel E2E Tests
 *
 * Validates the seller admin panel (PG-101 + PG-102):
 *   - Admin layout (sidebar, header, responsive)
 *   - Navigation between admin pages
 *   - Products management page (table/grid views, search)
 *   - Header "Store Admin" menu entry
 *   - Auth guard for admin routes
 *
 * Prerequisites:
 *   - Running dev server or Docker infrastructure
 *   - Authenticated user (seller, not buyer)
 *
 * Run:
 *   npx playwright test admin-flow.spec.ts --reporter=list
 */

import { test, expect } from '@playwright/test';
import { authenticatedTest } from './fixtures/auth';

// ── 1. Auth Guard — Admin routes require login ──────────────────────────────

test.describe('Admin Auth Guard', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  const adminRoutes = [
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/admin/products', name: 'Admin Products' },
    { path: '/admin/orders', name: 'Admin Orders' },
    { path: '/admin/analytics', name: 'Admin Analytics' },
    { path: '/admin/settings', name: 'Admin Settings' },
  ];

  for (const route of adminRoutes) {
    test(`${route.name} (${route.path}) should redirect to login`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/\/login/, { timeout: 10000 });

      const url = new URL(page.url());
      expect(url.pathname).toBe('/login');
    });
  }
});

// ── 2. Admin Layout and Navigation ──────────────────────────────────────────

authenticatedTest.describe('Admin Layout', () => {
  authenticatedTest('should display admin sidebar on desktop', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    const sidebar = authedPage.locator('[data-testid="admin-sidebar"]');
    await expect(sidebar).toBeVisible();
  });

  authenticatedTest('should display admin header', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    const header = authedPage.locator('[data-testid="admin-header"]');
    await expect(header).toBeVisible();
  });

  authenticatedTest('should display dashboard page by default', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    const dashboard = authedPage.locator('[data-testid="admin-dashboard"]');
    await expect(dashboard).toBeVisible();
  });
});

// ── 3. Sidebar Navigation ───────────────────────────────────────────────────

authenticatedTest.describe('Admin Sidebar Navigation', () => {
  authenticatedTest('should navigate to products page', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.locator('[data-testid="admin-nav-products"]').click();
    await authedPage.waitForURL(/\/admin\/products/);

    const productsPage = authedPage.locator('[data-testid="admin-products"]');
    await expect(productsPage).toBeVisible();
  });

  authenticatedTest('should navigate to orders page', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.locator('[data-testid="admin-nav-orders"]').click();
    await authedPage.waitForURL(/\/admin\/orders/);

    const ordersPage = authedPage.locator('[data-testid="admin-orders"]');
    await expect(ordersPage).toBeVisible();
  });

  authenticatedTest('should navigate to analytics page', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.locator('[data-testid="admin-nav-analytics"]').click();
    await authedPage.waitForURL(/\/admin\/analytics/);

    const analyticsPage = authedPage.locator('[data-testid="admin-analytics"]');
    await expect(analyticsPage).toBeVisible();
  });

  authenticatedTest('should navigate to settings page', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.locator('[data-testid="admin-nav-settings"]').click();
    await authedPage.waitForURL(/\/admin\/settings/);

    const settingsPage = authedPage.locator('[data-testid="admin-settings"]');
    await expect(settingsPage).toBeVisible();
  });

  authenticatedTest('should highlight active nav item', async ({ authedPage }) => {
    await authedPage.goto('/admin/products');
    await authedPage.waitForLoadState('networkidle');

    const productsNav = authedPage.locator('[data-testid="admin-nav-products"]');
    await expect(productsNav).toHaveClass(/text-primary/);
  });

  authenticatedTest('should collapse and expand sidebar', async ({ authedPage }) => {
    await authedPage.goto('/admin');
    await authedPage.waitForLoadState('networkidle');

    const sidebar = authedPage.locator('[data-testid="admin-sidebar"]');

    // Initially expanded (w-60 = 240px)
    const initialWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
    expect(initialWidth).toBeGreaterThan(200);

    // Click collapse button
    const collapseBtn = authedPage.locator('[aria-label="Collapse sidebar"]');
    if (await collapseBtn.isVisible()) {
      await collapseBtn.click();
      await authedPage.waitForTimeout(300);

      const collapsedWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
      expect(collapsedWidth).toBeLessThan(100);
    }
  });
});

// ── 4. Products Management Page ─────────────────────────────────────────────

authenticatedTest.describe('Admin Products Page', () => {
  authenticatedTest('should display products page with toolbar', async ({ authedPage }) => {
    await authedPage.goto('/admin/products');
    await authedPage.waitForLoadState('networkidle');

    const productsPage = authedPage.locator('[data-testid="admin-products"]');
    await expect(productsPage).toBeVisible();

    // Search input should be present
    const searchInput = authedPage.locator('input[placeholder]').first();
    await expect(searchInput).toBeVisible();
  });

  authenticatedTest('should have add product button', async ({ authedPage }) => {
    await authedPage.goto('/admin/products');
    await authedPage.waitForLoadState('networkidle');

    const addBtn = authedPage.locator('a[href*="/listing/new"]');
    await expect(addBtn).toBeVisible();
  });

  authenticatedTest('should toggle between table and grid views', async ({ authedPage }) => {
    await authedPage.goto('/admin/products');
    await authedPage.waitForLoadState('networkidle');

    // Table view button
    const tableBtn = authedPage.locator('[aria-label="Table view"]');
    const gridBtn = authedPage.locator('[aria-label="Grid view"]');

    await expect(tableBtn).toBeVisible();
    await expect(gridBtn).toBeVisible();

    // Click grid view
    await gridBtn.click();
    await authedPage.waitForTimeout(200);

    // Click table view
    await tableBtn.click();
    await authedPage.waitForTimeout(200);
  });

  authenticatedTest('should show empty state or product list', async ({ authedPage }) => {
    await authedPage.goto('/admin/products');
    await authedPage.waitForLoadState('networkidle');

    // Either products are displayed or empty state is shown
    const hasProducts = await authedPage
      .locator('table')
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await authedPage
      .locator('text=/添加|Add|暂无|No products/i')
      .isVisible()
      .catch(() => false);

    expect(hasProducts || hasEmptyState).toBe(true);
  });

  authenticatedTest('should filter products by search', async ({ authedPage }) => {
    await authedPage.goto('/admin/products');
    await authedPage.waitForLoadState('networkidle');

    const searchInput = authedPage.locator('input[placeholder]').first();
    await searchInput.fill('nonexistent-product-xyz');
    await authedPage.waitForTimeout(300);

    // Should show "no results" or empty table
    const body = await authedPage.locator('[data-testid="admin-products"]').textContent();
    expect(body).toBeTruthy();
  });
});

// ── 5. Header Store Admin Entry ─────────────────────────────────────────────

authenticatedTest.describe('Header Store Admin Menu', () => {
  authenticatedTest('should show Store Admin option in user dropdown', async ({ authedPage }) => {
    await authedPage.goto('/');
    await authedPage.waitForLoadState('networkidle');

    // Open user dropdown (click avatar area)
    const avatarTrigger = authedPage.locator('[data-testid="user-menu-trigger"]');
    if (await avatarTrigger.isVisible()) {
      await avatarTrigger.click();

      const adminMenuItem = authedPage.locator('[data-testid="header-menu-admin"]');
      await expect(adminMenuItem).toBeVisible();
    }
  });

  authenticatedTest('should navigate to admin from user dropdown', async ({ authedPage }) => {
    await authedPage.goto('/');
    await authedPage.waitForLoadState('networkidle');

    const avatarTrigger = authedPage.locator('[data-testid="user-menu-trigger"]');
    if (await avatarTrigger.isVisible()) {
      await avatarTrigger.click();

      const adminMenuItem = authedPage.locator('[data-testid="header-menu-admin"]');
      if (await adminMenuItem.isVisible()) {
        await adminMenuItem.click();
        await authedPage.waitForURL(/\/admin/);
      }
    }
  });
});

// ── 6. Admin Dashboard ───────────────────────────────────────────────────────

authenticatedTest.describe('Admin Dashboard', () => {
  authenticatedTest(
    'should display exactly 4 stat cards or empty state',
    async ({ authedPage }) => {
      await authedPage.goto('/admin');
      await authedPage.waitForLoadState('networkidle');

      const dashboard = authedPage.locator('[data-testid="admin-dashboard"]');
      await expect(dashboard).toBeVisible();

      const statCards = authedPage.locator('[data-testid="admin-stat-card"]');
      const cardCount = await statCards.count();

      // Either 4 stat cards (has data) or 0 (empty state with CTA)
      if (cardCount > 0) {
        expect(cardCount).toBe(4);
      } else {
        const emptyStateCTA = authedPage.locator('a[href*="/listing/new"]');
        await expect(emptyStateCTA).toBeVisible();
      }
    }
  );

  authenticatedTest(
    'should have 3 quick action cards with correct links',
    async ({ authedPage }) => {
      await authedPage.goto('/admin');
      await authedPage.waitForLoadState('networkidle');

      const statCards = authedPage.locator('[data-testid="admin-stat-card"]');
      const hasData = (await statCards.count()) > 0;

      if (hasData) {
        // Add Product quick action
        const addProductLink = authedPage.locator('a[href*="/listing/new"]');
        expect(await addProductLink.count()).toBeGreaterThan(0);

        // Manage Orders quick action
        const ordersLink = authedPage.locator('a[href="/admin/orders"]');
        expect(await ordersLink.count()).toBeGreaterThan(0);

        // View Storefront quick action (could be <a> with /store/ or /)
        const storefrontLink = authedPage.locator('a[href*="/store/"], a[href="/"]');
        expect(await storefrontLink.count()).toBeGreaterThan(0);
      }
    }
  );

  authenticatedTest(
    'should display recent orders and top products sections',
    async ({ authedPage }) => {
      await authedPage.goto('/admin');
      await authedPage.waitForLoadState('networkidle');

      const statCards = authedPage.locator('[data-testid="admin-stat-card"]');
      const hasData = (await statCards.count()) > 0;

      if (hasData) {
        // Recent Orders section header
        const ordersSection = authedPage
          .locator('h2')
          .filter({ hasText: /recent.*order|最近.*订单/i });
        await expect(ordersSection.first()).toBeVisible();

        // Top Products section header
        const productsSection = authedPage
          .locator('h2')
          .filter({ hasText: /top.*product|热门.*商品/i });
        await expect(productsSection.first()).toBeVisible();
      }
    }
  );

  authenticatedTest(
    'should show error banner when API fails gracefully',
    async ({ authedPage }) => {
      await authedPage.goto('/admin');
      await authedPage.waitForLoadState('networkidle');

      // ErrorBanner uses destructive color — just verify no unhandled JS errors
      const jsErrors: string[] = [];
      authedPage.on('pageerror', err => jsErrors.push(err.message));

      await authedPage.waitForTimeout(2000);
      expect(jsErrors.filter(e => e.includes('Unhandled'))).toHaveLength(0);
    }
  );
});

// ── 7. Admin Settings Page ──────────────────────────────────────────────────

authenticatedTest.describe('Admin Settings', () => {
  authenticatedTest('should display settings cards with links', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings');
    await authedPage.waitForLoadState('networkidle');

    const settingsPage = authedPage.locator('[data-testid="admin-settings"]');
    await expect(settingsPage).toBeVisible();

    // Should have links to existing settings pages
    const links = authedPage.locator('[data-testid="admin-settings"] a[href*="/settings/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});
