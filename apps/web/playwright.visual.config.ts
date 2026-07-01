/**
 * Playwright config for visual verification screenshots
 * Uses localhost:3001, no webServer (assumes app is already running)
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['visual-verification.spec.ts', 'auth-flow-visual.spec.ts'],
  use: {
    baseURL: process.env.SCREENSHOT_BASE_URL || 'http://localhost:3001',
    trace: 'off',
    screenshot: 'off', // we take our own
    video: 'off',
    navigationTimeout: 30 * 1000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // No webServer - app must be running at localhost:3001
});
