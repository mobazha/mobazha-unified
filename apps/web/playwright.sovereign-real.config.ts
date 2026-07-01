// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Playwright config for testing against a real Sovereign backend.
 *
 * No web server is started — the test expects a running Sovereign binary
 * at SOVEREIGN_URL (default http://127.0.0.1:5102).
 *
 * Usage:
 *   SOVEREIGN_URL=http://127.0.0.1:5102 pnpm test:e2e:sovereign:real
 */

import { defineConfig, devices } from '@playwright/test';

const sovereignUrl = process.env.SOVEREIGN_URL || 'http://127.0.0.1:5102';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report-sovereign-real' }], ['list']],

  timeout: 120 * 1000,
  expect: { timeout: 30 * 1000 },

  use: {
    baseURL: sovereignUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'sovereign-real',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /sovereign.*real|sovereign.*e2e/,
    },
  ],
});
