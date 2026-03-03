/**
 * Playwright E2E Test Configuration
 *
 * Project scoping:
 *   - chromium:           desktop-visual + general E2E (excludes mobile-visual & standalone)
 *   - Mobile Chrome:      mobile-visual  + general E2E (excludes desktop-visual & standalone)
 *   - standalone*:        standalone tests only
 *   - firefox/webkit/etc: opt-in via CLI --project flag
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  timeout: 120 * 1000,
  expect: {
    timeout: 15 * 1000,
    toHaveScreenshot: {
      maxDiffPixels: 200,
      threshold: 0.2,
    },
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [/standalone/, /mobile-visual/],
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testIgnore: [/standalone/, /desktop-visual/],
    },
    // Standalone store (port 3002, or 3000 for demo capture) — only standalone tests
    {
      name: 'standalone',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.STANDALONE_BASE_URL || 'http://localhost:3002',
      },
      testMatch: /standalone/,
    },
    {
      name: 'standalone-mobile',
      use: {
        ...devices['iPhone 12'],
        baseURL: process.env.STANDALONE_BASE_URL || 'http://localhost:3002',
      },
      testMatch: /standalone/,
    },
    // Cross-browser (opt-in via --project flag, not in default run)
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    //   testIgnore: [/standalone/, /mobile-visual/, /desktop-visual/],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    //   testIgnore: [/standalone/, /mobile-visual/, /desktop-visual/],
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    //   testIgnore: [/standalone/, /desktop-visual/],
    // },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
