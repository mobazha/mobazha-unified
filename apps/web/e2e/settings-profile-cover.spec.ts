// SPDX-License-Identifier: MPL-2.0
// Copyright (c) 2026 fengzie and the respective contributors.

/**
 * Settings → Profile: cover (header banner) upload
 *
 * Guards the ordering contract the save path depends on: /v1/media/header must
 * fully land before PUT /v1/profile, because the node applies the PUT as a merge
 * patch over the profile snapshot it read at request start — overlapping them
 * lets the PUT write back a pre-upload snapshot and silently drop headerHashes.
 */

import { test, expect, type Page } from '@playwright/test';
import { runtimeConfigFixture } from './fixtures/runtime-config';

const MOCK_PROFILE = {
  peerID: 'QmMockPeerForCoverTest',
  name: 'Demo Store',
  handle: 'demo-store',
  about: 'demo',
  shortDescription: 'demo',
  location: 'New York, NY',
  vendor: true,
  moderator: false,
  avatarHashes: {},
  headerHashes: {},
};

const USER_STORAGE = {
  state: {
    profile: MOCK_PROFILE,
    peerID: MOCK_PROFILE.peerID,
    isAuthenticated: true,
    isLoading: false,
    isStoreOwner: true,
    needsOnboarding: false,
    authMode: 'basic',
    token: 'basic:mock-cover-token',
    authSource: 'basic',
  },
  version: 0,
};

const UPLOADED_HASHES = {
  tiny: 'zbHash-tiny',
  small: 'zbHash-small',
  medium: 'zbHash-medium',
  large: 'zbHash-large',
  original: 'zbHash-original',
};

const UPLOADED_AVATAR_HASHES = {
  tiny: 'zbAvatar-tiny',
  small: 'zbAvatar-small',
  medium: 'zbAvatar-medium',
  large: 'zbAvatar-large',
  original: 'zbAvatar-original',
};

/** 1x1 PNG. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

interface Trace {
  events: string[];
  profilePutBody: Record<string, unknown> | null;
}

interface SetupOptions {
  /** Make POST /v1/media/header fail, the way a 413/5xx from the node would. */
  failHeaderUpload?: boolean;
}

async function setupPage(page: Page, opts: SetupOptions = {}): Promise<Trace> {
  const trace: Trace = { events: [], profilePutBody: null };

  await page.addInitScript(
    ({ runtimeConfig, userStorage }) => {
      (window as unknown as Record<string, unknown>).__RUNTIME_CONFIG__ = runtimeConfig;
      try {
        window.localStorage.setItem('mobazha_auth_token', 'basic:mock-cover-token');
        window.localStorage.setItem('mobazha-user-storage', JSON.stringify(userStorage));
      } catch {
        // ignore
      }
    },
    { runtimeConfig: runtimeConfigFixture({ deployment: 'hosted' }), userStorage: USER_STORAGE }
  );

  // Single handler so route precedence can't shadow the specific endpoints.
  await page.route('**/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const json = (data: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data }),
      });

    if (path.endsWith('/v1/system/setup/status')) {
      await json({ setupComplete: true, casdoorAvailable: false, hasAdmin: true });
      return;
    }

    // Deliberately slow so that a parallel PUT would overlap and be caught.
    if (path.endsWith('/v1/media/header')) {
      trace.events.push('header:start');
      await new Promise(resolve => setTimeout(resolve, 600));
      trace.events.push('header:end');
      if (opts.failHeaderUpload) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
        return;
      }
      await json(UPLOADED_HASHES);
      return;
    }

    // The avatar shares the ordering invariant — it used to run parallel with the PUT.
    if (path.endsWith('/v1/media/avatar')) {
      trace.events.push('avatar:start');
      await new Promise(resolve => setTimeout(resolve, 600));
      trace.events.push('avatar:end');
      await json(UPLOADED_AVATAR_HASHES);
      return;
    }

    if (path.endsWith('/v1/profiles')) {
      if (route.request().method() === 'PUT') {
        trace.events.push('profilePut:start');
        trace.profilePutBody = route.request().postDataJSON();
        await json({});
        return;
      }
      await json(MOCK_PROFILE);
      return;
    }

    await json(null);
  });
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204, body: '' }));

  return trace;
}

/**
 * Navigate and wait for the cover field. The timeout is deliberately generous:
 * this route is compiled on first hit and parallel workers contend for the dev
 * server, which is page-load latency rather than anything under test.
 */
async function gotoProfileSettings(page: Page) {
  await page.goto('/settings/page-profile');
  const coverField = page.getByRole('button', { name: /Change Cover|更换封面/i });
  await expect(coverField).toBeVisible({ timeout: 60_000 });
  return coverField;
}

const saveButton = (page: Page) => page.getByRole('button', { name: /^(Save|保存)/ });

