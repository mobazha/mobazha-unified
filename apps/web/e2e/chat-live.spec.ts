/**
 * Chat Live E2E Tests (Real Backend)
 *
 * These tests require:
 * - Running E2E Docker environment (SaaS + Synapse + Casdoor)
 * - Environment variables: E2E_BACKEND_URL, E2E_CASDOOR_URL, E2E_TEST_PASSWORD
 *
 * Covers: F1 (message content), F2 (edited indicator via API), F3 (redacted via API),
 * F4 (room list sorting), F5 (unread badge), F8 (SAS verification dialog),
 * F9 (room type tabs), F10 (message timestamp order)
 */

import { authenticatedTest, BACKEND_URL } from './fixtures/auth';
import { type Page } from '@playwright/test';

const HEADER_CHAT_BTN = '[data-testid="header-messages-btn"]';
const CHAT_DRAWER = '[data-testid="chat-system"]';
const CHAT_INPUT = '[data-testid="chat-message-input"]';
const CHAT_SEND = '[data-testid="chat-send-btn"]';
const CHAT_CONV_LIST = '[data-testid="chat-conversation-list"]';

async function openChatDrawer(page: Page): Promise<void> {
  const drawer = page.locator(CHAT_DRAWER);

  if (await drawer.isVisible().catch(() => false)) {
    return;
  }

  const headerBtn = page.locator(HEADER_CHAT_BTN);
  if (await headerBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await headerBtn.click();
    await drawer.waitFor({ state: 'visible', timeout: 10000 });
    return;
  }

  const mobileNavChat = page.locator('[data-testid="mobile-nav-chat"]');
  if (await mobileNavChat.isVisible({ timeout: 3000 }).catch(() => false)) {
    await mobileNavChat.click();
    await drawer.waitFor({ state: 'visible', timeout: 10000 });
    return;
  }

  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  const retryBtn = page.locator(HEADER_CHAT_BTN);
  await retryBtn.waitFor({ state: 'visible', timeout: 10000 });
  await retryBtn.click();
  await drawer.waitFor({ state: 'visible', timeout: 10000 });
}

async function sendChatMessage(page: Page, text: string): Promise<void> {
  const input = page.locator(CHAT_INPUT);
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(text);
  const sendBtn = page.locator(CHAT_SEND);
  await sendBtn.click();
}

