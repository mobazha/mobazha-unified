import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNodeAuthGet = vi.fn();
const mockNodeAuthPost = vi.fn();
const mockNodeAuthPut = vi.fn();
const mockNodeAuthDel = vi.fn();
const mockAuthGet = vi.fn();
const mockAuthPost = vi.fn();
const mockAuthDel = vi.fn();
const mockHostingGet = vi.fn();
const mockHostingPost = vi.fn();
const mockHostingDel = vi.fn();

vi.mock('../../../services/api/helpers', () => ({
  nodeAuthGet: (...args: unknown[]) => mockNodeAuthGet(...args),
  nodeAuthPost: (...args: unknown[]) => mockNodeAuthPost(...args),
  nodeAuthPut: (...args: unknown[]) => mockNodeAuthPut(...args),
  nodeAuthDel: (...args: unknown[]) => mockNodeAuthDel(...args),
  authGet: (...args: unknown[]) => mockAuthGet(...args),
  authPost: (...args: unknown[]) => mockAuthPost(...args),
  authDel: (...args: unknown[]) => mockAuthDel(...args),
  hostingGet: (...args: unknown[]) => mockHostingGet(...args),
  hostingPost: (...args: unknown[]) => mockHostingPost(...args),
  hostingDel: (...args: unknown[]) => mockHostingDel(...args),
}));

vi.mock('../../../services/api/config', () => ({
  getGatewayUrl: () => 'http://node.local/v1',
  getMyGatewayUrl: () => 'http://buyer.local/buyer-api/v1',
  getAuthHeaders: () => ({ Authorization: 'Bearer test-token' }),
}));

vi.mock('../../../config/env', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../config/env')>()),
  isStandaloneMode: () => true,
}));

