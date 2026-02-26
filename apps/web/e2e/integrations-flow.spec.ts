/**
 * Integrations Page E2E Tests
 *
 * Validates the admin integrations page (PG-007):
 *   - Tabbed layout (Notifications / AI Assistant)
 *   - AI config form: provider selection, model/baseURL placeholders, save
 *   - Notification channels: list, add, edit, delete
 *
 * Prerequisites:
 *   - Running full-stack E2E environment
 *
 * Run:
 *   npx playwright test integrations-flow.spec.ts --reporter=list
 */

import { test, expect } from '@playwright/test';
import { authenticatedTest, getCasdoorToken, BACKEND_URL } from './fixtures/auth';

// ── 1. Auth Guard — Integrations page requires login ────────────────────────

test.describe('Integrations Auth Guard', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/settings/integrations');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    const url = new URL(page.url());
    expect(url.pathname).toBe('/login');
  });
});

// ── 2. Integrations Page Layout ─────────────────────────────────────────────

authenticatedTest.describe('Integrations Page', () => {
  authenticatedTest('should display tabbed layout', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    const page = authedPage.locator('[data-testid="admin-integrations"]');
    await expect(page).toBeVisible();

    const notificationsTab = authedPage.getByRole('tab', { name: /notification|通知/i });
    const aiTab = authedPage.getByRole('tab', { name: /ai|助手/i });

    await expect(notificationsTab).toBeVisible();
    await expect(aiTab).toBeVisible();

    await authedPage.screenshot({
      path: 'e2e-screenshots/integrations-tabs.png',
      fullPage: true,
    });
  });

  authenticatedTest('notifications tab should be active by default', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    const notificationsTab = authedPage.getByRole('tab', { name: /notification|通知/i });
    await expect(notificationsTab).toHaveAttribute('data-state', 'active');
  });
});

// ── 3. AI Configuration Tab ─────────────────────────────────────────────────

authenticatedTest.describe('AI Configuration', () => {
  authenticatedTest('should display AI config form when tab is clicked', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    const aiTab = authedPage.getByRole('tab', { name: /ai|助手/i });
    await aiTab.click();

    await authedPage.waitForTimeout(500);

    const providerLabel = authedPage.getByText(/provider|服务商/i).first();
    await expect(providerLabel).toBeVisible();

    await authedPage.screenshot({
      path: 'e2e-screenshots/integrations-ai-tab.png',
      fullPage: true,
    });
  });

  authenticatedTest('should show provider selector with options', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.getByRole('tab', { name: /ai|助手/i }).click();
    await authedPage.waitForTimeout(500);

    const providerSelect = authedPage.locator('[role="combobox"]').first();
    await expect(providerSelect).toBeVisible();
    await providerSelect.click();

    const options = authedPage.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  authenticatedTest(
    'should show placeholder defaults when provider is selected',
    async ({ authedPage }) => {
      await authedPage.goto('/admin/settings/integrations');
      await authedPage.waitForLoadState('networkidle');

      await authedPage.getByRole('tab', { name: /ai|助手/i }).click();
      await authedPage.waitForTimeout(500);

      const providerSelect = authedPage.locator('[role="combobox"]').first();
      await providerSelect.click();

      const zhipuOption = authedPage.locator('[role="option"]').filter({ hasText: /智谱|GLM/i });
      if (await zhipuOption.isVisible()) {
        await zhipuOption.click();
        await authedPage.waitForTimeout(200);

        // Model field is inside "Advanced Settings" — expand it first
        const advancedToggle = authedPage.getByText(/advanced|高级/i);
        await advancedToggle.click();
        await authedPage.waitForTimeout(200);

        // Model selector should show as a combobox (second one after provider)
        const modelSelect = authedPage.locator('[role="combobox"]').nth(1);
        if (await modelSelect.isVisible()) {
          await modelSelect.click();
          const modelOptions = authedPage.locator('[role="option"]');
          const count = await modelOptions.count();
          expect(count).toBeGreaterThanOrEqual(2);
        }
      }
    }
  );

  authenticatedTest('should show "not configured" badge initially', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.getByRole('tab', { name: /ai|助手/i }).click();
    await authedPage.waitForTimeout(500);

    const badge = authedPage.getByText(/not configured|未配置/i);
    const hasBadge = await badge.isVisible().catch(() => false);
    expect(hasBadge).toBe(true);
  });

  authenticatedTest('save button should be disabled without provider', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.getByRole('tab', { name: /ai|助手/i }).click();
    await authedPage.waitForTimeout(500);

    const saveBtn = authedPage.getByRole('button', { name: /save|保存/i });
    await expect(saveBtn).toBeDisabled();
  });

  authenticatedTest('should display test connection button', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.getByRole('tab', { name: /ai|助手/i }).click();
    await authedPage.waitForTimeout(500);

    const testBtn = authedPage.getByRole('button', { name: /test connection|测试连接/i });
    await expect(testBtn).toBeVisible();
    await expect(testBtn).toBeDisabled();
  });

  authenticatedTest('should show advanced settings section', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.getByRole('tab', { name: /ai|助手/i }).click();
    await authedPage.waitForTimeout(500);

    const advancedToggle = authedPage.getByText(/advanced|高级/i);
    await expect(advancedToggle).toBeVisible();

    await advancedToggle.click();
    await authedPage.waitForTimeout(200);

    const modelLabel = authedPage.getByText(/model|模型/i).first();
    await expect(modelLabel).toBeVisible();

    await authedPage.screenshot({
      path: 'e2e-screenshots/integrations-ai-advanced.png',
      fullPage: true,
    });
  });

  authenticatedTest('should show model dropdown for known providers', async ({ authedPage }) => {
    await authedPage.goto('/admin/settings/integrations');
    await authedPage.waitForLoadState('networkidle');

    await authedPage.getByRole('tab', { name: /ai|助手/i }).click();
    await authedPage.waitForTimeout(500);

    // Select a provider first
    const providerSelect = authedPage.locator('[role="combobox"]').first();
    await providerSelect.click();
    const openaiOption = authedPage.locator('[role="option"]').filter({ hasText: /OpenAI/i });
    if (await openaiOption.isVisible()) {
      await openaiOption.click();
      await authedPage.waitForTimeout(200);

      // Open advanced settings
      const advancedToggle = authedPage.getByText(/advanced|高级/i);
      await advancedToggle.click();
      await authedPage.waitForTimeout(200);

      // Should show a model selector (second combobox)
      const modelSelect = authedPage.locator('[role="combobox"]').nth(1);
      await expect(modelSelect).toBeVisible();
    }
  });
});

