'use client';

import React, { useState, useCallback } from 'react';
import { useI18n, apiTokensApi } from '@mobazha/core';
import type { CreateTokenResponse } from '@mobazha/core';
import {
  MCP_CLIENTS,
  generateConnectArtifact,
  type McpClient,
  type ConnectArtifact,
  type ClientRisk,
} from '@mobazha/core/utils/mcpConnectors';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  MoreHorizontal,
  ExternalLink,
  Copy,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  CloudOff,
} from 'lucide-react';
import { ConnectDialog } from './ConnectDialog';

interface BrandIcon {
  path: string;
  color?: boolean; // true = full-color SVG, render as <img> (no theme adaptation)
}

const CLIENT_ICONS: Record<string, BrandIcon> = {
  'chatgpt-desktop': { path: '/icons/brands/openai.svg' },
  'claude-desktop': { path: '/icons/brands/claude.svg' },
  openclaw: { path: '/icons/brands/openclaw.svg' },
  cursor: { path: '/icons/brands/cursor.svg' },
  vscode: { path: '/icons/brands/vscode.svg' },
  'claude-code': { path: '/icons/brands/claude.svg' },
  windsurf: { path: '/icons/brands/windsurf.svg' },
  codex: { path: '/icons/brands/codex.svg', color: true },
  opencode: { path: '/icons/brands/opencode.svg' },
  cline: { path: '/icons/brands/cline.svg' },
};

function getButtonProps(client: McpClient) {
  switch (client.mode) {
    case 'deeplink':
      return { icon: ExternalLink, labelKey: 'aiAgents.openIde' as const };
    case 'cli':
      return { icon: Copy, labelKey: 'aiAgents.copyCli' as const };
    case 'remote-url':
      return { icon: ExternalLink, labelKey: 'aiAgents.connect' as const };
    case 'json-config':
      return { icon: Copy, labelKey: 'aiAgents.copyConfig' as const };
  }
}

interface QuickConnectGridProps {
  storeName: string;
  mcpUrl: string;
  onTokenCreated?: () => void;
  /**
   * Pre-filtered client list. When omitted, defaults to all MCP_CLIENTS.
   * In Sovereign mode, callers should pass `filterMcpClients(true, showHighRisk)`.
   */
  clients?: McpClient[];
  /**
   * When true, renders privacy risk badges on each ClientCard (used in Sovereign mode).
   * Always false outside Sovereign (avoids visual noise on SaaS/Standalone).
   */
  showRiskBadges?: boolean;
}

export function QuickConnectGrid({
  storeName,
  mcpUrl,
  onTokenCreated,
  clients,
  showRiskBadges = false,
}: QuickConnectGridProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loadingClient, setLoadingClient] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogArtifact, setDialogArtifact] = useState<ConnectArtifact | null>(null);
  const [dialogClient, setDialogClient] = useState<McpClient | null>(null);

  const list = clients ?? MCP_CLIENTS;
  const ownerClients = list.filter(c => c.audience === 'owner');
  const devClients = list.filter(c => c.audience === 'developer');

  const handleConnect = useCallback(
    async (client: McpClient) => {
      setLoadingClient(client.id);
      try {
        const tokenName = `${client.id}-${storeName}`.slice(0, 50);
        const resp: CreateTokenResponse = await apiTokensApi.createToken({
          name: tokenName,
          scopes: ['seller:*'],
          expires_in_days: 90,
        });
        onTokenCreated?.();

        const artifact = generateConnectArtifact(client.id, storeName, mcpUrl, resp.token);

        if (artifact.mode === 'deeplink' && artifact.deepLink) {
          window.location.href = artifact.deepLink;
          toast({
            title: t('aiAgents.ideOpening', { client: client.name }),
          });

          setTimeout(() => {
            setDialogArtifact(artifact);
            setDialogClient(client);
            setDialogOpen(true);
          }, 2000);
        } else {
          setDialogArtifact(artifact);
          setDialogClient(client);
          setDialogOpen(true);
        }
      } catch {
        toast({
          title: t('aiAgents.tokens.createFailed'),
          variant: 'destructive',
        });
      } finally {
        setLoadingClient(null);
      }
    },
    [storeName, mcpUrl, onTokenCreated, toast, t]
  );

  const handleOtherClick = useCallback(() => {
    setDialogClient(null);
    setDialogArtifact(null);
    setDialogOpen(true);
  }, []);

  return (
    <>
      <div className="space-y-6">
        {/* For store owners */}
        {ownerClients.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {t('aiAgents.forOwners')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ownerClients.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  loading={loadingClient === client.id}
                  onConnect={handleConnect}
                  showRiskBadge={showRiskBadges}
                />
              ))}
            </div>
          </div>
        )}

        {/* For developers */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {t('aiAgents.forDevelopers')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {devClients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                loading={loadingClient === client.id}
                onConnect={handleConnect}
                showRiskBadge={showRiskBadges}
              />
            ))}
            {/* Other / generic */}
            <button
              onClick={handleOtherClick}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-muted/50 transition-colors text-center"
            >
              <MoreHorizontal className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t('aiAgents.other')}</span>
              <span className="text-xs text-muted-foreground">{t('aiAgents.showDetails')}</span>
            </button>
          </div>
        </div>
      </div>

      <ConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        client={dialogClient}
        artifact={dialogArtifact}
        mcpUrl={mcpUrl}
        storeName={storeName}
        onTokenCreated={onTokenCreated}
      />
    </>
  );
}

