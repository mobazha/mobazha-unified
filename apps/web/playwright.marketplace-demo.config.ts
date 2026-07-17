// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Marketplace demo recording config (Demo 0001/0002 family).
 *
 * Records STYLE.md-compliant product demos against the REAL local e2e stack
 * (hosting :18080 + vite :3000 in marketplace-demo mode). Not a test gate:
 * one worker, always-on 1080p video, human pacing.
 *
 * Prereqs: e2e docker stack up; seed via tests/e2e/demos/0001 seed.py;
 *          vite on :3000 in marketplace-demo mode.
 * Run:     pnpm exec playwright test --config=playwright.marketplace-demo.config.ts
 * Output:  demo-output/marketplace/ (segments; concat per RUNBOOK).
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /marketplace-flywheel\.demo\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 8 * 60 * 1000,
  reporter: [['list']],
  outputDir: 'demo-output/marketplace/raw',

  use: {
    baseURL: 'http://localhost:3000',
    // Video is configured per-context in the spec (persistent dir), not here.
    viewport: { width: 1920, height: 1080 },
    // Human pacing — this footage is for viewers, not assertions.
    launchOptions: { slowMo: 300 },
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },
});
