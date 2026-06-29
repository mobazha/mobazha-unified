/**
 * UX 全量页面视觉审核测试
 *
 * 目标：对所有 70+ 页面进行 Desktop + Mobile 双端截图，
 * 用于产品设计师和 UX 设计师审核页面质量。
 *
 * 运行方式：
 *   CI= npx playwright test ux-audit.spec.ts --project=chromium --reporter=list
 *   CI= npx playwright test ux-audit.spec.ts --project="Mobile Chrome" --reporter=list
 */

import { test, expect, type Page } from '@playwright/test';
import { performCasdoorLogin, getCasdoorToken, getPeerID, BACKEND_URL } from './fixtures/auth';

const SCREENSHOT_DIR = 'test-results/ux-audit';

async function hideDevOverlays(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [data-nextjs-toast], nextjs-portal, [data-nextjs-dialog-overlay],
      [data-nextjs-dialog], [class*="Compiling"], [class*="compiling"],
      [class*="react-devtools"], [id*="__next_dev"], [class*="__next"],
      button:has-text("issues"), [class*="Issues"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `,
  });
}

async function waitForPageStable(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(1200);
  await hideDevOverlays(page);
  await page.waitForTimeout(300);
}

async function takeFullScreenshot(page: Page, name: string): Promise<void> {
  const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
  const prefix = isMobile ? 'mobile' : 'desktop';
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/${prefix}-${name}.png`,
    fullPage: true,
  });
}

// ============================================================
// Section 1: 公开页面（无需登录）
// ============================================================

const publicPages: Array<{ name: string; path: string; description: string }> = [
  { name: '01-home', path: '/', description: '首页 - Hero + 推荐商品' },
  { name: '02-search-empty', path: '/search', description: '搜索页 - 空状态' },
  { name: '03-search-results', path: '/search?q=test', description: '搜索页 - 有结果' },
  { name: '04-marketplace-list', path: '/marketplace', description: '集市列表' },
  { name: '05-moderators-list', path: '/moderators', description: '仲裁员列表' },
  { name: '06-login', path: '/login', description: '登录页' },
  { name: '07-policy-terms', path: '/policies/terms', description: '服务条款' },
  { name: '08-policy-privacy', path: '/policies/privacy', description: '隐私政策' },
  { name: '09-policy-shipping', path: '/policies/shipping', description: '配送政策' },
  { name: '10-policy-returns', path: '/policies/returns', description: '退换政策' },
  { name: '11-offline', path: '/offline', description: '离线页' },
  { name: '12-not-found', path: '/nonexistent-page-404', description: '404 页面' },
];

