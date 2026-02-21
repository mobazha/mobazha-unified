/**
 * Create Service-Type Listing E2E Test
 * 创建服务类型商品的端到端测试
 *
 * 步骤:
 * 1. 登录（通过 Casdoor OAuth）
 * 2. 导航到 /listing/new
 * 3. 选择第3个商品类型（服务）
 * 4. 填写基本信息（标题、价格）
 * 5. 上传商品图片
 * 6. 点击发布
 * 7. 验证重定向到商品详情页
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { performCasdoorLogin } from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '123';
const TEST_USERNAME = process.env.E2E_TEST_USERNAME || 'testuser1';
const TEST_IMAGE = path.join(__dirname, 'fixtures', 'test-image.png');

test.describe('Create Service Listing', () => {
  test.setTimeout(180_000);

  test('should create a service-type listing via the UI', async ({ page }) => {
    test.skip(!process.env.E2E_TEST_PASSWORD && !TEST_PASSWORD, 'E2E test password not configured');

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'log') {
        console.log(`[browser:${msg.type()}] ${msg.text().substring(0, 200)}`);
      }
    });

    // ── Step 1: Login via Casdoor ──
    console.log('Step 1: Login via Casdoor');
    await performCasdoorLogin(page, TEST_USERNAME, TEST_PASSWORD);
    console.log('Step 1: Login complete, URL:', page.url());

    // ── Step 2: Navigate to /listing/new ──
    console.log('Step 2: Navigate to /listing/new');
    await page.goto('/listing/new');
    await page.waitForLoadState('networkidle');

    const form = page.locator('[data-testid="listing-form-new"]');
    await expect(form).toBeVisible({ timeout: 60000 });
    console.log('Step 2: Form visible');

    await page.screenshot({ path: 'e2e-screenshots/listing-new-initial.png', fullPage: true });

    // ── Step 3: Select SERVICE type (3rd button) ──
    console.log('Step 3: Select SERVICE type');
    const typeButtons = form.locator('button').filter({ has: page.locator('h3') });
    const count = await typeButtons.count();
    console.log(`Found ${count} type buttons`);

    const serviceButton = typeButtons.nth(2);
    await serviceButton.scrollIntoViewIfNeeded();
    await serviceButton.click();
    await page.waitForTimeout(500);
    await expect(serviceButton).toHaveClass(/border-primary/);
    console.log('Step 3: SERVICE selected');

    // ── Step 4: Fill basic info ──
    console.log('Step 4: Fill title and price');
    const titleInput = page.getByPlaceholder(/descriptive title|描述性的标题/i).first();
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await titleInput.fill('E2E Test Service $1');

    const priceInput = page.getByRole('spinbutton').first();
    await expect(priceInput).toBeVisible({ timeout: 5000 });
    await priceInput.clear();
    await priceInput.fill('1');

    // ── Step 5: Upload an image (required) ──
    console.log('Step 5: Upload product image');
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
    await fileInput.setInputFiles(TEST_IMAGE);

    await page.waitForTimeout(3000);
    await expect(page.locator('text=/[1-9]\\d* \\/ 30/')).toBeVisible({ timeout: 15000 });
    console.log('Step 5: Image uploaded');

    await page.screenshot({ path: 'e2e-screenshots/before-publish.png', fullPage: true });

    // ── Step 6: Click Publish ──
    console.log('Step 6: Click Publish');
    const publishBtn = page.getByTestId('listing-form-publish').first();
    await publishBtn.scrollIntoViewIfNeeded();
    await expect(publishBtn).toBeEnabled();
    await publishBtn.click();

    // ── Step 7: Wait for redirect to product detail page ──
    console.log('Step 7: Wait for redirect to product page');
    await page.waitForURL(
      url => url.pathname.includes('/product/') && !url.pathname.includes('/listing/new'),
      { timeout: 30000 }
    );

    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/product\/.+/);
    console.log('Success! Product URL:', finalUrl);

    await page.screenshot({ path: 'e2e-screenshots/service-listing-created.png', fullPage: true });
  });
});
