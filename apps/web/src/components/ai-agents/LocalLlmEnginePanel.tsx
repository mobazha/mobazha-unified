'use client';

/**
 * LocalLlmEnginePanel — Outpost-only.
 *
 * Two states:
 * - Detected: compact status line (engine + model + endpoint).
 * - Not detected: single Ollama install guide; other engines collapsed.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { getAIConfig, getAIStatus } from '@mobazha/core/services/api/aiSettings';
import { Check, ChevronDown, Copy, Cpu, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type EngineId = 'ollama' | 'llamacpp' | 'lmstudio';

interface DetectedLocalLLM {
  engine: EngineId;
  label: string;
  model: string;
  baseURL: string;
}

const OLLAMA_INSTALL = 'curl -fsSL https://ollama.com/install.sh | sh';
const OLLAMA_PULL = 'ollama pull llama3.2';

const ALT_ENGINES: { id: EngineId; url: string }[] = [
  { id: 'llamacpp', url: 'https://github.com/ggml-org/llama.cpp/releases' },
  { id: 'lmstudio', url: 'https://lmstudio.ai/download' },
];

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

function getDetectedLocalEngine(
  baseURL: string
): Pick<DetectedLocalLLM, 'engine' | 'label'> | null {
  try {
    const url = new URL(baseURL);
    const hostname = normalizeHostname(url.hostname);
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const isDockerBundledOllama =
      (hostname === 'ollama' || hostname.endsWith('.ollama')) && url.port === '11434';

    if (isDockerBundledOllama) {
      return { engine: 'ollama', label: 'Ollama (Docker)' };
    }

    if (!isLoopback) {
      return null;
    }

    if (url.port === '11434') {
      return { engine: 'ollama', label: 'Ollama' };
    }

    return { engine: 'lmstudio', label: 'Local LLM' };
  } catch {
    return null;
  }
}

export function LocalLlmEnginePanel() {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedLocalLLM | null>(null);
  const [checking, setChecking] = useState(true);
  const [showAltEngines, setShowAltEngines] = useState(false);

  const handleCopy = useCallback(async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context).
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function probeLocalLLM() {
      try {
        const [status, config] = await Promise.all([getAIStatus(), getAIConfig()]);
        if (cancelled) return;

        const activeProvider = config.active_provider;
        const activeConfig = activeProvider ? config.providers?.[activeProvider] : undefined;
        const baseURL = activeConfig?.base_url || '';
        const model = activeConfig?.model || '';
        const detectedEngine = getDetectedLocalEngine(baseURL);

        if (status.available && activeConfig && detectedEngine) {
          setDetected({ ...detectedEngine, model, baseURL });
        } else {
          setDetected(null);
        }
      } catch {
        if (!cancelled) setDetected(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    probeLocalLLM();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div
        className="bg-card border border-border rounded-lg p-4 md:p-5"
        data-testid="local-llm-engine-panel"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('aiAgents.outpost.localLlm.checking', { defaultValue: 'Checking local AI engine…' })}
        </div>
      </div>
    );
  }

  if (detected) {
    return (
      <div
        className="bg-card border border-border rounded-lg p-4 md:p-5"
        data-testid="local-llm-engine-panel"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-md bg-success/10 text-success flex items-center justify-center">
            <Check className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{detected.label}</span>
              <span className="text-xs text-muted-foreground font-mono">{detected.model}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{detected.baseURL}</p>
          </div>
          <a href="#ai-endpoint-config" className="text-xs text-primary hover:underline shrink-0">
            {t('aiAgents.outpost.localLlm.edit', { defaultValue: 'Edit' })}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 md:p-6"
      data-testid="local-llm-engine-panel"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 shrink-0 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-base font-medium text-foreground">
            {t('aiAgents.outpost.localLlm.title')}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t('aiAgents.outpost.localLlm.bodySimple', {
              defaultValue:
                'Install Ollama to power on-device AI. Your store data never leaves this machine.',
            })}
          </p>
        </div>
      </div>

      {/* Ollama install commands */}
      <div className="rounded-md bg-muted/60 border border-border/60 px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">Ollama</span>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[11px] font-mono text-foreground break-all">
            {OLLAMA_INSTALL}
          </code>
          <button
            onClick={() => handleCopy('ollama-install', OLLAMA_INSTALL)}
            className="shrink-0 inline-flex items-center justify-center min-h-9 min-w-9 rounded hover:bg-muted transition-colors"
            aria-label={t('common.copy')}
          >
            {copiedId === 'ollama-install' ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
        <div className="border-t border-border/40 pt-1.5 flex items-center gap-2">
          <code className="flex-1 text-[11px] font-mono text-muted-foreground break-all">
            {OLLAMA_PULL}
          </code>
          <button
            onClick={() => handleCopy('ollama-pull', OLLAMA_PULL)}
            className="shrink-0 inline-flex items-center justify-center min-h-9 min-w-9 rounded hover:bg-muted transition-colors"
            aria-label={t('common.copy')}
          >
            {copiedId === 'ollama-pull' ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {t('aiAgents.outpost.localLlm.afterInstall', {
          defaultValue:
            'After installing, refresh this page — the engine will be detected automatically.',
        })}
      </p>

      {/* Other engines — collapsed */}
      <div className="mt-4 pt-3 border-t border-border/60">
        <button
          onClick={() => setShowAltEngines(prev => !prev)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown
            className={cn('w-3.5 h-3.5 transition-transform', showAltEngines && 'rotate-180')}
          />
          {t('aiAgents.outpost.localLlm.otherEngines', {
            defaultValue: 'Other engines (llama.cpp, LM Studio)',
          })}
        </button>
        {showAltEngines && (
          <div className="mt-2 space-y-1.5 pl-5">
            {ALT_ENGINES.map(eng => (
              <a
                key={eng.id}
                href={eng.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                {t(`aiAgents.outpost.localLlm.engines.${eng.id}.name` as const)}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
