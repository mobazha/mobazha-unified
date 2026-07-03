'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@mobazha/core';
import {
  mcpConnectApi,
  type MCPCapability,
  type MCPConnectResult,
} from '@mobazha/core/services/api';
import {
  Zap,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Info,
  RefreshCw,
} from 'lucide-react';

interface AutoConnectPanelProps {
  onTokenCreated?: () => void;
}

export function AutoConnectPanel({ onTokenCreated }: AutoConnectPanelProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MCPConnectResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [capability, setCapability] = useState<MCPCapability | null>(null);
  const [capabilityLoading, setCapabilityLoading] = useState(true);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);

  // Fetch capability probe on mount: tells us whether auto-connect is even
  // viable (token store available, slots left, AI clients installed) before
  // the user clicks. Burns no token, writes no files.
  const refreshCapability = useCallback(async () => {
    setCapabilityLoading(true);
    setCapabilityError(null);
    try {
      const cap = await mcpConnectApi.mcpGetCapability();
      setCapability(cap);
    } catch (err) {
      setCapabilityError(
        err instanceof Error ? err.message : t('aiAgents.autoConnect.capabilityProbeFailed')
      );
    } finally {
      setCapabilityLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refreshCapability();
  }, [refreshCapability]);

  const handleConnectAll = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setApiToken(null);
    try {
      const resp = await mcpConnectApi.mcpConnectAll();
      setResults(resp.clients);
      if (resp.token) {
        setApiToken(resp.token);
      }
      const hasConnected = resp.clients.some(c => c.status === 'connected');
      if (hasConnected) {
        onTokenCreated?.();
      }
      // Slot count or detection state may have changed; refresh asynchronously
      // so the next click reflects reality.
      refreshCapability();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('aiAgents.autoConnect.connectionFailed'));
    } finally {
      setLoading(false);
    }
  };

  const installedClients = capability?.detectedClients.filter(c => c.installed) ?? [];
  const buttonDisabled = loading || capabilityLoading || !capability?.supported;

  // Containerized: auto-connect is impossible (can't reach host filesystem).
  // Hide entirely — Quick Connect below already covers this case.
  if (capability?.containerized) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-6">
      <div className="flex items-start gap-3">
        <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium text-foreground">
            {t('aiAgents.autoConnect.title')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('aiAgents.autoConnect.desc')}</p>

          <CapabilityHint
            capability={capability}
            loading={capabilityLoading}
            error={capabilityError}
            onRefresh={refreshCapability}
          />

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleConnectAll}
              disabled={buttonDisabled}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('aiAgents.connecting')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {capability && installedClients.length > 0
                    ? t('aiAgents.autoConnect.connectCount', {
                        count: String(installedClients.length),
                      })
                    : t('aiAgents.connectAll')}
                </>
              )}
            </button>
            {!capabilityLoading && (
              <button
                onClick={refreshCapability}
                disabled={loading}
                className="p-2 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                title={t('aiAgents.autoConnect.rescan')}
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {apiToken && <TokenDisplay token={apiToken} />}

          {results && (
            <div className="mt-4 space-y-2">
              {results.map(r => (
                <ResultRow key={r.name} result={r} />
              ))}
              <ConnectedSummary results={results} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: MCPConnectResult }) {
  const { t } = useI18n();

  const icon = (() => {
    switch (result.status) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'already_configured':
        return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
      case 'not_installed':
        return <MinusCircle className="w-4 h-4 text-muted-foreground/50" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  })();

  const detail = (() => {
    switch (result.status) {
      case 'connected':
        return result.configPath
          ? t('aiAgents.autoConnect.status.configuredAt', { path: result.configPath })
          : t('aiAgents.autoConnect.status.configured');
      case 'already_configured':
        return t('aiAgents.autoConnect.status.alreadyConfigured');
      case 'not_installed':
        return t('aiAgents.autoConnect.status.notInstalled');
      case 'error':
        return result.error || t('aiAgents.autoConnect.status.failed');
      default:
        return '';
    }
  })();

  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="font-medium w-36">{result.displayName}</span>
      <span className="text-muted-foreground truncate">{detail}</span>
    </div>
  );
}

function TokenDisplay({ token }: { token: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 p-3 bg-muted/50 border border-border rounded-md">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {t('aiAgents.autoConnect.tokenLabel')}
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
          {token}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
          title={t('common.copy')}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}

// CapabilityHint renders a pre-flight summary so the user knows what
// auto-connect will (or won't) do before clicking. Two goals:
//   1. Show which clients we found, so the user can decide whether to install
//      one before pressing Connect.
//   2. Block the click and explain why when auto-connect cannot succeed
//      (no token slots, no token store, no clients) — saves a wasted token.
//
// The containerized case is handled by the parent component with a different
// layout entirely; this hint is only rendered for native nodes.
function CapabilityHint({
  capability,
  loading,
  error,
  onRefresh,
}: {
  capability: MCPCapability | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const { t } = useI18n();

  if (loading) {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {t('aiAgents.autoConnect.checkingEnvironment')}
      </p>
    );
  }

  if (error) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{t('aiAgents.autoConnect.probeError', { error })}</span>
        <button onClick={onRefresh} className="underline hover:no-underline">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!capability) return null;

  const installed = capability.detectedClients.filter(c => c.installed);
  const installedNames = installed.map(c => c.displayName).join(', ');

  return (
    <div className="mt-3 space-y-2">
      {capability.supported && installed.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            {t('aiAgents.autoConnect.detected', { clients: installedNames })}
            {capability.tokenSlotsLeft > 0 && (
              <>
                {' '}
                {t('aiAgents.autoConnect.tokenSlotsRemaining', {
                  count: String(capability.tokenSlotsLeft),
                })}
              </>
            )}
          </span>
        </p>
      )}

      {!capability.supported && (
        <div className="flex items-start gap-2 text-sm p-2 rounded-md bg-muted/50 border border-border text-muted-foreground">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{capabilityReasonMessage(t, capability.reason)}</span>
        </div>
      )}
    </div>
  );
}

function capabilityReasonMessage(
  t: (key: string) => string,
  reason: MCPCapability['reason']
): string {
  switch (reason) {
    case 'no_clients':
      return t('aiAgents.autoConnect.reason.noClients');
    case 'token_slots_exhausted':
      return t('aiAgents.autoConnect.reason.tokenSlotsExhausted');
    case 'no_token_store':
      return t('aiAgents.autoConnect.reason.noTokenStore');
    case 'containerized':
      return t('aiAgents.autoConnect.reason.containerized');
    default:
      return t('aiAgents.autoConnect.reason.default');
  }
}

function ConnectedSummary({ results }: { results: MCPConnectResult[] }) {
  const { t } = useI18n();
  const connected = results.filter(r => r.status === 'connected').length;

  if (connected === 0) return null;

  return (
    <p className="mt-3 text-sm text-muted-foreground">
      {t('aiAgents.autoConnect.summary', { count: String(connected) })}
    </p>
  );
}
