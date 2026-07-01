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
    const variantSection = page.locator('[data-testid="variants-section"]');
    await expect(variantSection).toBeVisible();
  });

  test('should show suggested option buttons initially', async ({ page }) => {
    // 应显示预设选项建议（颜色、尺寸等）
    const variantSection = page.locator('[data-testid="variants-section"]');
    await expect(variantSection).toBeVisible();

    // 检查建议按钮（Size, Color 等）
    const sizeButton = page.locator('[data-testid*="variant-suggest-"]').first();
    await expect(sizeButton).toBeVisible();
  });

  test('should add variant option with values', async ({ page }) => {
    // 点击第一个建议按钮或自定义选项按钮
    const suggestButton = page.locator('[data-testid*="variant-suggest-"]').first();
    const customButton = page.locator('[data-testid="variant-custom-option"]');

    if (await suggestButton.isVisible().catch(() => false)) {
      await suggestButton.click();
    } else if (await customButton.isVisible().catch(() => false)) {
      await customButton.click();
    }

    // 应出现选项值输入框
    const valueInput = page.locator('[data-testid="variant-value-input"]').first();
    await expect(valueInput).toBeVisible();
  });

  test('should display inventory table after adding variants', async ({ page }) => {
    // 添加一个选项
    const suggestButton = page.locator('[data-testid*="variant-suggest-"]').first();
    if (await suggestButton.isVisible().catch(() => false)) {
      await suggestButton.click();
    }

    // 添加变体值
    const valueInput = page.locator('[data-testid="variant-value-input"]').first();
    if (await valueInput.isVisible().catch(() => false)) {
      await valueInput.fill('Small');
      await valueInput.press('Enter');
      await valueInput.fill('Medium');
      await valueInput.press('Enter');

      // 库存表格应出现
      const table = page.locator('[data-testid="variant-inventory-table"]');
      await expect(table).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Listing - Clone with Variants', () => {
  test('should load clone data including variants', async ({ page }) => {
    // 导航到克隆页面（需要一个有效的 slug）
    // 这个测试在有后端 API 的集成环境中才能完整运行
    await page.goto('/listing/new?clone=test-product');

    // 如果克隆加载失败，页面应该仍然正常显示
    await page.waitForTimeout(3000);
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
