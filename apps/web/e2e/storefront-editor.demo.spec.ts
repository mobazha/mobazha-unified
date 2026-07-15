// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Storefront Editor Demo Recording — PG-203
 *
 * Not a test gate: this drives the store-editor through its headline flows and
 * records a narrated video so the UX can be reviewed without standing up a node
 * backend. Every /v1/* call is served from the in-memory fixture below, so the
 * run is deterministic and needs no Casdoor login.
 *
 * Run:  pnpm demo:storefront
 * Video: apps/web/demo-output/storefront-editor-demo.webm
 */

import { test, type Page, type Route } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PEER_ID = 'QmDemoSellerPeerId000000000000000000000000000';

// ---------------------------------------------------------------------------
// Fixture catalog
// ---------------------------------------------------------------------------

interface DemoProduct {
  slug: string;
  title: string;
  hash: string;
  color: string;
  amount: number;
}

const CATALOG: DemoProduct[] = [
  {
    slug: 'aurora-headphones',
    title: 'Aurora 降噪耳机',
    hash: 'img-aurora',
    color: '#0ea5e9',
    amount: 129900,
  },
  {
    slug: 'nimbus-keyboard',
    title: 'Nimbus 机械键盘',
    hash: 'img-nimbus',
    color: '#6366f1',
    amount: 89900,
  },
  {
    slug: 'lumen-desk-lamp',
    title: 'Lumen 护眼台灯',
    hash: 'img-lumen',
    color: '#f59e0b',
    amount: 34900,
  },
  {
    slug: 'atlas-backpack',
    title: 'Atlas 通勤背包',
    hash: 'img-atlas',
    color: '#10b981',
    amount: 59900,
  },
  {
    slug: 'echo-speaker',
    title: 'Echo 便携音箱',
    hash: 'img-echo',
    color: '#ef4444',
    amount: 45900,
  },
  {
    slug: 'pixel-mouse',
    title: 'Pixel 无线鼠标',
    hash: 'img-pixel',
    color: '#8b5cf6',
    amount: 25900,
  },
  {
    slug: 'terra-bottle',
    title: 'Terra 保温杯',
    hash: 'img-terra',
    color: '#14b8a6',
    amount: 15900,
  },
  {
    slug: 'vista-monitor',
    title: 'Vista 4K 显示器',
    hash: 'img-vista',
    color: '#3b82f6',
    amount: 249900,
  },
];

const productListItems = CATALOG.map(p => ({
  slug: p.slug,
  title: p.title,
  thumbnail: { tiny: p.hash, small: p.hash, medium: p.hash, large: p.hash, original: p.hash },
  price: { amount: p.amount, currency: { code: 'USD', divisibility: 2 } },
  vendorPeerID: PEER_ID,
  vendorName: 'Bob 的数码小店',
  averageRating: 4.8,
  ratingCount: 42,
  contractType: 'PHYSICAL_GOOD',
}));

const COLLECTIONS = [
  { id: 'col-audio', title: '音频精选', image: 'img-echo', published: true },
  { id: 'col-desk', title: '桌面好物', image: 'img-lumen', published: true },
  { id: 'col-travel', title: '出行装备', image: 'img-atlas', published: true },
].map(c => ({
  ...c,
  description: '',
  type: 'manual' as const,
  sortOrder: 'manual' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  products: [],
}));

/**
 * Backend capability snapshot. RuntimeCapabilityBoundary gates /admin on
 * commerce.storeAdmin and only trusts capabilities once capabilitiesReady is
 * true, so the demo must serve an authoritative-looking snapshot.
 */
const RUNTIME_CONFIG = {
  schemaVersion: 3,
  authMode: 'standalone',
  deployment: { mode: 'standalone', allowExternalResources: false },
  experience: { kind: 'store' },
  capabilitiesReady: true,
  features: {},
  capabilities: {
    commerce: { storefront: true, storeAdmin: true, checkout: true },
    marketplace: {
      discovery: false,
      operator: false,
      selling: false,
      curation: false,
      sellerReview: false,
      customDomains: false,
      releasePublishing: false,
      attribution: false,
    },
    sovereign: { isolatedRuntime: false, managedFleet: false },
    payments: { methods: [{ id: 'eth', kind: 'crypto', flow: 'address-transfer' }] },
  },
};

