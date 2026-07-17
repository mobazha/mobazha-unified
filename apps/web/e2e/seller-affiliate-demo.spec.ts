import { test } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';

// Web-UI demo of the seller-affiliate 带货闭环, recorded against the local E2E
// stack (frontend in `--mode e2e` → hosting :18080 / Casdoor :18000).
// Round-5 surfaces highlighted: seller attribution-window guardrail, promoter
// storefront with per-item "you earn ≈$X", and the earnings fiat + rollup.
// Run:  DEMO_SELLER_PEER_ID=... DEMO_PROGRAM_ID=... DEMO_PROMO_TOKEN=... \
//       npx playwright test e2e/seller-affiliate-demo.spec.ts --project=chromium --workers=1

const SELLER_PEER_ID = process.env.DEMO_SELLER_PEER_ID || 'QmDemoSellerPeer';
const PROGRAM_ID = process.env.DEMO_PROGRAM_ID || '66828577-dbd7-4bdf-9093-c791e35e06ca';
const PROMO_TOKEN = process.env.DEMO_PROMO_TOKEN || '6-1BiZxCrKVDBdFHBeAs5bkgNX_dM1NF';

test.use({
  video: { mode: 'on', size: { width: 1280, height: 800 } },
  viewport: { width: 1280, height: 800 },
});

// A soft wait: never fail the demo just because one selector is slow — the
// video is the deliverable, so we pause for the render and move on.
async function settle(page: import('@playwright/test').Page, testId: string, ms = 3500) {
  await page
    .getByTestId(testId)
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .catch(() => {});
  await page.waitForTimeout(ms);
}

// Bring a section into frame and pause on it so the recording lingers on the
// feature being demonstrated. Never throws — the video must keep rolling.
async function reveal(page: import('@playwright/test').Page, testId: string, ms = 3500) {
  const el = page.getByTestId(testId).first();
  await el.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(ms);
}

// On a cold vite compile the auth store can still be rehydrating when the
// page first renders, briefly showing the signed-out gate; one reload after
// it settles lands on the authenticated view.
async function passAuthGate(page: import('@playwright/test').Page, gateTestId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const gated = await page
      .getByTestId(gateTestId)
      .isVisible()
      .catch(() => false);
    if (!gated) return;
    await page.waitForTimeout(4000);
    await page.reload();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }
}

test('1 · seller 开 affiliate program + 归因窗口护栏与修复', async ({ page }) => {
  test.setTimeout(180000);
  await performCasdoorLogin(page, 'testuser1', '123');
  await page.goto('/admin/affiliate');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3500);

  // Seller affiliate panel: 5% commission, Active rails. Config starts
  // collapsed — open it on camera.
  await reveal(page, 'seller-affiliate-program-panel', 2500);
  const configToggle = page.getByTestId('affiliate-config-toggle').first();
  if (await configToggle.isVisible().catch(() => false)) {
    await configToggle.click();
    await page.waitForTimeout(2000);
  }

  // The 1-hour window trips the guardrail: a sub-day window silently discards
  // promoter-driven sales. Linger on the warning…
  await reveal(page, 'affiliate-window-advice', 4000);

  // …then fix it on camera with the 7-day preset (exact value+unit editing —
  // no lossy day conversion) and save.
  const preset = page.getByTestId('affiliate-window-preset-7').first();
  if (await preset.isVisible().catch(() => false)) {
    await preset.click();
    await page.waitForTimeout(2500);
    const save = page.getByTestId('seller-affiliate-program-save').first();
    if (await save.isEnabled().catch(() => false)) {
      await save.click();
      await page.waitForTimeout(3500);
    }
  }
});

