import { test } from '@playwright/test';
import { performCasdoorLogin } from './fixtures/auth';

// Web-UI demo of the seller-affiliate 带货闭环, recorded against the local E2E
// stack (frontend in `--mode e2e` → hosting :18080 / Casdoor :18000).
// Run:  DEMO_PROGRAM_ID=... DEMO_PROMO_TOKEN=... \
//       npx playwright test e2e/seller-affiliate-demo.spec.ts --project=chromium --workers=1

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

test('1 · seller 开 affiliate program (admin/deal-links)', async ({ page }) => {
  test.setTimeout(180000);
  await performCasdoorLogin(page, 'testuser1', '123');
  await page.goto('/admin/deal-links');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(4500);
});

test('2 · promoter 带货：登录 → 生成 rail-scoped 链接 → 看佣金', async ({ page }) => {
  test.setTimeout(180000);
  await performCasdoorLogin(page, 'testuser3', '123');

  // 打开推广程序页
  await page.goto(`/promote/${PROGRAM_ID}`);
  await passAuthGate(page, 'promote-auth-required');
  await settle(page, 'promote-program-page', 2500);

  // 点击「Create link」实际生成 rail-scoped 推广链接，停留展示生成结果
  const createBtn = page
    .getByRole('button', { name: /create link|生成链接|create|copy link|复制/i })
    .first();
  if (await createBtn.isVisible().catch(() => false)) {
    await createBtn.click();
    await page.waitForTimeout(3500);
  }
  await page.waitForTimeout(2500);

  // 进入「View affiliate earnings」查看佣金 / 结算明细
  const earningsBtn = page
    .getByRole('button', { name: /view affiliate earnings|affiliate earnings|查看佣金|earnings/i })
    .first();
  if (await earningsBtn.isVisible().catch(() => false)) {
    await earningsBtn.click();
  } else {
    await page.goto('/promote/commissions');
  }
  await passAuthGate(page, 'promote-commissions-auth-required');
  await settle(page, 'promote-commissions-page', 4500);
});

test('3 · guest 点开推广链接（referral saved）', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto(`/promo/${PROMO_TOKEN}`);
  await settle(page, 'seller-affiliate-entry-ready', 4000);
});