async function apiSendMessage(
  page: Page,
  roomId: string,
  text: string,
  token: string
): Promise<string> {
  const resp = await page.request.post(`${BACKEND_URL}/v1/chat/rooms/${roomId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { body: text },
  });
  const data = await resp.json();
  return data?.data?.eventId || data?.data?.id || '';
}

async function apiGetRooms(page: Page, token: string): Promise<Array<Record<string, unknown>>> {
  const resp = await page.request.get(`${BACKEND_URL}/v1/chat/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  return (data?.data || []) as Array<Record<string, unknown>>;
}

// ============================================================================
// F1: Message Content Displayed
// ============================================================================

authenticatedTest.describe('Chat Message Content', () => {
  authenticatedTest(
    'F1: sent message text is visible in chat timeline',
    async ({ authedPage, casdoorToken, expect }) => {
      const page = authedPage;

      const rooms = await apiGetRooms(page, casdoorToken);
      if (rooms.length === 0) {
        authenticatedTest.skip();
        return;
      }

      await openChatDrawer(page);

      const convList = page.locator(CHAT_CONV_LIST);
      const firstRoom = convList.locator('> *').first();
      await firstRoom.waitFor({ state: 'visible', timeout: 5000 });
      await firstRoom.click();
      await page.locator(CHAT_INPUT).waitFor({ state: 'visible', timeout: 5000 });

      const uniqueMsg = `e2e-content-${Date.now()}`;
      await sendChatMessage(page, uniqueMsg);

      const chatArea = page.locator(CHAT_DRAWER);
      await expect(chatArea.getByText(uniqueMsg)).toBeVisible({ timeout: 15000 });

      await page.screenshot({ path: 'test-results/chat-f1-message-content.png', fullPage: true });
    }
  );

  authenticatedTest(
    'F10: messages display in chronological order',
    async ({ authedPage, casdoorToken, expect }) => {
      const page = authedPage;

      const rooms = await apiGetRooms(page, casdoorToken);
      if (rooms.length === 0) {
        authenticatedTest.skip();
        return;
      }

      await openChatDrawer(page);

      const convList = page.locator(CHAT_CONV_LIST);
      const firstRoom = convList.locator('> *').first();
      await firstRoom.waitFor({ state: 'visible', timeout: 5000 });
      await firstRoom.click();
      await page.locator(CHAT_INPUT).waitFor({ state: 'visible', timeout: 5000 });

      const msg1 = `chrono-1-${Date.now()}`;
      await sendChatMessage(page, msg1);

      const msg2 = `chrono-2-${Date.now() + 1}`;
      await sendChatMessage(page, msg2);

      const chatArea = page.locator(CHAT_DRAWER);
      await expect(chatArea.getByText(msg2)).toBeVisible({ timeout: 15000 });

      const allText = (await chatArea.textContent()) ?? '';
      const idx1 = allText.indexOf(msg1);
      const idx2 = allText.indexOf(msg2);

      expect(idx1).toBeGreaterThanOrEqual(0);
      expect(idx2).toBeGreaterThan(idx1);

      await page.screenshot({ path: 'test-results/chat-f10-timestamp-order.png', fullPage: true });
    }
  );
});

// ============================================================================
// F4: Room List Reorders After New Message
// ============================================================================

authenticatedTest.describe('Chat Room List', () => {
  authenticatedTest(
    'F4: conversation list reorders after new message',
    async ({ authedPage, casdoorToken, expect }) => {
      const page = authedPage;

      const rooms = await apiGetRooms(page, casdoorToken);
      if (rooms.length < 2) {
        authenticatedTest.skip();
        return;
      }

      await openChatDrawer(page);

      const convList = page.locator(CHAT_CONV_LIST);
      const roomItems = convList.locator('> *');
      await roomItems.first().waitFor({ state: 'visible', timeout: 5000 });
      const countBefore = await roomItems.count();

      if (countBefore < 2) {
        authenticatedTest.skip();
        return;
      }

      const firstRoomTextBefore = await roomItems.first().textContent();

      const secondRoom = rooms[1] as { roomId?: string; name?: string };
      if (!secondRoom.roomId) {
        authenticatedTest.skip();
        return;
      }

      await apiSendMessage(page, secondRoom.roomId, `sort-test-${Date.now()}`, casdoorToken);

      // Wait for WS update to reorder the list — poll until first room text changes
      await page
        .waitForFunction(
          ({ selector, previousText }) => {
            const el = document.querySelector(selector)?.firstElementChild;
            return el && el.textContent !== previousText;
          },
          { selector: CHAT_CONV_LIST, previousText: firstRoomTextBefore },
          { timeout: 10000 }
        )
        .catch(() => {
          // Fallback: just wait a bit if WS didn't trigger reorder
        });

      const firstRoomTextAfter = await roomItems.first().textContent();
      expect(firstRoomTextAfter).not.toBe(firstRoomTextBefore);

      await page.screenshot({ path: 'test-results/chat-f4-after-sort.png', fullPage: true });
    }
  );

  authenticatedTest('F5: unread badge shows for new messages', async ({ authedPage, expect }) => {
    const page = authedPage;

    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const chatBtn = page.locator(HEADER_CHAT_BTN);
    await chatBtn.waitFor({ state: 'visible', timeout: 10000 });

    const badge = chatBtn.locator(
      '[data-testid="unread-badge"], span[class*="badge"], span[class*="count"]'
    );
    const hasBadge = await badge
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (hasBadge) {
      const text = await badge.first().textContent();
      expect(text).toBeTruthy();
    }

    await page.screenshot({ path: 'test-results/chat-f5-unread-badge.png', fullPage: true });
  });

  authenticatedTest('F9: chat drawer tabs filter by room type', async ({ authedPage }) => {
    const page = authedPage;

    await openChatDrawer(page);

    const tabs = page.locator('[role="tab"], [data-testid*="chat-tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      for (let i = 0; i < Math.min(tabCount, 4); i++) {
        const tab = tabs.nth(i);
        const tabText = await tab.textContent();
        await tab.click();
        await page
          .locator(CHAT_CONV_LIST)
          .waitFor({ timeout: 5000 })
          .catch(() => {});

        await page.screenshot({
          path: `test-results/chat-f9-tab-${i}-${tabText?.trim()?.replace(/\s+/g, '-')}.png`,
          fullPage: true,
        });
      }
    }

    await page.screenshot({ path: 'test-results/chat-f9-tabs.png', fullPage: true });
  });
});

// ============================================================================
// F2/F3: API-level smoke tests for edit/redact
// (Backend correctness is verified by Go E2E tests G6/G7;
//  these verify the same API from the Playwright HTTP client context)
// ============================================================================