test.describe('Settings → Profile cover upload', () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test('uploads the cover before the profile PUT and includes headerHashes', async ({ page }) => {
    const trace = await setupPage(page);
    const coverField = await gotoProfileSettings(page);

    // Scope to the cover field's own input — indexing across the page's file
    // inputs would silently target the avatar if another one is added above.
    await coverField.locator('input[type="file"]').setInputFiles({
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });

    await expect(saveButton(page)).toBeEnabled();
    await saveButton(page).click();

    await expect.poll(() => trace.profilePutBody, { timeout: 15000 }).not.toBeNull();

    // The upload must be fully finished before the PUT is issued.
    expect(trace.events).toEqual(['header:start', 'header:end', 'profilePut:start']);
    expect(trace.profilePutBody).toMatchObject({ headerHashes: UPLOADED_HASHES });
  });

  test('uploads the avatar before the profile PUT too', async ({ page }) => {
    const trace = await setupPage(page);
    await gotoProfileSettings(page);

    // The avatar's own hidden input — the cover field owns the other one.
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG_1X1 });

    await expect(saveButton(page)).toBeEnabled();
    await saveButton(page).click();

    await expect.poll(() => trace.profilePutBody, { timeout: 15000 }).not.toBeNull();

    expect(trace.events).toEqual(['avatar:start', 'avatar:end', 'profilePut:start']);
    expect(trace.profilePutBody).toMatchObject({ avatarHashes: UPLOADED_AVATAR_HASHES });
  });

  test('a failed cover upload reports the error but still saves the text edits', async ({
    page,
  }) => {
    const trace = await setupPage(page, { failHeaderUpload: true });
    const coverField = await gotoProfileSettings(page);

    // By placeholder: indexing textboxes would grab the header search field.
    await page.getByPlaceholder(/Your name \/ name of recipient|您的名字/i).fill('Renamed Store');
    await coverField.locator('input[type="file"]').setInputFiles({
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });

    await saveButton(page).click();

    // .first(): the toast renders the copy twice — visible body + sr-only announcement.
    await expect(page.getByText(/Failed to upload image|上传图片失败/i).first()).toBeVisible();
    // No success toast: the cover the user picked was never stored.
    await expect(page.getByText(/Profile saved|资料已保存/i)).toHaveCount(0);
    // The text must not be held hostage by a picture the node rejects...
    await expect.poll(() => trace.profilePutBody).not.toBeNull();
    expect(trace.profilePutBody).toMatchObject({ name: 'Renamed Store' });
    expect(trace.profilePutBody).not.toHaveProperty('headerHashes');
    // ...and the rejected cover stays pending so the SaveBar remains a retry path.
    await expect(saveButton(page)).toBeEnabled();
  });

  test('accepts a dropped image file', async ({ page }) => {
    await setupPage(page);
    const coverField = await gotoProfileSettings(page);

    // Save is only offered once the form is dirty, so it proves the drop registered.
    await expect(saveButton(page)).toHaveCount(0);

    await coverField.dispatchEvent('drop', {
      dataTransfer: await page.evaluateHandle(() => {
        const dt = new window.DataTransfer();
        dt.items.add(new File([new Uint8Array([1, 2, 3])], 'dropped.png', { type: 'image/png' }));
        return dt;
      }),
    });

    await expect(saveButton(page)).toBeEnabled();
  });

  test('rejects a non-image drop with a message instead of dropping it silently', async ({
    page,
  }) => {
    await setupPage(page);
    const coverField = await gotoProfileSettings(page);

    await coverField.dispatchEvent('drop', {
      dataTransfer: await page.evaluateHandle(() => {
        const dt = new window.DataTransfer();
        dt.items.add(
          new File([new Uint8Array([1, 2, 3])], 'notes.pdf', { type: 'application/pdf' })
        );
        return dt;
      }),
    });

    await expect(
      page.getByText(/Please choose an image file|请选择图片文件/i).first()
    ).toBeVisible();
    // Rejected file must not become a pending change.
    await expect(saveButton(page)).toHaveCount(0);
  });

  test('a drag carrying no file is rejected rather than silently ignored', async ({ page }) => {
    await setupPage(page);
    const coverField = await gotoProfileSettings(page);

    // Dragging an image between browser tabs hands over a URL, not a File.
    await coverField.dispatchEvent('drop', {
      dataTransfer: await page.evaluateHandle(() => {
        const dt = new window.DataTransfer();
        dt.setData('text/uri-list', 'https://example.com/cover.png');
        return dt;
      }),
    });

    await expect(
      page.getByText(/Please choose an image file|请选择图片文件/i).first()
    ).toBeVisible();
  });

  test('an oversized image is rejected before upload', async ({ page }) => {
    const trace = await setupPage(page);
    const coverField = await gotoProfileSettings(page);

    await coverField.locator('input[type="file"]').setInputFiles({
      name: 'huge.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(11 * 1024 * 1024, 1), // > the 10 MB cap
    });

    await expect(page.getByText(/too large|过大|超过/i).first()).toBeVisible();
    await expect(saveButton(page)).toHaveCount(0);
    expect(trace.events).toEqual([]); // never reached the node
  });
});
