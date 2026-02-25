/**
 * Playwright E2E Test Configuration
 * E2E 测试配置
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // 增加全局超时时间（视觉测试需要更长时间，开发服务器首次编译较慢）
  timeout: 120 * 1000, // 120 秒
  expect: {
    timeout: 15 * 1000, // expect 断言超时
    toHaveScreenshot: {
      maxDiffPixels: 200, // 允许的最大像素差异
      threshold: 0.2, // 像素比较阈值
    },
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 增加页面加载超时（开发服务器首次编译较慢）
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    // Standalone store (port 3002)
    {
      name: 'standalone',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
      },
    },
    {
      name: 'standalone-mobile',
      use: {
        ...devices['iPhone 12'],
        baseURL: 'http://localhost:3002',
      },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