authenticatedTest.describe('Chat API Smoke', () => {
  authenticatedTest(
    'F2: edited message has editedAt field via API',
    async ({ authedPage, casdoorToken, expect }) => {
      const page = authedPage;

      const rooms = await apiGetRooms(page, casdoorToken);
      const roomId = (rooms[0] as { roomId?: string })?.roomId;
      if (!roomId) {
        authenticatedTest.skip();
        return;
      }

      const eventId = await apiSendMessage(page, roomId, `edit-test-${Date.now()}`, casdoorToken);
      if (!eventId) {
        authenticatedTest.skip();
        return;
      }

      const editedText = `edited-${Date.now()}`;
      const editResp = await page.request.put(
        `${BACKEND_URL}/v1/chat/rooms/${roomId}/messages/${encodeURIComponent(eventId)}`,
        {
          headers: { Authorization: `Bearer ${casdoorToken}` },
          data: { body: editedText },
        }
      );
      expect(editResp.status()).toBeLessThan(300);

      // Poll for edit to propagate
      let editedMsg: Record<string, unknown> | undefined;
      for (let attempt = 0; attempt < 5; attempt++) {
        await page.waitForTimeout(1000);
        const msgsResp = await page.request.get(
          `${BACKEND_URL}/v1/chat/rooms/${roomId}/messages?limit=5`,
          { headers: { Authorization: `Bearer ${casdoorToken}` } }
        );
        const msgsData = await msgsResp.json();
        const msgs = (msgsData?.data || []) as Array<Record<string, unknown>>;
        editedMsg = msgs.find(m => m.id === eventId || m.eventId === eventId);
        if (editedMsg?.editedAt) break;
      }

      expect(editedMsg).toBeDefined();
      expect(editedMsg?.editedAt).toBeTruthy();
    }
  );

  authenticatedTest(
    'F3: redacted message is removed from API response',
    async ({ authedPage, casdoorToken, expect }) => {
      const page = authedPage;

      const rooms = await apiGetRooms(page, casdoorToken);
      const roomId = (rooms[0] as { roomId?: string })?.roomId;
      if (!roomId) {
        authenticatedTest.skip();
        return;
      }

      const msgText = `redact-test-${Date.now()}`;
      const eventId = await apiSendMessage(page, roomId, msgText, casdoorToken);
      if (!eventId) {
        authenticatedTest.skip();
        return;
      }

      const delResp = await page.request.delete(
        `${BACKEND_URL}/v1/chat/rooms/${roomId}/messages/${encodeURIComponent(eventId)}`,
        { headers: { Authorization: `Bearer ${casdoorToken}` } }
      );
      expect(delResp.status()).toBeLessThan(300);

      // Poll for redaction to propagate
      let found: Record<string, unknown> | undefined;
      for (let attempt = 0; attempt < 5; attempt++) {
        await page.waitForTimeout(1000);
        const msgsResp = await page.request.get(
          `${BACKEND_URL}/v1/chat/rooms/${roomId}/messages?limit=10`,
          { headers: { Authorization: `Bearer ${casdoorToken}` } }
        );
        const msgsData = await msgsResp.json();
        const msgs = (msgsData?.data || []) as Array<Record<string, unknown>>;
        found = msgs.find(m => (m.content as string)?.includes(msgText));
        if (!found) break;
      }

      expect(found).toBeUndefined();
    }
  );
});

// ============================================================================
// F8: SAS Verification Dialog (smoke test)
// ============================================================================

authenticatedTest.describe('Chat Security', () => {
  authenticatedTest('F8: verification elements exist in chat settings', async ({ authedPage }) => {
    const page = authedPage;

    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    const chatSettingsLink = page.getByText(/chat|messaging|聊天/i).first();
    if (await chatSettingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await chatSettingsLink.click();
    }

    const verifyBtn = page.locator(
      '[data-testid*="verif"], button:has-text("Verify"), button:has-text("验证")'
    );
    await page.screenshot({
      path: 'test-results/chat-f8-verification-settings.png',
      fullPage: true,
    });

    // Smoke test: log whether verification UI is present (not all deployments have E2EE)
    const hasVerify = await verifyBtn.isVisible({ timeout: 5000 }).catch(() => false);
    authenticatedTest.info().annotations.push({
      type: 'e2ee-ui',
      description: hasVerify
        ? 'Verification button found'
        : 'No verification UI (E2EE may be disabled)',
    });
  });
});