test.describe('UX Audit - Public Pages (No Auth)', () => {
  for (const pageInfo of publicPages) {
    test(`[${pageInfo.name}] ${pageInfo.description}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await waitForPageStable(page);
      await takeFullScreenshot(page, pageInfo.name);
    });
  }
});

// ============================================================
// Section 2: 需要登录的核心页面
// ============================================================

const authedCorePages: Array<{ name: string; path: string; description: string }> = [
  { name: '20-profile', path: '/profile', description: '个人资料' },
  { name: '21-me', path: '/me', description: '我的账户' },
  { name: '22-notifications', path: '/notifications', description: '通知中心' },
  { name: '23-cart', path: '/cart', description: '购物车' },
  { name: '24-wallet-overview', path: '/wallet', description: '钱包总览' },
  { name: '25-orders-list', path: '/orders', description: '订单列表' },
  { name: '26-onboarding', path: '/onboarding', description: '新手引导' },
  { name: '27-rwa-dashboard', path: '/rwa-dashboard', description: 'RWA 仪表盘' },
];

const authedListingPages: Array<{ name: string; path: string; description: string }> = [
  { name: '30-listing-new', path: '/listing/new', description: '创建商品' },
  { name: '31-listing-import', path: '/listing/import', description: '导入商品' },
];

const authedCheckoutPages: Array<{ name: string; path: string; description: string }> = [
  { name: '40-checkout', path: '/checkout', description: '结账页' },
  { name: '41-checkout-payment', path: '/checkout/payment-method', description: '选择支付方式' },
  { name: '42-checkout-moderator', path: '/checkout/moderator', description: '选择仲裁员' },
  { name: '43-checkout-confirm', path: '/checkout/confirmation', description: '订单确认' },
  { name: '44-payment', path: '/payment', description: '支付处理' },
];

const authedModeratorPages: Array<{ name: string; path: string; description: string }> = [
  { name: '50-cases', path: '/cases', description: '争议案件列表' },
];

test.describe('UX Audit - Authenticated Core Pages', () => {
  test.beforeEach(async ({ page }) => {
    await performCasdoorLogin(page);
  });

  for (const pageInfo of authedCorePages) {
    test(`[${pageInfo.name}] ${pageInfo.description}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await waitForPageStable(page);
      await takeFullScreenshot(page, pageInfo.name);
    });
  }

  for (const pageInfo of authedListingPages) {
    test(`[${pageInfo.name}] ${pageInfo.description}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await waitForPageStable(page);
      await takeFullScreenshot(page, pageInfo.name);
    });
  }

  for (const pageInfo of authedCheckoutPages) {
    test(`[${pageInfo.name}] ${pageInfo.description}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await waitForPageStable(page);
      await takeFullScreenshot(page, pageInfo.name);
    });
  }

  for (const pageInfo of authedModeratorPages) {
    test(`[${pageInfo.name}] ${pageInfo.description}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await waitForPageStable(page);
      await takeFullScreenshot(page, pageInfo.name);
    });
  }
});

// ============================================================
// Section 3: Settings 全部子页面
// ============================================================

const settingsPages: Array<{ name: string; path: string; description: string }> = [
  { name: '60-settings-hub', path: '/settings', description: '设置主页' },
  { name: '61-settings-general', path: '/settings/general', description: '通用设置' },
  { name: '62-settings-account', path: '/settings/account', description: '账户设置' },
  { name: '63-settings-page-profile', path: '/settings/page-profile', description: '页面资料' },
  { name: '64-settings-addresses', path: '/settings/addresses', description: '地址管理' },
  { name: '65-settings-refunds', path: '/settings/refunds', description: '默认退款收款地址' },
  { name: '66-settings-privacy', path: '/settings/privacy', description: '隐私设置' },
  { name: '67-settings-keys', path: '/settings/keys', description: '密钥管理' },
  {
    name: '68-settings-chat-encryption',
    path: '/settings/chat-encryption',
    description: '聊天加密',
  },
  { name: '69-settings-advanced', path: '/settings/advanced', description: '高级设置' },
  { name: '70-settings-moderation', path: '/settings/moderation', description: '仲裁服务设置' },
  { name: '72-settings-blocked', path: '/settings/blocked', description: '黑名单' },
  { name: '73-settings-blocked-users', path: '/settings/blocked-users', description: '已屏蔽用户' },
  { name: '74-settings-store', path: '/settings/store', description: '店铺设置主页' },
  { name: '75-settings-store-shipping', path: '/settings/store/shipping', description: '店铺配送' },
  { name: '76-settings-store-policies', path: '/settings/store/policies', description: '店铺政策' },
  {
    name: '77-settings-store-moderators',
    path: '/settings/store/moderators',
    description: '店铺仲裁员',
  },
  {
    name: '78-settings-access-requests',
    path: '/settings/access-requests',
    description: '访问请求',
  },
  {
    name: '79-settings-access-control',
    path: '/settings/access-control',
    description: '访问控制主页',
  },
  {
    name: '80-settings-ac-privacy',
    path: '/settings/access-control/privacy',
    description: 'AC 隐私',
  },
  {
    name: '81-settings-ac-requests',
    path: '/settings/access-control/requests',
    description: 'AC 请求',
  },
  {
    name: '82-settings-ac-user-groups',
    path: '/settings/access-control/user-groups',
    description: 'AC 用户组',
  },
  {
    name: '83-settings-ac-product-groups',
    path: '/settings/access-control/product-groups',
    description: 'AC 产品组',
  },
  { name: '84-settings-user-groups', path: '/settings/user-groups', description: '用户组' },
  { name: '85-settings-product-groups', path: '/settings/product-groups', description: '产品组' },
];

test.describe('UX Audit - Settings Pages', () => {
  test.beforeEach(async ({ page }) => {
    await performCasdoorLogin(page);
  });

  for (const pageInfo of settingsPages) {
    test(`[${pageInfo.name}] ${pageInfo.description}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await waitForPageStable(page);
      await takeFullScreenshot(page, pageInfo.name);
    });
  }
});

