'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@mobazha/core';
import { isBasicAuthMode, isStandaloneMode, isOutpostMode } from '@mobazha/core/config/env';
import {
  getSystemHealth,
  getPaymentRPCStatus,
  getNetworkConfig,
  updateNetworkConfig,
  runDoctor,
  downloadDiagnostics,
  getDomainConfig,
  updateDomain,
  triggerUpdate,
  getUpdateConfig,
  updateUpdateConfig,
  type SystemHealthResponse,
  type PaymentRPCStatusResponse,
  type NetworkConfigResponse,
  type DoctorSummary,
  type UpdateConfigResponse,
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
  Stethoscope,
  Download,
  Link,
  Save,
  Settings,
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

  const [doctorResult, setDoctorResult] = useState<DoctorSummary | null>(null);
  const [doctorRunning, setDoctorRunning] = useState(false);
  const [diagExporting, setDiagExporting] = useState(false);

  const [domainInput, setDomainInput] = useState('');
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainMessage, setDomainMessage] = useState<string | null>(null);

  const [updateTriggering, setUpdateTriggering] = useState(false);
  const [updateConfig, setUpdateConfig] = useState<UpdateConfigResponse | null>(null);
  const [updateConfigSaving, setUpdateConfigSaving] = useState(false);
  const [showUpdateSettings, setShowUpdateSettings] = useState(false);

  const [rpcStatus, setRpcStatus] = useState<PaymentRPCStatusResponse | null>(null);

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

  const fetchDomainConfig = useCallback(async () => {
    try {
      const cfg = await getDomainConfig();
      setDomainInput(cfg.domain || '');
    } catch {
      // Domain endpoint may not be available
    }
  }, []);

  const fetchUpdateConfig = useCallback(async () => {
    try {
      const cfg = await getUpdateConfig();
      setUpdateConfig(cfg);
    } catch {
      // Update config endpoint may not be available (Docker/SaaS mode)
    }
  }, []);

  const fetchRpcStatus = useCallback(async () => {
    if (!isOutpostMode()) return;
    try {
      setRpcStatus(await getPaymentRPCStatus());
    } catch {
      setRpcStatus(null);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchHealth();
      fetchNetworkConfig();
      fetchDomainConfig();
      fetchUpdateConfig();
      fetchRpcStatus();
      const interval = setInterval(fetchHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [
    isAdmin,
    fetchHealth,
    fetchNetworkConfig,
    fetchDomainConfig,
    fetchUpdateConfig,
    fetchRpcStatus,
  ]);

  const handleApplyNetwork = async () => {
    setNetworkSaving(true);
    setNetworkMessage(null);
    try {
      const result = await updateNetworkConfig(selectedOverlay);
      setNetworkMessage(result.message);
      setTimeout(() => setNetworkMessage(null), 8000);
      await fetchNetworkConfig();
    } catch (err) {
      setNetworkMessage(err instanceof Error ? err.message : t('system.network.error'));
    } finally {
      setNetworkSaving(false);
    }
  };

  const handleRunDoctor = async () => {
    setDoctorRunning(true);
    try {
      const result = await runDoctor();
      setDoctorResult(result);
    } catch {
      setDoctorResult(null);
    } finally {
      setDoctorRunning(false);
    }
  };

  const handleExportDiagnostics = async () => {
    setDiagExporting(true);
    try {
      const blob = await downloadDiagnostics();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mobazha-diag-${new Date().toISOString().slice(0, 10)}.tar.gz`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail
    } finally {
      setDiagExporting(false);
    }
  };

  const handleSaveDomain = async () => {
    setDomainSaving(true);
    setDomainMessage(null);
    try {
      const result = await updateDomain(domainInput.trim());
      setDomainMessage(result.message);
      setTimeout(() => setDomainMessage(null), 8000);
    } catch (err) {
      setDomainMessage(err instanceof Error ? err.message : t('system.domain.error'));
    } finally {
      setDomainSaving(false);
    }
  };

  const handleCheckUpdate = async () => {
    setUpdateTriggering(true);
    try {
      await triggerUpdate('check');
      setTimeout(fetchHealth, 3000);
    } catch {
      // silent
    } finally {
      setUpdateTriggering(false);
    }
  };

  const handleSaveUpdateConfig = async () => {
    if (!updateConfig) return;
    setUpdateConfigSaving(true);
    try {
      const saved = await updateUpdateConfig(updateConfig);
      setUpdateConfig(saved);
    } catch {
      // silent
    } finally {
      setUpdateConfigSaving(false);
    }
  };

  const handleApplyUpdate = async () => {
    setUpdateTriggering(true);
    try {
      await triggerUpdate('apply');
      setTimeout(fetchHealth, 3000);
    } catch {
      // silent
    } finally {
      setUpdateTriggering(false);
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

  const sys = health!.system ?? {
    goVersion: '',
    os: '',
    arch: '',
    numCPU: 0,
    numGoroutine: 0,
    memAllocMB: 0,
    memSysMB: 0,
    diskTotalGB: 0,
    diskFreeGB: 0,
    diskUsedPercent: 0,
  };
  const diskUsedGB = sys.diskTotalGB - sys.diskFreeGB;
  const storePort = networkConfig?.gatewayPort || 5102;

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
          title={t('system.refresh')}
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
              <div className="text-sm text-muted-foreground">{t('system.status.label')}</div>
              <div className="font-medium text-foreground capitalize">
                {health!.status === 'healthy'
                  ? t('system.status.healthy')
                  : health!.status === 'degraded'
                    ? t('system.status.degraded')
                    : health!.status}
              </div>
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
        <div className="space-y-4">
          {/* Current version */}
          <div className="flex items-center gap-3">
            <Tag className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm text-muted-foreground">
                {t('system.updates.currentVersion')}
              </div>
              <div className="font-medium font-mono text-foreground">
                {health!.version && health!.version !== 'dev'
                  ? health!.version
                  : t('system.updates.devBuild')}
              </div>
            </div>
          </div>

          {/* Dynamic update status */}
          {renderUpdateStatus(health!, updateTriggering, handleCheckUpdate, handleApplyUpdate, t)}

          {/* Update Settings (native mode with launcher only) */}
          {health!.deploymentMode === 'native' && updateConfig && (
            <div className="border-t border-border pt-4 mt-4">
              <button
                onClick={() => setShowUpdateSettings(!showUpdateSettings)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Settings className="w-4 h-4" />
                {t('system.updates.settings.title')}
                <span className={`transition-transform ${showUpdateSettings ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>

              {showUpdateSettings && (
                <div className="mt-3 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {t('system.updates.settings.autoUpdate')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('system.updates.settings.autoUpdateDesc')}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setUpdateConfig({
                          ...updateConfig,
                          autoUpdateEnabled: !updateConfig.autoUpdateEnabled,
                        })
                      }
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        updateConfig.autoUpdateEnabled ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          updateConfig.autoUpdateEnabled ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      {t('system.updates.settings.checkInterval')}
                    </label>
                    <select
                      value={updateConfig.checkIntervalMinutes}
                      onChange={e =>
                        setUpdateConfig({
                          ...updateConfig,
                          checkIntervalMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                    >
                      <option value={60}>{t('system.updates.settings.every1h')}</option>
                      <option value={180}>{t('system.updates.settings.every3h')}</option>
                      <option value={360}>{t('system.updates.settings.every6h')}</option>
                      <option value={720}>{t('system.updates.settings.every12h')}</option>
                      <option value={1440}>{t('system.updates.settings.every24h')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      {t('system.updates.settings.channel')}
                    </label>
                    <select
                      value={updateConfig.updateChannel}
                      onChange={e =>
                        setUpdateConfig({
                          ...updateConfig,
                          updateChannel: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                    >
                      <option value="stable">{t('system.updates.settings.stable')}</option>
                      <option value="beta">{t('system.updates.settings.beta')}</option>
                    </select>
                  </div>

                  <button
                    onClick={handleSaveUpdateConfig}
                    disabled={updateConfigSaving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {updateConfigSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {t('system.updates.settings.save')}
                  </button>
                </div>
              )}
            </div>
          )}
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
                <div className="text-sm text-muted-foreground">
                  {t('system.network.connectivity')}
                </div>
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

            {networkConfig.dockerManaged && (
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {t('system.network.overlayNetwork')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      value: '',
                      label: t('system.network.none'),
                      icon: Wifi,
                      desc: t('system.network.noneDesc'),
                    },
                    { value: 'tor', label: 'Tor', icon: Shield, desc: '.onion' },
                    { value: 'lokinet', label: 'Lokinet', icon: Shield, desc: '.loki' },
                  ].map(opt => (
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
                    <span className="text-xs text-muted-foreground">
                      {t('system.network.applyHint')}
                    </span>
                  </div>
                )}
                {networkMessage && (
                  <div className="mt-3 p-3 rounded-lg bg-muted text-sm text-foreground">
                    {networkMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RPC Connection Status (Outpost only) */}
      {isOutpostMode() && rpcStatus && (
        <div className="border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            {t('system.rpc.title', { defaultValue: 'Payment RPC Status' })}
          </h2>
          <div className="space-y-3">
            {rpcStatus.xmr && (
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${rpcStatus.xmr.connected ? 'bg-green-500' : 'bg-destructive'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">Monero (wallet-rpc)</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">
                    {rpcStatus.xmr.endpoint || 'Not configured'}
                  </div>
                  {rpcStatus.xmr.blockHeight != null && (
                    <div className="text-xs text-muted-foreground">
                      Block: {rpcStatus.xmr.blockHeight.toLocaleString()}
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${rpcStatus.xmr.connected ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                >
                  {rpcStatus.xmr.connected
                    ? t('system.rpc.connected', { defaultValue: 'Connected' })
                    : t('system.rpc.disconnected', { defaultValue: 'Disconnected' })}
                </span>
              </div>
            )}
            {!rpcStatus.xmr && (
              <p className="text-sm text-muted-foreground">
                {t('system.rpc.noneConfigured', {
                  defaultValue:
                    'No payment RPC configured. Go to Settings → Payments to set up XMR wallet-rpc.',
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Domain Settings (standalone only, hidden in Outpost) */}
      {isStandaloneMode() && !isOutpostMode() && (
        <div id="domain" className="border border-border rounded-lg p-5">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
            {t('system.domain.title', { defaultValue: 'Custom Domain' })}
          </h2>
          <div className="space-y-4">
            {/* Setup guide — varies by connectivity + deployment mode */}
            {networkConfig && (
              <div className="space-y-3 text-sm">
                {networkConfig.connectivity === 'nat' ? (
                  /* ── NAT mode: tunnel-first approach ── */
                  <>
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 space-y-1">
                      <p className="font-medium">
                        {t('system.domain.natWarning', {
                          defaultValue:
                            'Your store is behind NAT and not directly reachable from the internet.',
                        })}
                      </p>
                      <p className="text-xs opacity-80">
                        {t('system.domain.natDesc', {
                          defaultValue:
                            'You need a tunnel service to expose your local store to the internet before setting up a custom domain.',
                        })}
                      </p>
                    </div>

                    <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                      <li>
                        {t('system.domain.natStep1', {
                          defaultValue: 'Set up a tunnel to expose your store to the internet',
                        })}
                      </li>
                      <li>
                        {t('system.domain.natStep2', {
                          defaultValue:
                            'Point your domain to the tunnel (or use the tunnel-provided domain)',
                        })}
                      </li>
                      <li>
                        {t('system.domain.natStep3', {
                          defaultValue: 'Enter your domain below and save',
                        })}
                      </li>
                    </ol>

                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-primary hover:underline">
                        {t('system.domain.tunnelOptions', {
                          defaultValue: 'Recommended tunnel services',
                        })}
                      </summary>
                      <div className="mt-2 space-y-3 text-muted-foreground">
                        <div className="p-2 rounded bg-muted space-y-1.5">
                          <p className="font-medium text-foreground">
                            Cloudflare Tunnel (recommended)
                          </p>
                          <p>
                            {t('system.domain.cfTunnelDesc', {
                              defaultValue:
                                'Free, supports custom domains with automatic SSL. Best for long-term use.',
                            })}
                          </p>
                          <pre className="p-2 rounded bg-background font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
                            {`# Install cloudflared, then:
cloudflared tunnel create my-store
cloudflared tunnel route dns my-store store.example.com
cloudflared tunnel run --url localhost:${storePort} my-store`}
                          </pre>
                        </div>
                        <div className="p-2 rounded bg-muted space-y-1.5">
                          <p className="font-medium text-foreground">ngrok</p>
                          <p>
                            {t('system.domain.ngrokDesc', {
                              defaultValue:
                                'Quick setup for testing. Paid plans support custom domains.',
                            })}
                          </p>
                          <pre className="p-2 rounded bg-background font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
                            {`ngrok http ${storePort}`}
                          </pre>
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {t('system.domain.tunnelAlt', {
                            defaultValue:
                              'Alternatively, connect to the Mobazha Platform in Sales Channels for a zero-config branded subdomain without setting up tunnels.',
                          })}
                        </p>
                      </div>
                    </details>
                  </>
                ) : networkConfig.dockerManaged ? (
                  /* ── Docker + public IP: auto HTTPS via Caddy ── */
                  <>
                    <p className="text-muted-foreground">
                      {t('system.domain.dockerGuide', {
                        defaultValue:
                          'Your Docker environment supports automatic HTTPS. Follow these steps:',
                      })}
                    </p>
                    <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                      <li>
                        {t('system.domain.dockerStep1', {
                          defaultValue:
                            "Point your domain's DNS A record to this server's IP address",
                        })}
                      </li>
                      <li>
                        {t('system.domain.dockerStep2', {
                          defaultValue: 'Enter your domain below and save',
                        })}
                      </li>
                      <li>
                        {t('system.domain.dockerStep3', {
                          defaultValue: 'Caddy will automatically obtain an SSL certificate',
                        })}
                      </li>
                    </ol>
                  </>
                ) : (
                  /* ── Native binary + public IP: manual reverse proxy ── */
                  <>
                    <p className="text-muted-foreground">
                      {t('system.domain.nativeGuide', {
                        defaultValue:
                          'Set up a reverse proxy on this server to serve your store over HTTPS:',
                      })}
                    </p>
                    <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
                      <li>
                        {t('system.domain.nativeStep1', {
                          defaultValue:
                            "Point your domain's DNS A record to this server's public IP",
                        })}
                      </li>
                      <li>
                        {t('system.domain.nativeStep2', {
                          defaultValue: `Install a reverse proxy (Nginx or Caddy) and proxy your domain to localhost:${storePort}`,
                        })}
                      </li>
                      <li>
                        {t('system.domain.nativeStep3', {
                          defaultValue:
                            "Set up SSL (Caddy does this automatically; for Nginx use Let's Encrypt / certbot)",
                        })}
                      </li>
                      <li>
                        {t('system.domain.nativeStep4', {
                          defaultValue: 'Enter your domain below and save',
                        })}
                      </li>
                    </ol>

                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-primary hover:underline">
                        {t('system.domain.configExample', {
                          defaultValue: 'Show example proxy configuration',
                        })}
                      </summary>
                      <div className="mt-2 space-y-3">
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Caddy</p>
                          <pre className="p-2 rounded bg-muted font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
                            {`store.example.com {
  reverse_proxy localhost:${storePort}
}`}
                          </pre>
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground mb-1">Nginx</p>
                          <pre className="p-2 rounded bg-muted font-mono text-[11px] leading-relaxed overflow-x-auto whitespace-pre">
                            {`server {
  listen 443 ssl;
  server_name store.example.com;

  ssl_certificate     /etc/letsencrypt/live/store.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/store.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:${storePort};
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}`}
                          </pre>
                        </div>
                      </div>
                    </details>
                  </>
                )}
              </div>
            )}

            {/* Domain input */}
            <div className="flex items-start gap-3">
              <Link className="w-5 h-5 text-blue-500 mt-2" />
              <div className="flex-1 space-y-2">
                <label className="text-sm text-muted-foreground">
                  {t('system.domain.label', { defaultValue: 'Domain' })}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={domainInput}
                    onChange={e => setDomainInput(e.target.value)}
                    placeholder="store.example.com"
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleSaveDomain}
                    disabled={domainSaving || !domainInput.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {domainSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {t('system.domain.save', { defaultValue: 'Save' })}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('system.domain.hint', {
                    defaultValue: 'Enter the domain pointing to this server (without http/https).',
                  })}
                </p>
              </div>
            </div>
            {domainMessage && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  domainMessage.toLowerCase().includes('error') ||
                  domainMessage.toLowerCase().includes('fail')
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-green-500/10 text-green-700 dark:text-green-400'
                }`}
              >
                {domainMessage}
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
          {isStandaloneMode() && (
            <button
              onClick={handleRunDoctor}
              disabled={doctorRunning}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              {doctorRunning ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              ) : (
                <Stethoscope className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <div className="font-medium text-foreground text-sm">
                  {t('system.actions.runDoctor')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('system.actions.runDoctorDesc')}
                </div>
              </div>
            </button>
          )}

          {doctorResult && (
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="text-green-500">
                  {doctorResult.pass} {t('system.doctor.passed')}
                </span>
                {doctorResult.warn > 0 && (
                  <span className="text-yellow-500">
                    {doctorResult.warn} {t('system.doctor.warnings')}
                  </span>
                )}
                {doctorResult.fail > 0 && (
                  <span className="text-destructive">
                    {doctorResult.fail} {t('system.doctor.failed')}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {doctorResult.results.map(r => (
                  <div key={r.name} className="flex items-center gap-2 text-sm">
                    {r.status === 'PASS' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    )}
                    {r.status === 'WARN' && (
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                    )}
                    {r.status === 'FAIL' && (
                      <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                    )}
                    <span className="text-foreground">{r.name}</span>
                    {r.detail && (
                      <span className="text-muted-foreground truncate">— {r.detail}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isStandaloneMode() && (
            <button
              onClick={handleExportDiagnostics}
              disabled={diagExporting}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              {diagExporting ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <div className="font-medium text-foreground text-sm">
                  {t('system.actions.exportDiag')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('system.actions.exportDiagDesc')}
                </div>
              </div>
            </button>
          )}

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

function renderUpdateStatus(
  health: SystemHealthResponse,
  triggering: boolean,
  onCheck: () => void,
  onApply: () => void,
  t: (key: string, opts?: Record<string, string>) => string
) {
  const mode = health.deploymentMode;
  const update = health.update;

  // Docker mode — managed by Watchtower/platform
  if (mode === 'docker' || mode === 'saas') {
    return (
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
            {t('system.updates.managedByPlatform')}
          </div>
        </div>
      </div>
    );
  }

  // Native mode without launcher — manual updates
  if (!update) {
    return (
      <div className="flex items-center gap-3">
        <ArrowDownCircle className="w-5 h-5 text-muted-foreground" />
        <div>
          <div className="text-sm text-muted-foreground">{t('system.updates.autoUpdate')}</div>
          <div className="font-medium text-foreground text-sm">
            {t('system.updates.noLauncher')}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('system.updates.noLauncherDesc')}
          </div>
        </div>
      </div>
    );
  }

  // Native mode with launcher — dynamic status
  const status = update.updateStatus;

  if (status === 'downloading') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div>
            <div className="text-sm text-muted-foreground">{t('system.updates.downloading')}</div>
            <div className="font-medium text-foreground text-sm">
              {update.latestVersion} — {update.downloadProgress}%
            </div>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${update.downloadProgress}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === 'applying') {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <div>
          <div className="text-sm text-muted-foreground">{t('system.updates.applying')}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t('system.updates.applyingDesc')}
          </div>
        </div>
      </div>
    );
  }

  if (status === 'available' || status === 'ready') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <ArrowDownCircle className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">{t('system.updates.newVersion')}</div>
            <div className="font-medium text-foreground font-mono">{update.latestVersion}</div>
            {update.releaseNotes && (
              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {update.releaseNotes}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onApply}
            disabled={triggering}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {triggering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {t('system.updates.updateNow')}
          </button>
          {update.latestReleaseURL && (
            <a
              href={update.latestReleaseURL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm text-primary hover:underline"
            >
              {t('system.updates.viewRelease')}
            </a>
          )}
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div>
            <div className="text-sm text-destructive font-medium">{t('system.updates.failed')}</div>
            {update.lastError && (
              <div className="text-xs text-muted-foreground mt-0.5">{update.lastError}</div>
            )}
          </div>
        </div>
        <button
          onClick={onCheck}
          disabled={triggering}
          className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {triggering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('system.updates.retry')}
        </button>
      </div>
    );
  }

  // up-to-date
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-500" />
        <div>
          <div className="text-sm text-muted-foreground">{t('system.updates.upToDate')}</div>
          {update.autoUpdateEnabled && (
            <div className="text-xs text-muted-foreground mt-0.5">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {t('system.updates.autoUpdateActive')}
              </span>
            </div>
          )}
          {update.lastCheckTime && (
            <div className="text-xs text-muted-foreground/60 mt-0.5">
              {t('system.updates.lastChecked', {
                time: new Date(update.lastCheckTime).toLocaleString(),
              })}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={onCheck}
        disabled={triggering}
        className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {triggering ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        {t('system.updates.checkNow')}
      </button>
    </div>
  );
}
