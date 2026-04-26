'use client';

import React, { useState, useMemo } from 'react';
import { useI18n, useUserStore, isStandalone } from '@mobazha/core';
import { getEnvConfig } from '@mobazha/core/config/env';
import { Bot } from 'lucide-react';
import { QuickConnectGrid } from '@/components/ai-agents/QuickConnectGrid';
import { ApiTokenPanel } from '@/components/ai-agents/ApiTokenPanel';
import { AutoConnectPanel } from '@/components/ai-agents/AutoConnectPanel';

export default function AIAgentsPage() {
  const { t } = useI18n();
  const { profile } = useUserStore();
  const [tokenRefreshKey, setTokenRefreshKey] = useState(0);
  const standalone = isStandalone();

  const storeName = useMemo(() => {
    const handle = profile?.handle;
    const name = profile?.name;
    return (handle || name || 'store')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .slice(0, 30);
  }, [profile]);

  const mcpUrl = useMemo(() => {
    // MCP endpoint is registered at absolute path /v1/mcp on the topMux.
    // getGatewayUrl() already includes /v1 suffix, so we use the base URL instead.
    const envBase = getEnvConfig().api.baseUrl;
    const base = envBase || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/v1/mcp`;
  }, []);

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

      {/* Auto Connect — standalone only */}
      {standalone && <AutoConnectPanel onTokenCreated={() => setTokenRefreshKey(k => k + 1)} />}

      {/* Quick Connect Grid */}
      <div className="bg-card border border-border rounded-lg p-4 md:p-6">
        <h2 className="text-base font-medium text-foreground mb-4">{t('aiAgents.quickConnect')}</h2>
        <QuickConnectGrid
          storeName={storeName}
          mcpUrl={mcpUrl}
          onTokenCreated={() => setTokenRefreshKey(k => k + 1)}
        />
      </div>

      {/* API Token Management (collapsed) */}
      <ApiTokenPanel refreshKey={tokenRefreshKey} />
    </div>
  );
}
