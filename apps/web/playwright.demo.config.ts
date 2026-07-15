/**
 * Playwright Demo Recording Config — PG-203
 *
 * Records narrated walkthrough videos of the storefront editor. Unlike the
 * E2E configs this is not a test gate: it always records video, runs one
 * worker with slowMo so interactions are watchable, and serves every /v1/*
 * call from in-spec fixtures so no node backend or Casdoor login is needed.
 *
 * Run:
 *   pnpm demo:storefront
 *   (video lands in apps/web/demo-output/, see the spec's console output)
 */

import { defineConfig, devices } from '@playwright/test';

const port = process.env.DEMO_PORT || '3100';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.demo\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 5 * 60 * 1000,
  reporter: [['list']],
  outputDir: 'demo-output/raw',

  use: {
    baseURL: `http://localhost:${port}`,
    video: { mode: 'on', size: { width: 1440, height: 900 } },
    viewport: { width: 1440, height: 900 },
    // Must match the dev server's own host: Next 16 blocks dev chunks from a
    // host it considers cross-origin, which trips layout.tsx's ChunkLoadError
    // reload guard into an infinite loop.
    // Deliberate pacing: this footage is for humans, not assertions.
    launchOptions: { slowMo: 350 },
    navigationTimeout: 60 * 1000,
    actionTimeout: 30 * 1000,
  },

  projects: [
    {
      name: 'demo',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],

  webServer: {
    command: `pnpm next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 180 * 1000,
    env: { NEXT_PUBLIC_USE_MOCK_DATA: 'false' },
  },
});