// ============================================================
// Section 4: 动态页面（需要真实数据的 peerID/slug）
// ============================================================

test.describe('UX Audit - Dynamic Pages (Store/Product/Order)', () => {
  let peerID: string;

  test.beforeAll(async ({ request }) => {
    try {
      peerID = await getPeerID(request, 'testuser1', '123');
    } catch {
      peerID = '';
    }
  });

  test.beforeEach(async ({ page }) => {
    await performCasdoorLogin(page);
  });

  test('[90-store] 店铺页面', async ({ page }) => {
    test.skip(!peerID, 'No peerID available');
    await page.goto(`/store/${peerID}`, { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '90-store');
  });

  test('[91-store-empty] 店铺页面（不存在的 peerID）', async ({ page }) => {
    await page.goto('/store/QmInvalidPeerIdForTesting', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '91-store-empty');
  });

  test('[92-product-not-found] 商品页面（不存在的 slug）', async ({ page }) => {
    await page.goto('/product/nonexistent-product-slug', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '92-product-not-found');
  });

  test('[93-order-not-found] 订单详情（不存在的 orderId）', async ({ page }) => {
    await page.goto('/orders/nonexistent-order-id', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '93-order-not-found');
  });

  test('[94-marketplace-detail] 集市详情（默认 slug）', async ({ page }) => {
    await page.goto('/marketplace/mp1', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '94-marketplace-detail');
  });

  test('[95-marketplace-sell] 集市 - 卖在集市', async ({ page }) => {
    await page.goto('/marketplace/mp1/sell', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '95-marketplace-sell');
  });

  test('[96-marketplace-operator] Marketplace 运营台', async ({ page }) => {
    await page.goto('/operator/marketplaces', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '96-marketplace-operator');
  });

  test('[97-marketplace-operator-detail] Marketplace 运营详情', async ({ page }) => {
    await page.goto('/operator/marketplaces/mp1', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '97-marketplace-operator-detail');
  });

  test('[98-marketplace-store-invitations] 店铺 Marketplace 邀请', async ({ page }) => {
    await page.goto('/admin/settings/marketplace-memberships', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '98-marketplace-store-invitations');
  });

  test('[99-wallet-btc] 钱包 BTC 页面', async ({ page }) => {
    await page.goto('/wallet/BTC', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '99-wallet-btc');
  });

  test('[99b-wallet-eth] 钱包 ETH 页面', async ({ page }) => {
    await page.goto('/wallet/ETH', { waitUntil: 'domcontentloaded' });
    await waitForPageStable(page);
    await takeFullScreenshot(page, '99b-wallet-eth');
  });
});

// ============================================================
// Section 5: 组件级视觉检查（Header/Footer/Nav/Drawer）
// ============================================================

test.describe('UX Audit - Shared Components', () => {
  test('[comp-01] Header 桌面端', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    const header = page.locator('header').first();
    if (await header.isVisible()) {
      await header.screenshot({ path: `${SCREENSHOT_DIR}/comp-header.png` });
    }
  });

  test('[comp-02] Footer', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await hideDevOverlays(page);
    const footer = page.locator('footer').first();
    if (await footer.isVisible()) {
      await footer.screenshot({ path: `${SCREENSHOT_DIR}/comp-footer.png` });
    }
  });

  test('[comp-03] Mobile Bottom Navigation', async ({ page }) => {
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    test.skip(!isMobile, 'Only for mobile viewport');
    await page.goto('/');
    await waitForPageStable(page);
    const nav = page.locator('nav').last();
    if (await nav.isVisible()) {
      await nav.screenshot({ path: `${SCREENSHOT_DIR}/comp-mobile-nav.png` });
    }
  });

  test('[comp-04] Settings Sidebar', async ({ page }) => {
    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    test.skip(isMobile, 'Only for desktop viewport');
    await performCasdoorLogin(page);
    await page.goto('/settings');
    await waitForPageStable(page);
    const sidebar = page.locator('[class*="sidebar"], [class*="Sidebar"], aside').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: `${SCREENSHOT_DIR}/comp-settings-sidebar.png` });
    }
  });
});