const PROFILE = {
  peerID: PEER_ID,
  name: 'Bob 的数码小店',
  handle: 'bobs-tech',
  about: '专注高品质数码配件',
  shortDescription: '高品质数码配件',
  avatarHashes: {
    tiny: 'img-avatar',
    small: 'img-avatar',
    medium: 'img-avatar',
    large: 'img-avatar',
    original: 'img-avatar',
  },
  headerHashes: {
    tiny: 'img-header',
    small: 'img-header',
    medium: 'img-header',
    large: 'img-header',
    original: 'img-header',
  },
  vendor: true,
  stats: {
    followerCount: 128,
    followingCount: 34,
    listingCount: CATALOG.length,
    ratingCount: 42,
    averageRating: 4.8,
  },
};

/** Live storefront config — mirrors what a seller has published today. */
const initialLiveConfig = {
  version: 1,
  status: 'published',
  theme: {
    palette: 'minimal',
    primaryColor: '#0f172a',
    secondaryColor: '#475569',
    accentColor: '#0ea5e9',
    fontFamily: 'inter',
    borderRadius: 'md',
    headerStyle: 'minimal',
  },
  sections: [
    {
      id: 'demo-hero',
      type: 'hero',
      props: {
        title: '欢迎光临',
        subtitle: '探索我们的精选商品',
        height: 'md',
        textAlign: 'center',
        overlayOpacity: 0.4,
      },
      visible: true,
    },
    {
      id: 'demo-featured',
      type: 'featured-products',
      props: { title: '精选商品', mode: 'newest', count: 4, columns: 4 },
      visible: true,
    },
    {
      id: 'demo-trust',
      type: 'trust-badges',
      props: {
        badges: [
          {
            icon: 'escrow',
            title: 'Buyer Protection',
            description: 'Funds held securely until you confirm receipt',
          },
          {
            icon: 'crypto',
            title: 'Crypto Native',
            description: 'Pay with ETH, BNB, SOL and more',
          },
          {
            icon: 'selfHosted',
            title: 'Self-Hosted',
            description: "This store runs on the seller's own server",
          },
          {
            icon: 'p2p',
            title: 'Direct Trade',
            description: 'No middleman between you and the seller',
          },
          {
            icon: 'privacy',
            title: 'Privacy First',
            description: 'No tracking, no data harvesting',
          },
        ],
        layout: 'grid',
        style: 'card',
      },
      visible: true,
    },
    {
      id: 'demo-tabs',
      type: 'store-tabs',
      props: { tabs: ['reviews', 'following', 'followers'] },
      visible: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Fake node API
// ---------------------------------------------------------------------------

function svgPlaceholder(label: string, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="${color}99"/>
  </linearGradient></defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <text x="300" y="310" font-family="system-ui,sans-serif" font-size="34" fill="#fff"
        text-anchor="middle" opacity="0.95">${label}</text>
</svg>`;
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Serves the whole node surface the editor touches. Live/draft config are held
 * in closure state so Save draft → Publish behave like the real two-slot API.
 */
async function installFakeNode(page: Page) {
  const state = {
    live: JSON.parse(JSON.stringify(initialLiveConfig)) as Record<string, unknown>,
    draft: null as Record<string, unknown> | null,
  };

  await page.route('**/v1/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/^\/v1/, '');
    const method = req.method();

    // --- runtime capabilities (gates the whole /admin shell) ---------------
    if (p === '/runtime-config') return json(route, { data: RUNTIME_CONFIG });
    if (p.startsWith('/system/setup')) {
      // ownerUserId must equal the seeded JWT's `id` so restoreSession()
      // resolves this session as the store owner (admin context).
      return json(route, {
        data: { setupComplete: true, casdoorAvailable: false, ownerUserId: 'demo-owner' },
      });
    }
    if (p === '/preferences') return json(route, { data: {} });

    // --- media -------------------------------------------------------------
    if (p.startsWith('/media/images')) {
      const hash = p.split('/').pop() || '';
      if (method === 'POST')
        return json(route, { data: [{ hash: 'img-uploaded', name: 'upload' }] });
      const product = CATALOG.find(c => c.hash === hash);
      const label = product?.title ?? (hash === 'img-header' ? 'Bob 的数码小店' : 'Bob');
      const color = product?.color ?? '#334155';
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: svgPlaceholder(label, color),
      });
    }

    // --- storefront config -------------------------------------------------
    if (p === '/settings/storefront') {
      if (method === 'GET') {
        const wantsDraft = url.searchParams.get('variant') === 'draft';
        return json(route, { data: wantsDraft ? state.draft : state.live });
      }
      if (method === 'PUT') {
        const body = JSON.parse(req.postData() || '{}');
        if (body.status === 'draft') {
          state.draft = body;
        } else {
          state.live = body;
          state.draft = null; // publish supersedes the draft, atomically
        }
        return json(route, { data: body });
      }
    }
    if (p === '/settings/storefront/draft' && method === 'DELETE') {
      state.draft = null;
      return json(route, { data: null });
    }

    // --- catalog -----------------------------------------------------------
    if (p.startsWith('/listings/index')) return json(route, { data: productListItems });
    if (p === '/collections')
      return json(route, {
        data: COLLECTIONS,
        meta: { page: 1, pageSize: 20, total: COLLECTIONS.length },
      });
    if (p.startsWith('/collections/') && p.endsWith('/published'))
      return json(route, { data: COLLECTIONS });
    if (p.startsWith('/profiles')) return json(route, { data: PROFILE });
    if (p.startsWith('/ratings')) return json(route, { data: [] });

    // Anything else the shell polls (notifications, system status…) — empty is fine.
    return json(route, { data: null });
  });
}

// ---------------------------------------------------------------------------
// Narration overlay
// ---------------------------------------------------------------------------

async function installNarration(page: Page) {
  await page.addStyleTag({
    content: `
      #demo-caption {
        position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
        z-index: 2147483647; pointer-events: none;
        background: rgba(15,23,42,.93); color: #fff;
        padding: 12px 22px; border-radius: 999px;
        font: 500 15px/1.4 system-ui, -apple-system, "PingFang SC", sans-serif;
        box-shadow: 0 8px 30px rgba(0,0,0,.35);
        opacity: 0; transition: opacity .25s ease; max-width: 78vw; text-align: center;
      }
      #demo-caption.on { opacity: 1; }
      /* Next.js dev-tools indicator — not part of the product. */
      nextjs-portal { display: none !important; }
      #demo-step {
        position: fixed; left: 20px; top: 16px; z-index: 2147483647; pointer-events: none;
        background: rgba(14,165,233,.95); color:#fff; padding: 6px 14px; border-radius: 8px;
        font: 600 12px/1 system-ui, sans-serif; letter-spacing: .04em;
      }
    `,
  });
  await page.evaluate(() => {
    for (const id of ['demo-caption', 'demo-step']) {
      if (!document.getElementById(id)) {
        const el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
      }
    }
  });
}

async function say(page: Page, step: string, text: string, holdMs = 2200) {
  await page.evaluate(
    ({ step, text }) => {
      const cap = document.getElementById('demo-caption');
      const st = document.getElementById('demo-step');
      if (st) st.textContent = step;
      if (cap) {
        cap.textContent = text;
        cap.classList.add('on');
      }
    },
    { step, text }
  );
  await page.waitForTimeout(holdMs);
}

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

test('storefront editor walkthrough', async ({ page }, testInfo) => {
  await installFakeNode(page);

  // Bypass Casdoor: seed the persisted store, the standalone auth token, and
  // the Chinese locale. The token must be a parseable JWT with a live `exp` —
  // restoreSession() reads it from its own key and throws on a malformed one.
  await page.addInitScript(
    ({ profile }) => {
      const b64url = (o: unknown) =>
        btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const jwt = [
        b64url({ alg: 'HS256', typ: 'JWT' }),
        b64url({
          id: 'demo-owner',
          name: 'bob',
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        }),
        'demo-signature',
      ].join('.');

      localStorage.setItem('mobazha-locale', 'zh');
      localStorage.setItem('mobazha_auth_token', jwt);
      localStorage.setItem(
        'mobazha-user-storage',
        JSON.stringify({
          state: {
            profile,
            isAuthenticated: true,
            authMode: 'standalone',
            token: jwt,
            authSource: 'casdoor',
            isStoreOwner: true,
          },
          version: 0,
        })
      );
    },
    { profile: PROFILE }
  );

  // Turbopack compiles this route on first hit; give the dev server room.
  await page.goto('/admin/storefront', { waitUntil: 'domcontentloaded' });
  await page
    .locator('[data-testid="store-branding-editor"]')
    .waitFor({ state: 'visible', timeout: 180_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await installNarration(page);

  const previewFeatured = page.locator('[data-section-id="demo-featured"]');
  await previewFeatured.waitFor({ state: 'visible', timeout: 30_000 });

  await say(page, 'PG-203', '店铺外观编辑器：左侧设置，右侧是店铺的真实渲染（不再是占位框）', 2600);

  // --- 1. Theme ------------------------------------------------------------
  await say(page, '1 / 7 主题', '主题分组折叠，配色默认展开——切换调色板，预览实时跟随', 2000);
  const paletteBtn = page.locator('[data-testid="theme-group-colors"] ~ div button').nth(3);
  if (await paletteBtn.isVisible().catch(() => false)) {
    await paletteBtn.click();
    await page.waitForTimeout(1200);
  }

  // --- 2. Canvas click-to-select -------------------------------------------
  await say(page, '2 / 7 画布选中', '点击预览里的任意区块，左栏自动定位到它的设置', 2000);
  await previewFeatured.click();
  await page.waitForTimeout(1500);

  // --- 3. The reported bug: manual product selection ------------------------
  await say(page, '3 / 7 手动选品', '把「精选商品」切到手动模式——这里过去没有任何选择入口', 2400);
  const modeSelect = page.locator('[data-list-section-id="demo-featured"] select').first();
  await modeSelect.selectOption('manual');
  await page.waitForTimeout(1000);

  await say(page, '3 / 7 手动选品', '现在出现「选择商品」按钮，点开是带搜索的选品器', 2200);
  await page.locator('[data-testid="open-product-picker"]').click();
  await page.locator('[data-testid="resource-picker"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(900);

  await say(page, '3 / 7 手动选品', '搜索 + 多选，点选顺序就是展示顺序', 1800);
  await page.locator('[data-testid="resource-picker-search"]').fill('机');
  await page.waitForTimeout(1200);
  await page.locator('[data-testid="resource-picker-search"]').fill('');
  await page.waitForTimeout(700);

  const pickerItems = page.locator('[data-testid="resource-picker"] li button');
  for (const idx of [3, 0, 5]) {
    await pickerItems.nth(idx).click();
    await page.waitForTimeout(550);
  }
  await say(page, '3 / 7 手动选品', '确认后，预览立刻显示所选的真实商品', 1600);
  await page.locator('[data-testid="resource-picker-confirm"]').click();
  await page.waitForTimeout(2000);

  // --- 4. Undo / redo ------------------------------------------------------
  await say(page, '4 / 7 撤销重做', '误操作可撤销（⌘Z），历史栈完整', 1800);
  await page.locator('[data-testid="editor-undo"]').click();
  await page.waitForTimeout(1400);
  await say(page, '4 / 7 撤销重做', '重做恢复', 1200);
  await page.locator('[data-testid="editor-redo"]').click();
  await page.waitForTimeout(1400);

  // --- 5. Buyer's-eye preview ----------------------------------------------
  await say(page, '5 / 7 全屏预览', '以买家视角全屏看草稿，含尚未保存的改动', 2200);
  await page.locator('[data-testid="fullscreen-preview-open"]').click();
  await page.locator('[data-testid="fullscreen-preview"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(2400);
  await page.locator('[data-testid="exit-preview"]').click();
  await page.waitForTimeout(1200);

  // --- 6. Save draft -------------------------------------------------------
  await say(page, '6 / 7 草稿', '保存草稿：买家侧线上店铺完全不受影响', 2000);
  await page.locator('[data-testid="save-draft"]').click();
  await page.waitForTimeout(1800);

  // --- 7. Publish ----------------------------------------------------------
  await say(page, '7 / 7 发布', '发布前先说清买家会看到什么改动', 2000);
  await page.locator('[data-testid="publish"]').click();
  await page.locator('[data-testid="publish-summary"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(2600);
  await page.locator('[data-testid="publish-confirm"]').click();
  await page.waitForTimeout(2200);

  await say(page, '完成', '手动选品 → 真实预览 → 草稿 → 发布，全链路走通', 2600);

  // saveAs() — not copy-from-path() — is what waits for the recording to be
  // flushed; copying the raw path yields a truncated file that loses the last
  // scenes.
  const video = page.video();
  await page.close();
  if (video) {
    const out = path.join(testInfo.project.outputDir, '..', 'storefront-editor-demo.webm');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await video.saveAs(out);
    console.log(`\n▶ Demo video: ${out}`);

    // QuickTime/Keynote can't open webm; transcode when ffmpeg is around.
    const mp4 = out.replace(/\.webm$/, '.mp4');
    try {
      execFileSync('ffmpeg', [
        '-loglevel',
        'error',
        '-y',
        '-i',
        out,
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        mp4,
      ]);
      console.log(`▶ Demo video (mp4): ${mp4}`);
    } catch {
      console.log('  (ffmpeg not found — webm only)');
    }
  }
  console.log('');
});
