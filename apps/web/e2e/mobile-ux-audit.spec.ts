/**
 * 移动端 UX 审核 - iPhone 12 视口 (390x844)
 * 仅审核公开页面，无需登录
 *
 * 运行: pnpm exec playwright test mobile-ux-audit.spec.ts --project="Mobile Safari"
 */

import { test } from '@playwright/test';

const VIEWPORT = { width: 390, height: 844 };
const SCREENSHOT_DIR = 'test-results/mobile-ux-audit';

const publicPages = [
  { name: '01-home', path: '/', description: '首页' },
  { name: '02-search-empty', path: '/search', description: '搜索页-空状态' },
  { name: '03-search-results', path: '/search?q=test', description: '搜索结果' },
  { name: '04-marketplace', path: '/marketplace', description: '集市列表' },
  { name: '05-moderators', path: '/moderators', description: '仲裁员列表' },
  { name: '06-policy-terms', path: '/policies/terms', description: '服务条款' },
  { name: '07-policy-privacy', path: '/policies/privacy', description: '隐私政策' },
  { name: '08-offline', path: '/offline', description: '离线页' },
];

test.describe('Mobile UX Audit - iPhone 12 (390x844)', () => {
  test.use({ viewport: VIEWPORT });

  for (const pageInfo of publicPages) {
    test(`[${pageInfo.name}] ${pageInfo.description}`, async ({ page }) => {
      await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await page.waitForTimeout(1500);

      // 隐藏开发工具 overlay
      await page.addStyleTag({
        content: `
          [data-nextjs-toast], nextjs-portal, [data-nextjs-dialog-overlay],
          [class*="Compiling"], [class*="compiling"] { display: none !important; }
        `,
      });
      await page.waitForTimeout(300);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${pageInfo.name}.png`,
        fullPage: true,
      });
    });
  }
});