// ============================================================
// Section 6: UX 流程审核 — 关键用户旅程
// ============================================================

test.describe('UX Audit - User Journey: Browse → Cart → Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await performCasdoorLogin(page);
  });

  test('[flow-01] 首页浏览 → 搜索 → 点击商品', async ({ page }) => {
    await page.goto('/');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-01a-home');

    await page.goto('/search?q=test');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-01b-search');

    const firstProduct = page
      .locator(
        '[data-testid*="product"], [class*="product-card"], [class*="ProductCard"], a[href*="/product/"]'
      )
      .first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await waitForPageStable(page);
      await takeFullScreenshot(page, 'flow-01c-product-detail');
    }
  });

  test('[flow-02] 购物车 → 结账流程', async ({ page }) => {
    await page.goto('/cart');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-02a-cart');

    await page.goto('/checkout');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-02b-checkout');

    await page.goto('/checkout/payment-method');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-02c-payment-method');

    await page.goto('/checkout/moderator');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-02d-moderator');

    await page.goto('/checkout/confirmation');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-02e-confirmation');
  });
});

test.describe('UX Audit - User Journey: Seller Create Listing', () => {
  test.beforeEach(async ({ page }) => {
    await performCasdoorLogin(page);
  });

  test('[flow-03] 创建商品页面 → 各 Tab 截图', async ({ page }) => {
    await page.goto('/listing/new');
    await waitForPageStable(page);
    await takeFullScreenshot(page, 'flow-03a-listing-new');

    const tabs = page.locator('[role="tab"], button[data-state]');
    const tabCount = await tabs.count();
    for (let i = 0; i < Math.min(tabCount, 6); i++) {
      const tab = tabs.nth(i);
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(500);
        await takeFullScreenshot(page, `flow-03-listing-tab-${i}`);
      }
    }
  });
});

test.describe('UX Audit - User Journey: Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await performCasdoorLogin(page);
  });

  test('[flow-04] 设置页面导航完整性', async ({ page }) => {
    await page.goto('/settings');
    await waitForPageStable(page);

    const isMobile = (page.viewportSize()?.width ?? 1280) < 768;
    if (!isMobile) {
      const sidebarLinks = page.locator('aside a, [class*="sidebar"] a, [class*="Sidebar"] a');
      const linkCount = await sidebarLinks.count();
      for (let i = 0; i < Math.min(linkCount, 15); i++) {
        const link = sidebarLinks.nth(i);
        if (await link.isVisible()) {
          await link.click();
          await waitForPageStable(page);
          const url = page.url();
          const name = url.split('/settings/')[1]?.replace(/\//g, '-') || 'hub';
          await takeFullScreenshot(page, `flow-04-settings-nav-${name}`);
        }
      }
    }
  });
});