test('2 · promoter 带货：橱窗看收益 → 生成链接 → 佣金法币+汇总', async ({ page }) => {
  test.setTimeout(200000);
  await performCasdoorLogin(page, 'testuser3', '123');

  // 打开推广程序页
  await page.goto(`/promote/${SELLER_PEER_ID}/${PROGRAM_ID}`);
  await passAuthGate(page, 'promote-auth-required');
  await settle(page, 'promote-program-page', 2000);

  // The storefront and terms only exist once a link is created (they derive
  // from the link's public token), so generate the link FIRST, then linger on
  // the round-5 surfaces it unlocks.
  const createBtn = page
    .getByRole('button', { name: /create link|生成链接|create|copy link|复制/i })
    .first();
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click();
    // Wait for the created link to render (its URL box) before showcasing.
    await page
      .getByTestId('promote-earn-terms')
      .first()
      .waitFor({ timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
  }

  // Round-5 storefront: the seller's live items with a concrete "you earn ≈$X"
  // per sale, so the promoter sees what they're selling and the upside.
  await reveal(page, 'promote-storefront', 3500);
  await reveal(page, 'promote-storefront-earn', 4000);

  // The rail-scoped link + "what you earn" terms (rate / attribution window).
  await reveal(page, 'promote-earn-terms', 4000);

  // 进入「View affiliate earnings」查看佣金 / 结算明细
  const earningsBtn = page
    .getByRole('button', { name: /view affiliate earnings|affiliate earnings|查看佣金|earnings/i })
    .first();
  if (await earningsBtn.isVisible().catch(() => false)) {
    await earningsBtn.click();
  } else {
    await page.goto(`/promote/${SELLER_PEER_ID}/${PROGRAM_ID}/commissions`);
  }
  await passAuthGate(page, 'promote-commissions-auth-required');
  await settle(page, 'promote-commissions-page', 3000);

  // Round-5 earnings rollup: paid total per currency + paid/in-progress counts.
  await reveal(page, 'seller-affiliate-earnings-summary-promoter', 4500);

  // 向下滚动展示真实佣金条目（法币等值 / 状态 / 链上结算）。
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(2500);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(2500);
});

test('3 · guest 点开推广链接 → 逛店 → 打开商品（referral saved）', async ({ page }) => {
  test.setTimeout(150000);
  await page.goto(`/promo/${SELLER_PEER_ID}/${PROMO_TOKEN}`);
  await settle(page, 'seller-affiliate-entry-ready', 4000);

  // Follow the landing CTA into the seller's store — the shelf the promoter
  // is actually selling. The referral session persists across navigation.
  const storeLink = page.locator(`a[href*="/store/"]`).first();
  if (await storeLink.isVisible().catch(() => false)) {
    await storeLink.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(4500);
  } else {
    await page.goto(`/store/${SELLER_PEER_ID}`);
    await page.waitForTimeout(4500);
  }

  // Open one of the demo catalog items so the recording shows a real product
  // page reached through the promoter's link.
  const productCard = page
    .getByText(/Titan Leather Hardware Wallet Case|Fireproof Steel Seed Backup Plate/i)
    .first();
  if (await productCard.isVisible().catch(() => false)) {
    await productCard.click();
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(5000);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(2500);
  }
});

test('4 · seller 账单：汇总 → 筛选 → 展开一笔看归因与链上结算', async ({ page }) => {
  test.setTimeout(180000);
  await performCasdoorLogin(page, 'testuser1', '123');
  await page.goto('/admin/affiliate');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(3500);

  // The richer statements table: per-currency earnings rollup, converting
  // promoters, then the grouped commission rows themselves.
  await reveal(page, 'seller-affiliate-statements-seller', 2500);
  await reveal(page, 'seller-affiliate-earnings-summary-seller', 4000);
  await reveal(page, 'seller-affiliate-filters', 3000);

  // Expand the first commission row: attribution details, settlement address,
  // and the on-chain transaction the payout landed in.
  const firstRow = page.locator('[data-testid^="seller-affiliate-statement-row-"]').first();
  if (await firstRow.isVisible().catch(() => false)) {
    await firstRow.click();
    await page.waitForTimeout(4500);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(3000);
  }
});
