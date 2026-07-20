// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

import type { BrowserContext, Page } from '@playwright/test';

/**
 * Static, scene-level interface scales for 1920x1080 demo masters.
 *
 * Public product surfaces stay at native density. Workflow and proof scenes
 * may enlarge the app slightly, while the recording overlay remains at 1x.
 */
export const DEMO_INTERFACE_SCALE = {
  public: 1,
  workflow: 1.1,
  proof: 1.15,
} as const;

/** Install a scale before every navigation in a recording context. */
export async function installDemoInterfaceScale(
  context: BrowserContext,
  scale: number
): Promise<void> {
  await context.addInitScript(
    ({ interfaceScale }) => {
      const apply = () => {
        document.body?.style.setProperty('zoom', String(interfaceScale));
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply, { once: true });
      } else {
        apply();
      }
    },
    { interfaceScale: scale }
  );
}

/** Change scale behind an existing dark-floor transition before reveal. */
export async function setDemoInterfaceScale(page: Page, scale: number): Promise<void> {
  await page.evaluate(interfaceScale => {
    document.body.style.setProperty('zoom', String(interfaceScale));
  }, scale);
}
