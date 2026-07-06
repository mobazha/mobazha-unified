import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: unknown }) => children,
}));

vi.mock('../src/components/RuntimeCapabilityBoundary', () => ({
  RuntimeCapabilityBoundary: ({ children }: { children: unknown }) => children,
}));

vi.mock('../src/components/UnifiedFrontendFeatureBoundary', () => ({
  UnifiedFrontendFeatureBoundary: ({ children }: { children: unknown }) => children,
}));

describe('sovereign route contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('__SOVEREIGN__', true);
    vi.stubGlobal('__ROUTED_TMA__', false);
    vi.stubGlobal('__COMMERCIAL_EXTENSION__', false);
  });

  it('ships the seller payment and AI Agents routes exposed by the sidebar', async () => {
    const { routes } = await import('../src/routes');
    const adminRoute = routes.find(route => route.path === '/admin');
    const childPaths = adminRoute?.children?.map(route => route.path).filter(Boolean);

    expect(childPaths).toContain('payments');
    expect(childPaths).toContain('ai-agents');
    expect(childPaths).toContain('orders');
    expect(childPaths).toContain('ai');
    expect(routes.map(route => route.path)).toContain('/tools/cost-calculator');
    expect(routes.map(route => route.path)).not.toContain('/chat');
    expect(routes.map(route => route.path)).not.toContain('/purchases');

    const aiRoute = adminRoute?.children?.find(route => route.path === 'ai');
    expect(aiRoute?.children?.map(route => route.path)).toEqual(
      expect.arrayContaining(['workspace', 'models', 'connect'])
    );
  });

  it('adds private XMR finance routes only when the commercial extension is composed', async () => {
    vi.stubGlobal('__COMMERCIAL_EXTENSION__', true);
    const { routes } = await import('../src/routes');
    const adminRoute = routes.find(route => route.path === '/admin');
    const childPaths = adminRoute?.children?.map(route => route.path).filter(Boolean);

    expect(childPaths).toEqual(
      expect.arrayContaining([
        'finance',
        'finance/xmr-wallet',
        'finance/xmr-withdraw',
        'finance/xmr-secrets',
        'finance/xmr-transfers',
        'settings/monero-nodes',
      ])
    );
  });
});
