'use client';

import React, { useState } from 'react';
import { useI18n } from '@mobazha/core';
import { mcpConnectApi, type MCPConnectResult } from '@mobazha/core/services/api';
import {
  Zap,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Loader2,
  AlertCircle,
  Copy,
  Check,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-6">
      <div className="flex items-start gap-3">
        <Zap className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium text-foreground">
            {t('aiAgents.autoConnect.title') || 'Auto Connect'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('aiAgents.autoConnect.desc') ||
              'Your node can automatically detect and configure AI clients installed on this machine.'}
          </p>

          <div className="mt-4">
            <button
              onClick={handleConnectAll}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('aiAgents.connecting') || 'Connecting...'}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {t('aiAgents.connectAll') || 'Connect All AI Clients'}
                </>
              )}
            </button>
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
        return result.configPath ? `configured — ${result.configPath}` : 'configured';
      case 'already_configured':
        return 'already configured';
      case 'not_installed':
        return 'not installed';
      case 'error':
        return result.error || 'failed';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 p-3 bg-muted/50 border border-border rounded-md">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        API Token (shown once — save if needed for manual setup)
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
          {token}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
          title="Copy token"
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

function ConnectedSummary({ results }: { results: MCPConnectResult[] }) {
  const { t } = useI18n();
  const connected = results.filter(r => r.status === 'connected').length;

  if (connected === 0) return null;

  return (
    <p className="mt-3 text-sm text-muted-foreground">
      {t('aiAgents.autoConnect.summary', { count: String(connected) }) ||
        `Configured ${connected} client(s). Restart each and ask: "List my store products"`}
    </p>
  );
}
