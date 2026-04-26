'use client';

import React, { useState, useCallback } from 'react';
import { useI18n, apiTokensApi } from '@mobazha/core';
import type { McpClient, ConnectArtifact } from '@mobazha/core/utils/mcpConnectors';
import { generateConnectArtifact, POST_CONNECT_PROMPTS } from '@mobazha/core/utils/mcpConnectors';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';

interface ConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: McpClient | null;
  artifact: ConnectArtifact | null;
  mcpUrl: string;
  storeName: string;
  onTokenCreated?: () => void;
}

export function ConnectDialog({
  open,
  onOpenChange,
  client,
  artifact,
  mcpUrl,
  storeName,
  onTokenCreated,
}: ConnectDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [creatingForOther, setCreatingForOther] = useState(false);
  const [otherArtifact, setOtherArtifact] = useState<ConnectArtifact | null>(null);

  const effectiveArtifact = otherArtifact ?? artifact;

  const handleCreateForOther = useCallback(async () => {
    setCreatingForOther(true);
    try {
      const resp = await apiTokensApi.createToken({
        name: `generic-${storeName}`.slice(0, 50),
        scopes: ['seller:*'],
        expires_in_days: 90,
      });
      onTokenCreated?.();
      setOtherArtifact({
        mode: 'json-config',
        mcpUrl,
        token: resp.token,
        jsonConfig: {
          json: JSON.stringify(
            {
              mcpServers: {
                [`mobazha-${storeName}`]: {
                  transport: 'http',
                  url: mcpUrl,
                  headers: { Authorization: `Bearer ${resp.token}` },
                },
              },
            },
            null,
            2
          ),
          configPath: '(varies by client)',
        },
      });
    } catch {
      toast({ title: t('aiAgents.tokens.createFailed'), variant: 'destructive' });
    } finally {
      setCreatingForOther(false);
    }
  }, [mcpUrl, storeName, onTokenCreated, toast]);

  const handleClose = () => {
    setOtherArtifact(null);
    onOpenChange(false);
  };

  const title = client ? t('aiAgents.connectClient', { name: client.name }) : t('aiAgents.other');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* "Other" client: create token first */}
        {!client && !otherArtifact && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{t('aiAgents.otherDesc')}</p>
            <Button onClick={handleCreateForOther} disabled={creatingForOther} className="w-full">
              {creatingForOther && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('aiAgents.tokens.create')}
            </Button>
          </div>
        )}

        {effectiveArtifact && (
          <div className="space-y-4 py-2">
            {/* Mode A: Deep Link fallback — show URL + token as manual alternative */}
            {effectiveArtifact.mode === 'deeplink' && (
              <DeepLinkFallback mcpUrl={mcpUrl} artifact={effectiveArtifact} />
            )}

            {/* Mode B: CLI command */}
            {effectiveArtifact.mode === 'cli' && effectiveArtifact.cliCommand && (
              <CliBlock command={effectiveArtifact.cliCommand} />
            )}

            {/* Mode C: Remote URL guidance */}
            {effectiveArtifact.mode === 'remote-url' && (
              <RemoteUrlGuide artifact={effectiveArtifact} mcpUrl={mcpUrl} />
            )}

            {/* Mode D: JSON config */}
            {effectiveArtifact.mode === 'json-config' && effectiveArtifact.jsonConfig && (
              <JsonConfigBlock config={effectiveArtifact.jsonConfig} />
            )}

            {/* Post-connect prompts */}
            <PostConnectPrompts />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeepLinkFallback({ mcpUrl, artifact }: { mcpUrl: string; artifact: ConnectArtifact }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('aiAgents.deepLinkFallback')}</p>
      <CopyField label={t('aiAgents.mcpUrl')} value={mcpUrl} />
      {artifact.token && (
        <CopyField label={t('aiAgents.bearerToken')} value={artifact.token} sensitive />
      )}
    </div>
  );
}

function CliBlock({ command }: { command: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{t('aiAgents.cliStep')}</p>
      <CopyField label="" value={command} mono />
    </div>
  );
}

function RemoteUrlGuide({ artifact, mcpUrl }: { artifact: ConnectArtifact; mcpUrl: string }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {artifact.guidanceSteps?.map((step, i) => (
        <div key={i} className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {t(i === 0 ? 'aiAgents.remoteUrlStep1' : 'aiAgents.remoteUrlStep2')}
          </span>{' '}
          {step}
        </div>
      ))}
      <CopyField label={t('aiAgents.mcpUrl')} value={mcpUrl} />
      {artifact.token && (
        <CopyField label={t('aiAgents.bearerToken')} value={artifact.token} sensitive />
      )}
    </div>
  );
}

function JsonConfigBlock({
  config,
}: {
  config: { json: string; configPath: string; configPathWindows?: string };
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{t('aiAgents.jsonConfigSteps.step1')}</span>{' '}
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{config.configPath}</code>
      </div>
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{t('aiAgents.jsonConfigSteps.step2')}</span>
      </div>
      <CopyField label="" value={config.json} mono />
      <p className="text-xs text-muted-foreground">{t('aiAgents.jsonConfigSteps.step3')}</p>
    </div>
  );
}

function CopyField({
  label,
  value,
  mono,
  sensitive,
}: {
  label: string;
  value: string;
  mono?: boolean;
  sensitive?: boolean;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div className="flex items-start gap-2 bg-muted rounded-md p-2">
        <code className={`flex-1 text-xs break-all text-foreground ${mono ? 'font-mono' : ''}`}>
          {sensitive
            ? '••••••••••••••••'
            : value.length > 300
              ? value.slice(0, 300) + '...'
              : value}
        </code>
        <button
          onClick={handleCopy}
          className="shrink-0 p-1 rounded hover:bg-background transition-colors"
          title={t('aiAgents.copied')}
        >
          {copied ? (
            <Check className="w-4 h-4 text-primary" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>
      {sensitive && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{t('aiAgents.tokenOnlyOnce')}</p>
      )}
    </div>
  );
}

function PostConnectPrompts() {
  const { t } = useI18n();
  return (
    <div className="bg-primary/5 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        {t('aiAgents.postConnect.afterSetup')}
      </div>
      <ul className="space-y-1 pl-6">
        {POST_CONNECT_PROMPTS.map((prompt, i) => (
          <li key={i} className="text-sm text-muted-foreground list-disc">
            &quot;{prompt}&quot;
          </li>
        ))}
      </ul>
    </div>
  );
}
