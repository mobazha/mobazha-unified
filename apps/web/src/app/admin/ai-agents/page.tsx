'use client';

import React, { useMemo, useState } from 'react';
import { useI18n, useUserStore, isStandalone, isOutpostMode } from '@mobazha/core';
import { filterMcpClients } from '@mobazha/core/utils/mcpConnectors';
import { Bot, ChevronDown, Code2, ShieldCheck } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { QuickConnectGrid } from '@/components/ai-agents/QuickConnectGrid';
import { ApiTokenPanel } from '@/components/ai-agents/ApiTokenPanel';
import { AutoConnectPanel } from '@/components/ai-agents/AutoConnectPanel';
import { LocalLlmEnginePanel } from '@/components/ai-agents/LocalLlmEnginePanel';
import { AIConfigSection } from '../settings/integrations/AIConfigSection';
import { cn } from '@/lib/utils';

const OUTPOST_HIGH_RISK_KEY = 'mobazha:outpost:showHighRiskAiClients';

export default function AIAgentsPage() {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const [tokenRefreshKey, setTokenRefreshKey] = useState(0);
  const standalone = isStandalone();
  const outpost = isOutpostMode();
  const [showHighRisk, setShowHighRisk] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(OUTPOST_HIGH_RISK_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showDevSection, setShowDevSection] = useState(false);

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
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return `${origin}/v1/mcp`;
  }, []);

  const visibleClients = useMemo(
    () => filterMcpClients(outpost, showHighRisk),
    [outpost, showHighRisk]
  );

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

      {/* Local LLM engine status — Outpost only */}
      {outpost && <LocalLlmEnginePanel />}

      {/* AI endpoint configuration — Outpost only (compact) */}
      {outpost && (
        <AIConfigSection hideOutpostInstallGuide hideFeatureShowcase startCollapsedWhenConfigured />
      )}

      {/* Auto Connect — standalone only */}
      {standalone && <AutoConnectPanel onTokenCreated={() => setTokenRefreshKey(k => k + 1)} />}

      {/* Quick Connect Grid — visible by default on SaaS/Standalone */}
      {!outpost && (
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <h2 className="text-base font-medium text-foreground mb-4">
            {t('aiAgents.quickConnect')}
          </h2>
          <QuickConnectGrid
            storeName={storeName}
            mcpUrl={mcpUrl}
            onTokenCreated={() => setTokenRefreshKey(k => k + 1)}
            clients={visibleClients}
            showRiskBadges={false}
          />
        </div>
      )}

      {/* API Token Management — visible by default on SaaS/Standalone */}
      {!outpost && <ApiTokenPanel refreshKey={tokenRefreshKey} />}

      {/* Outpost: Developer section (collapsed) — MCP clients + tokens */}
      {outpost && (
        <div className="border border-border rounded-lg">
          <button
            onClick={() => setShowDevSection(prev => !prev)}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {t('aiAgents.outpost.developerOptions', {
                  defaultValue: 'Developer Options',
                })}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-muted-foreground transition-transform',
                showDevSection && 'rotate-180'
              )}
            />
          </button>

          {showDevSection && (
            <div className="border-t border-border p-4 md:p-6 space-y-6">
              {/* Privacy toggle for cloud AI clients */}
              <div
                className="bg-muted/50 border border-border rounded-lg p-4"
                data-testid="outpost-privacy-banner"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-success" />
                      <label
                        htmlFor="show-high-risk-clients"
                        className="text-sm font-medium text-foreground cursor-pointer"
                      >
                        {t('aiAgents.outpost.showHighRisk.label')}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('aiAgents.outpost.showHighRisk.description')}
                    </p>
                  </div>
                  <Switch
                    id="show-high-risk-clients"
                    checked={showHighRisk}
                    onCheckedChange={handleToggleHighRisk}
                    data-testid="show-high-risk-clients-toggle"
                  />
                </div>
              </div>

              {/* Quick Connect Grid */}
              <QuickConnectGrid
                storeName={storeName}
                mcpUrl={mcpUrl}
                onTokenCreated={() => setTokenRefreshKey(k => k + 1)}
                clients={visibleClients}
                showRiskBadges
              />

              {/* API Tokens */}
              <ApiTokenPanel refreshKey={tokenRefreshKey} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