interface ClientCardProps {
  client: McpClient;
  loading: boolean;
  onConnect: (client: McpClient) => void;
  showRiskBadge?: boolean;
}

const RISK_BADGE: Record<
  ClientRisk,
  { Icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  'local-capable': { Icon: ShieldCheck, tone: 'text-success' },
  mixed: { Icon: ShieldAlert, tone: 'text-amber-600 dark:text-amber-400' },
  'cloud-only': { Icon: CloudOff, tone: 'text-destructive' },
};

function ClientCard({ client, loading, onConnect, showRiskBadge = false }: ClientCardProps) {
  const { t } = useI18n();
  const icon = CLIENT_ICONS[client.id];
  const btn = getButtonProps(client);
  const BtnIcon = btn.icon;
  const riskBadge = RISK_BADGE[client.risk];
  const RiskIcon = riskBadge.Icon;
  const riskLabelKey =
    client.risk === 'local-capable'
      ? 'aiAgents.sovereign.risk.local'
      : client.risk === 'mixed'
        ? 'aiAgents.sovereign.risk.mixed'
        : 'aiAgents.sovereign.risk.cloud';
  const riskTitleKey =
    client.risk === 'mixed'
      ? 'aiAgents.sovereign.risk.mixedTooltip'
      : client.risk === 'cloud-only'
        ? 'aiAgents.sovereign.risk.cloudTooltip'
        : null;
  // Merge the short label and the long explanation into aria-label so keyboard /
  // touch / screen-reader users get the full risk context (the `title` attribute
  // is unreliable for those modalities — it only fires on mouse hover).
  const riskAriaLabel = riskTitleKey ? `${t(riskLabelKey)} — ${t(riskTitleKey)}` : t(riskLabelKey);

  return (
    <button
      onClick={() => onConnect(client)}
      disabled={loading}
      className={cn(
        'relative flex flex-col items-center gap-2 p-4 rounded-lg border border-border',
        'hover:border-primary/40 hover:bg-muted/50 transition-colors text-center',
        'disabled:opacity-60 disabled:cursor-wait'
      )}
      data-testid={`mcp-client-${client.id}`}
    >
      {showRiskBadge && (
        <span
          className={cn(
            'absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-medium',
            riskBadge.tone
          )}
          title={riskTitleKey ? t(riskTitleKey) : undefined}
          aria-label={riskAriaLabel}
          data-testid={`mcp-client-risk-${client.id}`}
        >
          <RiskIcon className="w-3 h-3" />
          {t(riskLabelKey)}
        </span>
      )}
      {icon ? (
        icon.color ? (
          <img
            src={icon.path}
            alt={`${client.name} logo`}
            width={32}
            height={32}
            className="w-8 h-8"
          />
        ) : (
          <span
            role="img"
            aria-label={`${client.name} logo`}
            className="inline-block w-8 h-8 bg-foreground"
            style={{
              maskImage: `url(${icon.path})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskImage: `url(${icon.path})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
            }}
          />
        )
      ) : (
        <MoreHorizontal className="w-8 h-8 text-foreground" />
      )}
      <span className="text-sm font-medium text-foreground">{client.name}</span>
      {client.tagline && <span className="text-xs text-muted-foreground">{client.tagline}</span>}
      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-1">
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            {t('aiAgents.connecting')}
          </>
        ) : (
          <>
            <BtnIcon className="w-3 h-3" />
            {t(btn.labelKey)}
          </>
        )}
      </span>
    </button>
  );
}
