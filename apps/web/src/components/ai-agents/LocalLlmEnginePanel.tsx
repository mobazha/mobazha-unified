'use client';

/**
 * LocalLlmEnginePanel — Outpost-only.
 *
 * Renders the local LLM runtime options that fulfil the "AI runs locally"
 * promise shown in the Outpost privacy banner above. Without this panel, the
 * banner is a claim with no surface — users see "AI runs locally" but no path
 * to actually install a local LLM.
 *
 * Static MVP (no backend probe):
 * - Three curated engines: Ollama (default recommendation), llama.cpp,
 *   LM Studio. Each card shows install command + recommended starter model.
 * - Footer "Configure endpoint" link is an in-page anchor (`#ai-endpoint-config`)
 *   that scrolls down to the inline `AIConfigSection` rendered below this panel
 *   on `/admin/ai-agents` (Outpost mode). The Settings → Integrations entry
 *   point was retired for Outpost when both surfaces were consolidated onto
 *   the AI Agents page (see Solution B in PROGRESS.md, 2026-05-12).
 *
 * Future enhancement (SCA Foundation): probe `localhost:11434/v1/models` etc.
 * and replace the install card with a "✓ Llama 3.2 already running" status.
 * The panel layout already accommodates per-engine status rendering.
 */

import React, { useCallback, useState } from 'react';
import { useI18n } from '@mobazha/core';
import { ArrowDown, Box, Check, Copy, Cpu, ExternalLink, Server, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type EngineId = 'ollama' | 'llamacpp' | 'lmstudio';

interface EngineDef {
  id: EngineId;
  Icon: typeof Cpu;
  /** Anchor color tint for the icon container (Tailwind utility). */
  accentClass: string;
  /** Install command shown in the copy block. Empty string falls back to the download link. */
  installCmd: string;
  /** Optional follow-up command (e.g., `ollama pull llama3.2`). */
  pullCmd?: string;
  /** External download / docs link. */
  externalUrl: string;
}

const ENGINES: EngineDef[] = [
  {
    id: 'ollama',
    Icon: Cpu,
    accentClass: 'bg-primary/10 text-primary',
    installCmd: 'curl -fsSL https://ollama.com/install.sh | sh',
    pullCmd: 'ollama pull llama3.2',
    externalUrl: 'https://ollama.com/download',
  },
  {
    id: 'llamacpp',
    Icon: Server,
    accentClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    // No single-line install: the project ships prebuilt binaries for Linux /
    // macOS / Windows on the GitHub releases page. The card's external link
    // lands on that page so the user picks the binary that matches the host
    // (Outpost typically runs on a Linux VPS, where `brew` is unavailable).
    installCmd: '',
    externalUrl: 'https://github.com/ggml-org/llama.cpp/releases',
  },
  {
    id: 'lmstudio',
    Icon: Box,
    accentClass: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
    installCmd: '',
    externalUrl: 'https://lmstudio.ai/download',
  },
];

export function LocalLlmEnginePanel() {
  const { t } = useI18n();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = useCallback(async (key: string, text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Clipboard may be unavailable (insecure context) — degrade silently.
    }
  }, []);

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
            {t('aiAgents.outpost.localLlm.body')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ENGINES.map(engine => {
          const installKey = `${engine.id}-install`;
          const pullKey = `${engine.id}-pull`;
          const taglineKey = `aiAgents.outpost.localLlm.engines.${engine.id}.tagline` as const;
          const recModelKey =
            `aiAgents.outpost.localLlm.engines.${engine.id}.recommendedModel` as const;
          const ctaKey = `aiAgents.outpost.localLlm.engines.${engine.id}.cta` as const;
          const nameKey = `aiAgents.outpost.localLlm.engines.${engine.id}.name` as const;
          const Icon = engine.Icon;

          return (
            <div
              key={engine.id}
              className="border border-border rounded-md p-3 flex flex-col gap-3 bg-background"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-9 h-9 shrink-0 rounded-md flex items-center justify-center',
                    engine.accentClass
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{t(nameKey)}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{t(taglineKey)}</p>
                </div>
              </div>

              {engine.installCmd ? (
                <div className="rounded-md bg-muted/60 border border-border/60 px-2.5 py-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] font-mono text-foreground break-all">
                      {engine.installCmd}
                    </code>
                    <button
                      onClick={() => handleCopy(installKey, engine.installCmd)}
                      className="shrink-0 inline-flex items-center justify-center min-h-9 min-w-9 rounded hover:bg-muted transition-colors"
                      aria-label={t('common.copy')}
                    >
                      {copiedId === installKey ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  {engine.pullCmd && (
                    <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center gap-2">
                      <code className="flex-1 text-[11px] font-mono text-muted-foreground break-all">
                        {engine.pullCmd}
                      </code>
                      <button
                        onClick={() => handleCopy(pullKey, engine.pullCmd!)}
                        className="shrink-0 inline-flex items-center justify-center min-h-9 min-w-9 rounded hover:bg-muted transition-colors"
                        aria-label={t('common.copy')}
                      >
                        {copiedId === pullKey ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 mt-auto">
                <span className="text-xs text-muted-foreground">{t(recModelKey)}</span>
                <a
                  href={engine.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  {t(ctaKey)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {t('aiAgents.outpost.localLlm.alreadyInstalled')}
        </span>
        {/* In-page jump to the AIConfigSection rendered below. The anchor id
            (`ai-endpoint-config`) is set on the AIConfigSection root. Using a
            native anchor (not next/link) keeps Next.js from triggering a soft
            navigation for what is purely a scroll. */}
        <a
          href="#ai-endpoint-config"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          {t('aiAgents.outpost.localLlm.configureEndpoint')}
          <ArrowDown className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
