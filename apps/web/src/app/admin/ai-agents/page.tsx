'use client';

import React, { useMemo, useState } from 'react';
import { useI18n, useUserStore, isStandalone, isOutpostMode } from '@mobazha/core';
import { filterMcpClients, MCP_CLIENTS } from '@mobazha/core/utils/mcpConnectors';
import { Bot, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { QuickConnectGrid } from '@/components/ai-agents/QuickConnectGrid';
import { ApiTokenPanel } from '@/components/ai-agents/ApiTokenPanel';
import { AutoConnectPanel } from '@/components/ai-agents/AutoConnectPanel';
import { LocalLlmEnginePanel } from '@/components/ai-agents/LocalLlmEnginePanel';
import { AIConfigSection } from '../settings/integrations/AIConfigSection';

const OUTPOST_HIGH_RISK_KEY = 'mobazha:outpost:showHighRiskAiClients';

export default function AIAgentsPage() {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const [tokenRefreshKey, setTokenRefreshKey] = useState(0);
  const standalone = isStandalone();
  const outpost = isOutpostMode();
  // Lazy initializer reads localStorage synchronously on first render so the
  // toggle reflects the user's prior opt-in without a one-frame "off → on"
  // flicker. SSR-safe via the typeof window guard.
  // Stored as plain boolean string ('1' / '0'); never auto-enabled by code.
  const [showHighRisk, setShowHighRisk] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(OUTPOST_HIGH_RISK_KEY) === '1';
    } catch {
      return false;
    }
  });

  const handleToggleHighRisk = (next: boolean) => {
    setShowHighRisk(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(OUTPOST_HIGH_RISK_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
  };

  const storeName = useMemo(() => {
    const handle = profile?.handle;
    const name = profile?.name;
    return (handle || name || 'store')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .slice(0, 30);
  }, [profile]);

  const mcpUrl = useMemo(() => {
    // Always derive from the origin the user is currently on.
    // This works for SaaS (app.mobazha.org), standalone Docker,
    // native binary (localhost), and any custom domain — the AI
    // client reaches the same host the admin UI is served from.
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/v1/mcp`;
  }, []);

  const visibleClients = useMemo(
    () => filterMcpClients(outpost, showHighRisk),
    [outpost, showHighRisk]
  );

  const hiddenCount = outpost ? MCP_CLIENTS.length - visibleClients.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">{t('aiAgents.title')}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{t('aiAgents.subtitle')}</p>
      </div>

      {/* Outpost privacy banner — explains the cloud-only client filter */}
      {outpost && (
        <div
          className="bg-success/10 border border-success/30 rounded-lg p-4 md:p-5"
          data-testid="outpost-privacy-banner"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-success shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {t('aiAgents.outpost.banner.title')}
              </h3>
              <p className="text-sm text-muted-foreground">{t('aiAgents.outpost.banner.body')}</p>
            </div>
          </div>

          {/* High-risk reveal toggle */}
          <div className="mt-4 pt-4 border-t border-success/20 flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <label
                htmlFor="show-high-risk-clients"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                {t('aiAgents.outpost.showHighRisk.label')}
              </label>
              <p className="text-xs text-muted-foreground">
                {t('aiAgents.outpost.showHighRisk.description')}
              </p>
              {hiddenCount > 0 && !showHighRisk && (
                <p className="text-xs text-muted-foreground/80">
                  {t('aiAgents.outpost.hiddenCount', { count: hiddenCount })}
                </p>
              )}
            </div>
            <Switch
              id="show-high-risk-clients"
              checked={showHighRisk}
              onCheckedChange={handleToggleHighRisk}
              data-testid="show-high-risk-clients-toggle"
            />
          </div>
        </div>
      )}

      {/* Local LLM engines — Outpost only.
          Renders BEFORE the MCP client list so the "AI runs locally" promise
          in the banner has a concrete first surface. */}
      {outpost && <LocalLlmEnginePanel />}

      {/* AI provider / endpoint configuration — Outpost only.
          Hoisted from the legacy Settings → Integrations → AI tab so the full
          configuration funnel (install runtime → configure endpoint →
          connect clients) lives on a single page. The legacy Settings page
          now redirects here under Outpost mode.
          We pass `hideOutpostInstallGuide` because the LocalLlmEnginePanel
          above already covers runtime installation with a richer 3-engine
          picker. */}
      {outpost && <AIConfigSection hideOutpostInstallGuide />}

      {/* Auto Connect — standalone only */}
      {standalone && <AutoConnectPanel onTokenCreated={() => setTokenRefreshKey(k => k + 1)} />}

      {/* Quick Connect Grid */}
      <div className="bg-card border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-base font-medium text-foreground mb-4">{t('aiAgents.quickConnect')}</h2>
        <QuickConnectGrid
          storeName={storeName}
          mcpUrl={mcpUrl}
          onTokenCreated={() => setTokenRefreshKey(k => k + 1)}
          clients={visibleClients}
          showRiskBadges={outpost}
        />
      </div>

      {/* API Token Management (collapsed) */}
      <ApiTokenPanel refreshKey={tokenRefreshKey} />
    </div>
  );
}