describe('Monero admin API routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches wallet balance from the local node route', async () => {
    const { getXMRBalance } = await import('../../../services/api/monero');
    mockNodeAuthGet.mockResolvedValue({
      balance: '0',
      unlockedBalance: '0',
      accountIndex: 0,
    });

    await expect(getXMRBalance(0)).resolves.toEqual({
      balance: '0',
      unlockedBalance: '0',
      accountIndex: 0,
    });

    expect(mockNodeAuthGet).toHaveBeenCalledWith('/wallet/xmr/balance?accountIndex=0');
    expect(mockAuthGet).not.toHaveBeenCalled();
  });

  it('submits fund-moving operations to the local node route', async () => {
    const { withdrawXMR, sweepAllXMR } = await import('../../../services/api/monero');
    mockNodeAuthPost
      .mockResolvedValueOnce({ txHash: 'abc', amount: '1', fee: '0' })
      .mockResolvedValueOnce({ txHashes: ['def'], amounts: ['1'], fees: ['0'] });

    await withdrawXMR({ address: '4'.repeat(95), amount: '1' });
    await sweepAllXMR({ address: '4'.repeat(95) });

    expect(mockNodeAuthPost).toHaveBeenNthCalledWith(1, '/wallet/xmr/withdraw', {
      address: '4'.repeat(95),
      amount: '1',
    });
    expect(mockNodeAuthPost).toHaveBeenNthCalledWith(2, '/wallet/xmr/sweep-all', {
      address: '4'.repeat(95),
    });
    expect(mockAuthPost).not.toHaveBeenCalled();
  });

  it('manages Monero nodes through local node routes', async () => {
    const { addMoneroNode, removeMoneroNode, switchMoneroNode } =
      await import('../../../services/api/monero');
    mockNodeAuthPost.mockResolvedValue({});
    mockNodeAuthDel.mockResolvedValue(undefined);

    await addMoneroNode({ address: 'node.example:18089' });
    await switchMoneroNode('node.example:18089');
    await removeMoneroNode('node.example:18089');

    expect(mockNodeAuthPost).toHaveBeenNthCalledWith(1, '/system/monero-nodes', {
      address: 'node.example:18089',
    });
    expect(mockNodeAuthPost).toHaveBeenNthCalledWith(
      2,
      '/system/monero-nodes/node.example%3A18089/switch'
    );
    expect(mockNodeAuthDel).toHaveBeenCalledWith('/system/monero-nodes/node.example%3A18089');
    expect(mockAuthPost).not.toHaveBeenCalled();
    expect(mockAuthDel).not.toHaveBeenCalled();
  });

  it('fetches payment RPC status from the local node route', async () => {
    const { getPaymentRPCStatus } = await import('../../../services/api/system');
    mockNodeAuthGet.mockResolvedValue({ xmr: { connected: true } });

    await expect(getPaymentRPCStatus()).resolves.toEqual({ xmr: { connected: true } });

    expect(mockNodeAuthGet).toHaveBeenCalledWith('/system/rpc-status');
    expect(mockAuthGet).not.toHaveBeenCalled();
  });

  it('keeps standalone system admin calls on the local node route', async () => {
    const { getSystemHealth, triggerUpdate, updateUpdateConfig } =
      await import('../../../services/api/system');
    mockNodeAuthGet.mockResolvedValue({ status: 'ok' });
    mockNodeAuthPost.mockResolvedValue(undefined);
    mockNodeAuthPut.mockResolvedValue({ autoUpdateEnabled: true });

    await getSystemHealth();
    await triggerUpdate('check');
    await updateUpdateConfig({
      autoUpdateEnabled: true,
      checkIntervalMinutes: 60,
      updateChannel: 'stable',
    });

    expect(mockNodeAuthGet).toHaveBeenCalledWith('/system/health');
    expect(mockNodeAuthPost).toHaveBeenCalledWith('/system/update-trigger', { action: 'check' });
    expect(mockNodeAuthPut).toHaveBeenCalledWith('/system/update-config', {
      autoUpdateEnabled: true,
      checkIntervalMinutes: 60,
      updateChannel: 'stable',
    });
  });

  it('keeps MCP auto-connect calls on the local node route', async () => {
    const { mcpGetCapability, mcpConnectAll } = await import('../../../services/api/mcpConnect');
    mockNodeAuthGet.mockResolvedValue({ supported: true });
    mockNodeAuthPost.mockResolvedValue({ clients: [] });

    await mcpGetCapability();
    await mcpConnectAll('mbz_token', true);

    expect(mockNodeAuthGet).toHaveBeenCalledWith('/system/mcp/capability');
    expect(mockNodeAuthPost).toHaveBeenCalledWith('/system/mcp/connect', {
      token: 'mbz_token',
      force: true,
    });
    expect(mockAuthGet).not.toHaveBeenCalled();
    expect(mockAuthPost).not.toHaveBeenCalled();
  });

  it('keeps standalone API token calls on the local node route', async () => {
    const { listTokens, createToken, revokeToken, getAvailableScopes } =
      await import('../../../services/api/apiTokens');
    mockNodeAuthGet.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockNodeAuthPost.mockResolvedValue({ token: 'mbz_test', info: {} });
    mockNodeAuthDel.mockResolvedValue(undefined);

    await listTokens();
    await createToken({ name: 'test', scopes: ['wallet:read'] });
    await revokeToken('123');
    await getAvailableScopes();

    expect(mockNodeAuthGet).toHaveBeenNthCalledWith(1, '/auth/tokens');
    expect(mockNodeAuthPost).toHaveBeenCalledWith('/auth/tokens', {
      name: 'test',
      scopes: ['wallet:read'],
    });
    expect(mockNodeAuthDel).toHaveBeenCalledWith('/auth/tokens/123');
    expect(mockNodeAuthGet).toHaveBeenNthCalledWith(2, '/auth/scopes');
    expect(mockHostingGet).not.toHaveBeenCalled();
    expect(mockAuthGet).not.toHaveBeenCalled();
  });

  it('keeps AI settings calls on the local node route', async () => {
    const { getAIStatus, saveAIConfig } = await import('../../../services/api/aiSettings');
    mockNodeAuthGet.mockResolvedValue({ available: true });
    mockNodeAuthPut.mockResolvedValue({ enabled: true });

    await getAIStatus();
    await saveAIConfig({
      provider: 'ollama',
      model: 'llava',
      base_url: 'http://127.0.0.1:11434',
      enabled: true,
    });

    expect(mockNodeAuthGet).toHaveBeenCalledWith('/ai/status');
    expect(mockNodeAuthPut).toHaveBeenCalledWith('/settings/ai', {
      provider: 'ollama',
      model: 'llava',
      base_url: 'http://127.0.0.1:11434',
      enabled: true,
    });
    expect(mockAuthGet).not.toHaveBeenCalled();
  });

  it('keeps AI generation on the local node route', async () => {
    const { aiService } = await import('../../../services/ai/aiService');
    mockNodeAuthPost.mockResolvedValue({ title: 'Better title' });

    await expect(aiService.improveTitle('Original title')).resolves.toEqual({
      title: 'Better title',
    });

    expect(mockNodeAuthPost).toHaveBeenCalledWith('/ai/generate', {
      action: 'improve_title',
      title: 'Original title',
    });
    expect(mockAuthPost).not.toHaveBeenCalled();
  });

  it('keeps AI chat session calls on the local node route', async () => {
    const { listChatSessions, getChatSession, deleteChatSession } =
      await import('../../../services/ai/chatService');
    const session = {
      id: 'session-1',
      role: 'seller',
      title: 'Help',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    mockNodeAuthGet.mockResolvedValueOnce([session]).mockResolvedValueOnce(session);
    mockNodeAuthDel.mockResolvedValue(undefined);

    await expect(listChatSessions(10, 5)).resolves.toEqual([session]);
    await expect(getChatSession('session-1')).resolves.toEqual(session);
    await deleteChatSession('session-1');

    expect(mockNodeAuthGet).toHaveBeenNthCalledWith(1, '/agent/chat/sessions?limit=10&offset=5');
    expect(mockNodeAuthGet).toHaveBeenNthCalledWith(2, '/agent/chat/session-1');
    expect(mockNodeAuthDel).toHaveBeenCalledWith('/agent/chat/session-1');
    expect(mockAuthGet).not.toHaveBeenCalled();
    expect(mockAuthDel).not.toHaveBeenCalled();
  });

  it('streams AI chat through the local node route', async () => {
    const { sendChatMessage } = await import('../../../services/ai/chatService');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('AI unavailable'),
    });
    vi.stubGlobal('fetch', fetchMock);

    const callbacks = {
      onContent: vi.fn(),
      onToolCall: vi.fn(),
      onToolResult: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    };

    await sendChatMessage('hello', undefined, callbacks);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://node.local/v1/agent/chat',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        },
      })
    );
    expect(callbacks.onError).toHaveBeenCalledWith('AI unavailable');
  });
});