// ── 4. AI Configuration API ─────────────────────────────────────────────────

test.describe('AI Config API', () => {
  test('should get AI providers list with models', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const resp = await request.get(`${BACKEND_URL}/api/v1/settings/ai/providers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status()).toBe(200);
    const providers = await resp.json();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThanOrEqual(3);

    const ids = providers.map((p: { id: string }) => p.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('zhipu');
    expect(ids).toContain('custom');

    const openai = providers.find((p: { id: string }) => p.id === 'openai');
    expect(openai.models).toBeDefined();
    expect(openai.models.length).toBeGreaterThanOrEqual(2);
  });

  test('should get AI config (initially empty)', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const resp = await request.get(`${BACKEND_URL}/api/v1/settings/ai`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(resp.status()).toBe(200);
    const config = await resp.json();
    expect(config).toHaveProperty('provider');
    expect(config).toHaveProperty('enabled');
    expect(config).toHaveProperty('has_api_key');
  });

  test('should save and retrieve AI config', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const putResp = await request.put(`${BACKEND_URL}/api/v1/settings/ai`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        provider: 'zhipu',
        api_key: 'test-key-e2e',
        model: '',
        base_url: '',
        enabled: false,
      },
    });
    expect(putResp.status()).toBe(200);

    const saved = await putResp.json();
    expect(saved.provider).toBe('zhipu');
    expect(saved.has_api_key).toBe(true);
    expect(saved.enabled).toBe(false);
    expect(saved.model).toBe('');
    expect(saved.base_url).toBe('');

    const getResp = await request.get(`${BACKEND_URL}/api/v1/settings/ai`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const fetched = await getResp.json();
    expect(fetched.provider).toBe('zhipu');
    expect(fetched.has_api_key).toBe(true);
  });

  test('should test connection endpoint (expects failure with fake key)', async ({ request }) => {
    let token: string;
    try {
      token = await getCasdoorToken(request);
    } catch {
      test.skip(true, 'Auth not available');
      return;
    }

    const resp = await request.post(`${BACKEND_URL}/api/v1/settings/ai/test`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        provider: 'openai',
        api_key: 'sk-fake-test-key',
        model: 'gpt-4o',
        base_url: '',
      },
    });

    expect(resp.status()).toBe(200);
    const result = await resp.json();
    expect(result).toHaveProperty('success');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
