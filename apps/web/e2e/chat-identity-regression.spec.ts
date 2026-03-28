import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import {
  BACKEND_URL,
  completeOnboardingIfNeeded,
  getCasdoorToken,
  getPeerID,
  performCasdoorLogin,
} from './fixtures/auth';

const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || '123';
const USER1 = 'testuser1';
const USER2 = 'testuser2';

async function apiJson(
  request: APIRequestContext,
  method: 'GET' | 'POST',
  path: string,
  token: string,
  data?: unknown
): Promise<{ status: number; json: unknown }> {
  const response =
    method === 'GET'
      ? await request.get(`${BACKEND_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      : await request.post(`${BACKEND_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
          data,
        });

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return { status: response.status(), json };
}

async function initializeChat(request: APIRequestContext, token: string): Promise<void> {
  await apiJson(request, 'GET', '/v1/chat/rooms', token);
  await apiJson(request, 'GET', '/v1/chat/status', token);
}

async function openChatDrawer(page: Page): Promise<void> {
  const drawer = page.getByTestId('chat-system');
  if (await drawer.isVisible().catch(() => false)) {
    return;
  }

  const headerButton = page.getByTestId('header-messages-btn');
  if (await headerButton.isVisible().catch(() => false)) {
    await headerButton.click();
    await expect(drawer).toBeVisible();
    return;
  }

  const mobileNavButton = page.getByTestId('mobile-nav-chat');
  if (await mobileNavButton.isVisible().catch(() => false)) {
    await mobileNavButton.click();
    await expect(drawer).toBeVisible();
    return;
  }

  await page.goto('/');
  await headerButton.click();
  await expect(drawer).toBeVisible();
}

function unwrapData<T>(json: unknown): T {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

async function joinRoomIfPossible(
  request: APIRequestContext,
  token: string,
  roomId: string
): Promise<void> {
  await apiJson(request, 'POST', `/v1/chat/rooms/${encodeURIComponent(roomId)}/join`, token);
}

async function sendMessage(
  request: APIRequestContext,
  token: string,
  roomId: string,
  body: string
): Promise<void> {
  const response = await apiJson(
    request,
    'POST',
    `/v1/chat/rooms/${encodeURIComponent(roomId)}/messages`,
    token,
    { body }
  );
  expect(response.status).toBeLessThan(300);
}

test('dm identity presentation stays consistent across list, header, settings, and incoming messages', async ({
  page,
  request,
}) => {
  const [user1Token, user2Token, user1PeerID] = await Promise.all([
    getCasdoorToken(request, USER1, TEST_PASSWORD),
    getCasdoorToken(request, USER2, TEST_PASSWORD),
    getPeerID(request, USER1, TEST_PASSWORD),
  ]);

  await initializeChat(request, user1Token);
  await initializeChat(request, user2Token);

  await performCasdoorLogin(page, USER2, TEST_PASSWORD);
  await completeOnboardingIfNeeded(page);
  await openChatDrawer(page);

  const createRoomResponsePromise = page.waitForResponse(response => {
    if (!response.url().includes('/v1/chat/rooms')) return false;
    if (response.request().method() !== 'POST') return false;
    return response.request().postData()?.includes('"isDM":true') ?? false;
  });

  await page.getByTestId('chat-system').getByTestId('chat-new-btn').first().click();
  await expect(page.getByTestId('chat-new-dialog')).toBeVisible();
  await page.getByTestId('chat-new-dialog-input').fill(user1PeerID);
  await page.getByTestId('chat-new-dialog-submit').click();

  const roomTitle = page.getByTestId('chat-room-title');
  await expect(roomTitle).toContainText(/Alice.*Digital Shop/i, { timeout: 30000 });

  const headerAvatar = page.getByTestId('chat-room-avatar-btn').locator('img');
  await expect(headerAvatar).toBeVisible({ timeout: 30000 });
  await expect(headerAvatar).toHaveAttribute('src', /^(blob:|https?:)/);

  const createRoomResponse = await createRoomResponsePromise;
  const createRoomJson = await createRoomResponse.json().catch(() => null);
  const createdRoom = unwrapData<{ roomId?: string; roomID?: string }>(createRoomJson);
  const roomId = createdRoom?.roomId || createdRoom?.roomID || null;
  expect(roomId).toBeTruthy();

  await joinRoomIfPossible(request, user1Token, roomId!);
  await page.waitForTimeout(5000);

  const incomingMessage = `identity-regression-${Date.now()}`;
  await sendMessage(request, user1Token, roomId!, incomingMessage);

  await expect(page.getByText(incomingMessage)).toBeVisible({ timeout: 45000 });
  const incomingMessageAvatar = page.getByTestId('chat-message-avatar-btn').locator('img').first();
  await expect(incomingMessageAvatar).toBeVisible({ timeout: 30000 });
  await expect(incomingMessageAvatar).toHaveAttribute('src', /^(blob:|https?:)/);

  await page.getByTestId('chat-room-back-btn').click();
  const roomItem = page.locator(`[data-testid="chat-room-item"][data-room-id="${roomId!}"]`);
  await expect(roomItem).toBeVisible({ timeout: 30000 });
  await expect(roomItem).toContainText(/Alice.*Digital Shop/i);
  await expect(roomItem.locator('img')).toBeVisible({ timeout: 30000 });
  await expect(roomItem.locator('img')).toHaveAttribute('src', /^(blob:|https?:)/);

  await roomItem.click();
  await expect(page.getByTestId('chat-room-title')).toContainText(/Alice.*Digital Shop/i);

  await page.getByTestId('chat-room-settings-btn').click();
  const settingsPanel = page.getByTestId('chat-room-settings-panel');
  await expect(settingsPanel).toBeVisible();
  await expect(settingsPanel.getByTestId('chat-room-settings-title')).toContainText(
    /Alice.*Digital Shop/i
  );
  const settingsAvatar = settingsPanel.getByTestId('chat-room-settings-avatar').locator('img');
  await expect(settingsAvatar).toBeVisible({ timeout: 30000 });
  await expect(settingsAvatar).toHaveAttribute('src', /^(blob:|https?:)/);

  await page.screenshot({
    path: `/tmp/chat-identity-regression-${Date.now()}.png`,
    fullPage: true,
  });
});
