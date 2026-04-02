'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { isBasicAuthMode, isStandaloneMode } from '@mobazha/core/config/env';
import {
  getSystemHealth,
  getNetworkConfig,
  updateNetworkConfig,
  type SystemHealthResponse,
  type NetworkConfigResponse,
} from '@mobazha/core/services/api/system';
import {
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  RefreshCw,
  FileDown,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Copy,
  Check,
  ArrowDownCircle,
  Tag,
  Shield,
  Globe,
  Wifi,
} from 'lucide-react';

function formatUptime(seconds: number, t: (key: string) => string): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${t('system.days')}`);
  if (hours > 0) parts.push(`${hours} ${t('system.hours')}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} ${t('system.minutes')}`);
  return parts.join(' ');
}

function formatGB(gb: number): string {
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

function formatMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export default function SystemPage() {
  const { t } = useI18n();
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedPeerID, setCopiedPeerID] = useState(false);

  const [networkConfig, setNetworkConfig] = useState<NetworkConfigResponse | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState('');
  const [networkSaving, setNetworkSaving] = useState(false);
  const [networkMessage, setNetworkMessage] = useState<string | null>(null);

  const isAdmin = isBasicAuthMode() || isStandaloneMode();

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemHealth();
      setHealth(data);
    } catch {
      setError(t('system.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchNetworkConfig = useCallback(async () => {
    try {
      const cfg = await getNetworkConfig();
      setNetworkConfig(cfg);
      setSelectedOverlay(cfg.overlayType || '');
    } catch {
      // Network endpoint may not be available in SaaS mode
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchHealth();
      fetchNetworkConfig();
      const interval = setInterval(fetchHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchHealth, fetchNetworkConfig]);

  const handleApplyNetwork = async () => {
    setNetworkSaving(true);
    setNetworkMessage(null);
    try {
      const result = await updateNetworkConfig(selectedOverlay);
      setNetworkMessage(result.message);
      setTimeout(() => setNetworkMessage(null), 8000);
      await fetchNetworkConfig();
    } catch (err) {
      setNetworkMessage(
        err instanceof Error ? err.message : t('system.network.error'),
      );
    } finally {
      setNetworkSaving(false);
    }
  };

  const handleCopyPeerID = async () => {
    if (health?.node.peerID) {
      await navigator.clipboard.writeText(health.node.peerID);
      setCopiedPeerID(true);
      setTimeout(() => setCopiedPeerID(false), 2000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{t('system.notAvailable')}</p>
        </div>
      </div>
    );
  }

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('system.loading')}</span>
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-destructive">{error}</p>
        <button
          onClick={fetchHealth}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
        >
          {t('system.retry')}
        </button>
      </div>
    );
  }

  const sys = health!.system;
  const diskUsedGB = sys.diskTotalGB - sys.diskFreeGB;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{t('system.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('system.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Overview */}
      <div className="border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {t('system.status.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium text-foreground capitalize">{health!.status}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-sm text-muted-foreground">{t('system.status.uptime')}</div>
              <div className="font-medium text-foreground">
                {formatUptime(health!.uptimeSeconds, t)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 col-span-1 sm:col-span-2">
            <Activity className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">{t('system.status.peerID')}</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-foreground truncate">
                  {health!.node.peerID}
                </span>
                <button
                  onClick={handleCopyPeerID}
                  className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                >
                  {copiedPeerID ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Software Updates */}
      <div className="border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {t('system.updates.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">{t('system.updates.currentVersion')}</div>
              <div className="font-medium font-mono text-foreground">
                {health!.version && health!.version !== 'dev'
                  ? health!.version
                  : t('system.updates.devBuild')}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-sm text-muted-foreground">{t('system.updates.autoUpdate')}</div>
              <div className="font-medium text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {t('system.updates.enabled')}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t('system.updates.autoUpdateDesc')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network & Privacy */}
      {networkConfig && (
        <div className="border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            {t('system.network.title')}
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">{t('system.network.connectivity')}</div>
                <div className="font-medium text-foreground capitalize">
                  {networkConfig.connectivity === 'overlay'
                    ? `${t('system.network.overlay')} (${networkConfig.overlayType})`
                    : networkConfig.connectivity}
                </div>
                {networkConfig.overlayDomain && (
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    {networkConfig.overlayDomain}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t('system.network.overlayNetwork')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: '', label: t('system.network.none'), icon: Wifi, desc: t('system.network.noneDesc') },
                  { value: 'tor', label: 'Tor', icon: Shield, desc: '.onion' },
                  { value: 'lokinet', label: 'Lokinet', icon: Shield, desc: '.loki' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedOverlay(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors text-center ${
                      selectedOverlay === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    <opt.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-[10px] opacity-70">{opt.desc}</span>
                  </button>
                ))}
              </div>
              {selectedOverlay !== (networkConfig.overlayType || '') && (
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={handleApplyNetwork}
                    disabled={networkSaving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {networkSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {t('system.network.apply')}
                  </button>
                  <span className="text-xs text-muted-foreground">{t('system.network.applyHint')}</span>
                </div>
              )}
              {networkMessage && (
                <div className="mt-3 p-3 rounded-lg bg-muted text-sm text-foreground">
                  {networkMessage}
                </div>
              )}
            </div>

            {!networkConfig.dockerManaged && (
              <div className="mt-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-700 dark:text-yellow-400">
                {t('system.network.noDocker')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resources */}
      <div className="border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {t('system.resources.title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-sm text-muted-foreground">{t('system.resources.cpu')}</div>
              <div className="font-medium text-foreground">
                {sys.numCPU} {t('system.resources.cores')} · {sys.os}/{sys.arch}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MemoryStick className="w-5 h-5 text-purple-500" />
            <div>
              <div className="text-sm text-muted-foreground">{t('system.resources.memory')}</div>
              <div className="font-medium text-foreground">
                {formatMB(sys.memAllocMB)} {t('system.resources.used')} / {formatMB(sys.memSysMB)}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 col-span-1 sm:col-span-2">
            <HardDrive className="w-5 h-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">{t('system.resources.disk')}</div>
              <div className="font-medium text-foreground mb-2">
                {formatGB(diskUsedGB)} {t('system.resources.used')} / {formatGB(sys.diskTotalGB)} (
                {sys.diskUsedPercent.toFixed(1)}%)
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    sys.diskUsedPercent > 90
                      ? 'bg-destructive'
                      : sys.diskUsedPercent > 75
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(sys.diskUsedPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          {t('system.actions.title')}
        </h2>
        <div className="space-y-3">
          <a
            href={`${window.location.origin}/v1/system/logs`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
          >
            <FileDown className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-medium text-foreground text-sm">
                {t('system.actions.downloadLogs')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('system.actions.downloadLogsDesc')}
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* System info footer */}
      <div className="text-xs text-muted-foreground/50 text-center">
        {health!.version && health!.version !== 'dev' ? `v${health!.version} · ` : ''}
        {sys.goVersion} · {sys.numGoroutine} {t('system.resources.goroutines')}
      </div>
    </div>
  );
}
