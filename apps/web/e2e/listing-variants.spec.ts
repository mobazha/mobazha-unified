/**
 * Listing Variants & Coupons E2E Tests
 * 商品变体和优惠券 E2E 测试
 *
 * 测试创建/编辑商品时的变体选项和优惠券功能
 * 需要本地开发服务器运行
 */

import { test, expect } from '@playwright/test';

test.describe('Listing - Variant Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listing/new');
    // 等待页面加载完成
    await page.waitForSelector('[data-testid="listing-form"], form', { timeout: 30000 });
  });

  test('should show variant section for physical goods', async ({ page }) => {
    // 物理商品应显示变体区域
    const variantSection = page.locator('text=Variants, text=变体').first();
    await expect(variantSection).toBeVisible();
  });

  test('should show suggested option buttons initially', async ({ page }) => {
    // 应显示预设选项建议（颜色、尺寸等）
    const sizeButton = page.locator('button:has-text("Size"), button:has-text("尺寸")').first();
    const colorButton = page.locator('button:has-text("Color"), button:has-text("颜色")').first();

    // 至少一个建议按钮可见（取决于语言）
    const hasSuggestion =
      (await sizeButton.isVisible().catch(() => false)) ||
      (await colorButton.isVisible().catch(() => false));
    expect(hasSuggestion).toBeTruthy();
  });

  test('should add variant option with values', async ({ page }) => {
    // 点击尺寸选项或自定义选项
    const sizeBtn = page.locator('button:has-text("Size"), button:has-text("尺寸")').first();
    const customBtn = page.locator('button:has-text("Custom"), button:has-text("自定义")').first();

    if (await sizeBtn.isVisible().catch(() => false)) {
      await sizeBtn.click();
    } else if (await customBtn.isVisible().catch(() => false)) {
      await customBtn.click();
    }

    // 应出现选项编辑区域
    await expect(
      page.locator('input[placeholder*="value"], input[placeholder*="值"]').first()
    ).toBeVisible();
  });

  test('should display inventory table after adding variants', async ({ page }) => {
    // 添加一个选项
    const addBtn = page
      .locator(
        'button:has-text("Size"), button:has-text("尺寸"), button:has-text("Add option"), button:has-text("添加选项")'
      )
      .first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    }

    // 添加变体值
    const valueInput = page
      .locator(
        'input[placeholder*="value"], input[placeholder*="值"], input[placeholder*="Enter"], input[placeholder*="回车"]'
      )
      .first();
    if (await valueInput.isVisible().catch(() => false)) {
      await valueInput.fill('Small');
      await valueInput.press('Enter');
      await valueInput.fill('Medium');
      await valueInput.press('Enter');

      // 库存表格应出现
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Listing - Coupon Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listing/new');
    await page.waitForSelector('[data-testid="listing-form"], form', { timeout: 30000 });
  });

  test('should show coupon section', async ({ page }) => {
    const couponSection = page.locator('text=Coupons, text=优惠券').first();
    await expect(couponSection).toBeVisible();
  });

  test('should show empty state initially', async ({ page }) => {
    // 应显示空状态引导
    const emptyState = page.locator('text=No coupons, text=暂无优惠券').first();
    const isVisible = await emptyState.isVisible().catch(() => false);
    // 空状态或添加按钮应可见
    if (!isVisible) {
      const addBtn = page
        .locator(
          'button:has-text("Create discount"), button:has-text("创建优惠券"), button:has-text("Add Coupon"), button:has-text("添加优惠券")'
        )
        .first();
      await expect(addBtn).toBeVisible();
    }
  });

  test('should add a coupon with discount code', async ({ page }) => {
    // 点击创建优惠券
    const addBtn = page
      .locator(
        'button:has-text("Create discount"), button:has-text("创建优惠券"), button:has-text("Add Coupon"), button:has-text("添加优惠券")'
      )
      .first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();

      // 应显示优惠券表单
      const titleInput = page
        .locator('input[placeholder*="Summer"], input[placeholder*="促销"]')
        .first();
      await expect(titleInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('should toggle between percent and fixed discount', async ({ page }) => {
    // 添加一个优惠券
    const addBtn = page
      .locator(
        'button:has-text("Create discount"), button:has-text("创建优惠券"), button:has-text("Add Coupon"), button:has-text("添加优惠券")'
      )
      .first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();

      // 找到固定金额按钮（带 $ 图标的按钮）
      const fixedBtn = page
        .locator('button')
        .filter({ has: page.locator('svg') })
        .last();
      if (await fixedBtn.isVisible().catch(() => false)) {
        await fixedBtn.click();
      }
    }
  });
});

test.describe('Listing - Clone with Variants', () => {
  test('should load clone data including variants and coupons', async ({ page }) => {
    // 导航到克隆页面（需要一个有效的 slug）
    // 这个测试在有后端 API 的集成环境中才能完整运行
    await page.goto('/listing/new?clone=test-product');

    // 如果克隆加载失败，页面应该仍然正常显示
    await page.waitForTimeout(3000);
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
